using System.Data;
using System.Text.RegularExpressions;
using GymManagement.Api.Data;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Payments;
using GymManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Services;

public sealed class PaymentService(GymDbContext dbContext) : IPaymentService
{
    public async Task<(PaymentResponse? Payment, PaymentError? Error)> CreateAsync(
        int invoiceId,
        CreatePaymentRequest request,
        int createdByUserId,
        CancellationToken cancellationToken)
    {
        var invoice = await dbContext.Invoices.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == invoiceId, cancellationToken);
        if (invoice is null)
        {
            return (null, PaymentError.InvoiceNotFound);
        }

        if (invoice.Status != InvoiceStatus.PendingPayment)
        {
            return (null, PaymentError.InvoiceNotPayable);
        }

        var confirmedPaid = await dbContext.Payments.AsNoTracking()
            .Where(item => item.InvoiceId == invoice.Id && item.Status == PaymentStatus.Confirmed)
            .SumAsync(item => (decimal?)item.Amount, cancellationToken) ?? 0m;
        var remaining = decimal.Truncate(invoice.TotalAmount) - confirmedPaid;
        if (request.Amount <= 0 || request.Amount > remaining)
        {
            return (null, PaymentError.AmountMismatch);
        }

        if (request.ReceiptFileId.HasValue)
        {
            var fileExists = await dbContext.StoredFiles.AnyAsync(f => f.Id == request.ReceiptFileId.Value, cancellationToken);
            if (!fileExists)
            {
                return (null, PaymentError.FileNotFound);
            }
        }

        var payment = new Payment
        {
            InvoiceId = invoice.Id,
            Amount = request.Amount,
            Method = request.Method,
            ReceiptFileId = request.ReceiptFileId,
            Status = PaymentStatus.PendingConfirmation,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = createdByUserId
        };
        dbContext.Payments.Add(payment);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(payment), null);
    }

    public async Task<(PaymentResponse? Payment, PaymentError? Error)> ConfirmAsync(
        int paymentId,
        ConfirmPaymentRequest request,
        int reviewedByUserId,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var payment = await dbContext.Payments.SingleOrDefaultAsync(item => item.Id == paymentId, cancellationToken);
        if (payment is null)
        {
            return (null, PaymentError.PaymentNotFound);
        }

        if (payment.Status != PaymentStatus.PendingConfirmation)
        {
            return (null, PaymentError.PaymentNotPending);
        }

        var invoice = await dbContext.Invoices.SingleOrDefaultAsync(item => item.Id == payment.InvoiceId, cancellationToken);
        if (invoice is null)
        {
            return (null, PaymentError.InvoiceNotFound);
        }

        if (invoice.Status != InvoiceStatus.PendingPayment)
        {
            return (null, PaymentError.InvoiceNotPayable);
        }

        var alreadyConfirmed = await dbContext.Payments
            .Where(item => item.InvoiceId == invoice.Id && item.Status == PaymentStatus.Confirmed)
            .SumAsync(item => (decimal?)item.Amount, cancellationToken) ?? 0m;
        var invoiceTarget = decimal.Truncate(invoice.TotalAmount);
        var newTotalConfirmed = alreadyConfirmed + payment.Amount;
        if (newTotalConfirmed > invoiceTarget)
        {
            return (null, PaymentError.AmountMismatch);
        }

        var reference = string.IsNullOrWhiteSpace(request.Reference) ? null : request.Reference.Trim();
        if (payment.Method == PaymentMethod.BankTransfer && reference is null)
        {
            return (null, PaymentError.TransferReferenceRequired);
        }

        var isFullyPaid = newTotalConfirmed >= invoiceTarget;
        var shouldActivate = isFullyPaid || request.ActivateSubscriptionNow;
        var now = DateTime.UtcNow;

        payment.Status = PaymentStatus.Confirmed;
        payment.Reference = reference;
        payment.ReviewedByUserId = reviewedByUserId;
        payment.ReviewedAtUtc = now;
        payment.Version++;

        if (shouldActivate)
        {
            var subscription = await dbContext.Subscriptions.SingleOrDefaultAsync(
                item => item.Id == invoice.SubscriptionId,
                cancellationToken);
            if (subscription is null ||
                subscription.Status is not (SubscriptionStatus.PendingPayment or SubscriptionStatus.Active))
            {
                return (null, PaymentError.SubscriptionNotPendingPayment);
            }

            if (subscription.Status == SubscriptionStatus.PendingPayment)
            {
                var member = await dbContext.Members.SingleOrDefaultAsync(item => item.Id == invoice.MemberId, cancellationToken);
                if (member is null || member.Status != MemberStatus.Active)
                {
                    return (null, PaymentError.MemberNotActive);
                }

                var today = GymClock.TodayVietnam(now);
                var startDate = today;
                if (subscription.RenewedFromSubscriptionId is int previousId)
                {
                    var previous = await dbContext.Subscriptions.AsNoTracking()
                        .SingleOrDefaultAsync(item => item.Id == previousId, cancellationToken);
                    if (previous?.EndsOn is DateOnly previousEnd && previousEnd >= today)
                    {
                        startDate = previousEnd.AddDays(1);
                    }
                }

                subscription.Status = SubscriptionStatus.Active;
                subscription.StartsOn = startDate;
                subscription.EndsOn = startDate.AddDays(invoice.PlanDurationDaysSnapshot - 1);
            }
        }

        if (isFullyPaid)
        {
            invoice.Status = InvoiceStatus.Paid;
            invoice.PaidAtUtc = now;
            invoice.Version++;
        }

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return (null, PaymentError.ConcurrentUpdate);
        }

        return (ToResponse(payment), null);
    }

    public async Task<(PaymentResponse? Payment, PaymentError? Error)> RejectAsync(
        int paymentId,
        RejectPaymentRequest request,
        int reviewedByUserId,
        CancellationToken cancellationToken)
    {
        var payment = await dbContext.Payments.SingleOrDefaultAsync(item => item.Id == paymentId, cancellationToken);
        if (payment is null)
        {
            return (null, PaymentError.PaymentNotFound);
        }

        if (payment.Status != PaymentStatus.PendingConfirmation)
        {
            return (null, PaymentError.PaymentNotPending);
        }

        payment.Status = PaymentStatus.Rejected;
        payment.ReviewedByUserId = reviewedByUserId;
        payment.ReviewedAtUtc = DateTime.UtcNow;
        payment.AdjustmentReason = request.Reason.Trim();
        payment.Version++;
        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(payment), null);
    }

    public async Task<(PaymentResponse? Payment, PaymentError? Error)> AttachReceiptAsync(
        int paymentId,
        int fileId,
        CancellationToken cancellationToken)
    {
        var payment = await dbContext.Payments.SingleOrDefaultAsync(item => item.Id == paymentId, cancellationToken);
        if (payment is null)
        {
            return (null, PaymentError.PaymentNotFound);
        }

        var fileExists = await dbContext.StoredFiles.AnyAsync(f => f.Id == fileId, cancellationToken);
        if (!fileExists)
        {
            return (null, PaymentError.FileNotFound);
        }

        var currentIds = GetReceiptFileIds(payment).ToList();
        if (!currentIds.Contains(fileId))
        {
            currentIds.Add(fileId);
        }

        if (payment.ReceiptFileId is null)
        {
            payment.ReceiptFileId = fileId;
        }

        // Preserve all uploaded receipts permanently without removing old images
        var idsTag = $"[RECEIPTS:{string.Join(",", currentIds)}]";
        if (string.IsNullOrWhiteSpace(payment.AdjustmentReason))
        {
            payment.AdjustmentReason = idsTag;
        }
        else if (payment.AdjustmentReason.Contains("[RECEIPTS:"))
        {
            payment.AdjustmentReason = Regex.Replace(payment.AdjustmentReason, @"\[RECEIPTS:[0-9,]+\]", idsTag);
        }
        else
        {
            payment.AdjustmentReason = $"{payment.AdjustmentReason} {idsTag}".Trim();
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(payment), null);
    }

    public static IReadOnlyList<int> GetReceiptFileIds(Payment payment)
    {
        var list = new List<int>();
        if (payment.ReceiptFileId.HasValue)
        {
            list.Add(payment.ReceiptFileId.Value);
        }

        if (!string.IsNullOrWhiteSpace(payment.AdjustmentReason) && payment.AdjustmentReason.Contains("[RECEIPTS:"))
        {
            var match = Regex.Match(payment.AdjustmentReason, @"\[RECEIPTS:([0-9,]+)\]");
            if (match.Success)
            {
                var ids = match.Groups[1].Value.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(s => int.TryParse(s, out var id) ? id : 0)
                    .Where(id => id > 0);
                foreach (var id in ids)
                {
                    if (!list.Contains(id))
                    {
                        list.Add(id);
                    }
                }
            }
        }

        return list;
    }

    public async Task<PaymentResponse?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var payment = await dbContext.Payments.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        return payment is null ? null : ToResponse(payment);
    }

    public async Task<PagedResponse<PaymentResponse>> SearchAsync(
        int? invoiceId,
        PaymentStatus? status,
        string? search,
        DateOnly? from,
        DateOnly? to,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Payments.AsNoTracking();
        if (invoiceId.HasValue)
        {
            query = query.Where(payment => payment.InvoiceId == invoiceId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(payment => payment.Status == status.Value);
        }

        if (from.HasValue)
        {
            var startUtc = GymClock.VietnamDayStartUtc(from.Value);
            query = query.Where(payment => payment.CreatedAtUtc >= startUtc);
        }

        if (to.HasValue)
        {
            var endExclusiveUtc = GymClock.VietnamDayEndExclusiveUtc(to.Value);
            query = query.Where(payment => payment.CreatedAtUtc < endExclusiveUtc);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var stripped = term.TrimStart('#');
            if (stripped.StartsWith("PAY-", StringComparison.OrdinalIgnoreCase))
            {
                stripped = stripped[4..];
            }

            var numericTerm = int.TryParse(stripped, out var parsedId) ? parsedId : (int?)null;
            var matchingMemberIds = dbContext.Members.AsNoTracking()
                .Where(member =>
                    member.FirstName.Contains(term) ||
                    member.LastName.Contains(term) ||
                    (member.Phone != null && member.Phone.Contains(term)) ||
                    (member.Email != null && member.Email.Contains(term)) ||
                    (numericTerm.HasValue && member.Id == numericTerm.Value))
                .Select(member => member.Id);

            var matchingInvoiceIds = dbContext.Invoices.AsNoTracking()
                .Where(invoice =>
                    invoice.Number.Contains(term) ||
                    matchingMemberIds.Contains(invoice.MemberId))
                .Select(invoice => invoice.Id);

            query = query.Where(payment =>
                (payment.Reference != null && payment.Reference.Contains(term)) ||
                matchingInvoiceIds.Contains(payment.InvoiceId) ||
                (numericTerm.HasValue && payment.Id == numericTerm.Value));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var payments = await query
            .OrderByDescending(payment => payment.CreatedAtUtc)
            .ThenByDescending(payment => payment.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // Enrich the current page with invoice numbers and member display info.
        var invoiceIds = payments.Select(payment => payment.InvoiceId).Distinct().ToList();
        var invoiceInfos = await dbContext.Invoices.AsNoTracking()
            .Where(invoice => invoiceIds.Contains(invoice.Id))
            .Select(invoice => new { invoice.Id, invoice.Number, invoice.MemberId })
            .ToDictionaryAsync(invoice => invoice.Id, cancellationToken);

        var memberIds = invoiceInfos.Values.Select(info => info.MemberId).Distinct().ToList();
        var members = await dbContext.Members.AsNoTracking()
            .Where(member => memberIds.Contains(member.Id))
            .Select(member => new { member.Id, member.FirstName, member.LastName, member.Phone })
            .ToDictionaryAsync(member => member.Id, cancellationToken);

        var staffIds = payments
            .SelectMany(p => p.ReviewedByUserId.HasValue ? new[] { p.CreatedByUserId, p.ReviewedByUserId.Value } : new[] { p.CreatedByUserId })
            .Distinct()
            .ToList();
        var staffNames = await dbContext.Users.AsNoTracking()
            .Where(u => staffIds.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName })
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName, cancellationToken);

        var items = payments
            .Select(payment =>
            {
                staffNames.TryGetValue(payment.CreatedByUserId, out var createdByName);
                string? reviewedByName = payment.ReviewedByUserId.HasValue
                    ? staffNames.GetValueOrDefault(payment.ReviewedByUserId.Value)
                    : null;

                if (!invoiceInfos.TryGetValue(payment.InvoiceId, out var inv))
                {
                    return ToResponse(payment) with
                    {
                        CreatedByName = createdByName,
                        ReviewedByName = reviewedByName,
                    };
                }

                members.TryGetValue(inv.MemberId, out var member);
                return ToResponse(payment) with
                {
                    InvoiceNumber = inv.Number,
                    MemberName = member is null ? null : $"{member.FirstName} {member.LastName}".Trim(),
                    MemberPhone = member?.Phone,
                    CreatedByName = createdByName,
                    ReviewedByName = reviewedByName,
                };
            })
            .ToList();

        return new PagedResponse<PaymentResponse>(page, pageSize, totalCount, items);
    }

    private static PaymentResponse ToResponse(Payment payment) => new(
        payment.Id,
        payment.InvoiceId,
        payment.Amount,
        payment.Method,
        payment.Status,
        payment.Reference,
        payment.CreatedAtUtc,
        payment.CreatedByUserId,
        payment.ReviewedByUserId,
        payment.ReviewedAtUtc,
        payment.AdjustmentReason,
        payment.ReceiptFileId,
        GetReceiptFileIds(payment));
}

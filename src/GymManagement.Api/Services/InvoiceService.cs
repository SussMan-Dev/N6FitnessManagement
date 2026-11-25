using System.Data;
using GymManagement.Api.Data;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Invoices;
using GymManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Services;

public sealed class InvoiceService(GymDbContext dbContext) : IInvoiceService
{
    public async Task<(InvoiceResponse? Invoice, InvoiceError? Error)> CreateAsync(
        CreateInvoiceRequest request,
        int createdByUserId,
        CancellationToken cancellationToken)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        var subscription = await dbContext.Subscriptions.SingleOrDefaultAsync(
            item => item.Id == request.SubscriptionId,
            cancellationToken);
        if (subscription is null)
        {
            return (null, InvoiceError.SubscriptionNotFound);
        }

        if (subscription.Status != SubscriptionStatus.PendingPayment)
        {
            return (null, InvoiceError.SubscriptionNotPendingPayment);
        }

        if (await dbContext.Invoices.AnyAsync(
                invoice => invoice.SubscriptionId == subscription.Id &&
                           invoice.Status == InvoiceStatus.PendingPayment,
                cancellationToken))
        {
            return (null, InvoiceError.InvoiceAlreadyExists);
        }

        var member = await dbContext.Members.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == subscription.MemberId, cancellationToken);
        if (member is null)
        {
            return (null, InvoiceError.MemberNotFound);
        }

        if (member.Status != MemberStatus.Active)
        {
            return (null, InvoiceError.MemberNotActive);
        }

        var plan = await dbContext.MembershipPlans.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == subscription.MembershipPlanId, cancellationToken);
        if (plan is null)
        {
            return (null, InvoiceError.PlanNotFound);
        }

        if (!plan.IsActive)
        {
            return (null, InvoiceError.PlanNotActive);
        }

        var now = DateTime.UtcNow;
        var invoice = new Invoice
        {
            Number = $"INV-{now:yyyyMMdd}-{Guid.NewGuid():N}"[..29].ToUpperInvariant(),
            MemberId = member.Id,
            SubscriptionId = subscription.Id,
            PlanNameSnapshot = plan.Name,
            PlanDurationDaysSnapshot = plan.DurationDays,
            TotalAmount = plan.Price,
            Status = InvoiceStatus.PendingPayment,
            CreatedAtUtc = now,
            CreatedByUserId = createdByUserId
        };

        dbContext.Invoices.Add(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return (ToResponse(invoice), null);
    }

    public async Task<InvoiceResponse?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var invoice = await dbContext.Invoices.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (invoice is null)
        {
            return null;
        }

        var paidAmount = await dbContext.Payments.AsNoTracking()
            .Where(payment => payment.InvoiceId == id && payment.Status == PaymentStatus.Confirmed)
            .SumAsync(payment => (decimal?)payment.Amount, cancellationToken) ?? 0m;

        var member = await dbContext.Members.AsNoTracking()
            .Where(m => m.Id == invoice.MemberId)
            .Select(m => new { m.FirstName, m.LastName, m.Phone, m.Email })
            .SingleOrDefaultAsync(cancellationToken);

        var dto = ToResponse(invoice) with { PaidAmount = paidAmount };
        return member is null
            ? dto
            : dto with
            {
                MemberName = $"{member.FirstName} {member.LastName}".Trim(),
                MemberPhone = member.Phone,
                MemberEmail = member.Email,
            };
    }

    public async Task<PagedResponse<InvoiceResponse>> SearchAsync(
        int? memberId,
        string? search,
        InvoiceStatus? status,
        DateOnly? from,
        DateOnly? to,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Invoices.AsNoTracking();
        if (memberId.HasValue)
        {
            query = query.Where(invoice => invoice.MemberId == memberId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(invoice => invoice.Status == status.Value);
        }

        if (from.HasValue)
        {
            var startUtc = GymClock.VietnamDayStartUtc(from.Value);
            query = query.Where(invoice => invoice.CreatedAtUtc >= startUtc);
        }

        if (to.HasValue)
        {
            var endExclusiveUtc = GymClock.VietnamDayEndExclusiveUtc(to.Value);
            query = query.Where(invoice => invoice.CreatedAtUtc < endExclusiveUtc);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var numericTerm = int.TryParse(term.TrimStart('#'), out var parsedId) ? parsedId : (int?)null;
            var matchingMemberIds = dbContext.Members.AsNoTracking()
                .Where(member =>
                    member.FirstName.Contains(term) ||
                    member.LastName.Contains(term) ||
                    (member.Phone != null && member.Phone.Contains(term)) ||
                    (member.Email != null && member.Email.Contains(term)))
                .Select(member => member.Id);

            query = query.Where(invoice =>
                invoice.Number.Contains(term) ||
                invoice.PlanNameSnapshot.Contains(term) ||
                matchingMemberIds.Contains(invoice.MemberId) ||
                (numericTerm.HasValue && invoice.MemberId == numericTerm.Value));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var invoices = await query
            .OrderByDescending(invoice => invoice.CreatedAtUtc)
            .ThenByDescending(invoice => invoice.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        // Enrich the current page with member display info and confirmed paid amounts.
        var memberIds = invoices.Select(invoice => invoice.MemberId).Distinct().ToList();
        var members = await dbContext.Members.AsNoTracking()
            .Where(member => memberIds.Contains(member.Id))
            .Select(member => new { member.Id, member.FirstName, member.LastName, member.Phone, member.Email })
            .ToDictionaryAsync(member => member.Id, cancellationToken);

        var invoiceIds = invoices.Select(invoice => invoice.Id).ToList();
        var paidByInvoice = await dbContext.Payments.AsNoTracking()
            .Where(payment => invoiceIds.Contains(payment.InvoiceId) && payment.Status == PaymentStatus.Confirmed)
            .GroupBy(payment => payment.InvoiceId)
            .Select(group => new { InvoiceId = group.Key, Paid = group.Sum(payment => payment.Amount) })
            .ToDictionaryAsync(item => item.InvoiceId, item => item.Paid, cancellationToken);

        var items = invoices
            .Select(invoice =>
            {
                var paid = paidByInvoice.GetValueOrDefault(invoice.Id, 0m);
                var dto = ToResponse(invoice) with { PaidAmount = paid };
                return members.TryGetValue(invoice.MemberId, out var member)
                    ? dto with
                    {
                        MemberName = $"{member.FirstName} {member.LastName}".Trim(),
                        MemberPhone = member.Phone,
                        MemberEmail = member.Email,
                    }
                    : dto;
            })
            .ToList();

        return new PagedResponse<InvoiceResponse>(page, pageSize, totalCount, items);
    }

    public async Task<InvoiceSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken)
    {
        var pendingInvoices = await dbContext.Invoices.AsNoTracking()
            .Where(i => i.Status == InvoiceStatus.PendingPayment)
            .Select(i => new { i.Id, i.TotalAmount })
            .ToListAsync(cancellationToken);

        var pendingIds = pendingInvoices.Select(i => i.Id).ToList();
        var pendingPaid = pendingIds.Count == 0
            ? 0m
            : await dbContext.Payments.AsNoTracking()
                .Where(p => pendingIds.Contains(p.InvoiceId) && p.Status == PaymentStatus.Confirmed)
                .SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0m;

        var totalPendingValue = pendingInvoices.Sum(i => decimal.Truncate(i.TotalAmount));
        var outstandingDebt = Math.Max(0m, totalPendingValue - pendingPaid);

        var paidCount = await dbContext.Invoices.AsNoTracking()
            .CountAsync(i => i.Status == InvoiceStatus.Paid, cancellationToken);
        var totalCollected = await dbContext.Payments.AsNoTracking()
            .Where(p => p.Status == PaymentStatus.Confirmed)
            .SumAsync(p => (decimal?)p.Amount, cancellationToken) ?? 0m;

        return new InvoiceSummaryResponse(pendingInvoices.Count, paidCount, outstandingDebt, totalCollected);
    }

    public async Task<(InvoiceResponse? Invoice, InvoiceError? Error)> VoidAsync(int id, CancellationToken cancellationToken)
    {
        var invoice = await dbContext.Invoices.SingleOrDefaultAsync(i => i.Id == id, cancellationToken);
        if (invoice is null)
        {
            return (null, InvoiceError.InvoiceNotFound);
        }

        if (invoice.Status != InvoiceStatus.PendingPayment)
        {
            return (null, InvoiceError.InvoiceNotVoidable);
        }

        var hasConfirmedPayments = await dbContext.Payments.AnyAsync(
            p => p.InvoiceId == id && p.Status == PaymentStatus.Confirmed,
            cancellationToken);
        if (hasConfirmedPayments)
        {
            return (null, InvoiceError.InvoiceHasConfirmedPayments);
        }

        // Also reject any unconfirmed pending payments tied to this voided invoice
        var pendingPayments = await dbContext.Payments
            .Where(p => p.InvoiceId == id && p.Status == PaymentStatus.PendingConfirmation)
            .ToListAsync(cancellationToken);
        foreach (var p in pendingPayments)
        {
            p.Status = PaymentStatus.Rejected;
            p.AdjustmentReason = "Hóa đơn đã bị hủy.";
            p.ReviewedAtUtc = DateTime.UtcNow;
            p.Version++;
        }

        invoice.Status = InvoiceStatus.Voided;
        invoice.Version++;
        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(invoice), null);
    }

    private static InvoiceResponse ToResponse(Invoice invoice) => new(
        invoice.Id,
        invoice.Number,
        invoice.MemberId,
        invoice.SubscriptionId,
        invoice.PlanNameSnapshot,
        invoice.PlanDurationDaysSnapshot,
        invoice.TotalAmount,
        invoice.Status,
        invoice.CreatedAtUtc,
        invoice.PaidAtUtc);
}

using System.Data;
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

        if (payment.Amount != invoice.TotalAmount)
        {
            return (null, PaymentError.AmountMismatch);
        }

        var reference = string.IsNullOrWhiteSpace(request.Reference) ? null : request.Reference.Trim();
        if (payment.Method == PaymentMethod.BankTransfer && reference is null)
        {
            return (null, PaymentError.TransferReferenceRequired);
        }

        var subscription = await dbContext.Subscriptions.SingleOrDefaultAsync(
            item => item.Id == invoice.SubscriptionId,
            cancellationToken);
        if (subscription is null || subscription.Status != SubscriptionStatus.PendingPayment)
        {
            return (null, PaymentError.SubscriptionNotPendingPayment);
        }

        var member = await dbContext.Members.SingleOrDefaultAsync(item => item.Id == invoice.MemberId, cancellationToken);
        if (member is null || member.Status != MemberStatus.Active)
        {
            return (null, PaymentError.MemberNotActive);
        }

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
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

        payment.Status = PaymentStatus.Confirmed;
        payment.Reference = reference;
        payment.ReviewedByUserId = reviewedByUserId;
        payment.ReviewedAtUtc = now;
        payment.Version++;
        invoice.Status = InvoiceStatus.Paid;
        invoice.PaidAtUtc = now;
        invoice.Version++;
        subscription.Status = SubscriptionStatus.Active;
        subscription.StartsOn = startDate;
        subscription.EndsOn = startDate.AddDays(invoice.PlanDurationDaysSnapshot - 1);

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

        payment.ReceiptFileId = fileId;
        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(payment), null);
    }

    public async Task<PaymentResponse?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var payment = await dbContext.Payments.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        return payment is null ? null : ToResponse(payment);
    }

    public async Task<PagedResponse<PaymentResponse>> SearchAsync(
        int? invoiceId,
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

        var totalCount = await query.CountAsync(cancellationToken);
        var payments = await query
            .OrderByDescending(payment => payment.CreatedAtUtc)
            .ThenByDescending(payment => payment.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(payment => ToResponse(payment))
            .ToListAsync(cancellationToken);

        return new PagedResponse<PaymentResponse>(page, pageSize, totalCount, payments);
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
        payment.ReceiptFileId);
}

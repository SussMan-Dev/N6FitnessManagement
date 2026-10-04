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
        return invoice is null ? null : ToResponse(invoice);
    }

    public async Task<PagedResponse<InvoiceResponse>> SearchAsync(
        int? memberId,
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

        var totalCount = await query.CountAsync(cancellationToken);
        var invoices = await query
            .OrderByDescending(invoice => invoice.CreatedAtUtc)
            .ThenByDescending(invoice => invoice.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(invoice => ToResponse(invoice))
            .ToListAsync(cancellationToken);

        return new PagedResponse<InvoiceResponse>(page, pageSize, totalCount, invoices);
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

using GymManagement.Api.Data;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Subscriptions;
using GymManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Services;

public sealed class SubscriptionService(GymDbContext dbContext) : ISubscriptionService
{
    public async Task<(SubscriptionResponse? Subscription, SubscriptionError? Error)> CreateAsync(
        CreateSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        var member = await dbContext.Members.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == request.MemberId, cancellationToken);
        if (member is null)
        {
            return (null, SubscriptionError.MemberNotFound);
        }

        if (member.Status != MemberStatus.Active)
        {
            return (null, SubscriptionError.MemberNotActive);
        }

        var plan = await dbContext.MembershipPlans.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == request.MembershipPlanId, cancellationToken);
        if (plan is null)
        {
            return (null, SubscriptionError.PlanNotFound);
        }

        if (!plan.IsActive)
        {
            return (null, SubscriptionError.PlanNotActive);
        }

        var subscription = new Subscription
        {
            MemberId = member.Id,
            MembershipPlanId = plan.Id,
            CreatedAtUtc = DateTime.UtcNow,
            Status = SubscriptionStatus.PendingPayment
        };

        dbContext.Subscriptions.Add(subscription);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(subscription), null);
    }

    public async Task<PagedResponse<SubscriptionResponse>> GetByMemberAsync(
        int memberId,
        SubscriptionStatus? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Subscriptions.AsNoTracking().Where(item => item.MemberId == memberId);
        if (status.HasValue)
        {
            query = query.Where(item => item.Status == status.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var subscriptions = await query
            .OrderByDescending(item => item.CreatedAtUtc)
            .ThenByDescending(item => item.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => ToResponse(item))
            .ToListAsync(cancellationToken);

        return new PagedResponse<SubscriptionResponse>(page, pageSize, totalCount, subscriptions);
    }

    public async Task<(SubscriptionResponse? Subscription, SubscriptionError? Error)> RenewAsync(
        int subscriptionId,
        CancellationToken cancellationToken)
    {
        var previous = await dbContext.Subscriptions.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == subscriptionId, cancellationToken);
        if (previous is null)
        {
            return (null, SubscriptionError.SubscriptionNotFound);
        }

        if (previous.Status is not (SubscriptionStatus.Active or SubscriptionStatus.Expired))
        {
            return (null, SubscriptionError.SubscriptionNotRenewable);
        }

        if (await dbContext.Subscriptions.AnyAsync(
                item => item.RenewedFromSubscriptionId == previous.Id &&
                        item.Status == SubscriptionStatus.PendingPayment,
                cancellationToken))
        {
            return (null, SubscriptionError.PendingRenewalExists);
        }

        var member = await dbContext.Members.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == previous.MemberId, cancellationToken);
        if (member is null)
        {
            return (null, SubscriptionError.MemberNotFound);
        }

        if (member.Status != MemberStatus.Active)
        {
            return (null, SubscriptionError.MemberNotActive);
        }

        var plan = await dbContext.MembershipPlans.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == previous.MembershipPlanId, cancellationToken);
        if (plan is null)
        {
            return (null, SubscriptionError.PlanNotFound);
        }

        if (!plan.IsActive)
        {
            return (null, SubscriptionError.PlanNotActive);
        }

        var renewal = new Subscription
        {
            MemberId = previous.MemberId,
            MembershipPlanId = previous.MembershipPlanId,
            RenewedFromSubscriptionId = previous.Id,
            CreatedAtUtc = DateTime.UtcNow,
            Status = SubscriptionStatus.PendingPayment
        };

        dbContext.Subscriptions.Add(renewal);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(renewal), null);
    }

    public async Task<(SubscriptionResponse? Subscription, SubscriptionError? Error)> CancelAsync(
        int subscriptionId,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        var subscription = await dbContext.Subscriptions.SingleOrDefaultAsync(item => item.Id == subscriptionId, cancellationToken);
        if (subscription is null)
        {
            return (null, SubscriptionError.SubscriptionNotFound);
        }

        if (subscription.Status is not (SubscriptionStatus.PendingPayment or SubscriptionStatus.Active))
        {
            return (null, SubscriptionError.SubscriptionNotCancellable);
        }

        var linkedInvoices = await dbContext.Invoices
            .Where(i => i.SubscriptionId == subscriptionId && i.Status == InvoiceStatus.PendingPayment)
            .ToListAsync(cancellationToken);

        if (linkedInvoices.Count > 0)
        {
            var linkedInvoiceIds = linkedInvoices.Select(i => i.Id).ToList();
            var invoiceIdsWithConfirmedPayments = await dbContext.Payments
                .Where(p => linkedInvoiceIds.Contains(p.InvoiceId) && p.Status == PaymentStatus.Confirmed)
                .Select(p => p.InvoiceId)
                .Distinct()
                .ToListAsync(cancellationToken);

            if (subscription.Status == SubscriptionStatus.PendingPayment && invoiceIdsWithConfirmedPayments.Count > 0)
            {
                return (null, SubscriptionError.SubscriptionHasConfirmedPayments);
            }

            foreach (var inv in linkedInvoices)
            {
                if (!invoiceIdsWithConfirmedPayments.Contains(inv.Id))
                {
                    inv.Status = InvoiceStatus.Voided;
                    inv.Version++;
                }
            }
        }

        subscription.Status = SubscriptionStatus.Cancelled;
        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(subscription), null);
    }

    public async Task<(SubscriptionResponse? Subscription, SubscriptionError? Error)> FreezeAsync(
        int subscriptionId,
        int days,
        CancellationToken cancellationToken)
    {
        var subscription = await dbContext.Subscriptions.SingleOrDefaultAsync(item => item.Id == subscriptionId, cancellationToken);
        if (subscription is null)
        {
            return (null, SubscriptionError.SubscriptionNotFound);
        }

        if (subscription.Status != SubscriptionStatus.Active || !subscription.EndsOn.HasValue)
        {
            return (null, SubscriptionError.SubscriptionNotActive);
        }

        subscription.EndsOn = subscription.EndsOn.Value.AddDays(Math.Clamp(days, 1, 90));
        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(subscription), null);
    }

    private static SubscriptionResponse ToResponse(Subscription subscription) => new(
        subscription.Id,
        subscription.MemberId,
        subscription.MembershipPlanId,
        subscription.RenewedFromSubscriptionId,
        subscription.StartsOn,
        subscription.EndsOn,
        subscription.CreatedAtUtc,
        subscription.Status);
}

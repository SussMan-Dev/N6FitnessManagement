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
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Subscriptions.AsNoTracking().Where(item => item.MemberId == memberId);
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

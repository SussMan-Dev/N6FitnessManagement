using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Subscriptions;

namespace GymManagement.Api.Services;

public interface ISubscriptionService
{
    Task<(SubscriptionResponse? Subscription, SubscriptionError? Error)> CreateAsync(
        CreateSubscriptionRequest request,
        CancellationToken cancellationToken);

    Task<PagedResponse<SubscriptionResponse>> GetByMemberAsync(
        int memberId,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<(SubscriptionResponse? Subscription, SubscriptionError? Error)> RenewAsync(
        int subscriptionId,
        CancellationToken cancellationToken);
}

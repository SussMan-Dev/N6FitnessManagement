using System.ComponentModel.DataAnnotations;
using GymManagement.Api.Models;

namespace GymManagement.Api.DTOs.Subscriptions;

public sealed class CreateSubscriptionRequest
{
    [Range(1, int.MaxValue)]
    public int MemberId { get; init; }

    [Range(1, int.MaxValue)]
    public int MembershipPlanId { get; init; }
}

public sealed record SubscriptionResponse(
    int Id,
    int MemberId,
    int MembershipPlanId,
    int? RenewedFromSubscriptionId,
    DateOnly? StartsOn,
    DateOnly? EndsOn,
    DateTime CreatedAtUtc,
    SubscriptionStatus Status);

public enum SubscriptionError
{
    MemberNotFound,
    MemberNotActive,
    PlanNotFound,
    PlanNotActive,
    SubscriptionNotFound,
    SubscriptionNotRenewable,
    PendingRenewalExists
}

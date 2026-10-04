namespace GymManagement.Api.Models;

public sealed class Subscription
{
    public int Id { get; set; }

    public int MemberId { get; set; }

    public int MembershipPlanId { get; set; }

    public int? RenewedFromSubscriptionId { get; set; }

    public DateOnly? StartsOn { get; set; }

    public DateOnly? EndsOn { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public SubscriptionStatus Status { get; set; }
}

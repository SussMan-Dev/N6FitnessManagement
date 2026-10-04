namespace GymManagement.Api.Models;

public sealed class Invoice
{
    public int Id { get; set; }

    public required string Number { get; set; }

    public int MemberId { get; set; }

    public int SubscriptionId { get; set; }

    public required string PlanNameSnapshot { get; set; }

    public int PlanDurationDaysSnapshot { get; set; }

    public decimal TotalAmount { get; set; }

    public InvoiceStatus Status { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public int CreatedByUserId { get; set; }

    public DateTime? PaidAtUtc { get; set; }

    public int Version { get; set; }
}

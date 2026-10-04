namespace GymManagement.Api.Models;

public sealed class Payment
{
    public int Id { get; set; }

    public int InvoiceId { get; set; }

    public decimal Amount { get; set; }

    public PaymentMethod Method { get; set; }

    public PaymentStatus Status { get; set; }

    public string? Reference { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public int CreatedByUserId { get; set; }

    public int? ReviewedByUserId { get; set; }

    public DateTime? ReviewedAtUtc { get; set; }

    public string? AdjustmentReason { get; set; }

    public int Version { get; set; }
}

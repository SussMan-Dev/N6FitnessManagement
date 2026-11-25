using System.ComponentModel.DataAnnotations;
using GymManagement.Api.Models;

namespace GymManagement.Api.DTOs.Invoices;

public sealed class CreateInvoiceRequest
{
    [Range(1, int.MaxValue)]
    public int SubscriptionId { get; init; }
}

public sealed record InvoiceResponse(
    int Id,
    string Number,
    int MemberId,
    int SubscriptionId,
    string PlanNameSnapshot,
    int PlanDurationDaysSnapshot,
    decimal TotalAmount,
    InvoiceStatus Status,
    DateTime CreatedAtUtc,
    DateTime? PaidAtUtc,
    string? MemberName = null,
    string? MemberPhone = null,
    string? MemberEmail = null,
    decimal PaidAmount = 0m);

public sealed record InvoiceSummaryResponse(
    int PendingCount,
    int PaidCount,
    decimal TotalOutstandingDebt,
    decimal TotalCollected);

public enum InvoiceError
{
    InvoiceNotFound,
    MemberNotFound,
    MemberNotActive,
    SubscriptionNotFound,
    SubscriptionNotPendingPayment,
    PlanNotFound,
    PlanNotActive,
    InvoiceAlreadyExists,
    InvoiceNotVoidable,
    InvoiceHasConfirmedPayments
}

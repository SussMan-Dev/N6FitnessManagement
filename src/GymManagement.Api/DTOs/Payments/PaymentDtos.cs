using System.ComponentModel.DataAnnotations;
using GymManagement.Api.Models;

namespace GymManagement.Api.DTOs.Payments;

public sealed class CreatePaymentRequest
{
    [Range(typeof(decimal), "0.01", "99999999.99")]
    public decimal Amount { get; init; }

    [EnumDataType(typeof(PaymentMethod))]
    public PaymentMethod Method { get; init; }

    public int? ReceiptFileId { get; init; }
}

public sealed class ConfirmPaymentRequest
{
    [StringLength(100)]
    public string? Reference { get; init; }

    /// <summary>
    /// Allows activating the linked PendingPayment subscription immediately on a partial payment
    /// (deposit / installment) while keeping the invoice in PendingPayment until 100% collected.
    /// </summary>
    public bool ActivateSubscriptionNow { get; init; }
}

public sealed class RejectPaymentRequest
{
    [Required, StringLength(500, MinimumLength = 3)]
    public required string Reason { get; init; }
}

public sealed record PaymentResponse(
    int Id,
    int InvoiceId,
    decimal Amount,
    PaymentMethod Method,
    PaymentStatus Status,
    string? Reference,
    DateTime CreatedAtUtc,
    int CreatedByUserId,
    int? ReviewedByUserId,
    DateTime? ReviewedAtUtc,
    string? AdjustmentReason,
    int? ReceiptFileId = null,
    IReadOnlyList<int>? ReceiptFileIds = null,
    string? InvoiceNumber = null,
    string? MemberName = null,
    string? MemberPhone = null,
    string? CreatedByName = null,
    string? ReviewedByName = null);

public enum PaymentError
{
    InvoiceNotFound,
    InvoiceNotPayable,
    PaymentNotFound,
    PaymentNotPending,
    AmountMismatch,
    TransferReferenceRequired,
    MemberNotActive,
    SubscriptionNotPendingPayment,
    ConcurrentUpdate,
    FileNotFound,
    InvalidFileFormat,
    FileTooLarge
}

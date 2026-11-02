using System.ComponentModel.DataAnnotations;
using GymManagement.Api.Models;

namespace GymManagement.Api.DTOs.Portal;

public sealed record PortalPlanItemResponse(
    int Id,
    string Name,
    string? Description,
    decimal Price,
    int DurationDays,
    IReadOnlyList<string> Highlights);

public sealed class PortalRegistrationRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string FirstName { get; init; }

    [Required, StringLength(100, MinimumLength = 1)]
    public required string LastName { get; init; }

    [Required, EmailAddress, StringLength(254)]
    public required string Email { get; init; }

    [Required, Phone, StringLength(30)]
    public required string Phone { get; init; }

    public DateOnly? BirthDate { get; init; }

    [Range(1, int.MaxValue)]
    public int MembershipPlanId { get; init; }

    public DateOnly? StartsOn { get; init; }

    public PaymentMethod PaymentMethod { get; init; } = PaymentMethod.BankTransfer;

    [StringLength(300)]
    public string? Note { get; init; }
}

public sealed record PortalRegistrationResponse(
    string InvoiceNumber,
    int InvoiceId,
    int MemberId,
    string FullName,
    string Email,
    string Phone,
    int PlanId,
    string PlanName,
    decimal Price,
    int DurationDays,
    DateOnly StartsOn,
    DateOnly EndsOn,
    string PaymentMethod,
    string BankName,
    string BankAccountNumber,
    string BankAccountName,
    string TransferContent,
    string QrCodeUrl,
    DateTime CreatedAtUtc);

public sealed record PortalMemberSubscriptionItem(
    int SubscriptionId,
    string PlanName,
    DateOnly? StartsOn,
    DateOnly? EndsOn,
    SubscriptionStatus Status,
    DateTime CreatedAtUtc);

public sealed record PortalMemberInvoiceItem(
    int InvoiceId,
    string Number,
    string PlanNameSnapshot,
    decimal TotalAmount,
    InvoiceStatus Status,
    DateTime CreatedAtUtc);

public sealed record PortalLookupResponse(
    int MemberId,
    string FullName,
    string? Email,
    string? Phone,
    MemberStatus Status,
    IReadOnlyList<PortalMemberSubscriptionItem> Subscriptions,
    IReadOnlyList<PortalMemberInvoiceItem> Invoices);


using System.ComponentModel.DataAnnotations;

namespace GymManagement.Api.DTOs.MembershipPlans;

public sealed class CreateMembershipPlanRequest : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Name { get; init; }

    [StringLength(500)]
    public string? Description { get; init; }

    [Range(typeof(decimal), "1", "99999999")]
    public decimal Price { get; init; }

    [Range(1, 3650)]
    public int DurationDays { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Price != decimal.Truncate(Price))
        {
            yield return new ValidationResult(
                "Giá gói tập phải là số nguyên (không chứa phần thập phân).",
                [nameof(Price)]);
        }
    }
}

public sealed class UpdateMembershipPlanRequest : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Name { get; init; }

    [StringLength(500)]
    public string? Description { get; init; }

    [Range(typeof(decimal), "1", "99999999")]
    public decimal Price { get; init; }

    [Range(1, 3650)]
    public int DurationDays { get; init; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Price != decimal.Truncate(Price))
        {
            yield return new ValidationResult(
                "Giá gói tập phải là số nguyên (không chứa phần thập phân).",
                [nameof(Price)]);
        }
    }
}

public sealed class UpdateMembershipPlanStatusRequest
{
    public bool IsActive { get; init; }
}

public sealed record MembershipPlanResponse(
    int Id,
    string Name,
    string? Description,
    decimal Price,
    int DurationDays,
    bool IsActive);

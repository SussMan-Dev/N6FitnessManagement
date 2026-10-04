using System.ComponentModel.DataAnnotations;

namespace GymManagement.Api.DTOs.MembershipPlans;

public sealed class CreateMembershipPlanRequest
{
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Name { get; init; }

    [StringLength(500)]
    public string? Description { get; init; }

    [Range(typeof(decimal), "0.01", "99999999.99")]
    public decimal Price { get; init; }

    [Range(1, 3650)]
    public int DurationDays { get; init; }
}

public sealed class UpdateMembershipPlanRequest
{
    [Required, StringLength(120, MinimumLength = 1)]
    public required string Name { get; init; }

    [StringLength(500)]
    public string? Description { get; init; }

    [Range(typeof(decimal), "0.01", "99999999.99")]
    public decimal Price { get; init; }

    [Range(1, 3650)]
    public int DurationDays { get; init; }
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

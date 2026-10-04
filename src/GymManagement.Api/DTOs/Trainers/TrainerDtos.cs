using System.ComponentModel.DataAnnotations;

namespace GymManagement.Api.DTOs.Trainers;

public sealed class CreateTrainerRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string FirstName { get; init; }

    [Required, StringLength(100, MinimumLength = 1)]
    public required string LastName { get; init; }

    [EmailAddress, StringLength(254)]
    public string? Email { get; init; }

    [StringLength(30)]
    public string? Phone { get; init; }

    [StringLength(120)]
    public string? Specialty { get; init; }
}

public sealed class UpdateTrainerRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string FirstName { get; init; }

    [Required, StringLength(100, MinimumLength = 1)]
    public required string LastName { get; init; }

    [EmailAddress, StringLength(254)]
    public string? Email { get; init; }

    [StringLength(30)]
    public string? Phone { get; init; }

    [StringLength(120)]
    public string? Specialty { get; init; }
}

public sealed class UpdateTrainerStatusRequest
{
    public bool IsActive { get; init; }
}

public sealed record TrainerResponse(
    int Id,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    string? Specialty,
    bool IsActive);
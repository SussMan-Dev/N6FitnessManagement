using System.ComponentModel.DataAnnotations;
using GymManagement.Api.Models;

namespace GymManagement.Api.DTOs.Members;

public sealed class CreateMemberRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string FirstName { get; init; }

    [Required, StringLength(100, MinimumLength = 1)]
    public required string LastName { get; init; }

    [EmailAddress, StringLength(254)]
    public string? Email { get; init; }

    [StringLength(30)]
    public string? Phone { get; init; }

    public DateOnly? BirthDate { get; init; }
}

public sealed class UpdateMemberRequest
{
    [Required, StringLength(100, MinimumLength = 1)]
    public required string FirstName { get; init; }

    [Required, StringLength(100, MinimumLength = 1)]
    public required string LastName { get; init; }

    [EmailAddress, StringLength(254)]
    public string? Email { get; init; }

    [StringLength(30)]
    public string? Phone { get; init; }

    public DateOnly? BirthDate { get; init; }
}

public sealed class UpdateMemberStatusRequest
{
    [EnumDataType(typeof(MemberStatus))]
    public MemberStatus Status { get; init; }
}

public sealed record MemberResponse(
    int Id,
    string FirstName,
    string LastName,
    string? Email,
    string? Phone,
    DateOnly? BirthDate,
    DateTime JoinedAtUtc,
    MemberStatus Status);

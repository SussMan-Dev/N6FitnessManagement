using System.ComponentModel.DataAnnotations;

namespace GymManagement.Api.DTOs.Auth;

public sealed class LoginRequest
{
    [Required, EmailAddress, StringLength(254)]
    public required string Email { get; init; }

    [Required, StringLength(128, MinimumLength = 12)]
    public required string Password { get; init; }
}

public sealed class CreateStaffRequest
{
    [Required, EmailAddress, StringLength(254)]
    public required string Email { get; init; }

    [Required, StringLength(120, MinimumLength = 1)]
    public required string DisplayName { get; init; }

    [Required, StringLength(128, MinimumLength = 12)]
    public required string Password { get; init; }
}

public sealed record LoginResponse(string AccessToken, DateTime ExpiresAtUtc, string Email, IReadOnlyList<string> Roles);

public sealed record StaffResponse(int Id, string Email, string DisplayName, IReadOnlyList<string> Roles);

namespace GymManagement.Api.Models;

public sealed class Member
{
    public int Id { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public DateOnly? BirthDate { get; set; }

    public DateTime JoinedAtUtc { get; set; }

    public MemberStatus Status { get; set; }
}

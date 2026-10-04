namespace GymManagement.Api.Models;

public sealed class MembershipPlan
{
    public int Id { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public int DurationDays { get; set; }

    public bool IsActive { get; set; }
}

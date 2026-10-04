namespace GymManagement.Api.Models;

public sealed class Trainer
{
    public int Id { get; set; }

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Specialty { get; set; }

    public bool IsActive { get; set; }
}

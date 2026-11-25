namespace GymManagement.Api.Models;

public sealed class AuditLog
{
    public int Id { get; set; }

    public required string Action { get; set; }

    public required string EntityType { get; set; }

    public int? EntityId { get; set; }

    public required string Summary { get; set; }

    public string? Details { get; set; }

    public int? ActorUserId { get; set; }

    public required string ActorName { get; set; }

    public string? ActorEmail { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}

namespace GymManagement.Api.DTOs.AuditLogs;

public sealed record AuditLogResponse(
    int Id,
    string Action,
    string EntityType,
    int? EntityId,
    string Summary,
    string? Details,
    int? ActorUserId,
    string ActorName,
    string? ActorEmail,
    DateTime CreatedAtUtc);

public sealed record AuditActorOption(
    int Id,
    string Name,
    string? Email);

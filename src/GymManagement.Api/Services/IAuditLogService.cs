using System.Security.Claims;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.AuditLogs;

namespace GymManagement.Api.Services;

public interface IAuditLogService
{
    Task LogAsync(
        string action,
        string entityType,
        int? entityId,
        string summary,
        string? details = null,
        ClaimsPrincipal? actor = null,
        CancellationToken cancellationToken = default);

    Task LogExplicitAsync(
        string action,
        string entityType,
        int? entityId,
        string summary,
        string? details,
        int? actorUserId,
        string actorName,
        string? actorEmail,
        CancellationToken cancellationToken = default);

    Task<PagedResponse<AuditLogResponse>> SearchAsync(
        string? search,
        string? entityType,
        string? action,
        int? actorUserId,
        int? memberId,
        DateOnly? from,
        DateOnly? to,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AuditActorOption>> GetActorsAsync(CancellationToken cancellationToken = default);
}

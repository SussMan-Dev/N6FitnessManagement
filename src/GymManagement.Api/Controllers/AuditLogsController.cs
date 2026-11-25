using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.AuditLogs;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/audit-logs")]
public sealed class AuditLogsController(IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<AuditLogResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<AuditLogResponse>>> Search(
        [FromQuery] string? search,
        [FromQuery] string? entityType,
        [FromQuery] string? action,
        [FromQuery] int? actorUserId,
        [FromQuery] int? memberId,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await auditLogService.SearchAsync(search, entityType, action, actorUserId, memberId, from, to, page, pageSize, cancellationToken));
    }

    [HttpGet("actors")]
    [ProducesResponseType(typeof(IReadOnlyList<AuditActorOption>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AuditActorOption>>> GetActors(CancellationToken cancellationToken = default)
    {
        return Ok(await auditLogService.GetActorsAsync(cancellationToken));
    }
}

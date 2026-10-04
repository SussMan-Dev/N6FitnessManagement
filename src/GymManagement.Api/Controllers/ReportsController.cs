using GymManagement.Api.DTOs.Reports;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/reports")]
public sealed class ReportsController(IReportService reportService) : ControllerBase
{
    [HttpGet("revenue")]
    [ProducesResponseType(typeof(RevenueReportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<RevenueReportResponse>> Revenue(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        if (!TryGetRange(from, to, out var start, out var end))
        {
            return BadRequest(new ProblemDetails { Title = "The date range is invalid." });
        }

        return Ok(await reportService.GetRevenueAsync(start, end, cancellationToken));
    }

    [HttpGet("members")]
    [ProducesResponseType(typeof(MemberReportResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<MemberReportResponse>> Members(CancellationToken cancellationToken)
    {
        return Ok(await reportService.GetMembersAsync(cancellationToken));
    }

    [HttpGet("check-ins")]
    [ProducesResponseType(typeof(CheckInReportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CheckInReportResponse>> CheckIns(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        if (!TryGetRange(from, to, out var start, out var end))
        {
            return BadRequest(new ProblemDetails { Title = "The date range is invalid." });
        }

        return Ok(await reportService.GetCheckInsAsync(start, end, cancellationToken));
    }

    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(DashboardReportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DashboardReportResponse>> Dashboard(
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        CancellationToken cancellationToken)
    {
        if (!TryGetRange(from, to, out var start, out var end))
        {
            return BadRequest(new ProblemDetails { Title = "The date range is invalid." });
        }

        return Ok(await reportService.GetDashboardAsync(start, end, cancellationToken));
    }

    private static bool TryGetRange(DateOnly? from, DateOnly? to, out DateOnly start, out DateOnly end)
    {
        end = to ?? DateOnly.FromDateTime(DateTime.UtcNow);
        start = from ?? end.AddDays(-29);
        return start <= end;
    }
}
using System.Security.Claims;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.CheckIns;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/check-ins")]
public sealed class CheckInsController(ICheckInService checkInService, IMemberService memberService) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(CheckInResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CheckInResponse>> Create(
        CreateCheckInRequest request,
        CancellationToken cancellationToken)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var actorId))
        {
            return Forbid();
        }

        var result = await checkInService.CreateAsync(request.MemberId, actorId, cancellationToken);
        if (result.Error is not null)
        {
            return result.Error == CheckInError.MemberNotFound
                ? NotFound(new ProblemDetails { Title = result.Error.ToString() })
                : Conflict(new ProblemDetails { Title = result.Error.ToString() });
        }

        return CreatedAtAction(
            nameof(GetByMember),
            new { memberId = result.CheckIn!.MemberId },
            result.CheckIn);
    }

    [HttpGet("~/api/members/{memberId:int}/check-ins")]
    [ProducesResponseType(typeof(PagedResponse<CheckInResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<CheckInResponse>>> GetByMember(
        int memberId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (await memberService.GetByIdAsync(memberId, cancellationToken) is null)
        {
            return NotFound();
        }

        return Ok(await checkInService.GetByMemberAsync(memberId, page, pageSize, cancellationToken));
    }
}
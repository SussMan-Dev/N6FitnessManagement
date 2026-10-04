using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Members;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/members")]
public sealed class MembersController(IMemberService memberService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<MemberResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<MemberResponse>>> Search(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await memberService.SearchAsync(search, page, pageSize, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(MemberResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MemberResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var member = await memberService.GetByIdAsync(id, cancellationToken);
        return member is null ? NotFound() : Ok(member);
    }

    [HttpPost]
    [ProducesResponseType(typeof(MemberResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MemberResponse>> Create(
        CreateMemberRequest request,
        CancellationToken cancellationToken)
    {
        var result = await memberService.CreateAsync(request, cancellationToken);
        if (result.EmailConflict)
        {
            return Conflict(new ProblemDetails { Title = "Email is already in use." });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Member!.Id }, result.Member);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(MemberResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MemberResponse>> Update(
        int id,
        UpdateMemberRequest request,
        CancellationToken cancellationToken)
    {
        var result = await memberService.UpdateAsync(id, request, cancellationToken);
        if (result.EmailConflict)
        {
            return Conflict(new ProblemDetails { Title = "Email is already in use." });
        }

        return result.Member is null ? NotFound() : Ok(result.Member);
    }

    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(
        int id,
        UpdateMemberStatusRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await memberService.UpdateStatusAsync(id, request.Status, cancellationToken);
        return updated ? NoContent() : NotFound();
    }
}

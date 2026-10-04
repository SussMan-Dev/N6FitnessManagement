using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.MembershipPlans;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/membership-plans")]
public sealed class MembershipPlansController(IMembershipPlanService planService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<MembershipPlanResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<MembershipPlanResponse>>> Search(
        [FromQuery] string? search,
        [FromQuery] bool includeInactive = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await planService.SearchAsync(search, includeInactive, page, pageSize, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(MembershipPlanResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MembershipPlanResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var plan = await planService.GetByIdAsync(id, cancellationToken);
        return plan is null ? NotFound() : Ok(plan);
    }

    [HttpPost]
    [ProducesResponseType(typeof(MembershipPlanResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<MembershipPlanResponse>> Create(
        CreateMembershipPlanRequest request,
        CancellationToken cancellationToken)
    {
        var plan = await planService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = plan.Id }, plan);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(MembershipPlanResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MembershipPlanResponse>> Update(
        int id,
        UpdateMembershipPlanRequest request,
        CancellationToken cancellationToken)
    {
        var plan = await planService.UpdateAsync(id, request, cancellationToken);
        return plan is null ? NotFound() : Ok(plan);
    }

    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(
        int id,
        UpdateMembershipPlanStatusRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await planService.UpdateStatusAsync(id, request.IsActive, cancellationToken);
        return updated ? NoContent() : NotFound();
    }
}

using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.MembershipPlans;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/membership-plans")]
public sealed class MembershipPlansController(
    IMembershipPlanService planService,
    IAuditLogService auditLogService) : ControllerBase
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
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(MembershipPlanResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<MembershipPlanResponse>> Create(
        CreateMembershipPlanRequest request,
        CancellationToken cancellationToken)
    {
        var plan = await planService.CreateAsync(request, cancellationToken);
        await auditLogService.LogAsync(
            "Plan.Create",
            "MembershipPlan",
            plan.Id,
            $"Tạo gói tập {plan.Name} ({plan.Price:N0}đ / {plan.DurationDays} ngày)",
            null,
            User,
            cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = plan.Id }, plan);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(MembershipPlanResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MembershipPlanResponse>> Update(
        int id,
        UpdateMembershipPlanRequest request,
        CancellationToken cancellationToken)
    {
        var plan = await planService.UpdateAsync(id, request, cancellationToken);
        if (plan is null)
        {
            return NotFound();
        }

        await auditLogService.LogAsync(
            "Plan.Update",
            "MembershipPlan",
            id,
            $"Cập nhật gói tập {plan.Name} ({plan.Price:N0}đ / {plan.DurationDays} ngày)",
            null,
            User,
            cancellationToken);

        return Ok(plan);
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(
        int id,
        UpdateMembershipPlanStatusRequest request,
        CancellationToken cancellationToken)
    {
        var existing = await planService.GetByIdAsync(id, cancellationToken);
        var updated = await planService.UpdateStatusAsync(id, request.IsActive, cancellationToken);
        if (!updated)
        {
            return NotFound();
        }

        var planName = existing?.Name ?? $"#{id}";
        await auditLogService.LogAsync(
            "Plan.UpdateStatus",
            "MembershipPlan",
            id,
            request.IsActive ? $"Kích hoạt lại gói tập {planName}" : $"Tạm ngừng gói tập {planName}",
            existing is null ? null : $"Giá: {existing.Price:N0}đ / {existing.DurationDays} ngày",
            User,
            cancellationToken);

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var existing = await planService.GetByIdAsync(id, cancellationToken);
        var (deleted, hasRelatedRecords) = await planService.DeleteAsync(id, cancellationToken);
        if (hasRelatedRecords)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Không thể xóa gói tập đã có hội viên đăng ký. Vui lòng chuyển sang Tạm ngừng."
            });
        }

        if (!deleted)
        {
            return NotFound();
        }

        var planName = existing?.Name ?? $"#{id}";
        await auditLogService.LogAsync(
            "Plan.Delete",
            "MembershipPlan",
            id,
            $"Xóa gói tập {planName}",
            existing is null ? null : $"Giá: {existing.Price:N0}đ / {existing.DurationDays} ngày",
            User,
            cancellationToken);

        return NoContent();
    }
}

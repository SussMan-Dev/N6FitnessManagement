using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Members;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
// Authorization: both Admin and Staff tokens may use member operations.
[Authorize(Roles = "Admin,Staff")]
[Route("api/members")]
public sealed class MembersController(
    IMemberService memberService,
    IAuditLogService auditLogService) : ControllerBase
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
            return Conflict(new ProblemDetails { Title = "Email này đã được sử dụng bởi hội viên khác." });
        }

        if (result.PhoneConflict)
        {
            return Conflict(new ProblemDetails { Title = "Số điện thoại này đã được sử dụng bởi hội viên khác." });
        }

        await auditLogService.LogAsync(
            "Member.Create",
            "Member",
            result.Member!.Id,
            $"Thêm hội viên {result.Member.FirstName} {result.Member.LastName}".Trim(),
            $"SĐT: {result.Member.Phone ?? "—"} · Email: {result.Member.Email ?? "—"}",
            User,
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = result.Member.Id }, result.Member);
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
            return Conflict(new ProblemDetails { Title = "Email này đã được sử dụng bởi hội viên khác." });
        }

        if (result.PhoneConflict)
        {
            return Conflict(new ProblemDetails { Title = "Số điện thoại này đã được sử dụng bởi hội viên khác." });
        }

        if (result.Member is null)
        {
            return NotFound();
        }

        await auditLogService.LogAsync(
            "Member.Update",
            "Member",
            id,
            $"Cập nhật hội viên {result.Member.FirstName} {result.Member.LastName}".Trim(),
            $"SĐT: {result.Member.Phone ?? "—"} · Trạng thái: {result.Member.Status}",
            User,
            cancellationToken);

        return Ok(result.Member);
    }

    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(
        int id,
        UpdateMemberStatusRequest request,
        CancellationToken cancellationToken)
    {
        var existing = await memberService.GetByIdAsync(id, cancellationToken);
        var updated = await memberService.UpdateStatusAsync(id, request.Status, cancellationToken);
        if (!updated)
        {
            return NotFound();
        }

        var memberLabel = existing is null
            ? $"#{id}"
            : $"{existing.FirstName} {existing.LastName}".Trim() + (string.IsNullOrWhiteSpace(existing.Phone) ? "" : $" ({existing.Phone})");
        var statusLabel = request.Status == Models.MemberStatus.Active ? "Đang hoạt động" : "Tạm ngừng";
        await auditLogService.LogAsync(
            "Member.UpdateStatus",
            "Member",
            id,
            $"Đổi trạng thái hội viên {memberLabel} sang {statusLabel}",
            $"MemberId={id}",
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
        var existing = await memberService.GetByIdAsync(id, cancellationToken);
        var (deleted, hasRelatedRecords) = await memberService.DeleteAsync(id, cancellationToken);
        if (hasRelatedRecords)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Không thể xóa hội viên đang có gói tập hoạt động hoặc chờ thanh toán. Vui lòng hủy gói tập trước khi xóa."
            });
        }

        if (!deleted)
        {
            return NotFound();
        }

        var memberLabel = existing is null
            ? $"#{id}"
            : $"{existing.FirstName} {existing.LastName}".Trim() + (string.IsNullOrWhiteSpace(existing.Phone) ? "" : $" ({existing.Phone})");
        await auditLogService.LogAsync(
            "Member.Delete",
            "Member",
            id,
            $"Xóa hồ sơ hội viên {memberLabel}",
            $"MemberId={id}" + (string.IsNullOrWhiteSpace(existing?.Email) ? "" : $" · Email: {existing.Email}"),
            User,
            cancellationToken);

        return NoContent();
    }
}

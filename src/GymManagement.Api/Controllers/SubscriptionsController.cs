using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Members;
using GymManagement.Api.DTOs.Subscriptions;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/subscriptions")]
public sealed class SubscriptionsController(
    ISubscriptionService subscriptionService,
    IMemberService memberService,
    IMembershipPlanService planService,
    IAuditLogService auditLogService) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(SubscriptionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SubscriptionResponse>> Create(
        CreateSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await subscriptionService.CreateAsync(request, cancellationToken);
        if (result.Error is not null)
        {
            return ToErrorResult(result.Error.Value);
        }

        var (memberLabel, planLabel) = await ResolveLabelsAsync(result.Subscription!.MemberId, result.Subscription.MembershipPlanId, cancellationToken);
        await auditLogService.LogAsync(
            "Subscription.Create",
            "Subscription",
            result.Subscription.Id,
            $"Đăng ký gói {planLabel} (#SUB-{result.Subscription.Id:D4}) cho hội viên {memberLabel}",
            $"MemberId={result.Subscription.MemberId} · Gói: {planLabel}",
            User,
            cancellationToken);

        return CreatedAtAction(
            nameof(GetByMember),
            new { memberId = result.Subscription.MemberId },
            result.Subscription);
    }

    [HttpGet("~/api/members/{memberId:int}/subscriptions")]
    [ProducesResponseType(typeof(PagedResponse<SubscriptionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<SubscriptionResponse>>> GetByMember(
        int memberId,
        [FromQuery] GymManagement.Api.Models.SubscriptionStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        MemberResponse? member = await memberService.GetByIdAsync(memberId, cancellationToken);
        if (member is null)
        {
            return NotFound();
        }

        return Ok(await subscriptionService.GetByMemberAsync(memberId, status, page, pageSize, cancellationToken));
    }

    [HttpPost("{id:int}/renew")]
    [ProducesResponseType(typeof(SubscriptionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SubscriptionResponse>> Renew(int id, CancellationToken cancellationToken)
    {
        var result = await subscriptionService.RenewAsync(id, cancellationToken);
        if (result.Error is not null)
        {
            return ToErrorResult(result.Error.Value);
        }

        var (memberLabel, planLabel) = await ResolveLabelsAsync(result.Subscription!.MemberId, result.Subscription.MembershipPlanId, cancellationToken);
        await auditLogService.LogAsync(
            "Subscription.Renew",
            "Subscription",
            result.Subscription.Id,
            $"Gia hạn gói {planLabel} (#SUB-{id:D4} → #SUB-{result.Subscription.Id:D4}) cho hội viên {memberLabel}",
            $"MemberId={result.Subscription.MemberId} · Gói: {planLabel}",
            User,
            cancellationToken);

        return CreatedAtAction(
            nameof(GetByMember),
            new { memberId = result.Subscription.MemberId },
            result.Subscription);
    }

    [HttpPost("{id:int}/cancel")]
    [ProducesResponseType(typeof(SubscriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SubscriptionResponse>> Cancel(
        int id,
        [FromBody] CancelSubscriptionRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        var result = await subscriptionService.CancelAsync(id, request?.Reason, cancellationToken);
        if (result.Error is not null)
        {
            return ToErrorResult(result.Error.Value);
        }

        var (memberLabel, planLabel) = await ResolveLabelsAsync(result.Subscription!.MemberId, result.Subscription.MembershipPlanId, cancellationToken);
        var reason = string.IsNullOrWhiteSpace(request?.Reason) ? "Không ghi lý do" : request!.Reason.Trim();
        await auditLogService.LogAsync(
            "Subscription.Cancel",
            "Subscription",
            id,
            $"Hủy gói {planLabel} (#SUB-{id:D4}) của hội viên {memberLabel}",
            $"MemberId={result.Subscription.MemberId} · Lý do: {reason}",
            User,
            cancellationToken);

        return Ok(result.Subscription);
    }

    [HttpPost("{id:int}/freeze")]
    [ProducesResponseType(typeof(SubscriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SubscriptionResponse>> Freeze(
        int id,
        FreezeSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await subscriptionService.FreezeAsync(id, request.Days, cancellationToken);
        if (result.Error is not null)
        {
            return ToErrorResult(result.Error.Value);
        }

        var (memberLabel, planLabel) = await ResolveLabelsAsync(result.Subscription!.MemberId, result.Subscription.MembershipPlanId, cancellationToken);
        await auditLogService.LogAsync(
            "Subscription.Freeze",
            "Subscription",
            id,
            $"Bảo lưu gói {planLabel} (#SUB-{id:D4}) của hội viên {memberLabel} thêm {request.Days} ngày",
            $"MemberId={result.Subscription.MemberId} · Hạn mới: {result.Subscription.EndsOn:yyyy-MM-dd}",
            User,
            cancellationToken);

        return Ok(result.Subscription);
    }

    private async Task<(string MemberLabel, string PlanLabel)> ResolveLabelsAsync(
        int memberId,
        int planId,
        CancellationToken cancellationToken)
    {
        var member = await memberService.GetByIdAsync(memberId, cancellationToken);
        var plan = await planService.GetByIdAsync(planId, cancellationToken);
        var memberName = member is null
            ? $"#{memberId}"
            : $"{member.FirstName} {member.LastName}".Trim() + (string.IsNullOrWhiteSpace(member.Phone) ? "" : $" ({member.Phone})");
        var planName = plan?.Name ?? $"#{planId}";
        return (memberName, planName);
    }

    private ActionResult ToErrorResult(SubscriptionError error) => error switch
    {
        SubscriptionError.MemberNotFound or
        SubscriptionError.PlanNotFound or
        SubscriptionError.SubscriptionNotFound => NotFound(new ProblemDetails { Title = error.ToString() }),
        SubscriptionError.SubscriptionNotCancellable => Conflict(new ProblemDetails { Title = "Chỉ có thể hủy gói tập đang ở trạng thái Chờ thanh toán hoặc Đang hoạt động." }),
        SubscriptionError.SubscriptionHasConfirmedPayments => Conflict(new ProblemDetails { Title = "Không thể hủy đăng ký chờ thanh toán vì hóa đơn đã có khoản thanh toán được xác nhận." }),
        SubscriptionError.SubscriptionNotActive => Conflict(new ProblemDetails { Title = "Chỉ có thể bảo lưu / cộng ngày cho gói tập đang hoạt động." }),
        _ => Conflict(new ProblemDetails { Title = error.ToString() })
    };
}

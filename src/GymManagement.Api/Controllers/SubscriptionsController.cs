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
    IMemberService memberService) : ControllerBase
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

        return CreatedAtAction(
            nameof(GetByMember),
            new { memberId = result.Subscription!.MemberId },
            result.Subscription);
    }

    [HttpGet("~/api/members/{memberId:int}/subscriptions")]
    [ProducesResponseType(typeof(PagedResponse<SubscriptionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResponse<SubscriptionResponse>>> GetByMember(
        int memberId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        MemberResponse? member = await memberService.GetByIdAsync(memberId, cancellationToken);
        if (member is null)
        {
            return NotFound();
        }

        return Ok(await subscriptionService.GetByMemberAsync(memberId, page, pageSize, cancellationToken));
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

        return CreatedAtAction(
            nameof(GetByMember),
            new { memberId = result.Subscription!.MemberId },
            result.Subscription);
    }

    private ActionResult ToErrorResult(SubscriptionError error) => error switch
    {
        SubscriptionError.MemberNotFound or
        SubscriptionError.PlanNotFound or
        SubscriptionError.SubscriptionNotFound => NotFound(new ProblemDetails { Title = error.ToString() }),
        _ => Conflict(new ProblemDetails { Title = error.ToString() })
    };
}

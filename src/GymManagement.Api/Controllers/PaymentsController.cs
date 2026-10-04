using System.Security.Claims;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Payments;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
public sealed class PaymentsController(IPaymentService paymentService) : ControllerBase
{
    [HttpGet("api/payments")]
    [ProducesResponseType(typeof(PagedResponse<PaymentResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<PaymentResponse>>> Search(
        [FromQuery] int? invoiceId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await paymentService.SearchAsync(invoiceId, page, pageSize, cancellationToken));
    }

    [HttpGet("api/payments/{id:int}")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var payment = await paymentService.GetByIdAsync(id, cancellationToken);
        return payment is null ? NotFound() : Ok(payment);
    }

    [HttpPost("api/invoices/{invoiceId:int}/payments")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PaymentResponse>> Create(
        int invoiceId,
        CreatePaymentRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId))
        {
            return Forbid();
        }

        var result = await paymentService.CreateAsync(invoiceId, request, actorId, cancellationToken);
        if (result.Error is not null)
        {
            return ToErrorResult(result.Error.Value);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Payment!.Id }, result.Payment);
    }

    [HttpPost("api/payments/{id:int}/confirm")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PaymentResponse>> Confirm(
        int id,
        ConfirmPaymentRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId))
        {
            return Forbid();
        }

        var result = await paymentService.ConfirmAsync(id, request, actorId, cancellationToken);
        return result.Error is not null ? ToErrorResult(result.Error.Value) : Ok(result.Payment);
    }

    [HttpPost("api/payments/{id:int}/reject")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<PaymentResponse>> Reject(
        int id,
        RejectPaymentRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId))
        {
            return Forbid();
        }

        var result = await paymentService.RejectAsync(id, request, actorId, cancellationToken);
        return result.Error is not null ? ToErrorResult(result.Error.Value) : Ok(result.Payment);
    }

    private bool TryGetActorId(out int actorId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out actorId);

    private ActionResult ToErrorResult(PaymentError error) => error switch
    {
        PaymentError.InvoiceNotFound or PaymentError.PaymentNotFound =>
            NotFound(new ProblemDetails { Title = error.ToString() }),
        _ => Conflict(new ProblemDetails { Title = error.ToString() })
    };
}

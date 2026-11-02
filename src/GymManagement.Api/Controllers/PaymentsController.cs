using System.Security.Claims;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Files;
using GymManagement.Api.DTOs.Payments;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
public sealed class PaymentsController(IPaymentService paymentService, IFileService fileService) : ControllerBase
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

    [HttpPost("api/payments/{id:int}/receipt")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(PaymentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PaymentResponse>> UploadReceipt(
        int id,
        [FromForm] FileUploadDbDto.UploadFileDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var uploadResult = await fileService.UploadAsync(request.File, cancellationToken);
            var attachResult = await paymentService.AttachReceiptAsync(id, uploadResult.Id, cancellationToken);
            return attachResult.Error is not null ? ToErrorResult(attachResult.Error.Value) : Ok(attachResult.Payment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Tệp không hợp lệ",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest
            });
        }
    }

    [HttpGet("api/payments/{id:int}/receipt")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetReceipt(int id, CancellationToken cancellationToken)
    {
        var payment = await paymentService.GetByIdAsync(id, cancellationToken);
        if (payment is null || payment.ReceiptFileId is null)
        {
            return NotFound();
        }

        var file = await fileService.GetFileAsync(payment.ReceiptFileId.Value, cancellationToken);
        if (file is null)
        {
            return NotFound();
        }

        return File(file.Content, file.ContentType);
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
        PaymentError.InvoiceNotFound or PaymentError.PaymentNotFound or PaymentError.FileNotFound =>
            NotFound(new ProblemDetails { Title = error.ToString() }),
        _ => Conflict(new ProblemDetails { Title = error.ToString() })
    };
}

using System.Security.Claims;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Invoices;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/invoices")]
public sealed class InvoicesController(IInvoiceService invoiceService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<InvoiceResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<InvoiceResponse>>> Search(
        [FromQuery] int? memberId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await invoiceService.SearchAsync(memberId, page, pageSize, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(InvoiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InvoiceResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var invoice = await invoiceService.GetByIdAsync(id, cancellationToken);
        return invoice is null ? NotFound() : Ok(invoice);
    }

    [HttpPost]
    [ProducesResponseType(typeof(InvoiceResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<InvoiceResponse>> Create(
        CreateInvoiceRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetActorId(out var actorId))
        {
            return Forbid();
        }

        var result = await invoiceService.CreateAsync(request, actorId, cancellationToken);
        if (result.Error is not null)
        {
            return ToErrorResult(result.Error.Value);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Invoice!.Id }, result.Invoice);
    }

    private bool TryGetActorId(out int actorId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out actorId);

    private ActionResult ToErrorResult(InvoiceError error) => error switch
    {
        InvoiceError.InvoiceNotFound or
        InvoiceError.MemberNotFound or
        InvoiceError.SubscriptionNotFound or
        InvoiceError.PlanNotFound => NotFound(new ProblemDetails { Title = error.ToString() }),
        _ => Conflict(new ProblemDetails { Title = error.ToString() })
    };
}

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
public sealed class InvoicesController(
    IInvoiceService invoiceService,
    IAuditLogService auditLogService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<InvoiceResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<InvoiceResponse>>> Search(
        [FromQuery] int? memberId,
        [FromQuery] string? search,
        [FromQuery] GymManagement.Api.Models.InvoiceStatus? status,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await invoiceService.SearchAsync(memberId, search, status, from, to, page, pageSize, cancellationToken));
    }

    [HttpGet("summary")]
    [ProducesResponseType(typeof(InvoiceSummaryResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<InvoiceSummaryResponse>> Summary(CancellationToken cancellationToken = default)
    {
        return Ok(await invoiceService.GetSummaryAsync(cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(InvoiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InvoiceResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var invoice = await invoiceService.GetByIdAsync(id, cancellationToken);
        return invoice is null ? NotFound() : Ok(invoice);
    }

    [HttpPost("{id:int}/void")]
    [ProducesResponseType(typeof(InvoiceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<InvoiceResponse>> Void(int id, CancellationToken cancellationToken)
    {
        var (invoice, error) = await invoiceService.VoidAsync(id, cancellationToken);
        if (error is not null)
        {
            return error switch
            {
                InvoiceError.InvoiceNotFound => NotFound(new ProblemDetails { Title = "Không tìm thấy hóa đơn." }),
                InvoiceError.InvoiceHasConfirmedPayments => Conflict(new ProblemDetails { Title = "Không thể hủy hóa đơn đã có khoản thanh toán được xác nhận." }),
                InvoiceError.InvoiceNotVoidable => Conflict(new ProblemDetails { Title = "Chỉ có thể hủy hóa đơn đang ở trạng thái Chờ thanh toán." }),
                _ => Conflict(new ProblemDetails { Title = error.Value.ToString() })
            };
        }

        var memberLabel = string.IsNullOrWhiteSpace(invoice!.MemberName)
            ? $"#{invoice.MemberId}"
            : invoice.MemberName + (string.IsNullOrWhiteSpace(invoice.MemberPhone) ? "" : $" ({invoice.MemberPhone})");
        await auditLogService.LogAsync(
            "Invoice.Void",
            "Invoice",
            id,
            $"Hủy hóa đơn {invoice.Number} · gói {invoice.PlanNameSnapshot} của hội viên {memberLabel}",
            $"MemberId={invoice.MemberId} · Số tiền: {invoice.TotalAmount:N0}đ",
            User,
            cancellationToken);

        return Ok(invoice);
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

        var inv = result.Invoice!;
        var memberLabel = string.IsNullOrWhiteSpace(inv.MemberName)
            ? $"#{inv.MemberId}"
            : inv.MemberName + (string.IsNullOrWhiteSpace(inv.MemberPhone) ? "" : $" ({inv.MemberPhone})");
        await auditLogService.LogAsync(
            "Invoice.Create",
            "Invoice",
            inv.Id,
            $"Lập hóa đơn {inv.Number} · gói {inv.PlanNameSnapshot} cho hội viên {memberLabel} ({inv.TotalAmount:N0}đ)",
            $"MemberId={inv.MemberId} · SubscriptionId={inv.SubscriptionId}",
            User,
            cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = inv.Id }, inv);
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

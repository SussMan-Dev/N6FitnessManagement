using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Invoices;

namespace GymManagement.Api.Services;

public interface IInvoiceService
{
    Task<(InvoiceResponse? Invoice, InvoiceError? Error)> CreateAsync(
        CreateInvoiceRequest request,
        int createdByUserId,
        CancellationToken cancellationToken);

    Task<InvoiceResponse?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<PagedResponse<InvoiceResponse>> SearchAsync(
        int? memberId,
        int page,
        int pageSize,
        CancellationToken cancellationToken);
}

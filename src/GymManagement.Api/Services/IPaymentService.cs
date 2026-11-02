using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Payments;

namespace GymManagement.Api.Services;

public interface IPaymentService
{
    Task<(PaymentResponse? Payment, PaymentError? Error)> CreateAsync(
        int invoiceId,
        CreatePaymentRequest request,
        int createdByUserId,
        CancellationToken cancellationToken);

    Task<(PaymentResponse? Payment, PaymentError? Error)> ConfirmAsync(
        int paymentId,
        ConfirmPaymentRequest request,
        int reviewedByUserId,
        CancellationToken cancellationToken);

    Task<(PaymentResponse? Payment, PaymentError? Error)> RejectAsync(
        int paymentId,
        RejectPaymentRequest request,
        int reviewedByUserId,
        CancellationToken cancellationToken);

    Task<(PaymentResponse? Payment, PaymentError? Error)> AttachReceiptAsync(
        int paymentId,
        int fileId,
        CancellationToken cancellationToken);

    Task<PaymentResponse?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<PagedResponse<PaymentResponse>> SearchAsync(
        int? invoiceId,
        int page,
        int pageSize,
        CancellationToken cancellationToken);
}

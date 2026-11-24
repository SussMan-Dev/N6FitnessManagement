using GymManagement.Api.DTOs.Reports;

namespace GymManagement.Api.Services;

public interface IReportService
{
    Task<RevenueReportResponse> GetRevenueAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);

    Task<MemberReportResponse> GetMembersAsync(CancellationToken cancellationToken);

    Task<CheckInReportResponse> GetCheckInsAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);

    Task<DashboardReportResponse> GetDashboardAsync(DateOnly from, DateOnly to, CancellationToken cancellationToken);

    Task<IReadOnlyList<ExpiringSubscriptionItemResponse>> GetExpiringSubscriptionsAsync(
        int withinDays,
        CancellationToken cancellationToken);

    Task<ReportAnalyticsResponse> GetAnalyticsAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken);
}
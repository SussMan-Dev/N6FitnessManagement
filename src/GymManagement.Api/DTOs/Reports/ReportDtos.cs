namespace GymManagement.Api.DTOs.Reports;

public sealed record RevenueReportResponse(DateOnly From, DateOnly To, decimal TotalRevenue, int PaidInvoiceCount);

public sealed record MemberReportResponse(int TotalMembers, int ActiveMembers, int NonActiveMembers);

public sealed record CheckInReportResponse(DateOnly From, DateOnly To, int CheckInCount, int UniqueMembers);

public sealed record DashboardReportResponse(
    int ActiveMembers,
    int ActiveSubscriptions,
    int SubscriptionsExpiringInSevenDays,
    decimal RevenueInRange,
    int CheckInsInRange);
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

public sealed record ExpiringSubscriptionItemResponse(
    int SubscriptionId,
    int MemberId,
    string MemberName,
    string? MemberPhone,
    string? MemberEmail,
    string PlanName,
    DateOnly EndsOn,
    int DaysRemaining);

public sealed record DailyMetricPoint(
    DateOnly Date,
    decimal Revenue,
    int PaidInvoiceCount,
    int CheckInCount);

public sealed record TopPlanMetric(
    string PlanName,
    int SoldCount,
    decimal TotalRevenue);

public sealed record ReportAnalyticsResponse(
    DateOnly From,
    DateOnly To,
    IReadOnlyList<DailyMetricPoint> DailySeries,
    IReadOnlyList<TopPlanMetric> TopPlans);
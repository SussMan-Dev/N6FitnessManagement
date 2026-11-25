using GymManagement.Api.Data;
using GymManagement.Api.DTOs.Reports;
using GymManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Services;

public sealed class ReportService(GymDbContext dbContext) : IReportService
{
    public async Task<RevenueReportResponse> GetRevenueAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var (start, end) = UtcRange(from, to);
        var paidInvoices = dbContext.Invoices.AsNoTracking()
            .Where(invoice => invoice.Status == InvoiceStatus.Paid &&
                              invoice.PaidAtUtc >= start && invoice.PaidAtUtc < end);
        var total = await paidInvoices.SumAsync(invoice => (decimal?)invoice.TotalAmount, cancellationToken) ?? 0m;
        var count = await paidInvoices.CountAsync(cancellationToken);
        return new RevenueReportResponse(from, to, total, count);
    }

    public async Task<MemberReportResponse> GetMembersAsync(CancellationToken cancellationToken)
    {
        var total = await dbContext.Members.CountAsync(cancellationToken);
        var active = await dbContext.Members.CountAsync(member => member.Status == MemberStatus.Active, cancellationToken);
        return new MemberReportResponse(total, active, total - active);
    }

    public async Task<CheckInReportResponse> GetCheckInsAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var (start, end) = UtcRange(from, to);
        var checkIns = dbContext.CheckIns.AsNoTracking()
            .Where(checkIn => checkIn.CheckedInAtUtc >= start && checkIn.CheckedInAtUtc < end);
        var count = await checkIns.CountAsync(cancellationToken);
        var uniqueMembers = await checkIns.Select(checkIn => checkIn.MemberId).Distinct().CountAsync(cancellationToken);
        return new CheckInReportResponse(from, to, count, uniqueMembers);
    }

    public async Task<DashboardReportResponse> GetDashboardAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var today = GymClock.TodayVietnam();
        var expiryLimit = today.AddDays(7);
        var activeSubscriptions = dbContext.Subscriptions.AsNoTracking()
            .Where(subscription => subscription.Status == SubscriptionStatus.Active &&
                                  subscription.StartsOn <= today &&
                                  subscription.EndsOn >= today);
        var activeMembers = await dbContext.Members.CountAsync(
            member => member.Status == MemberStatus.Active,
            cancellationToken);
        var activeCount = await activeSubscriptions.CountAsync(cancellationToken);
        var expiringCount = await activeSubscriptions.CountAsync(
            subscription => subscription.EndsOn <= expiryLimit,
            cancellationToken);
        var revenue = await GetRevenueAsync(from, to, cancellationToken);
        var checkIns = await GetCheckInsAsync(from, to, cancellationToken);

        return new DashboardReportResponse(
            activeMembers,
            activeCount,
            expiringCount,
            revenue.TotalRevenue,
            checkIns.CheckInCount);
    }

    public async Task<IReadOnlyList<ExpiringSubscriptionItemResponse>> GetExpiringSubscriptionsAsync(
        int withinDays,
        CancellationToken cancellationToken)
    {
        withinDays = Math.Clamp(withinDays, 1, 60);
        var today = GymClock.TodayVietnam();
        var expiryLimit = today.AddDays(withinDays);

        var rows = await (
            from s in dbContext.Subscriptions.AsNoTracking()
            where s.Status == SubscriptionStatus.Active &&
                  s.StartsOn <= today &&
                  s.EndsOn >= today &&
                  s.EndsOn <= expiryLimit
            join m in dbContext.Members.AsNoTracking() on s.MemberId equals m.Id
            join p in dbContext.MembershipPlans.AsNoTracking() on s.MembershipPlanId equals p.Id
            orderby s.EndsOn, s.Id
            select new
            {
                s.Id,
                s.MemberId,
                m.FirstName,
                m.LastName,
                m.Phone,
                m.Email,
                PlanName = p.Name,
                EndsOn = s.EndsOn!.Value
            }
        ).ToListAsync(cancellationToken);

        return rows
            .Select(r => new ExpiringSubscriptionItemResponse(
                r.Id,
                r.MemberId,
                $"{r.FirstName} {r.LastName}".Trim(),
                r.Phone,
                r.Email,
                r.PlanName,
                r.EndsOn,
                r.EndsOn.DayNumber - today.DayNumber))
            .ToList();
    }

    public async Task<ReportAnalyticsResponse> GetAnalyticsAsync(
        DateOnly from,
        DateOnly to,
        CancellationToken cancellationToken)
    {
        var (start, end) = UtcRange(from, to);

        var paidInvoices = await dbContext.Invoices.AsNoTracking()
            .Where(inv => inv.Status == InvoiceStatus.Paid &&
                          inv.PaidAtUtc >= start && inv.PaidAtUtc < end)
            .Select(inv => new { inv.PaidAtUtc, inv.TotalAmount, inv.PlanNameSnapshot })
            .ToListAsync(cancellationToken);

        var checkIns = await dbContext.CheckIns.AsNoTracking()
            .Where(c => c.CheckedInAtUtc >= start && c.CheckedInAtUtc < end)
            .Select(c => c.CheckedInAtUtc)
            .ToListAsync(cancellationToken);

        var revenueByDay = paidInvoices
            .Where(inv => inv.PaidAtUtc.HasValue)
            .GroupBy(inv => GymClock.ToVietnamDate(inv.PaidAtUtc!.Value))
            .ToDictionary(g => g.Key, g => (Revenue: g.Sum(x => x.TotalAmount), Count: g.Count()));

        var checkInsByDay = checkIns
            .GroupBy(GymClock.ToVietnamDate)
            .ToDictionary(g => g.Key, g => g.Count());

        var totalDays = Math.Min(90, Math.Max(0, to.DayNumber - from.DayNumber) + 1);
        var seriesStart = to.AddDays(-(totalDays - 1));
        var dailySeries = new List<DailyMetricPoint>(totalDays);
        for (var i = 0; i < totalDays; i++)
        {
            var day = seriesStart.AddDays(i);
            revenueByDay.TryGetValue(day, out var rev);
            checkInsByDay.TryGetValue(day, out var ciCount);
            dailySeries.Add(new DailyMetricPoint(day, rev.Revenue, rev.Count, ciCount));
        }

        var topPlans = paidInvoices
            .GroupBy(inv => inv.PlanNameSnapshot)
            .Select(g => new TopPlanMetric(g.Key, g.Count(), g.Sum(x => x.TotalAmount)))
            .OrderByDescending(x => x.TotalRevenue)
            .ThenByDescending(x => x.SoldCount)
            .Take(8)
            .ToList();

        return new ReportAnalyticsResponse(from, to, dailySeries, topPlans);
    }

    private static (DateTime Start, DateTime EndExclusive) UtcRange(DateOnly from, DateOnly to) =>
        GymClock.VietnamRangeToUtc(from, to);
}
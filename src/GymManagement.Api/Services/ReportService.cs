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
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
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

    private static (DateTime Start, DateTime EndExclusive) UtcRange(DateOnly from, DateOnly to) =>
        (from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            to.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc));
}
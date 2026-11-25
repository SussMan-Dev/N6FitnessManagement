using GymManagement.Api.Data;
using GymManagement.Api.DTOs.Subscriptions;
using GymManagement.Api.Models;
using GymManagement.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GymManagement.Api.Tests;

[TestClass]
public sealed class SubscriptionServiceTests
{
    [TestMethod]
    public async Task CreateAsync_CreatesPendingSubscriptionWithoutActiveDates()
    {
        using var dbContext = CreateDbContext();
        var (member, plan) = await SeedActiveMemberAndPlanAsync(dbContext);
        var service = new SubscriptionService(dbContext);

        var result = await service.CreateAsync(new CreateSubscriptionRequest
        {
            MemberId = member.Id,
            MembershipPlanId = plan.Id
        }, CancellationToken.None);

        Assert.IsNull(result.Error);
        Assert.IsNotNull(result.Subscription);
        Assert.AreEqual(SubscriptionStatus.PendingPayment, result.Subscription.Status);
        Assert.IsNull(result.Subscription.StartsOn);
        Assert.IsNull(result.Subscription.EndsOn);
    }

    [TestMethod]
    public async Task CreateAsync_RejectsInactiveMember()
    {
        using var dbContext = CreateDbContext();
        var (member, plan) = await SeedActiveMemberAndPlanAsync(dbContext);
        member.Status = MemberStatus.Inactive;
        await dbContext.SaveChangesAsync();
        var service = new SubscriptionService(dbContext);

        var result = await service.CreateAsync(new CreateSubscriptionRequest
        {
            MemberId = member.Id,
            MembershipPlanId = plan.Id
        }, CancellationToken.None);

        Assert.AreEqual(SubscriptionError.MemberNotActive, result.Error);
        Assert.IsNull(result.Subscription);
    }

    [TestMethod]
    public async Task RenewAsync_CreatesPendingRenewalLinkedToPreviousSubscription()
    {
        using var dbContext = CreateDbContext();
        var (member, plan) = await SeedActiveMemberAndPlanAsync(dbContext);
        var previous = new Subscription
        {
            MemberId = member.Id,
            MembershipPlanId = plan.Id,
            StartsOn = new DateOnly(2026, 1, 1),
            EndsOn = new DateOnly(2026, 1, 30),
            CreatedAtUtc = DateTime.UtcNow,
            Status = SubscriptionStatus.Expired
        };
        dbContext.Subscriptions.Add(previous);
        await dbContext.SaveChangesAsync();
        var service = new SubscriptionService(dbContext);

        var result = await service.RenewAsync(previous.Id, CancellationToken.None);

        Assert.IsNull(result.Error);
        Assert.IsNotNull(result.Subscription);
        Assert.AreEqual(previous.Id, result.Subscription.RenewedFromSubscriptionId);
        Assert.AreEqual(SubscriptionStatus.PendingPayment, result.Subscription.Status);
        Assert.IsNull(result.Subscription.StartsOn);
    }

    [TestMethod]
    public async Task CancelAsync_CancelsActiveSubscriptionAndVoidsUnpaidPendingInvoices()
    {
        using var dbContext = CreateDbContext();
        var (member, plan) = await SeedActiveMemberAndPlanAsync(dbContext);
        var activeSub = new Subscription
        {
            MemberId = member.Id,
            MembershipPlanId = plan.Id,
            StartsOn = new DateOnly(2026, 11, 1),
            EndsOn = new DateOnly(2026, 12, 1),
            CreatedAtUtc = DateTime.UtcNow,
            Status = SubscriptionStatus.Active
        };
        dbContext.Subscriptions.Add(activeSub);
        await dbContext.SaveChangesAsync();

        var unpaidInvoice = new Invoice
        {
            Number = "INV-TEST-001",
            MemberId = member.Id,
            SubscriptionId = activeSub.Id,
            PlanNameSnapshot = plan.Name,
            PlanDurationDaysSnapshot = plan.DurationDays,
            TotalAmount = plan.Price,
            Status = InvoiceStatus.PendingPayment,
            CreatedAtUtc = DateTime.UtcNow
        };
        dbContext.Invoices.Add(unpaidInvoice);
        await dbContext.SaveChangesAsync();

        var service = new SubscriptionService(dbContext);
        var result = await service.CancelAsync(activeSub.Id, "Hội viên chuyển công tác", CancellationToken.None);

        Assert.IsNull(result.Error);
        Assert.IsNotNull(result.Subscription);
        Assert.AreEqual(SubscriptionStatus.Cancelled, result.Subscription.Status);
        var reloadedInvoice = await dbContext.Invoices.FindAsync(unpaidInvoice.Id);
        Assert.AreEqual(InvoiceStatus.Voided, reloadedInvoice!.Status);
    }

    [TestMethod]
    public async Task AuditLogService_LogsAndFiltersEntries()
    {
        using var dbContext = CreateDbContext();
        var auditService = new AuditLogService(dbContext);

        await auditService.LogExplicitAsync(
            "Subscription.Cancel",
            "Subscription",
            42,
            "Hủy gói tập #SUB-0042",
            "Lý do: Chuyển nơi ở",
            1,
            "Admin Gym",
            "admin@gym.vn",
            CancellationToken.None);

        await auditService.LogExplicitAsync(
            "Payment.Confirm",
            "Payment",
            99,
            "Xác nhận thu tiền PAY-00099",
            "Hóa đơn #15",
            2,
            "Le Tan",
            "staff@gym.vn",
            CancellationToken.None);

        var filtered = await auditService.SearchAsync("Chuyển nơi ở", "Subscription", null, 1, null, null, null, 1, 20, CancellationToken.None);
        Assert.AreEqual(1, filtered.TotalCount);
        Assert.AreEqual("Subscription.Cancel", filtered.Items[0].Action);
        Assert.AreEqual("Admin Gym", filtered.Items[0].ActorName);
    }

    private static async Task<(Member Member, MembershipPlan Plan)> SeedActiveMemberAndPlanAsync(
        GymDbContext dbContext)
    {
        var member = new Member
        {
            FirstName = "Linh",
            LastName = "Nguyen",
            JoinedAtUtc = DateTime.UtcNow,
            Status = MemberStatus.Active
        };
        var plan = new MembershipPlan
        {
            Name = "Monthly",
            Price = 100m,
            DurationDays = 30,
            IsActive = true
        };

        dbContext.Members.Add(member);
        dbContext.MembershipPlans.Add(plan);
        await dbContext.SaveChangesAsync();
        return (member, plan);
    }

    private static GymDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<GymDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new GymDbContext(options);
    }
}

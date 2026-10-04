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

using GymManagement.Api.Data;
using GymManagement.Api.DTOs.CheckIns;
using GymManagement.Api.Models;
using GymManagement.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GymManagement.Api.Tests;

[TestClass]
public sealed class CheckInAndReportServiceTests
{
    [TestMethod]
    public async Task CreateCheckIn_RequiresCurrentActiveSubscription()
    {
        using var dbContext = CreateDbContext();
        var member = new Member
        {
            FirstName = "Linh",
            LastName = "Nguyen",
            JoinedAtUtc = DateTime.UtcNow,
            Status = MemberStatus.Active
        };
        dbContext.Members.Add(member);
        await dbContext.SaveChangesAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        dbContext.Subscriptions.Add(new Subscription
        {
            MemberId = member.Id,
            MembershipPlanId = 1,
            StartsOn = today.AddDays(-1),
            EndsOn = today.AddDays(1),
            CreatedAtUtc = DateTime.UtcNow,
            Status = SubscriptionStatus.Active
        });
        await dbContext.SaveChangesAsync();
        var service = new CheckInService(dbContext);

        var result = await service.CreateAsync(member.Id, 42, CancellationToken.None);

        Assert.IsNull(result.Error);
        Assert.IsNotNull(result.CheckIn);
        Assert.AreEqual(42, result.CheckIn.RecordedByUserId);
    }

    [TestMethod]
    public async Task CreateCheckIn_RejectsExpiredSubscription()
    {
        using var dbContext = CreateDbContext();
        var member = new Member
        {
            FirstName = "Linh",
            LastName = "Nguyen",
            JoinedAtUtc = DateTime.UtcNow,
            Status = MemberStatus.Active
        };
        dbContext.Members.Add(member);
        await dbContext.SaveChangesAsync();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        dbContext.Subscriptions.Add(new Subscription
        {
            MemberId = member.Id,
            MembershipPlanId = 1,
            StartsOn = today.AddDays(-30),
            EndsOn = today.AddDays(-1),
            CreatedAtUtc = DateTime.UtcNow,
            Status = SubscriptionStatus.Expired
        });
        await dbContext.SaveChangesAsync();

        var result = await new CheckInService(dbContext).CreateAsync(member.Id, 42, CancellationToken.None);

        Assert.AreEqual(CheckInError.NoValidSubscription, result.Error);
        Assert.IsNull(result.CheckIn);
    }

    [TestMethod]
    public async Task GetMembersReportCountsActiveAndInactiveMembers()
    {
        using var dbContext = CreateDbContext();
        dbContext.Members.AddRange(
            new Member { FirstName = "A", LastName = "One", JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Active },
            new Member { FirstName = "B", LastName = "Two", JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Inactive },
            new Member { FirstName = "C", LastName = "Three", JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Suspended });
        await dbContext.SaveChangesAsync();

        var result = await new ReportService(dbContext).GetMembersAsync(CancellationToken.None);

        Assert.AreEqual(3, result.TotalMembers);
        Assert.AreEqual(1, result.ActiveMembers);
        Assert.AreEqual(2, result.NonActiveMembers);
    }

    private static GymDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<GymDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new GymDbContext(options);
    }
}
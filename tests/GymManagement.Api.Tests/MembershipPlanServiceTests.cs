using GymManagement.Api.Data;
using GymManagement.Api.DTOs.MembershipPlans;
using GymManagement.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GymManagement.Api.Tests;

[TestClass]
public sealed class MembershipPlanServiceTests
{
    [TestMethod]
    public async Task CreateAsync_PreservesDecimalPriceAndActivatesPlan()
    {
        using var dbContext = CreateDbContext();
        var service = new MembershipPlanService(dbContext);

        var plan = await service.CreateAsync(new CreateMembershipPlanRequest
        {
            Name = "Monthly",
            Price = 125000.50m,
            DurationDays = 30
        }, CancellationToken.None);

        Assert.AreEqual(125000.50m, plan.Price);
        Assert.IsTrue(plan.IsActive);
    }

    [TestMethod]
    public async Task UpdateStatusAsync_DeactivatesPlanWithoutDeletingIt()
    {
        using var dbContext = CreateDbContext();
        var service = new MembershipPlanService(dbContext);
        var created = await service.CreateAsync(new CreateMembershipPlanRequest
        {
            Name = "Monthly",
            Price = 100m,
            DurationDays = 30
        }, CancellationToken.None);

        var updated = await service.UpdateStatusAsync(created.Id, false, CancellationToken.None);
        var stored = await dbContext.MembershipPlans.SingleAsync();

        Assert.IsTrue(updated);
        Assert.IsFalse(stored.IsActive);
        Assert.AreEqual(created.Id, stored.Id);
    }

    private static GymDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<GymDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new GymDbContext(options);
    }
}

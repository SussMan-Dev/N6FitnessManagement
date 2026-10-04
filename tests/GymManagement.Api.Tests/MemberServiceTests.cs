using GymManagement.Api.Data;
using GymManagement.Api.DTOs.Members;
using GymManagement.Api.Models;
using GymManagement.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GymManagement.Api.Tests;

[TestClass]
public sealed class MemberServiceTests
{
    [TestMethod]
    public async Task CreateAsync_NormalizesEmailAndSetsActiveStatus()
    {
        using var dbContext = CreateDbContext();
        var service = new MemberService(dbContext);

        var result = await service.CreateAsync(new CreateMemberRequest
        {
            FirstName = " Linh ",
            LastName = " Nguyen ",
            Email = " LINH@example.com "
        }, CancellationToken.None);

        Assert.IsFalse(result.EmailConflict);
        Assert.IsNotNull(result.Member);
        Assert.AreEqual("linh@example.com", result.Member.Email);
        Assert.AreEqual("Linh", result.Member.FirstName);
        Assert.AreEqual(MemberStatus.Active, result.Member.Status);
    }

    [TestMethod]
    public async Task CreateAsync_ReturnsConflictForDuplicateEmail()
    {
        using var dbContext = CreateDbContext();
        var service = new MemberService(dbContext);
        var request = new CreateMemberRequest
        {
            FirstName = "Linh",
            LastName = "Nguyen",
            Email = "linh@example.com"
        };

        await service.CreateAsync(request, CancellationToken.None);
        var duplicate = await service.CreateAsync(request, CancellationToken.None);

        Assert.IsTrue(duplicate.EmailConflict);
        Assert.IsNull(duplicate.Member);
        Assert.AreEqual(1, await dbContext.Members.CountAsync());
    }

    [TestMethod]
    public async Task SearchAsync_ClampsPageSizeToMaximum()
    {
        using var dbContext = CreateDbContext();
        var service = new MemberService(dbContext);

        var result = await service.SearchAsync(null, 0, 1000, CancellationToken.None);

        Assert.AreEqual(1, result.Page);
        Assert.AreEqual(100, result.PageSize);
    }

    private static GymDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<GymDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new GymDbContext(options);
    }
}

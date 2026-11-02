using GymManagement.Api.Controllers;
using GymManagement.Api.Data;
using GymManagement.Api.DTOs.Portal;
using GymManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GymManagement.Api.Tests;

[TestClass]
public sealed class PortalControllerTests
{
    [TestMethod]
    public async Task GetPublicPlans_ReturnsOnlyActivePlansWithHighlights()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var dbContext = database.DbContext;

        dbContext.MembershipPlans.AddRange(
            new MembershipPlan { Id = 1, Name = "Plan Active 1", Price = 500000m, DurationDays = 30, IsActive = true },
            new MembershipPlan { Id = 2, Name = "Plan Inactive", Price = 300000m, DurationDays = 30, IsActive = false },
            new MembershipPlan { Id = 3, Name = "Plan Active 2", Price = 1200000m, DurationDays = 90, IsActive = true }
        );
        await dbContext.SaveChangesAsync();

        var controller = new PortalController(dbContext);
        var actionResult = await controller.GetPublicPlans(CancellationToken.None);

        Assert.IsInstanceOfType<OkObjectResult>(actionResult.Result);
        var okResult = (OkObjectResult)actionResult.Result;
        var plans = (IReadOnlyList<PortalPlanItemResponse>)okResult.Value!;

        Assert.AreEqual(2, plans.Count);
        Assert.IsTrue(plans.All(p => p.Name.Contains("Active")));
        Assert.IsTrue(plans.Any(p => p.DurationDays == 90 && p.Highlights.Count > 3));
    }

    [TestMethod]
    public async Task RegisterPlan_CreatesMemberSubscriptionAndInvoice()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var dbContext = database.DbContext;

        var plan = new MembershipPlan
        {
            Id = 10,
            Name = "VIP Year",
            Price = 6000000m,
            DurationDays = 365,
            IsActive = true
        };
        dbContext.MembershipPlans.Add(plan);
        await dbContext.SaveChangesAsync();

        var controller = new PortalController(dbContext);
        var request = new PortalRegistrationRequest
        {
            FirstName = "Van A",
            LastName = "Nguyen",
            Email = "nguyenvana@gmail.com",
            Phone = "0912345678",
            MembershipPlanId = 10,
            PaymentMethod = PaymentMethod.BankTransfer,
            StartsOn = new DateOnly(2026, 11, 10)
        };

        var actionResult = await controller.RegisterPlan(request, CancellationToken.None);

        Assert.IsInstanceOfType<ObjectResult>(actionResult.Result);
        var objectResult = (ObjectResult)actionResult.Result;
        Assert.AreEqual(201, objectResult.StatusCode);

        var response = (PortalRegistrationResponse)objectResult.Value!;
        Assert.AreEqual("Nguyen Van A", response.FullName);
        Assert.AreEqual("VIP Year", response.PlanName);
        Assert.AreEqual(6000000m, response.Price);
        Assert.AreEqual(new DateOnly(2026, 11, 10), response.StartsOn);
        Assert.AreEqual(new DateOnly(2026, 11, 10).AddDays(365), response.EndsOn);
        Assert.IsTrue(response.InvoiceNumber.StartsWith("INV-"));
        Assert.IsTrue(response.QrCodeUrl.Contains("vietqr.io"));

        // Verify entities in database
        var member = await dbContext.Members.SingleAsync(m => m.Email == "nguyenvana@gmail.com");
        Assert.AreEqual(MemberStatus.Active, member.Status);

        var subscription = await dbContext.Subscriptions.SingleAsync(s => s.MemberId == member.Id);
        Assert.AreEqual(SubscriptionStatus.PendingPayment, subscription.Status);
        Assert.AreEqual(10, subscription.MembershipPlanId);

        var invoice = await dbContext.Invoices.SingleAsync(inv => inv.SubscriptionId == subscription.Id);
        Assert.AreEqual(InvoiceStatus.PendingPayment, invoice.Status);
        Assert.AreEqual(6000000m, invoice.TotalAmount);
    }

    [TestMethod]
    public async Task Lookup_ReturnsMemberAndRegisteredPlans()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var dbContext = database.DbContext;

        var member = new Member
        {
            Id = 5,
            FirstName = "Binh",
            LastName = "Tran",
            Email = "tranbinh@gym.vn",
            Phone = "0987654321",
            JoinedAtUtc = DateTime.UtcNow,
            Status = MemberStatus.Active
        };
        var plan = new MembershipPlan
        {
            Id = 20,
            Name = "Quarterly Plan",
            Price = 1500000m,
            DurationDays = 90,
            IsActive = true
        };
        var subscription = new Subscription
        {
            Id = 50,
            MemberId = 5,
            MembershipPlanId = 20,
            StartsOn = new DateOnly(2026, 11, 1),
            EndsOn = new DateOnly(2026, 11, 1).AddDays(90),
            Status = SubscriptionStatus.Active,
            CreatedAtUtc = DateTime.UtcNow
        };
        var invoice = new Invoice
        {
            Id = 100,
            Number = "INV-20261101-TEST",
            MemberId = 5,
            SubscriptionId = 50,
            PlanNameSnapshot = "Quarterly Plan",
            PlanDurationDaysSnapshot = 90,
            TotalAmount = 1500000m,
            Status = InvoiceStatus.Paid,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = 1
        };

        dbContext.Members.Add(member);
        dbContext.MembershipPlans.Add(plan);
        dbContext.Subscriptions.Add(subscription);
        dbContext.Invoices.Add(invoice);
        await dbContext.SaveChangesAsync();

        var controller = new PortalController(dbContext);
        var actionResult = await controller.Lookup("0987654321", CancellationToken.None);

        Assert.IsInstanceOfType<OkObjectResult>(actionResult.Result);
        var okResult = (OkObjectResult)actionResult.Result;
        var response = (PortalLookupResponse)okResult.Value!;

        Assert.AreEqual("Tran Binh", response.FullName);
        Assert.AreEqual(1, response.Subscriptions.Count);
        Assert.AreEqual("Quarterly Plan", response.Subscriptions[0].PlanName);
        Assert.AreEqual(SubscriptionStatus.Active, response.Subscriptions[0].Status);
        Assert.AreEqual(1, response.Invoices.Count);
        Assert.AreEqual("INV-20261101-TEST", response.Invoices[0].Number);
    }
}

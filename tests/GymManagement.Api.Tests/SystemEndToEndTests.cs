using GymManagement.Api.Controllers;
using GymManagement.Api.DTOs.Invoices;
using GymManagement.Api.DTOs.Members;
using GymManagement.Api.DTOs.MembershipPlans;
using GymManagement.Api.DTOs.Payments;
using GymManagement.Api.DTOs.Portal;
using GymManagement.Api.DTOs.Subscriptions;
using GymManagement.Api.Models;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GymManagement.Api.Tests;

[TestClass]
public sealed class SystemEndToEndTests
{
    [TestMethod]
    public void TC01_GymClock_ConvertsVietnamDateRangeAccuratelyToUtc()
    {
        var vnDate = new DateOnly(2026, 11, 24);
        var (startUtc, endUtc) = GymClock.VietnamRangeToUtc(vnDate, vnDate);

        // 2026-11-24 00:00:00 +07:00 == 2026-11-23 17:00:00 UTC
        Assert.AreEqual(new DateTime(2026, 11, 23, 17, 0, 0, DateTimeKind.Utc), startUtc);
        Assert.AreEqual(new DateTime(2026, 11, 24, 17, 0, 0, DateTimeKind.Utc), endUtc);

        // 01:00 AM VN on Nov 24 is 18:00 UTC on Nov 23 -> must map to Nov 24 VN
        var earlyMorningVnInUtc = new DateTime(2026, 11, 23, 18, 0, 0, DateTimeKind.Utc);
        Assert.AreEqual(vnDate, GymClock.ToVietnamDate(earlyMorningVnInUtc));
    }

    [TestMethod]
    public async Task TC02_ExpiringSubscriptionsReport_ReturnsOnlyActiveWithinSevenDays()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var db = database.DbContext;
        var today = GymClock.TodayVietnam();

        var plan = new MembershipPlan { Name = "Monthly", Price = 500000m, DurationDays = 30, IsActive = true };
        var m1 = new Member { FirstName = "An", LastName = "Nguyen", Phone = "0900000001", JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Active };
        var m2 = new Member { FirstName = "Binh", LastName = "Tran", Phone = "0900000002", JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Active };
        db.MembershipPlans.Add(plan);
        db.Members.AddRange(m1, m2);
        await db.SaveChangesAsync();

        db.Subscriptions.AddRange(
            new Subscription { MemberId = m1.Id, MembershipPlanId = plan.Id, StartsOn = today.AddDays(-25), EndsOn = today.AddDays(4), Status = SubscriptionStatus.Active, CreatedAtUtc = DateTime.UtcNow },
            new Subscription { MemberId = m2.Id, MembershipPlanId = plan.Id, StartsOn = today.AddDays(-5), EndsOn = today.AddDays(25), Status = SubscriptionStatus.Active, CreatedAtUtc = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var expiring = await new ReportService(db).GetExpiringSubscriptionsAsync(7, CancellationToken.None);

        Assert.AreEqual(1, expiring.Count);
        Assert.AreEqual(m1.Id, expiring[0].MemberId);
        Assert.AreEqual(4, expiring[0].DaysRemaining);
    }

    [TestMethod]
    public async Task TC03_CheckInByDate_ReturnsEnrichedMemberAndStaffNames()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var db = database.DbContext;
        var today = GymClock.TodayVietnam();

        var staff = new GymUser { UserName = "staff@gym.vn", Email = "staff@gym.vn", DisplayName = "Le Tan A", IsActive = true };
        var member = new Member { FirstName = "Minh", LastName = "Le", Phone = "0911222333", JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Active };
        var plan = new MembershipPlan { Name = "30D", Price = 300000m, DurationDays = 30, IsActive = true };
        db.Users.Add(staff);
        db.Members.Add(member);
        db.MembershipPlans.Add(plan);
        await db.SaveChangesAsync();

        db.Subscriptions.Add(new Subscription
        {
            MemberId = member.Id,
            MembershipPlanId = plan.Id,
            StartsOn = today.AddDays(-1),
            EndsOn = today.AddDays(10),
            Status = SubscriptionStatus.Active,
            CreatedAtUtc = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new CheckInService(db);
        var created = await service.CreateAsync(member.Id, staff.Id, CancellationToken.None);
        Assert.IsNull(created.Error);

        var todayLogs = await service.GetByDateAsync(today, 1, 20, CancellationToken.None);
        Assert.AreEqual(1, todayLogs.TotalCount);
        Assert.AreEqual("Minh Le", todayLogs.Items[0].MemberName);
        Assert.AreEqual("Le Tan A", todayLogs.Items[0].RecordedByName);
    }

    [TestMethod]
    public async Task TC04_VoidInvoiceAndCancelSubscription_ProtectConfirmedPayments()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var db = database.DbContext;
        var member = new Member { FirstName = "Cuong", LastName = "Pham", JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Active };
        var plan = new MembershipPlan { Name = "Quarterly", Price = 1200000m, DurationDays = 90, IsActive = true };
        db.Members.Add(member);
        db.MembershipPlans.Add(plan);
        await db.SaveChangesAsync();

        var subService = new SubscriptionService(db);
        var invService = new InvoiceService(db);
        var payService = new PaymentService(db);

        // Case A: Unpaid pending subscription + invoice -> Cancel cancels sub and auto-voids invoice
        var subA = (await subService.CreateAsync(new CreateSubscriptionRequest { MemberId = member.Id, MembershipPlanId = plan.Id }, CancellationToken.None)).Subscription!;
        var invA = (await invService.CreateAsync(new CreateInvoiceRequest { SubscriptionId = subA.Id }, 1, CancellationToken.None)).Invoice!;
        var cancelled = await subService.CancelAsync(subA.Id, null, CancellationToken.None);
        Assert.IsNull(cancelled.Error);
        Assert.AreEqual(SubscriptionStatus.Cancelled, cancelled.Subscription!.Status);
        Assert.AreEqual(InvoiceStatus.Voided, (await db.Invoices.SingleAsync(i => i.Id == invA.Id)).Status);

        // Case B: Invoice with confirmed partial payment -> Void MUST fail
        var subB = (await subService.CreateAsync(new CreateSubscriptionRequest { MemberId = member.Id, MembershipPlanId = plan.Id }, CancellationToken.None)).Subscription!;
        var invB = (await invService.CreateAsync(new CreateInvoiceRequest { SubscriptionId = subB.Id }, 1, CancellationToken.None)).Invoice!;
        var p1 = (await payService.CreateAsync(invB.Id, new CreatePaymentRequest { Amount = 400000m, Method = PaymentMethod.Cash }, 1, CancellationToken.None)).Payment!;
        await payService.ConfirmAsync(p1.Id, new ConfirmPaymentRequest(), 1, CancellationToken.None);

        var voidAttempt = await invService.VoidAsync(invB.Id, CancellationToken.None);
        Assert.AreEqual(InvoiceError.InvoiceHasConfirmedPayments, voidAttempt.Error);
    }

    [TestMethod]
    public async Task TC05_FreezeSubscription_ExtendsEndDateForActiveOnly()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var db = database.DbContext;
        var today = GymClock.TodayVietnam();
        var member = new Member { FirstName = "Duc", LastName = "Hoang", JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Active };
        var plan = new MembershipPlan { Name = "Monthly", Price = 500000m, DurationDays = 30, IsActive = true };
        db.Members.Add(member);
        db.MembershipPlans.Add(plan);
        await db.SaveChangesAsync();

        var activeSub = new Subscription { MemberId = member.Id, MembershipPlanId = plan.Id, StartsOn = today, EndsOn = today.AddDays(29), Status = SubscriptionStatus.Active, CreatedAtUtc = DateTime.UtcNow };
        db.Subscriptions.Add(activeSub);
        await db.SaveChangesAsync();

        var result = await new SubscriptionService(db).FreezeAsync(activeSub.Id, 10, CancellationToken.None);
        Assert.IsNull(result.Error);
        Assert.AreEqual(today.AddDays(39), result.Subscription!.EndsOn);
    }

    [TestMethod]
    public async Task TC06_InvoiceSummaryAndAnalytics_TrackDebtAndRevenueAccurately()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var db = database.DbContext;
        var member = new Member { FirstName = "Hoa", LastName = "Vu", JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Active };
        var plan = new MembershipPlan { Name = "VIP 3M", Price = 1500000m, DurationDays = 90, IsActive = true };
        db.Members.Add(member);
        db.MembershipPlans.Add(plan);
        await db.SaveChangesAsync();

        var sub = (await new SubscriptionService(db).CreateAsync(new CreateSubscriptionRequest { MemberId = member.Id, MembershipPlanId = plan.Id }, CancellationToken.None)).Subscription!;
        var inv = (await new InvoiceService(db).CreateAsync(new CreateInvoiceRequest { SubscriptionId = sub.Id }, 1, CancellationToken.None)).Invoice!;
        var payService = new PaymentService(db);
        var p1 = (await payService.CreateAsync(inv.Id, new CreatePaymentRequest { Amount = 500000m, Method = PaymentMethod.Cash }, 1, CancellationToken.None)).Payment!;
        await payService.ConfirmAsync(p1.Id, new ConfirmPaymentRequest(), 1, CancellationToken.None);

        var summary = await new InvoiceService(db).GetSummaryAsync(CancellationToken.None);
        Assert.AreEqual(1, summary.PendingCount);
        Assert.AreEqual(1000000m, summary.TotalOutstandingDebt);
        Assert.AreEqual(500000m, summary.TotalCollected);
    }

    [TestMethod]
    public async Task TC07_PortalRegister_MatchesExactEmailBeforeSharedPhoneNumber()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var db = database.DbContext;
        var sharedPhone = "0388775804";
        var member1 = new Member { FirstName = "Huy", LastName = "Bui", Email = "huyantv@gmail.com", Phone = sharedPhone, JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Active };
        var member2 = new Member { FirstName = "Van", LastName = "An", Email = "anbeo@gmail.com", Phone = sharedPhone, JoinedAtUtc = DateTime.UtcNow, Status = MemberStatus.Active };
        var plan = new MembershipPlan { Name = "30 Days", Price = 1000000m, DurationDays = 30, IsActive = true };
        db.Members.AddRange(member1, member2);
        db.MembershipPlans.Add(plan);
        await db.SaveChangesAsync();

        var controller = new PortalController(db);
        var res = await controller.RegisterPlan(new PortalRegistrationRequest
        {
            FirstName = "Van",
            LastName = "An",
            Email = "anbeo@gmail.com",
            Phone = sharedPhone,
            MembershipPlanId = plan.Id,
            PaymentMethod = PaymentMethod.BankTransfer
        }, CancellationToken.None);

        var obj = (ObjectResult)res.Result!;
        var body = (PortalRegistrationResponse)obj.Value!;
        Assert.AreEqual(member2.Id, body.MemberId);
    }

    [TestMethod]
    public async Task TC08_AdminDelete_AllowsUnusedAndBlocksReferencedRecords()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var db = database.DbContext;
        var memberService = new MemberService(db);
        var planService = new MembershipPlanService(db);

        var unusedMember = (await memberService.CreateAsync(new CreateMemberRequest { FirstName = "Test", LastName = "Free" }, CancellationToken.None)).Member!;
        var (deletedUnused, _) = await memberService.DeleteAsync(unusedMember.Id, CancellationToken.None);
        Assert.IsTrue(deletedUnused);

        var usedMember = (await memberService.CreateAsync(new CreateMemberRequest { FirstName = "Test", LastName = "Used" }, CancellationToken.None)).Member!;
        var usedPlan = await planService.CreateAsync(new CreateMembershipPlanRequest { Name = "Basic", Price = 200000m, DurationDays = 30 }, CancellationToken.None);
        await new SubscriptionService(db).CreateAsync(new CreateSubscriptionRequest { MemberId = usedMember.Id, MembershipPlanId = usedPlan.Id }, CancellationToken.None);

        var (delMember, memberHasRel) = await memberService.DeleteAsync(usedMember.Id, CancellationToken.None);
        Assert.IsFalse(delMember);
        Assert.IsTrue(memberHasRel);

        var (delPlan, planHasRel) = await planService.DeleteAsync(usedPlan.Id, CancellationToken.None);
        Assert.IsFalse(delPlan);
        Assert.IsTrue(planHasRel);
    }
}

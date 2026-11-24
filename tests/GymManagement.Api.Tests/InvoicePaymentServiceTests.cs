using GymManagement.Api.Data;
using GymManagement.Api.DTOs.Invoices;
using GymManagement.Api.DTOs.Payments;
using GymManagement.Api.Models;
using GymManagement.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GymManagement.Api.Tests;

[TestClass]
public sealed class InvoicePaymentServiceTests
{
    [TestMethod]
    public async Task CreateInvoice_SnapshotsPlanTermsAndRejectsDuplicatePendingInvoice()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var (member, plan, subscription) = await SeedPendingSubscriptionAsync(database.DbContext);
        var service = new InvoiceService(database.DbContext);

        var created = await service.CreateAsync(new CreateInvoiceRequest
        {
            SubscriptionId = subscription.Id
        }, createdByUserId: 12, CancellationToken.None);

        plan.Name = "Changed name";
        plan.Price = 999m;
        plan.DurationDays = 365;
        await database.DbContext.SaveChangesAsync();
        var duplicate = await service.CreateAsync(new CreateInvoiceRequest
        {
            SubscriptionId = subscription.Id
        }, createdByUserId: 12, CancellationToken.None);

        Assert.IsNull(created.Error);
        Assert.IsNotNull(created.Invoice);
        Assert.AreEqual("Monthly", created.Invoice.PlanNameSnapshot);
        Assert.AreEqual(100m, created.Invoice.TotalAmount);
        Assert.AreEqual(30, created.Invoice.PlanDurationDaysSnapshot);
        Assert.AreEqual(InvoiceError.InvoiceAlreadyExists, duplicate.Error);
        Assert.AreEqual(member.Id, created.Invoice.MemberId);
    }

    [TestMethod]
    public async Task ConfirmPayment_AtomicallyPaysInvoiceAndActivatesSubscription()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var (_, _, subscription) = await SeedPendingSubscriptionAsync(database.DbContext);
        var invoiceService = new InvoiceService(database.DbContext);
        var createdInvoice = await invoiceService.CreateAsync(new CreateInvoiceRequest
        {
            SubscriptionId = subscription.Id
        }, createdByUserId: 12, CancellationToken.None);
        var paymentService = new PaymentService(database.DbContext);
        var createdPayment = await paymentService.CreateAsync(
            createdInvoice.Invoice!.Id,
            new CreatePaymentRequest { Amount = 100m, Method = PaymentMethod.BankTransfer },
            createdByUserId: 12,
            CancellationToken.None);

        var confirmed = await paymentService.ConfirmAsync(
            createdPayment.Payment!.Id,
            new ConfirmPaymentRequest { Reference = "BANK-REF-1" },
            reviewedByUserId: 18,
            CancellationToken.None);

        Assert.IsNull(confirmed.Error);
        Assert.AreEqual(PaymentStatus.Confirmed, confirmed.Payment!.Status);
        Assert.AreEqual(18, confirmed.Payment.ReviewedByUserId);
        Assert.AreEqual(InvoiceStatus.Paid,
            (await database.DbContext.Invoices.SingleAsync()).Status);
        var activated = await database.DbContext.Subscriptions.SingleAsync();
        Assert.AreEqual(SubscriptionStatus.Active, activated.Status);
        Assert.IsNotNull(activated.StartsOn);
        Assert.AreEqual(29, activated.EndsOn!.Value.DayNumber - activated.StartsOn!.Value.DayNumber);
    }

    [TestMethod]
    public async Task ConfirmPayment_SupportsPartialPaymentsAndRejectsOverpayment()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var (_, _, subscription) = await SeedPendingSubscriptionAsync(database.DbContext);
        var invoice = await new InvoiceService(database.DbContext).CreateAsync(
            new CreateInvoiceRequest { SubscriptionId = subscription.Id },
            createdByUserId: 12,
            CancellationToken.None);
        var paymentService = new PaymentService(database.DbContext);

        // Overpayment is rejected on creation
        var overpayment = await paymentService.CreateAsync(
            invoice.Invoice!.Id,
            new CreatePaymentRequest { Amount = 101m, Method = PaymentMethod.Cash },
            createdByUserId: 12,
            CancellationToken.None);
        Assert.AreEqual(PaymentError.AmountMismatch, overpayment.Error);

        // First partial payment (60 / 100) confirms the payment but keeps invoice & subscription pending
        var first = await paymentService.CreateAsync(
            invoice.Invoice.Id,
            new CreatePaymentRequest { Amount = 60m, Method = PaymentMethod.Cash },
            createdByUserId: 12,
            CancellationToken.None);
        var firstConfirm = await paymentService.ConfirmAsync(
            first.Payment!.Id,
            new ConfirmPaymentRequest(),
            reviewedByUserId: 18,
            CancellationToken.None);
        Assert.IsNull(firstConfirm.Error);
        Assert.AreEqual(PaymentStatus.Confirmed, firstConfirm.Payment!.Status);
        Assert.AreEqual(InvoiceStatus.PendingPayment, (await database.DbContext.Invoices.SingleAsync()).Status);
        Assert.AreEqual(SubscriptionStatus.PendingPayment, (await database.DbContext.Subscriptions.SingleAsync()).Status);

        // Second payment exceeding remaining (41 > 40) is rejected
        var tooMuch = await paymentService.CreateAsync(
            invoice.Invoice.Id,
            new CreatePaymentRequest { Amount = 41m, Method = PaymentMethod.Cash },
            createdByUserId: 12,
            CancellationToken.None);
        Assert.AreEqual(PaymentError.AmountMismatch, tooMuch.Error);

        // Final payment (40 / 40 remaining) pays invoice and activates subscription
        var second = await paymentService.CreateAsync(
            invoice.Invoice.Id,
            new CreatePaymentRequest { Amount = 40m, Method = PaymentMethod.Cash },
            createdByUserId: 12,
            CancellationToken.None);
        var secondConfirm = await paymentService.ConfirmAsync(
            second.Payment!.Id,
            new ConfirmPaymentRequest(),
            reviewedByUserId: 18,
            CancellationToken.None);
        Assert.IsNull(secondConfirm.Error);
        Assert.AreEqual(InvoiceStatus.Paid, (await database.DbContext.Invoices.SingleAsync()).Status);
        Assert.AreEqual(SubscriptionStatus.Active, (await database.DbContext.Subscriptions.SingleAsync()).Status);
    }

    [TestMethod]
    public async Task ConfirmPayment_AllowsEarlySubscriptionActivationOnDepositAndKeepsPeriodOnFinalPayment()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var (_, _, subscription) = await SeedPendingSubscriptionAsync(database.DbContext);
        var invoice = await new InvoiceService(database.DbContext).CreateAsync(
            new CreateInvoiceRequest { SubscriptionId = subscription.Id },
            createdByUserId: 12,
            CancellationToken.None);
        var paymentService = new PaymentService(database.DbContext);

        // Deposit (30 / 100) with ActivateSubscriptionNow = true -> Subscription Active, Invoice still PendingPayment
        var deposit = await paymentService.CreateAsync(
            invoice.Invoice!.Id,
            new CreatePaymentRequest { Amount = 30m, Method = PaymentMethod.Cash },
            createdByUserId: 12,
            CancellationToken.None);
        var depositConfirm = await paymentService.ConfirmAsync(
            deposit.Payment!.Id,
            new ConfirmPaymentRequest { ActivateSubscriptionNow = true },
            reviewedByUserId: 18,
            CancellationToken.None);

        Assert.IsNull(depositConfirm.Error);
        var subAfterDeposit = await database.DbContext.Subscriptions.SingleAsync();
        var invAfterDeposit = await database.DbContext.Invoices.SingleAsync();
        Assert.AreEqual(SubscriptionStatus.Active, subAfterDeposit.Status);
        Assert.IsNotNull(subAfterDeposit.StartsOn);
        Assert.IsNotNull(subAfterDeposit.EndsOn);
        Assert.AreEqual(InvoiceStatus.PendingPayment, invAfterDeposit.Status);

        var originalStart = subAfterDeposit.StartsOn;
        var originalEnd = subAfterDeposit.EndsOn;

        // Remaining balance (70 / 100) -> Invoice Paid, Subscription stays Active with original dates intact
        var finalPay = await paymentService.CreateAsync(
            invoice.Invoice.Id,
            new CreatePaymentRequest { Amount = 70m, Method = PaymentMethod.BankTransfer },
            createdByUserId: 12,
            CancellationToken.None);
        var finalConfirm = await paymentService.ConfirmAsync(
            finalPay.Payment!.Id,
            new ConfirmPaymentRequest { Reference = "FINAL-REF" },
            reviewedByUserId: 18,
            CancellationToken.None);

        Assert.IsNull(finalConfirm.Error);
        var subAfterFinal = await database.DbContext.Subscriptions.SingleAsync();
        var invAfterFinal = await database.DbContext.Invoices.SingleAsync();
        Assert.AreEqual(InvoiceStatus.Paid, invAfterFinal.Status);
        Assert.AreEqual(SubscriptionStatus.Active, subAfterFinal.Status);
        Assert.AreEqual(originalStart, subAfterFinal.StartsOn);
        Assert.AreEqual(originalEnd, subAfterFinal.EndsOn);
    }

    private static async Task<(Member Member, MembershipPlan Plan, Subscription Subscription)>
        SeedPendingSubscriptionAsync(GymDbContext dbContext)
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

        var subscription = new Subscription
        {
            MemberId = member.Id,
            MembershipPlanId = plan.Id,
            CreatedAtUtc = DateTime.UtcNow,
            Status = SubscriptionStatus.PendingPayment
        };
        dbContext.Subscriptions.Add(subscription);
        await dbContext.SaveChangesAsync();
        return (member, plan, subscription);
    }
}

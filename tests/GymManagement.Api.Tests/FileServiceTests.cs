using GymManagement.Api.Data;
using GymManagement.Api.DTOs.Payments;
using GymManagement.Api.Models;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.VisualStudio.TestTools.UnitTesting;

namespace GymManagement.Api.Tests;

[TestClass]
public sealed class FileServiceTests
{
    [TestMethod]
    public async Task UploadAsync_SavesFileToDatabaseAndReturnsDto()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var fileService = new FileService(database.DbContext);

        var fileContent = "Fake binary receipt content"u8.ToArray();
        var formFile = new FormFile(
            new MemoryStream(fileContent),
            0,
            fileContent.Length,
            "File",
            "receipt.png")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/png"
        };

        var result = await fileService.UploadAsync(formFile);

        Assert.IsNotNull(result);
        Assert.IsTrue(result.Id > 0);
        Assert.AreEqual("receipt.png", result.FileName);
        Assert.AreEqual(fileContent.Length, result.Size);

        var stored = await fileService.GetFileAsync(result.Id);
        Assert.IsNotNull(stored);
        Assert.AreEqual("image/png", stored.ContentType);
        Assert.AreEqual("receipt.png", stored.FileName);
        CollectionAssert.AreEqual(fileContent, stored.Content);
    }

    [TestMethod]
    public async Task UploadAsync_RejectsInvalidContentType()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var fileService = new FileService(database.DbContext);

        var fileContent = "executable code"u8.ToArray();
        var formFile = new FormFile(
            new MemoryStream(fileContent),
            0,
            fileContent.Length,
            "File",
            "script.exe")
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/x-msdownload"
        };

        var ex = await Assert.ThrowsAsync<ArgumentException>(async () => await fileService.UploadAsync(formFile));
        Assert.IsNotNull(ex);
    }

    [TestMethod]
    public async Task AttachReceipt_LinksPaymentToStoredFile()
    {
        await using var database = await RelationalTestDatabase.CreateAsync();
        var fileService = new FileService(database.DbContext);
        var paymentService = new PaymentService(database.DbContext);

        var fileContent = "Fake receipt"u8.ToArray();
        var formFile = new FormFile(
            new MemoryStream(fileContent),
            0,
            fileContent.Length,
            "File",
            "receipt.jpg")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/jpeg"
        };
        var uploaded = await fileService.UploadAsync(formFile);

        var invoice = await SeedInvoiceAsync(database.DbContext);

        var payment = new Payment
        {
            InvoiceId = invoice.Id,
            Amount = 500_000m,
            Method = PaymentMethod.BankTransfer,
            Status = PaymentStatus.PendingConfirmation,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = 1
        };
        database.DbContext.Payments.Add(payment);
        await database.DbContext.SaveChangesAsync();

        var (updated, error) = await paymentService.AttachReceiptAsync(payment.Id, uploaded.Id, CancellationToken.None);

        Assert.IsNull(error);
        Assert.IsNotNull(updated);
        Assert.AreEqual(uploaded.Id, updated.ReceiptFileId);
    }

    private static async Task<Invoice> SeedInvoiceAsync(GymDbContext dbContext)
    {
        var member = new Member
        {
            FirstName = "Minh",
            LastName = "Le",
            JoinedAtUtc = DateTime.UtcNow,
            Status = MemberStatus.Active
        };
        var plan = new MembershipPlan
        {
            Name = "Basic Plan",
            Price = 500_000m,
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

        var invoice = new Invoice
        {
            MemberId = member.Id,
            SubscriptionId = subscription.Id,
            Number = $"INV-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
            PlanNameSnapshot = plan.Name,
            PlanDurationDaysSnapshot = plan.DurationDays,
            TotalAmount = plan.Price,
            Status = InvoiceStatus.PendingPayment,
            CreatedAtUtc = DateTime.UtcNow
        };
        dbContext.Invoices.Add(invoice);
        await dbContext.SaveChangesAsync();

        return invoice;
    }
}

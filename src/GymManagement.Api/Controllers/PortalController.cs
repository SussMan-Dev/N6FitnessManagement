using System.Data;
using GymManagement.Api.Data;
using GymManagement.Api.DTOs.Portal;
using GymManagement.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/portal")]
public sealed class PortalController(GymDbContext dbContext) : ControllerBase
{
    private const string DefaultBankName = "MB Bank (Ngân hàng Quân Đội)";
    private const string DefaultBankCode = "MB";
    private const string DefaultAccountNumber = "9999888899";
    private const string DefaultAccountName = "FITNESS MANAGEMENT CLUB";

    [HttpGet("plans")]
    [ProducesResponseType(typeof(IReadOnlyList<PortalPlanItemResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PortalPlanItemResponse>>> GetPublicPlans(
        CancellationToken cancellationToken)
    {
        var plans = await dbContext.MembershipPlans.AsNoTracking()
            .Where(plan => plan.IsActive)
            .OrderBy(plan => plan.Price)
            .ToListAsync(cancellationToken);

        var response = plans.Select(plan =>
        {
            var highlights = GenerateHighlights(plan);
            return new PortalPlanItemResponse(
                plan.Id,
                plan.Name,
                plan.Description,
                plan.Price,
                plan.DurationDays,
                highlights);
        }).ToList();

        return Ok(response);
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(PortalRegistrationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PortalRegistrationResponse>> RegisterPlan(
        PortalRegistrationRequest request,
        CancellationToken cancellationToken)
    {
        var plan = await dbContext.MembershipPlans.AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == request.MembershipPlanId, cancellationToken);

        if (plan is null)
        {
            return NotFound(new ProblemDetails { Title = "Gói tập không tồn tại trên hệ thống." });
        }

        if (!plan.IsActive)
        {
            return BadRequest(new ProblemDetails { Title = "Gói tập này hiện đang tạm dừng tiếp nhận đăng ký mới." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var phone = request.Phone.Trim();

        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);

        // 1. Locate or create member
        var member = await dbContext.Members
            .FirstOrDefaultAsync(m => m.Email == email || m.Phone == phone, cancellationToken);

        var now = DateTime.UtcNow;

        if (member is null)
        {
            member = new Member
            {
                FirstName = request.FirstName.Trim(),
                LastName = request.LastName.Trim(),
                Email = email,
                Phone = phone,
                BirthDate = request.BirthDate,
                JoinedAtUtc = now,
                Status = MemberStatus.Active
            };
            dbContext.Members.Add(member);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        else
        {
            if (member.Status != MemberStatus.Active)
            {
                member.Status = MemberStatus.Active;
            }

            if (!string.IsNullOrWhiteSpace(request.FirstName)) member.FirstName = request.FirstName.Trim();
            if (!string.IsNullOrWhiteSpace(request.LastName)) member.LastName = request.LastName.Trim();
            if (request.BirthDate.HasValue) member.BirthDate = request.BirthDate;
            if (string.IsNullOrWhiteSpace(member.Phone) && !string.IsNullOrWhiteSpace(phone)) member.Phone = phone;

            await dbContext.SaveChangesAsync(cancellationToken);
        }

        // 2. Identify system user for auditing
        var systemUserId = await dbContext.Users
            .Select(u => u.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (systemUserId == 0)
        {
            systemUserId = 1;
        }

        // 3. Create Subscription
        var startsOn = request.StartsOn ?? DateOnly.FromDateTime(now);
        var endsOn = startsOn.AddDays(plan.DurationDays);

        var subscription = new Subscription
        {
            MemberId = member.Id,
            MembershipPlanId = plan.Id,
            StartsOn = startsOn,
            EndsOn = endsOn,
            CreatedAtUtc = now,
            Status = SubscriptionStatus.PendingPayment
        };
        dbContext.Subscriptions.Add(subscription);
        await dbContext.SaveChangesAsync(cancellationToken);

        // 4. Create Invoice
        var invoiceNumber = $"INV-{now:yyyyMMdd}-{Guid.NewGuid():N}"[..29].ToUpperInvariant();
        var invoice = new Invoice
        {
            Number = invoiceNumber,
            MemberId = member.Id,
            SubscriptionId = subscription.Id,
            PlanNameSnapshot = plan.Name,
            PlanDurationDaysSnapshot = plan.DurationDays,
            TotalAmount = plan.Price,
            Status = InvoiceStatus.PendingPayment,
            CreatedAtUtc = now,
            CreatedByUserId = systemUserId,
            Version = 1
        };
        dbContext.Invoices.Add(invoice);
        await dbContext.SaveChangesAsync(cancellationToken);

        // 5. Create Payment record for confirmation
        var payment = new Payment
        {
            InvoiceId = invoice.Id,
            Amount = plan.Price,
            Method = request.PaymentMethod,
            Status = PaymentStatus.PendingConfirmation,
            CreatedAtUtc = now,
            CreatedByUserId = systemUserId,
            Reference = string.IsNullOrWhiteSpace(request.Note) ? "Đăng ký trực tuyến" : request.Note.Trim(),
            Version = 1
        };
        dbContext.Payments.Add(payment);
        await dbContext.SaveChangesAsync(cancellationToken);

        await transaction.CommitAsync(cancellationToken);

        var transferContent = $"GYM {invoice.Number}";
        var qrUrl = $"https://img.vietqr.io/image/{DefaultBankCode}-{DefaultAccountNumber}-compact2.png?amount={(long)plan.Price}&addInfo={Uri.EscapeDataString(transferContent)}&accountName={Uri.EscapeDataString(DefaultAccountName)}";

        var response = new PortalRegistrationResponse(
            InvoiceNumber: invoice.Number,
            InvoiceId: invoice.Id,
            MemberId: member.Id,
            FullName: $"{member.LastName} {member.FirstName}".Trim(),
            Email: member.Email ?? email,
            Phone: member.Phone ?? phone,
            PlanId: plan.Id,
            PlanName: plan.Name,
            Price: plan.Price,
            DurationDays: plan.DurationDays,
            StartsOn: startsOn,
            EndsOn: endsOn,
            PaymentMethod: request.PaymentMethod == PaymentMethod.Cash ? "Tiền mặt tại quầy" : "Chuyển khoản ngân hàng",
            BankName: DefaultBankName,
            BankAccountNumber: DefaultAccountNumber,
            BankAccountName: DefaultAccountName,
            TransferContent: transferContent,
            QrCodeUrl: qrUrl,
            CreatedAtUtc: now);

        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpGet("lookup")]
    [ProducesResponseType(typeof(PortalLookupResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PortalLookupResponse>> Lookup(
        [FromQuery] string query,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return BadRequest(new ProblemDetails { Title = "Vui lòng nhập Email hoặc Số điện thoại để tra cứu." });
        }

        var trimmed = query.Trim().ToLowerInvariant();
        var member = await dbContext.Members.AsNoTracking()
            .FirstOrDefaultAsync(
                m => (m.Email != null && m.Email.ToLower() == trimmed) || (m.Phone != null && m.Phone == trimmed),
                cancellationToken);

        if (member is null)
        {
            return NotFound(new ProblemDetails { Title = "Không tìm thấy thông tin hội viên tương ứng với Email hoặc Số điện thoại này." });
        }

        var subscriptions = await (
            from s in dbContext.Subscriptions.AsNoTracking()
            where s.MemberId == member.Id
            join p in dbContext.MembershipPlans.AsNoTracking() on s.MembershipPlanId equals p.Id
            orderby s.CreatedAtUtc descending
            select new PortalMemberSubscriptionItem(
                s.Id,
                p.Name,
                s.StartsOn,
                s.EndsOn,
                s.Status,
                s.CreatedAtUtc)
        ).ToListAsync(cancellationToken);

        var invoices = await dbContext.Invoices.AsNoTracking()
            .Where(inv => inv.MemberId == member.Id)
            .OrderByDescending(inv => inv.CreatedAtUtc)
            .Select(inv => new PortalMemberInvoiceItem(
                inv.Id,
                inv.Number,
                inv.PlanNameSnapshot,
                inv.TotalAmount,
                inv.Status,
                inv.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        var response = new PortalLookupResponse(
            MemberId: member.Id,
            FullName: $"{member.LastName} {member.FirstName}".Trim(),
            Email: member.Email,
            Phone: member.Phone,
            Status: member.Status,
            Subscriptions: subscriptions,
            Invoices: invoices);

        return Ok(response);
    }

    private static IReadOnlyList<string> GenerateHighlights(MembershipPlan plan)
    {
        var items = new List<string>
        {
            "Toàn quyền sử dụng trang thiết bị tập luyện hiện đại",
            "Miễn phí sử dụng tủ locker cá nhân và phòng tắm nóng lạnh",
            "Đo và phân tích chỉ số cơ thể InBody định kỳ"
        };

        if (plan.DurationDays >= 90)
        {
            items.Add("Tặng 02 buổi định hướng tập luyện cùng Huấn luyện viên chuyên nghiệp");
        }

        if (plan.DurationDays >= 180)
        {
            items.Add("Miễn phí bảo lưu gói tập tối đa 30 ngày");
            items.Add("Ưu tiên tham gia các lớp Group-X và Yoga không giới hạn");
        }

        if (!string.IsNullOrWhiteSpace(plan.Description))
        {
            items.Add(plan.Description);
        }

        return items;
    }
}


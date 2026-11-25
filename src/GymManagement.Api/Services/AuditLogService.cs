using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GymManagement.Api.Data;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.AuditLogs;
using GymManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Services;

public sealed class AuditLogService(GymDbContext dbContext) : IAuditLogService
{
    public Task LogAsync(
        string action,
        string entityType,
        int? entityId,
        string summary,
        string? details = null,
        ClaimsPrincipal? actor = null,
        CancellationToken cancellationToken = default)
    {
        int? actorUserId = int.TryParse(actor?.FindFirstValue(ClaimTypes.NameIdentifier), out var parsedId)
            ? parsedId
            : null;
        var actorEmail = actor?.FindFirstValue(ClaimTypes.Email)
            ?? actor?.FindFirstValue(JwtRegisteredClaimNames.Email);
        var actorName = actor?.FindFirstValue(ClaimTypes.Name)
            ?? actorEmail
            ?? "Hệ thống";

        return LogExplicitAsync(action, entityType, entityId, summary, details, actorUserId, actorName, actorEmail, cancellationToken);
    }

    public async Task LogExplicitAsync(
        string action,
        string entityType,
        int? entityId,
        string summary,
        string? details,
        int? actorUserId,
        string actorName,
        string? actorEmail,
        CancellationToken cancellationToken = default)
    {
        var entry = new AuditLog
        {
            Action = Truncate(action, 80)!,
            EntityType = Truncate(entityType, 50)!,
            EntityId = entityId,
            Summary = Truncate(summary, 300)!,
            Details = Truncate(details, 1000),
            ActorUserId = actorUserId,
            ActorName = Truncate(string.IsNullOrWhiteSpace(actorName) ? "Hệ thống" : actorName, 120)!,
            ActorEmail = Truncate(actorEmail, 254),
            CreatedAtUtc = DateTime.UtcNow
        };

        dbContext.AuditLogs.Add(entry);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<PagedResponse<AuditLogResponse>> SearchAsync(
        string? search,
        string? entityType,
        string? action,
        int? actorUserId,
        int? memberId,
        DateOnly? from,
        DateOnly? to,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = dbContext.AuditLogs.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            var normalizedEntity = entityType.Trim();
            query = query.Where(item => item.EntityType == normalizedEntity);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            var normalizedAction = action.Trim();
            query = query.Where(item => item.Action == normalizedAction);
        }

        if (actorUserId.HasValue)
        {
            var actor = await dbContext.Users.AsNoTracking()
                .Where(u => u.Id == actorUserId.Value)
                .Select(u => new { u.Id, u.Email })
                .SingleOrDefaultAsync(cancellationToken);

            var actorEmail = actor?.Email;
            query = query.Where(item =>
                item.ActorUserId == actorUserId.Value ||
                (actorEmail != null && item.ActorEmail == actorEmail));
        }

        if (memberId.HasValue)
        {
            var targetMemberId = memberId.Value;
            var subIds = await dbContext.Subscriptions.AsNoTracking()
                .Where(s => s.MemberId == targetMemberId)
                .Select(s => s.Id)
                .ToListAsync(cancellationToken);
            var invoiceIds = await dbContext.Invoices.AsNoTracking()
                .Where(i => i.MemberId == targetMemberId)
                .Select(i => i.Id)
                .ToListAsync(cancellationToken);
            var paymentIds = invoiceIds.Count > 0
                ? await dbContext.Payments.AsNoTracking()
                    .Where(p => invoiceIds.Contains(p.InvoiceId))
                    .Select(p => p.Id)
                    .ToListAsync(cancellationToken)
                : new List<int>();
            var checkInIds = await dbContext.CheckIns.AsNoTracking()
                .Where(c => c.MemberId == targetMemberId)
                .Select(c => c.Id)
                .ToListAsync(cancellationToken);

            var memberTag = $"#{targetMemberId}";
            var memberKv = $"MemberId={targetMemberId}";

            query = query.Where(item =>
                (item.EntityType == "Member" && item.EntityId == targetMemberId) ||
                (item.EntityType == "Subscription" && item.EntityId.HasValue && subIds.Contains(item.EntityId.Value)) ||
                (item.EntityType == "Invoice" && item.EntityId.HasValue && invoiceIds.Contains(item.EntityId.Value)) ||
                (item.EntityType == "Payment" && item.EntityId.HasValue && paymentIds.Contains(item.EntityId.Value)) ||
                (item.EntityType == "CheckIn" && item.EntityId.HasValue && checkInIds.Contains(item.EntityId.Value)) ||
                (item.Details != null && item.Details.Contains(memberKv)) ||
                item.Summary.Contains($"hội viên {memberTag}"));
        }

        if (from.HasValue || to.HasValue)
        {
            var rangeStart = from ?? new DateOnly(2000, 1, 1);
            var rangeEnd = to ?? GymClock.TodayVietnam().AddDays(1);
            var (startUtc, endUtc) = GymClock.VietnamRangeToUtc(rangeStart, rangeEnd);
            query = query.Where(item => item.CreatedAtUtc >= startUtc && item.CreatedAtUtc < endUtc);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(item =>
                item.Summary.ToLower().Contains(term) ||
                (item.Details != null && item.Details.ToLower().Contains(term)) ||
                item.ActorName.ToLower().Contains(term) ||
                (item.ActorEmail != null && item.ActorEmail.ToLower().Contains(term)) ||
                item.Action.ToLower().Contains(term) ||
                item.EntityType.ToLower().Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(item => item.CreatedAtUtc)
            .ThenByDescending(item => item.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new AuditLogResponse(
                item.Id,
                item.Action,
                item.EntityType,
                item.EntityId,
                item.Summary,
                item.Details,
                item.ActorUserId,
                item.ActorName,
                item.ActorEmail,
                item.CreatedAtUtc))
            .ToListAsync(cancellationToken);

        return new PagedResponse<AuditLogResponse>(page, pageSize, totalCount, items);
    }

    public async Task<IReadOnlyList<AuditActorOption>> GetActorsAsync(CancellationToken cancellationToken = default)
    {
        return await dbContext.Users.AsNoTracking()
            .OrderBy(u => u.DisplayName)
            .ThenBy(u => u.Email)
            .Select(u => new AuditActorOption(
                u.Id,
                string.IsNullOrWhiteSpace(u.DisplayName) ? (u.Email ?? $"NV #{u.Id}") : u.DisplayName,
                u.Email))
            .ToListAsync(cancellationToken);
    }

    private static string? Truncate(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..maxLength];
    }
}

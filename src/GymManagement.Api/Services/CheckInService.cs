using GymManagement.Api.Data;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.CheckIns;
using GymManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Services;

public sealed class CheckInService(GymDbContext dbContext) : ICheckInService
{
    public async Task<(CheckInResponse? CheckIn, CheckInError? Error)> CreateAsync(
        int memberId,
        int recordedByUserId,
        CancellationToken cancellationToken)
    {
        var member = await dbContext.Members.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == memberId, cancellationToken);
        if (member is null)
        {
            return (null, CheckInError.MemberNotFound);
        }

        if (member.Status != MemberStatus.Active)
        {
            return (null, CheckInError.MemberNotActive);
        }

        var now = DateTime.UtcNow;
        var today = GymClock.TodayVietnam(now);
        var hasValidSubscription = await dbContext.Subscriptions.AnyAsync(
            subscription => subscription.MemberId == memberId &&
                            subscription.Status == SubscriptionStatus.Active &&
                            subscription.StartsOn <= today &&
                            subscription.EndsOn >= today,
            cancellationToken);
        if (!hasValidSubscription)
        {
            return (null, CheckInError.NoValidSubscription);
        }

        var checkIn = new CheckIn
        {
            MemberId = memberId,
            CheckedInAtUtc = now,
            RecordedByUserId = recordedByUserId,
            Method = "Staff"
        };
        dbContext.CheckIns.Add(checkIn);
        await dbContext.SaveChangesAsync(cancellationToken);
        var staffName = await dbContext.Users.AsNoTracking()
            .Where(u => u.Id == recordedByUserId)
            .Select(u => u.DisplayName)
            .SingleOrDefaultAsync(cancellationToken);
        return (ToResponse(checkIn) with
        {
            MemberName = $"{member.FirstName} {member.LastName}".Trim(),
            MemberPhone = member.Phone,
            RecordedByName = staffName,
        }, null);
    }

    public async Task<PagedResponse<CheckInResponse>> GetByMemberAsync(
        int memberId,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.CheckIns.AsNoTracking().Where(item => item.MemberId == memberId);
        return await ToPagedEnrichedAsync(query, page, pageSize, cancellationToken);
    }

    public async Task<PagedResponse<CheckInResponse>> GetByDateAsync(
        DateOnly date,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var (startUtc, endUtc) = GymClock.VietnamRangeToUtc(date, date);
        var query = dbContext.CheckIns.AsNoTracking()
            .Where(item => item.CheckedInAtUtc >= startUtc && item.CheckedInAtUtc < endUtc);
        return await ToPagedEnrichedAsync(query, page, pageSize, cancellationToken);
    }

    private async Task<PagedResponse<CheckInResponse>> ToPagedEnrichedAsync(
        IQueryable<CheckIn> query,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var checkIns = await query
            .OrderByDescending(item => item.CheckedInAtUtc)
            .ThenByDescending(item => item.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var memberIds = checkIns.Select(c => c.MemberId).Distinct().ToList();
        var members = await dbContext.Members.AsNoTracking()
            .Where(m => memberIds.Contains(m.Id))
            .Select(m => new { m.Id, m.FirstName, m.LastName, m.Phone })
            .ToDictionaryAsync(m => m.Id, cancellationToken);

        var staffIds = checkIns.Select(c => c.RecordedByUserId).Distinct().ToList();
        var staffNames = await dbContext.Users.AsNoTracking()
            .Where(u => staffIds.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName })
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName, cancellationToken);

        var items = checkIns.Select(c =>
        {
            members.TryGetValue(c.MemberId, out var m);
            staffNames.TryGetValue(c.RecordedByUserId, out var staffName);
            return ToResponse(c) with
            {
                MemberName = m is null ? null : $"{m.FirstName} {m.LastName}".Trim(),
                MemberPhone = m?.Phone,
                RecordedByName = staffName,
            };
        }).ToList();

        return new PagedResponse<CheckInResponse>(page, pageSize, totalCount, items);
    }

    private static CheckInResponse ToResponse(CheckIn checkIn) => new(
        checkIn.Id,
        checkIn.MemberId,
        checkIn.CheckedInAtUtc,
        checkIn.RecordedByUserId,
        checkIn.Method);
}
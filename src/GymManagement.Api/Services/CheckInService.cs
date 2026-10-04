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
        var today = DateOnly.FromDateTime(now);
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
        return (ToResponse(checkIn), null);
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
        var totalCount = await query.CountAsync(cancellationToken);
        var checkIns = await query
            .OrderByDescending(item => item.CheckedInAtUtc)
            .ThenByDescending(item => item.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => ToResponse(item))
            .ToListAsync(cancellationToken);

        return new PagedResponse<CheckInResponse>(page, pageSize, totalCount, checkIns);
    }

    private static CheckInResponse ToResponse(CheckIn checkIn) => new(
        checkIn.Id,
        checkIn.MemberId,
        checkIn.CheckedInAtUtc,
        checkIn.RecordedByUserId,
        checkIn.Method);
}
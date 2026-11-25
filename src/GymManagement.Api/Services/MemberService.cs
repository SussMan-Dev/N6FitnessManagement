using GymManagement.Api.Data;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Members;
using GymManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Services;

public sealed class MemberService(GymDbContext dbContext) : IMemberService
{
    public async Task<PagedResponse<MemberResponse>> SearchAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Members.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            var numericTerm = int.TryParse(term.TrimStart('#'), out var parsedId) ? parsedId : (int?)null;
            query = query.Where(member =>
                member.FirstName.Contains(term) ||
                member.LastName.Contains(term) ||
                (member.Email != null && member.Email.Contains(term)) ||
                (member.Phone != null && member.Phone.Contains(term)) ||
                (numericTerm.HasValue && member.Id == numericTerm.Value));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var members = await query
            .OrderBy(member => member.LastName)
            .ThenBy(member => member.FirstName)
            .ThenBy(member => member.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var memberIds = members.Select(m => m.Id).ToList();
        var subscriptions = await dbContext.Subscriptions.AsNoTracking()
            .Where(s => memberIds.Contains(s.MemberId))
            .OrderByDescending(s => s.StartsOn)
            .ThenByDescending(s => s.Id)
            .ToListAsync(cancellationToken);

        var planIds = subscriptions.Select(s => s.MembershipPlanId).Distinct().ToList();
        var plans = await dbContext.MembershipPlans.AsNoTracking()
            .Where(p => planIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, cancellationToken);

        var today = GymClock.TodayVietnam();

        var resultList = members.Select(member =>
        {
            var memberSubs = subscriptions.Where(s => s.MemberId == member.Id).ToList();
            var activeSub = memberSubs.FirstOrDefault(s => s.Status == SubscriptionStatus.Active && (s.EndsOn == null || s.EndsOn >= today))
                            ?? memberSubs.FirstOrDefault(s => s.Status == SubscriptionStatus.Active)
                            ?? memberSubs.FirstOrDefault(s => s.Status == SubscriptionStatus.PendingPayment)
                            ?? memberSubs.FirstOrDefault(s => s.Status == SubscriptionStatus.Expired);

            string? planName = null;
            DateOnly? endsOn = null;
            int? daysRemaining = null;
            SubscriptionStatus? subStatus = null;

            if (activeSub != null)
            {
                subStatus = activeSub.Status;
                endsOn = activeSub.EndsOn;
                if (plans.TryGetValue(activeSub.MembershipPlanId, out var plan))
                {
                    planName = plan.Name;
                }

                if (activeSub.EndsOn.HasValue && activeSub.Status != SubscriptionStatus.Cancelled && activeSub.Status != SubscriptionStatus.PendingPayment)
                {
                    daysRemaining = activeSub.EndsOn.Value.DayNumber - today.DayNumber;
                }
            }

            return new MemberResponse(
                member.Id,
                member.FirstName,
                member.LastName,
                member.Email,
                member.Phone,
                member.BirthDate,
                member.JoinedAtUtc,
                member.Status,
                planName,
                endsOn,
                daysRemaining,
                subStatus);
        }).ToList();

        return new PagedResponse<MemberResponse>(page, pageSize, totalCount, resultList);
    }

    public async Task<MemberResponse?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var member = await dbContext.Members.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        if (member is null) return null;

        var memberSubs = await dbContext.Subscriptions.AsNoTracking()
            .Where(s => s.MemberId == id)
            .OrderByDescending(s => s.StartsOn)
            .ThenByDescending(s => s.Id)
            .ToListAsync(cancellationToken);

        var today = GymClock.TodayVietnam();
        var sub = memberSubs.FirstOrDefault(s => s.Status == SubscriptionStatus.Active && (s.EndsOn == null || s.EndsOn >= today))
                  ?? memberSubs.FirstOrDefault(s => s.Status == SubscriptionStatus.Active)
                  ?? memberSubs.FirstOrDefault(s => s.Status == SubscriptionStatus.PendingPayment)
                  ?? memberSubs.FirstOrDefault(s => s.Status == SubscriptionStatus.Expired);

        string? planName = null;
        DateOnly? endsOn = null;
        int? daysRemaining = null;
        SubscriptionStatus? subStatus = null;

        if (sub != null)
        {
            subStatus = sub.Status;
            endsOn = sub.EndsOn;
            var plan = await dbContext.MembershipPlans.AsNoTracking()
                .SingleOrDefaultAsync(p => p.Id == sub.MembershipPlanId, cancellationToken);
            planName = plan?.Name;
            if (sub.EndsOn.HasValue && sub.Status != SubscriptionStatus.Cancelled && sub.Status != SubscriptionStatus.PendingPayment)
            {
                daysRemaining = sub.EndsOn.Value.DayNumber - today.DayNumber;
            }
        }

        return new MemberResponse(
            member.Id,
            member.FirstName,
            member.LastName,
            member.Email,
            member.Phone,
            member.BirthDate,
            member.JoinedAtUtc,
            member.Status,
            planName,
            endsOn,
            daysRemaining,
            subStatus);
    }

    public async Task<(MemberResponse? Member, bool EmailConflict, bool PhoneConflict)> CreateAsync(
        CreateMemberRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        if (await EmailExistsAsync(email, null, cancellationToken))
        {
            return (null, true, false);
        }

        var phone = NormalizePhone(request.Phone);
        if (await PhoneExistsAsync(phone, null, cancellationToken))
        {
            return (null, false, true);
        }

        var member = new Member
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Phone = phone,
            BirthDate = request.BirthDate,
            JoinedAtUtc = DateTime.UtcNow,
            Status = MemberStatus.Active
        };

        dbContext.Members.Add(member);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            if (await EmailExistsAsync(email, null, cancellationToken))
            {
                return (null, true, false);
            }

            if (await PhoneExistsAsync(phone, null, cancellationToken))
            {
                return (null, false, true);
            }

            throw;
        }

        return (ToResponse(member), false, false);
    }

    public async Task<(MemberResponse? Member, bool EmailConflict, bool PhoneConflict)> UpdateAsync(
        int id,
        UpdateMemberRequest request,
        CancellationToken cancellationToken)
    {
        var member = await dbContext.Members.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (member is null)
        {
            return (null, false, false);
        }

        var email = NormalizeEmail(request.Email);
        if (await EmailExistsAsync(email, id, cancellationToken))
        {
            return (null, true, false);
        }

        var phone = NormalizePhone(request.Phone);
        if (await PhoneExistsAsync(phone, id, cancellationToken))
        {
            return (null, false, true);
        }

        member.FirstName = request.FirstName.Trim();
        member.LastName = request.LastName.Trim();
        member.Email = email;
        member.Phone = phone;
        member.BirthDate = request.BirthDate;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            if (await EmailExistsAsync(email, id, cancellationToken))
            {
                return (null, true, false);
            }

            if (await PhoneExistsAsync(phone, id, cancellationToken))
            {
                return (null, false, true);
            }

            throw;
        }

        return (ToResponse(member), false, false);
    }

    public async Task<bool> UpdateStatusAsync(
        int id,
        MemberStatus status,
        CancellationToken cancellationToken)
    {
        var member = await dbContext.Members.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (member is null)
        {
            return false;
        }

        member.Status = status;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<(bool Deleted, bool HasRelatedRecords)> DeleteAsync(
        int id,
        CancellationToken cancellationToken)
    {
        var member = await dbContext.Members.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (member is null)
        {
            return (false, false);
        }

        var hasBlockingSubscription = await dbContext.Subscriptions.AnyAsync(
            item => item.MemberId == id && (item.Status == SubscriptionStatus.Active || item.Status == SubscriptionStatus.PendingPayment),
            cancellationToken);
        if (hasBlockingSubscription)
        {
            return (false, true);
        }

        // Clean up historical records in FK-safe order (AuditLogs are kept intact for traceability).
        var checkIns = await dbContext.CheckIns.Where(item => item.MemberId == id).ToListAsync(cancellationToken);
        if (checkIns.Count > 0)
        {
            dbContext.CheckIns.RemoveRange(checkIns);
        }

        var invoices = await dbContext.Invoices.Where(item => item.MemberId == id).ToListAsync(cancellationToken);
        if (invoices.Count > 0)
        {
            var invoiceIds = invoices.Select(i => i.Id).ToList();
            var payments = await dbContext.Payments.Where(p => invoiceIds.Contains(p.InvoiceId)).ToListAsync(cancellationToken);
            if (payments.Count > 0)
            {
                dbContext.Payments.RemoveRange(payments);
            }

            dbContext.Invoices.RemoveRange(invoices);
        }

        var subscriptions = await dbContext.Subscriptions.Where(item => item.MemberId == id).ToListAsync(cancellationToken);
        if (subscriptions.Count > 0)
        {
            foreach (var sub in subscriptions)
            {
                sub.RenewedFromSubscriptionId = null;
            }
            await dbContext.SaveChangesAsync(cancellationToken);
            dbContext.Subscriptions.RemoveRange(subscriptions);
        }

        dbContext.Members.Remove(member);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (true, false);
    }

    private Task<bool> EmailExistsAsync(string? email, int? excludedId, CancellationToken cancellationToken)
    {
        if (email is null)
        {
            return Task.FromResult(false);
        }

        return dbContext.Members.AnyAsync(
            member => member.Email == email && (excludedId == null || member.Id != excludedId),
            cancellationToken);
    }

    private Task<bool> PhoneExistsAsync(string? phone, int? excludedId, CancellationToken cancellationToken)
    {
        if (phone is null)
        {
            return Task.FromResult(false);
        }

        return dbContext.Members.AnyAsync(
            member => member.Phone == phone && (excludedId == null || member.Id != excludedId),
            cancellationToken);
    }

    private static string? NormalizeEmail(string? email) => NormalizeOptional(email)?.ToLowerInvariant();

    private static string? NormalizePhone(string? phone)
    {
        var normalized = NormalizeOptional(phone);
        if (normalized is null)
        {
            return null;
        }

        var compact = new string(normalized.Where(c => !char.IsWhiteSpace(c) && c != '-' && c != '.').ToArray());
        return string.IsNullOrEmpty(compact) ? null : compact;
    }

    private static string? NormalizeOptional(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrEmpty(normalized) ? null : normalized;
    }

    private static MemberResponse ToResponse(Member member) => new(
        member.Id,
        member.FirstName,
        member.LastName,
        member.Email,
        member.Phone,
        member.BirthDate,
        member.JoinedAtUtc,
        member.Status);
}

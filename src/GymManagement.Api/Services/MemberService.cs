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
            query = query.Where(member =>
                member.FirstName.Contains(term) ||
                member.LastName.Contains(term) ||
                (member.Email != null && member.Email.Contains(term)) ||
                (member.Phone != null && member.Phone.Contains(term)));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var members = await query
            .OrderBy(member => member.LastName)
            .ThenBy(member => member.FirstName)
            .ThenBy(member => member.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(member => ToResponse(member))
            .ToListAsync(cancellationToken);

        return new PagedResponse<MemberResponse>(page, pageSize, totalCount, members);
    }

    public async Task<MemberResponse?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var member = await dbContext.Members.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return member is null ? null : ToResponse(member);
    }

    public async Task<(MemberResponse? Member, bool EmailConflict)> CreateAsync(
        CreateMemberRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        if (await EmailExistsAsync(email, null, cancellationToken))
        {
            return (null, true);
        }

        var member = new Member
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Phone = NormalizeOptional(request.Phone),
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
                return (null, true);
            }

            throw;
        }

        return (ToResponse(member), false);
    }

    public async Task<(MemberResponse? Member, bool EmailConflict)> UpdateAsync(
        int id,
        UpdateMemberRequest request,
        CancellationToken cancellationToken)
    {
        var member = await dbContext.Members.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (member is null)
        {
            return (null, false);
        }

        var email = NormalizeEmail(request.Email);
        if (await EmailExistsAsync(email, id, cancellationToken))
        {
            return (null, true);
        }

        member.FirstName = request.FirstName.Trim();
        member.LastName = request.LastName.Trim();
        member.Email = email;
        member.Phone = NormalizeOptional(request.Phone);
        member.BirthDate = request.BirthDate;

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            if (await EmailExistsAsync(email, id, cancellationToken))
            {
                return (null, true);
            }

            throw;
        }

        return (ToResponse(member), false);
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

    private static string? NormalizeEmail(string? email) => NormalizeOptional(email)?.ToLowerInvariant();

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

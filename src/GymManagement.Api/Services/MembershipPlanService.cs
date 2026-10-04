using GymManagement.Api.Data;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.MembershipPlans;
using GymManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Services;

public sealed class MembershipPlanService(GymDbContext dbContext) : IMembershipPlanService
{
    public async Task<PagedResponse<MembershipPlanResponse>> SearchAsync(
        string? search,
        bool includeInactive,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.MembershipPlans.AsNoTracking();

        if (!includeInactive)
        {
            query = query.Where(plan => plan.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(plan => plan.Name.Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var plans = await query
            .OrderBy(plan => plan.Name)
            .ThenBy(plan => plan.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(plan => ToResponse(plan))
            .ToListAsync(cancellationToken);

        return new PagedResponse<MembershipPlanResponse>(page, pageSize, totalCount, plans);
    }

    public async Task<MembershipPlanResponse?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var plan = await dbContext.MembershipPlans.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);

        return plan is null ? null : ToResponse(plan);
    }

    public async Task<MembershipPlanResponse> CreateAsync(
        CreateMembershipPlanRequest request,
        CancellationToken cancellationToken)
    {
        var plan = new MembershipPlan
        {
            Name = request.Name.Trim(),
            Description = NormalizeOptional(request.Description),
            Price = request.Price,
            DurationDays = request.DurationDays,
            IsActive = true
        };

        dbContext.MembershipPlans.Add(plan);
        await dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(plan);
    }

    public async Task<MembershipPlanResponse?> UpdateAsync(
        int id,
        UpdateMembershipPlanRequest request,
        CancellationToken cancellationToken)
    {
        var plan = await dbContext.MembershipPlans.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (plan is null)
        {
            return null;
        }

        plan.Name = request.Name.Trim();
        plan.Description = NormalizeOptional(request.Description);
        plan.Price = request.Price;
        plan.DurationDays = request.DurationDays;

        await dbContext.SaveChangesAsync(cancellationToken);
        return ToResponse(plan);
    }

    public async Task<bool> UpdateStatusAsync(
        int id,
        bool isActive,
        CancellationToken cancellationToken)
    {
        var plan = await dbContext.MembershipPlans.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (plan is null)
        {
            return false;
        }

        plan.IsActive = isActive;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static string? NormalizeOptional(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrEmpty(normalized) ? null : normalized;
    }

    private static MembershipPlanResponse ToResponse(MembershipPlan plan) => new(
        plan.Id,
        plan.Name,
        plan.Description,
        plan.Price,
        plan.DurationDays,
        plan.IsActive);
}

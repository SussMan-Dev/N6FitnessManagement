using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.MembershipPlans;

namespace GymManagement.Api.Services;

public interface IMembershipPlanService
{
    Task<PagedResponse<MembershipPlanResponse>> SearchAsync(
        string? search,
        bool includeInactive,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<MembershipPlanResponse?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<MembershipPlanResponse> CreateAsync(
        CreateMembershipPlanRequest request,
        CancellationToken cancellationToken);

    Task<MembershipPlanResponse?> UpdateAsync(
        int id,
        UpdateMembershipPlanRequest request,
        CancellationToken cancellationToken);

    Task<bool> UpdateStatusAsync(int id, bool isActive, CancellationToken cancellationToken);
}

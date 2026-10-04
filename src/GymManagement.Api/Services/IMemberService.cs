using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Members;

namespace GymManagement.Api.Services;

public interface IMemberService
{
    Task<PagedResponse<MemberResponse>> SearchAsync(
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<MemberResponse?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<(MemberResponse? Member, bool EmailConflict)> CreateAsync(
        CreateMemberRequest request,
        CancellationToken cancellationToken);

    Task<(MemberResponse? Member, bool EmailConflict)> UpdateAsync(
        int id,
        UpdateMemberRequest request,
        CancellationToken cancellationToken);

    Task<bool> UpdateStatusAsync(int id, Models.MemberStatus status, CancellationToken cancellationToken);
}

using GymManagement.Api.DTOs.Auth;

namespace GymManagement.Api.Services;

public interface IUserManagementService
{
    Task<StaffResponse?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<IReadOnlyList<StaffResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<(StaffResponse? Staff, IReadOnlyList<string> Errors)> CreateStaffAsync(
        CreateStaffRequest request,
        CancellationToken cancellationToken);

    Task<(StaffResponse? Staff, string? Error)> ToggleStaffStatusAsync(
        int id,
        CancellationToken cancellationToken);
}

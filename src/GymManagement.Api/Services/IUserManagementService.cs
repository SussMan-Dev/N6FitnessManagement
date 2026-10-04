using GymManagement.Api.DTOs.Auth;

namespace GymManagement.Api.Services;

public interface IUserManagementService
{
    Task<StaffResponse?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<(StaffResponse? Staff, IReadOnlyList<string> Errors)> CreateStaffAsync(
        CreateStaffRequest request,
        CancellationToken cancellationToken);
}

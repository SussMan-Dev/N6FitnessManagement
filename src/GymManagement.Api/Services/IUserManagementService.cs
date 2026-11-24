using GymManagement.Api.DTOs.Auth;

namespace GymManagement.Api.Services;

public interface IUserManagementService
{
    Task<StaffResponse?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<IReadOnlyList<StaffResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<(StaffResponse? Staff, IReadOnlyList<string> Errors)> CreateStaffAsync(
        CreateStaffRequest request,
        CancellationToken cancellationToken);

    Task<(StaffResponse? Staff, bool NotFound, IReadOnlyList<string> Errors)> UpdateStaffAsync(
        int id,
        UpdateStaffRequest request,
        CancellationToken cancellationToken);

    Task<(bool Succeeded, bool NotFound, IReadOnlyList<string> Errors)> ResetPasswordAsync(
        int id,
        ResetStaffPasswordRequest request,
        CancellationToken cancellationToken);

    Task<(StaffResponse? Staff, string? Error)> ToggleStaffStatusAsync(
        int id,
        CancellationToken cancellationToken);

    Task<(bool Deleted, bool NotFound, string? Error)> DeleteStaffAsync(
        int id,
        int? currentUserId,
        CancellationToken cancellationToken);
}

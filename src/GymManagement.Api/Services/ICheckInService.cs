using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.CheckIns;

namespace GymManagement.Api.Services;

public interface ICheckInService
{
    Task<(CheckInResponse? CheckIn, CheckInError? Error)> CreateAsync(
        int memberId,
        int recordedByUserId,
        CancellationToken cancellationToken);

    Task<PagedResponse<CheckInResponse>> GetByMemberAsync(
        int memberId,
        int page,
        int pageSize,
        CancellationToken cancellationToken);
}
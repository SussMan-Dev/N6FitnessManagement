using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Trainers;

namespace GymManagement.Api.Services;

public interface ITrainerService
{
    Task<PagedResponse<TrainerResponse>> SearchAsync(
        string? search,
        bool includeInactive,
        int page,
        int pageSize,
        CancellationToken cancellationToken);

    Task<TrainerResponse?> GetByIdAsync(int id, CancellationToken cancellationToken);

    Task<(TrainerResponse? Trainer, bool EmailConflict)> CreateAsync(
        CreateTrainerRequest request,
        CancellationToken cancellationToken);

    Task<(TrainerResponse? Trainer, bool EmailConflict)> UpdateAsync(
        int id,
        UpdateTrainerRequest request,
        CancellationToken cancellationToken);

    Task<bool> UpdateStatusAsync(int id, bool isActive, CancellationToken cancellationToken);
}
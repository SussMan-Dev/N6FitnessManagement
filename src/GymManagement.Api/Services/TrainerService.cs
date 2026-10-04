using GymManagement.Api.Data;
using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Trainers;
using GymManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Services;

public sealed class TrainerService(GymDbContext dbContext) : ITrainerService
{
    public async Task<PagedResponse<TrainerResponse>> SearchAsync(
        string? search,
        bool includeInactive,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var query = dbContext.Trainers.AsNoTracking();
        if (!includeInactive)
        {
            query = query.Where(trainer => trainer.IsActive);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(trainer => trainer.FirstName.Contains(term) || trainer.LastName.Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var trainers = await query
            .OrderBy(trainer => trainer.LastName)
            .ThenBy(trainer => trainer.FirstName)
            .ThenBy(trainer => trainer.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(trainer => ToResponse(trainer))
            .ToListAsync(cancellationToken);

        return new PagedResponse<TrainerResponse>(page, pageSize, totalCount, trainers);
    }

    public async Task<TrainerResponse?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var trainer = await dbContext.Trainers.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        return trainer is null ? null : ToResponse(trainer);
    }

    public async Task<(TrainerResponse? Trainer, bool EmailConflict)> CreateAsync(
        CreateTrainerRequest request,
        CancellationToken cancellationToken)
    {
        var email = NormalizeEmail(request.Email);
        if (await EmailExistsAsync(email, null, cancellationToken))
        {
            return (null, true);
        }

        var trainer = new Trainer
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            Email = email,
            Phone = NormalizeOptional(request.Phone),
            Specialty = NormalizeOptional(request.Specialty),
            IsActive = true
        };
        dbContext.Trainers.Add(trainer);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(trainer), false);
    }

    public async Task<(TrainerResponse? Trainer, bool EmailConflict)> UpdateAsync(
        int id,
        UpdateTrainerRequest request,
        CancellationToken cancellationToken)
    {
        var trainer = await dbContext.Trainers.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (trainer is null)
        {
            return (null, false);
        }

        var email = NormalizeEmail(request.Email);
        if (await EmailExistsAsync(email, id, cancellationToken))
        {
            return (null, true);
        }

        trainer.FirstName = request.FirstName.Trim();
        trainer.LastName = request.LastName.Trim();
        trainer.Email = email;
        trainer.Phone = NormalizeOptional(request.Phone);
        trainer.Specialty = NormalizeOptional(request.Specialty);
        await dbContext.SaveChangesAsync(cancellationToken);
        return (ToResponse(trainer), false);
    }

    public async Task<bool> UpdateStatusAsync(int id, bool isActive, CancellationToken cancellationToken)
    {
        var trainer = await dbContext.Trainers.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (trainer is null)
        {
            return false;
        }

        trainer.IsActive = isActive;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private Task<bool> EmailExistsAsync(string? email, int? excludedId, CancellationToken cancellationToken)
    {
        if (email is null)
        {
            return Task.FromResult(false);
        }

        return dbContext.Trainers.AnyAsync(
            trainer => trainer.Email == email && (excludedId == null || trainer.Id != excludedId),
            cancellationToken);
    }

    private static string? NormalizeEmail(string? value) => NormalizeOptional(value)?.ToLowerInvariant();

    private static string? NormalizeOptional(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrEmpty(normalized) ? null : normalized;
    }

    private static TrainerResponse ToResponse(Trainer trainer) => new(
        trainer.Id,
        trainer.FirstName,
        trainer.LastName,
        trainer.Email,
        trainer.Phone,
        trainer.Specialty,
        trainer.IsActive);
}
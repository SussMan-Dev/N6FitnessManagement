using GymManagement.Api.DTOs;
using GymManagement.Api.DTOs.Trainers;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Staff")]
[Route("api/trainers")]
public sealed class TrainersController(ITrainerService trainerService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PagedResponse<TrainerResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResponse<TrainerResponse>>> Search(
        [FromQuery] string? search,
        [FromQuery] bool includeInactive = false,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        return Ok(await trainerService.SearchAsync(search, includeInactive, page, pageSize, cancellationToken));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(TrainerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TrainerResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var trainer = await trainerService.GetByIdAsync(id, cancellationToken);
        return trainer is null ? NotFound() : Ok(trainer);
    }

    [HttpPost]
    [ProducesResponseType(typeof(TrainerResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TrainerResponse>> Create(
        CreateTrainerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await trainerService.CreateAsync(request, cancellationToken);
        if (result.EmailConflict)
        {
            return Conflict(new ProblemDetails { Title = "Email is already in use." });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Trainer!.Id }, result.Trainer);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(TrainerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<TrainerResponse>> Update(
        int id,
        UpdateTrainerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await trainerService.UpdateAsync(id, request, cancellationToken);
        if (result.EmailConflict)
        {
            return Conflict(new ProblemDetails { Title = "Email is already in use." });
        }

        return result.Trainer is null ? NotFound() : Ok(result.Trainer);
    }

    [HttpPatch("{id:int}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(
        int id,
        UpdateTrainerStatusRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await trainerService.UpdateStatusAsync(id, request.IsActive, cancellationToken);
        return updated ? NoContent() : NotFound();
    }
}
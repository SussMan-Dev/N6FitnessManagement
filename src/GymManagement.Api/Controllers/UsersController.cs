using GymManagement.Api.DTOs.Auth;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
// Authorization: only an Admin token can manage staff accounts.
[Authorize(Roles = "Admin")]
[Route("api/users")]
public sealed class UsersController(IUserManagementService userManagementService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<StaffResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<StaffResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var staffList = await userManagementService.GetAllAsync(cancellationToken);
        return Ok(staffList);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(StaffResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StaffResponse>> GetById(int id, CancellationToken cancellationToken)
    {
        var staff = await userManagementService.GetByIdAsync(id, cancellationToken);
        return staff is null ? NotFound() : Ok(staff);
    }

    [HttpPost]
    [ProducesResponseType(typeof(StaffResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<StaffResponse>> CreateStaff(
        CreateStaffRequest request,
        CancellationToken cancellationToken)
    {
        var result = await userManagementService.CreateStaffAsync(request, cancellationToken);
        if (result.Staff is null)
        {
            return BadRequest(new { Errors = result.Errors });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Staff.Id }, result.Staff);
    }

    [HttpPut("{id:int}/toggle-status")]
    [ProducesResponseType(typeof(StaffResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StaffResponse>> ToggleStatus(int id, CancellationToken cancellationToken)
    {
        var (staff, error) = await userManagementService.ToggleStaffStatusAsync(id, cancellationToken);
        if (error is not null)
        {
            return BadRequest(new { Message = error });
        }

        return staff is null ? NotFound() : Ok(staff);
    }
}

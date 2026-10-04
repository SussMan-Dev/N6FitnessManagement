using GymManagement.Api.DTOs.Auth;
using GymManagement.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace GymManagement.Api.Services;

public sealed class UserManagementService(
    UserManager<GymUser> userManager,
    RoleManager<IdentityRole<int>> roleManager) : IUserManagementService
{
    public async Task<StaffResponse?> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return null;
        }

        var roles = (await userManager.GetRolesAsync(user)).ToArray();
        return new StaffResponse(user.Id, user.Email ?? user.UserName ?? string.Empty, user.DisplayName, roles);
    }

    public async Task<(StaffResponse? Staff, IReadOnlyList<string> Errors)> CreateStaffAsync(
        CreateStaffRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!await roleManager.RoleExistsAsync("Staff"))
        {
            return (null, ["Staff role is not initialized. Configure the bootstrap administrator first."]);
        }

        var email = request.Email.Trim();
        var user = new GymUser
        {
            UserName = email,
            Email = email,
            DisplayName = request.DisplayName.Trim(),
            EmailConfirmed = true,
            IsActive = true
        };
        var createResult = await userManager.CreateAsync(user, request.Password);
        if (!createResult.Succeeded)
        {
            return (null, createResult.Errors.Select(error => error.Description).ToArray());
        }

        var roleResult = await userManager.AddToRoleAsync(user, "Staff");
        if (!roleResult.Succeeded)
        {
            await userManager.DeleteAsync(user);
            return (null, roleResult.Errors.Select(error => error.Description).ToArray());
        }

        return (new StaffResponse(user.Id, email, user.DisplayName, ["Staff"]), []);
    }
}

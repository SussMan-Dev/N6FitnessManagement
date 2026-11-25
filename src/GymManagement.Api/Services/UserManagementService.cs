using GymManagement.Api.DTOs.Auth;
using GymManagement.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

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
        return new StaffResponse(
            user.Id,
            user.Email ?? user.UserName ?? string.Empty,
            user.DisplayName,
            roles,
            user.IsActive,
            user.LockoutEnd);
    }

    public async Task<IReadOnlyList<StaffResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var users = await userManager.Users.OrderBy(u => u.Id).ToListAsync(cancellationToken);
        var result = new List<StaffResponse>(users.Count);
        foreach (var user in users)
        {
            var roles = (await userManager.GetRolesAsync(user)).ToArray();
            result.Add(new StaffResponse(
                user.Id,
                user.Email ?? user.UserName ?? string.Empty,
                user.DisplayName,
                roles,
                user.IsActive,
                user.LockoutEnd));
        }

        return result;
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

        return (new StaffResponse(user.Id, email, user.DisplayName, ["Staff"], user.IsActive, user.LockoutEnd), []);
    }

    public async Task<(StaffResponse? Staff, bool NotFound, IReadOnlyList<string> Errors)> UpdateStaffAsync(
        int id,
        UpdateStaffRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return (null, true, []);
        }

        var email = request.Email.Trim();
        var existingByEmail = await userManager.FindByEmailAsync(email);
        if (existingByEmail is not null && existingByEmail.Id != user.Id)
        {
            return (null, false, ["Email này đã được sử dụng bởi tài khoản khác."]);
        }

        user.DisplayName = request.DisplayName.Trim();
        user.Email = email;
        user.UserName = email;
        user.NormalizedEmail = userManager.NormalizeEmail(email);
        user.NormalizedUserName = userManager.NormalizeName(email);

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return (null, false, updateResult.Errors.Select(e => e.Description).ToArray());
        }

        var roles = (await userManager.GetRolesAsync(user)).ToArray();
        return (new StaffResponse(
            user.Id,
            user.Email ?? user.UserName ?? string.Empty,
            user.DisplayName,
            roles,
            user.IsActive,
            user.LockoutEnd), false, []);
    }

    public async Task<(bool Succeeded, bool NotFound, IReadOnlyList<string> Errors)> ResetPasswordAsync(
        int id,
        ResetStaffPasswordRequest request,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return (false, true, []);
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var resetResult = await userManager.ResetPasswordAsync(user, token, request.NewPassword);
        if (!resetResult.Succeeded)
        {
            return (false, false, resetResult.Errors.Select(e => e.Description).ToArray());
        }

        await userManager.UpdateSecurityStampAsync(user);
        return (true, false, []);
    }

    public async Task<(StaffResponse? Staff, string? Error)> ToggleStaffStatusAsync(
        int id,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return (null, "Không tìm thấy người dùng.");
        }

        var roles = (await userManager.GetRolesAsync(user)).ToArray();

        // Safety: Prevent locking the last active Admin
        if (roles.Contains("Admin") && user.IsActive)
        {
            var admins = await userManager.GetUsersInRoleAsync("Admin");
            if (admins.Count(a => a.IsActive) <= 1)
            {
                return (null, "Không thể khóa tài khoản Quản trị viên (Admin) duy nhất đang hoạt động.");
            }
        }

        user.IsActive = !user.IsActive;

        // If deactivated, revoke all existing JWTs immediately via SecurityStamp update!
        if (!user.IsActive)
        {
            await userManager.UpdateSecurityStampAsync(user);
        }

        var updateResult = await userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return (null, string.Join("; ", updateResult.Errors.Select(e => e.Description)));
        }

        return (new StaffResponse(
            user.Id,
            user.Email ?? user.UserName ?? string.Empty,
            user.DisplayName,
            roles,
            user.IsActive,
            user.LockoutEnd), null);
    }

    public async Task<(bool Deleted, bool NotFound, string? Error)> DeleteStaffAsync(
        int id,
        int? currentUserId,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (currentUserId.HasValue && currentUserId.Value == id)
        {
            return (false, false, "Không thể tự xóa tài khoản đang đăng nhập.");
        }

        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return (false, true, null);
        }

        var roles = await userManager.GetRolesAsync(user);
        if (roles.Contains("Admin"))
        {
            var admins = await userManager.GetUsersInRoleAsync("Admin");
            if (admins.Count <= 1)
            {
                return (false, false, "Không thể xóa tài khoản Quản trị viên (Admin) duy nhất.");
            }
        }

        var deleteResult = await userManager.DeleteAsync(user);
        if (!deleteResult.Succeeded)
        {
            return (false, false, string.Join("; ", deleteResult.Errors.Select(e => e.Description)));
        }

        return (true, false, null);
    }
}

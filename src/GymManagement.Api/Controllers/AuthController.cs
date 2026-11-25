using GymManagement.Api.DTOs.Auth;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    IAuthService authService,
    IAuditLogService auditLogService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        var result = await authService.LoginAsync(request, cancellationToken);
        if (result is null)
        {
            return Unauthorized();
        }

        await auditLogService.LogExplicitAsync(
            "Auth.Login",
            "Auth",
            null,
            $"Đăng nhập hệ thống ({result.Email})",
            $"Quyền: {string.Join(", ", result.Roles)}",
            null,
            result.Email,
            result.Email,
            cancellationToken);

        return Ok(result);
    }

    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var userIdValue = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdValue, out var userId))
        {
            await authService.LogoutAsync(userId, cancellationToken);
            await auditLogService.LogAsync(
                "Auth.Logout",
                "Auth",
                userId,
                "Đăng xuất & thu hồi phiên truy cập (SecurityStamp)",
                null,
                User,
                cancellationToken);
        }
        return Ok(new { message = "Đã đăng xuất và thu hồi phiên truy cập thành công qua SecurityStamp." });
    }
}

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using GymManagement.Api.DTOs.Auth;
using GymManagement.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace GymManagement.Api.Services;

public sealed class AuthService(
    UserManager<GymUser> userManager,
    SignInManager<GymUser> signInManager,
    IConfiguration configuration) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var email = request.Email.Trim();
        var user = await userManager.FindByEmailAsync(email);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        var signInResult = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!signInResult.Succeeded)
        {
            return null;
        }

        var roles = (await userManager.GetRolesAsync(user)).ToArray();
        var section = configuration.GetSection("Jwt");
        var issuer = string.IsNullOrWhiteSpace(section["Issuer"])
            ? "GymManagement.Api"
            : section["Issuer"];
        var audience = string.IsNullOrWhiteSpace(section["Audience"])
            ? "GymManagement.Client"
            : section["Audience"];
        var signingKey = section["SigningKey"]!;
        var expiresAt = DateTime.UtcNow.AddMinutes(section.GetValue("AccessTokenMinutes", 30));
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.DisplayName)
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer,
            audience,
            claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return new LoginResponse(new JwtSecurityTokenHandler().WriteToken(token), expiresAt, email, roles);
    }
}

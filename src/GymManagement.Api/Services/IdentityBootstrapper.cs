using GymManagement.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace GymManagement.Api.Services;

public sealed class IdentityBootstrapper(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<IdentityBootstrapper> logger,
    IHostEnvironment environment) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var email = configuration["BootstrapAdmin:Email"]?.Trim();
        var password = configuration["BootstrapAdmin:Password"];
        if (string.IsNullOrWhiteSpace(email))
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < 12)
        {
            throw new InvalidOperationException("BootstrapAdmin:Password must contain at least 12 characters.");
        }

        var resetExistingPassword = configuration.GetValue<bool>("BootstrapAdmin:ResetPassword");
        if (resetExistingPassword && !environment.IsDevelopment())
        {
            throw new InvalidOperationException("BootstrapAdmin:ResetPassword is only allowed in Development.");
        }

        using var scope = scopeFactory.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<GymUser>>();

        foreach (var roleName in new[] { "Admin", "Staff" })
        {
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                var roleResult = await roleManager.CreateAsync(new IdentityRole<int>(roleName));
                if (!roleResult.Succeeded)
                {
                    throw new InvalidOperationException(
                        $"Could not initialize role '{roleName}': {string.Join(", ", roleResult.Errors.Select(error => error.Code))}");
                }
            }
        }

        var admin = await userManager.FindByEmailAsync(email);
        if (admin is null)
        {
            admin = new GymUser
            {
                UserName = email,
                Email = email,
                DisplayName = "Gym administrator",
                EmailConfirmed = true,
                IsActive = true
            };
            var createResult = await userManager.CreateAsync(admin, password);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Could not create bootstrap administrator: {string.Join(", ", createResult.Errors.Select(error => error.Code))}");
            }
        }
        else if (resetExistingPassword)
        {
            admin.PasswordHash = userManager.PasswordHasher.HashPassword(admin, password);
            admin.SecurityStamp = Guid.NewGuid().ToString();
            var updateResult = await userManager.UpdateAsync(admin);
            if (!updateResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Could not reset bootstrap administrator password: {string.Join(", ", updateResult.Errors.Select(error => error.Code))}");
            }

            logger.LogWarning("Bootstrap administrator password reset using a one-time Development flag.");
        }

        if (!await userManager.IsInRoleAsync(admin, "Admin"))
        {
            var roleResult = await userManager.AddToRoleAsync(admin, "Admin");
            if (!roleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Could not assign Admin role: {string.Join(", ", roleResult.Errors.Select(error => error.Code))}");
            }
        }

        logger.LogInformation("Bootstrap administrator is available.");
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

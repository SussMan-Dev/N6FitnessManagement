using GymManagement.Api.DTOs.Auth;

namespace GymManagement.Api.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
}

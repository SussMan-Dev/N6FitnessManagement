using Microsoft.AspNetCore.Identity;

namespace GymManagement.Api.Models;

public sealed class GymUser : IdentityUser<int>
{
    public required string DisplayName { get; set; }

    public bool IsActive { get; set; } = true;
}

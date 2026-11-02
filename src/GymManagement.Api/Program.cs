using System.Text.Json.Serialization;
using System.Text;
using GymManagement.Api.Data;
using GymManagement.Api.Models;
using GymManagement.Api.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = "Frontend"
});

builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole(options =>
{
    options.SingleLine = true;
    options.TimestampFormat = "HH:mm:ss ";
});

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDataProtection()
        .PersistKeysToFileSystem(new DirectoryInfo(
            Path.Combine(builder.Environment.ContentRootPath, ".data-protection-keys")));
}

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Connection string 'DefaultConnection' is required. Configure it with user secrets or " +
        "the ConnectionStrings__DefaultConnection environment variable.");
}

var jwtSection = builder.Configuration.GetSection("Jwt");
var signingKey = jwtSection["SigningKey"];
if (string.IsNullOrWhiteSpace(signingKey) || Encoding.UTF8.GetByteCount(signingKey) < 32)
{
    throw new InvalidOperationException("Jwt:SigningKey must be configured with at least 32 UTF-8 bytes.");
}

var jwtIssuer = string.IsNullOrWhiteSpace(jwtSection["Issuer"])
    ? "GymManagement.Api"
    : jwtSection["Issuer"];
var jwtAudience = string.IsNullOrWhiteSpace(jwtSection["Audience"])
    ? "GymManagement.Client"
    : jwtSection["Audience"];
// JWT lifetime: Jwt:AccessTokenMinutes in configuration; defaults to 30 minutes.
var accessTokenMinutes = jwtSection.GetValue("AccessTokenMinutes", 30);
if (accessTokenMinutes is < 1 or > 1440)
{
    throw new InvalidOperationException("Jwt:AccessTokenMinutes must be between 1 and 1440.");
}

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    const string bearerScheme = "Bearer";
    options.AddSecurityDefinition(bearerScheme, new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = bearerScheme,
        BearerFormat = "JWT",
        Description = "Enter a valid JWT access token."
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference(bearerScheme, document, null)] = []
    });
});
builder.Services.AddDbContext<GymDbContext>(options => options.UseMySQL(connectionString));
builder.Services.AddIdentityCore<GymUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 12;
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddRoles<IdentityRole<int>>()
    .AddEntityFrameworkStores<GymDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();
builder.Services
    // Authentication flow: read the Bearer token from the Authorization header.
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Reject tokens with a wrong issuer, audience, signature, or expiry time.
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = System.Security.Claims.ClaimTypes.Name,
            RoleClaimType = System.Security.Claims.ClaimTypes.Role
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                // A valid signature alone is insufficient: reject a token for a locked,
                // inactive, deleted, or password-reset user.
                var userIdValue = context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var tokenSecurityStamp = context.Principal?.FindFirst("security_stamp")?.Value;
                if (!int.TryParse(userIdValue, out var userId) || string.IsNullOrWhiteSpace(tokenSecurityStamp))
                {
                    context.Fail("The access token is missing required user information.");
                    return;
                }

                var userManager = context.HttpContext.RequestServices.GetRequiredService<UserManager<GymUser>>();
                var user = await userManager.FindByIdAsync(userId.ToString());
                if (user is null || !user.IsActive ||
                    (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow) ||
                    !string.Equals(user.SecurityStamp, tokenSecurityStamp, StringComparison.Ordinal))
                {
                    context.Fail("The access token is no longer valid.");
                }
            }
        };
    });
builder.Services.AddAuthorization(options =>
{
    // Authorization flow: new API endpoints are private unless they explicitly opt out
    // with [AllowAnonymous]. [Authorize(Roles = ...)] additionally enforces roles.
    options.FallbackPolicy = new AuthorizationPolicyBuilder(JwtBearerDefaults.AuthenticationScheme)
        .RequireAuthenticatedUser()
        .Build();
});
builder.Services.AddScoped<IMemberService, MemberService>();
builder.Services.AddScoped<IMembershipPlanService, MembershipPlanService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IInvoiceService, InvoiceService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<ICheckInService, CheckInService>();
builder.Services.AddScoped<ITrainerService, TrainerService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();
builder.Services.AddHostedService<IdentityBootstrapper>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<GymDbContext>();
    await dbContext.Database.MigrateAsync();

    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        if (app.Environment.IsDevelopment())
        {
            context.Context.Response.Headers.CacheControl = "no-store";
        }
    }
});
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

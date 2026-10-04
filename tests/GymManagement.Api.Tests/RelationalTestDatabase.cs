using GymManagement.Api.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Tests;

public sealed class RelationalTestDatabase : IAsyncDisposable
{
    private RelationalTestDatabase(SqliteConnection connection, GymDbContext dbContext)
    {
        Connection = connection;
        DbContext = dbContext;
    }

    public SqliteConnection Connection { get; }

    public GymDbContext DbContext { get; }

    public static async Task<RelationalTestDatabase> CreateAsync()
    {
        var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<GymDbContext>()
            .UseSqlite(connection)
            .Options;
        var dbContext = new GymDbContext(options);
        await dbContext.Database.EnsureCreatedAsync();
        return new RelationalTestDatabase(connection, dbContext);
    }

    public async ValueTask DisposeAsync()
    {
        await DbContext.DisposeAsync();
        await Connection.DisposeAsync();
    }
}

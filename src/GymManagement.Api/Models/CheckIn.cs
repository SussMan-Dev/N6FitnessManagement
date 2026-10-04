namespace GymManagement.Api.Models;

public sealed class CheckIn
{
    public int Id { get; set; }

    public int MemberId { get; set; }

    public DateTime CheckedInAtUtc { get; set; }

    public int RecordedByUserId { get; set; }

    public required string Method { get; set; }
}

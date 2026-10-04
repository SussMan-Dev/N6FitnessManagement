using System.ComponentModel.DataAnnotations;

namespace GymManagement.Api.DTOs.CheckIns;

public sealed class CreateCheckInRequest
{
    [Range(1, int.MaxValue)]
    public int MemberId { get; init; }
}

public sealed record CheckInResponse(int Id, int MemberId, DateTime CheckedInAtUtc, int RecordedByUserId, string Method);

public enum CheckInError
{
    MemberNotFound,
    MemberNotActive,
    NoValidSubscription
}
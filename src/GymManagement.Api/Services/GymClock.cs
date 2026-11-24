namespace GymManagement.Api.Services;

/// <summary>
/// Centralized Vietnam business timezone (UTC+7) helpers so date-range filters,
/// reports, check-ins, and subscription start/end dates match local gym operations.
/// </summary>
public static class GymClock
{
    public static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public static DateTime NowVietnam(DateTime? utcNow = null) =>
        (utcNow ?? DateTime.UtcNow).Add(VietnamOffset);

    public static DateOnly TodayVietnam(DateTime? utcNow = null) =>
        DateOnly.FromDateTime(NowVietnam(utcNow));

    public static DateOnly ToVietnamDate(DateTime utcDateTime) =>
        DateOnly.FromDateTime(utcDateTime.Add(VietnamOffset));

    /// <summary>
    /// Converts an inclusive local Vietnam date range [from..to] into a half-open UTC range [StartUtc, EndExclusiveUtc).
    /// Example: 2026-11-24 VN -> [2026-11-23 17:00:00Z, 2026-11-24 17:00:00Z).
    /// </summary>
    public static (DateTime StartUtc, DateTime EndExclusiveUtc) VietnamRangeToUtc(DateOnly from, DateOnly to) =>
        (from.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).Subtract(VietnamOffset),
         to.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).Subtract(VietnamOffset));

    public static DateTime VietnamDayStartUtc(DateOnly date) =>
        date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).Subtract(VietnamOffset);

    public static DateTime VietnamDayEndExclusiveUtc(DateOnly date) =>
        date.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc).Subtract(VietnamOffset);
}

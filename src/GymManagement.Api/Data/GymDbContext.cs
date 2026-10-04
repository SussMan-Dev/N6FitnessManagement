using GymManagement.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace GymManagement.Api.Data;

public sealed class GymDbContext(DbContextOptions<GymDbContext> options)
    : IdentityDbContext<GymUser, IdentityRole<int>, int>(options)
{
    private static readonly ValueConverter<DateOnly?, DateTime?> NullableDateOnlyConverter = new(
        date => date.HasValue ? date.Value.ToDateTime(TimeOnly.MinValue) : null,
        value => value.HasValue ? DateOnly.FromDateTime(value.Value) : null);

    public DbSet<Member> Members => Set<Member>();

    public DbSet<MembershipPlan> MembershipPlans => Set<MembershipPlan>();

    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    public DbSet<Invoice> Invoices => Set<Invoice>();

    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<CheckIn> CheckIns => Set<CheckIn>();

    public DbSet<Trainer> Trainers => Set<Trainer>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<GymUser>().Property(user => user.DisplayName).HasMaxLength(120).IsRequired();

        modelBuilder.Entity<Member>(entity =>
        {
            entity.ToTable("Members");
            entity.HasKey(member => member.Id);
            entity.Property(member => member.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(member => member.LastName).HasMaxLength(100).IsRequired();
            entity.Property(member => member.Email).HasMaxLength(254);
            entity.Property(member => member.Phone).HasMaxLength(30);
            entity.Property(member => member.BirthDate)
                .HasConversion(NullableDateOnlyConverter)
                .HasColumnType("date");
            entity.Property(member => member.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(member => member.Email).IsUnique();
            entity.HasIndex(member => member.Status);
        });

        modelBuilder.Entity<MembershipPlan>(entity =>
        {
            entity.ToTable("MembershipPlans");
            entity.HasKey(plan => plan.Id);
            entity.Property(plan => plan.Name).HasMaxLength(120).IsRequired();
            entity.Property(plan => plan.Description).HasMaxLength(500);
            entity.Property(plan => plan.Price).HasPrecision(10, 2);
            entity.HasIndex(plan => plan.IsActive);
        });

        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.ToTable("Subscriptions");
            entity.HasKey(subscription => subscription.Id);
            entity.Property(subscription => subscription.Status).HasConversion<string>().HasMaxLength(24);
            entity.Property(subscription => subscription.StartsOn)
                .HasConversion(NullableDateOnlyConverter)
                .HasColumnType("date");
            entity.Property(subscription => subscription.EndsOn)
                .HasConversion(NullableDateOnlyConverter)
                .HasColumnType("date");
            entity.HasIndex(subscription => new { subscription.MemberId, subscription.Status });
            entity.HasIndex(subscription => subscription.MembershipPlanId);
            entity.HasOne<Member>()
                .WithMany()
                .HasForeignKey(subscription => subscription.MemberId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<MembershipPlan>()
                .WithMany()
                .HasForeignKey(subscription => subscription.MembershipPlanId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Subscription>()
                .WithMany()
                .HasForeignKey(subscription => subscription.RenewedFromSubscriptionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Invoice>(entity =>
        {
            entity.ToTable("Invoices");
            entity.HasKey(invoice => invoice.Id);
            entity.Property(invoice => invoice.Number).HasMaxLength(40).IsRequired();
            entity.Property(invoice => invoice.PlanNameSnapshot).HasMaxLength(120).IsRequired();
            entity.Property(invoice => invoice.TotalAmount).HasPrecision(10, 2);
            entity.Property(invoice => invoice.Status).HasConversion<string>().HasMaxLength(24);
            entity.Property(invoice => invoice.Version).IsConcurrencyToken();
            entity.HasIndex(invoice => invoice.Number).IsUnique();
            entity.HasIndex(invoice => new { invoice.MemberId, invoice.CreatedAtUtc });
            entity.HasIndex(invoice => new { invoice.SubscriptionId, invoice.Status });
            entity.HasOne<Member>()
                .WithMany()
                .HasForeignKey(invoice => invoice.MemberId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<Subscription>()
                .WithMany()
                .HasForeignKey(invoice => invoice.SubscriptionId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("Payments");
            entity.HasKey(payment => payment.Id);
            entity.Property(payment => payment.Amount).HasPrecision(10, 2);
            entity.Property(payment => payment.Method).HasConversion<string>().HasMaxLength(24);
            entity.Property(payment => payment.Status).HasConversion<string>().HasMaxLength(24);
            entity.Property(payment => payment.Reference).HasMaxLength(100);
            entity.Property(payment => payment.AdjustmentReason).HasMaxLength(500);
            entity.Property(payment => payment.Version).IsConcurrencyToken();
            entity.HasIndex(payment => new { payment.InvoiceId, payment.Status });
            entity.HasOne<Invoice>()
                .WithMany()
                .HasForeignKey(payment => payment.InvoiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CheckIn>(entity =>
        {
            entity.ToTable("CheckIns");
            entity.HasKey(checkIn => checkIn.Id);
            entity.Property(checkIn => checkIn.Method).HasMaxLength(30).IsRequired();
            entity.HasIndex(checkIn => new { checkIn.MemberId, checkIn.CheckedInAtUtc });
            entity.HasOne<Member>()
                .WithMany()
                .HasForeignKey(checkIn => checkIn.MemberId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Trainer>(entity =>
        {
            entity.ToTable("Trainers");
            entity.HasKey(trainer => trainer.Id);
            entity.Property(trainer => trainer.FirstName).HasMaxLength(100).IsRequired();
            entity.Property(trainer => trainer.LastName).HasMaxLength(100).IsRequired();
            entity.Property(trainer => trainer.Email).HasMaxLength(254);
            entity.Property(trainer => trainer.Phone).HasMaxLength(30);
            entity.Property(trainer => trainer.Specialty).HasMaxLength(120);
            entity.HasIndex(trainer => trainer.Email).IsUnique();
            entity.HasIndex(trainer => trainer.IsActive);
        });
    }
}

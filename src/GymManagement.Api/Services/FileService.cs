using GymManagement.Api.Data;
using GymManagement.Api.DTOs.Files;
using GymManagement.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Api.Services;

public sealed class FileService(GymDbContext dbContext) : IFileService
{
    private const long MaxFileSizeInBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "application/pdf"
    };

    public async Task<FileUploadDbDto.FileResponseDto> UploadAsync(IFormFile file, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(file);

        if (file.Length == 0)
        {
            throw new ArgumentException("Tệp tải lên không được để trống.", nameof(file));
        }

        if (file.Length > MaxFileSizeInBytes)
        {
            throw new ArgumentException($"Kích thước tệp vượt quá giới hạn cho phép ({MaxFileSizeInBytes / (1024 * 1024)}MB).", nameof(file));
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            throw new ArgumentException($"Định dạng tệp không được hỗ trợ ({file.ContentType}). Chỉ chấp nhận JPG, PNG, WEBP, GIF, PDF.", nameof(file));
        }

        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, cancellationToken);
        var bytes = memoryStream.ToArray();

        var storedFile = new StoredFile
        {
            FileName = Path.GetFileName(file.FileName),
            ContentType = file.ContentType,
            Content = bytes,
            Length = file.Length,
            UploadedAt = DateTime.UtcNow
        };

        dbContext.StoredFiles.Add(storedFile);
        await dbContext.SaveChangesAsync(cancellationToken);

        return new FileUploadDbDto.FileResponseDto
        {
            Id = storedFile.Id,
            FileName = storedFile.FileName,
            Size = storedFile.Length,
            UploadedAt = storedFile.UploadedAt
        };
    }

    public async Task<FileUploadDbDto.FileDownloadDto?> GetFileAsync(int id, CancellationToken cancellationToken = default)
    {
        var storedFile = await dbContext.StoredFiles.AsNoTracking()
            .SingleOrDefaultAsync(f => f.Id == id, cancellationToken);

        if (storedFile is null)
        {
            return null;
        }

        return new FileUploadDbDto.FileDownloadDto
        {
            Content = storedFile.Content,
            ContentType = storedFile.ContentType,
            FileName = storedFile.FileName
        };
    }

    public async Task<StoredFile?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await dbContext.StoredFiles.AsNoTracking()
            .SingleOrDefaultAsync(f => f.Id == id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var storedFile = await dbContext.StoredFiles.SingleOrDefaultAsync(f => f.Id == id, cancellationToken);
        if (storedFile is null)
        {
            return false;
        }

        dbContext.StoredFiles.Remove(storedFile);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}


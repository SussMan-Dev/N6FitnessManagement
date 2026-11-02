using GymManagement.Api.DTOs.Files;
using GymManagement.Api.Models;
using Microsoft.AspNetCore.Http;

namespace GymManagement.Api.Services;

public interface IFileService
{
    Task<FileUploadDbDto.FileResponseDto> UploadAsync(IFormFile file, CancellationToken cancellationToken = default);
    Task<FileUploadDbDto.FileDownloadDto?> GetFileAsync(int id, CancellationToken cancellationToken = default);
    Task<StoredFile?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
}


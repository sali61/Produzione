namespace Produzione.Application.Contracts.System;

public sealed class AppInfoResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public string Applicazione { get; set; } = string.Empty;
    public AppInfoMenuItemDto[] Items { get; set; } = [];
}


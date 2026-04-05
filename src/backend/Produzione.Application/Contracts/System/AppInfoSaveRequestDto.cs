namespace Produzione.Application.Contracts.System;

public sealed class AppInfoSaveRequestDto
{
    public string Menu { get; set; } = string.Empty;
    public string Voce { get; set; } = string.Empty;
    public string Sintesi { get; set; } = string.Empty;
}


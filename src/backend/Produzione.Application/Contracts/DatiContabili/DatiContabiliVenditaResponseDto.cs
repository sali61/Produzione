namespace Produzione.Application.Contracts.DatiContabili;

public sealed class DatiContabiliVenditaResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int Count { get; set; }
    public DatiContabiliVenditaRowDto[] Items { get; set; } = [];
}

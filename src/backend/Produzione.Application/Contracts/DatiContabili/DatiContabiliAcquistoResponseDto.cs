namespace Produzione.Application.Contracts.DatiContabili;

public sealed class DatiContabiliAcquistoResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int Count { get; set; }
    public DatiContabiliAcquistoRowDto[] Items { get; set; } = [];
}

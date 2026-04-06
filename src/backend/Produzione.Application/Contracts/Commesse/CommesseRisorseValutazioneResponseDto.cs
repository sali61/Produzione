namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseRisorseValutazioneResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public bool Mensile { get; set; }
    public int Count { get; set; }
    public IReadOnlyCollection<int> Anni { get; set; } = Array.Empty<int>();
    public IReadOnlyCollection<CommessaRisorseValutazioneRowDto> Items { get; set; } = Array.Empty<CommessaRisorseValutazioneRowDto>();
}


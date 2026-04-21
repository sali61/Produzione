namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSegnalazioneMessaggioUpdateRequestDto
{
    public int IdMessaggio { get; set; }
    public string Testo { get; set; } = string.Empty;
}

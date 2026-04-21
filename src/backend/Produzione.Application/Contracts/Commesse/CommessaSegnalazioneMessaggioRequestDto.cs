namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSegnalazioneMessaggioRequestDto
{
    public int IdSegnalazione { get; set; }
    public int? IdMessaggioPadre { get; set; }
    public string Testo { get; set; } = string.Empty;
}

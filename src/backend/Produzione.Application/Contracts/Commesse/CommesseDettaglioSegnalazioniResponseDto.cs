namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseDettaglioSegnalazioniResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public string Commessa { get; set; } = string.Empty;
    public int IdCommessa { get; set; }
    public CommessaSegnalazioneTipoDto[] TipiSegnalazione { get; set; } = Array.Empty<CommessaSegnalazioneTipoDto>();
    public CommessaSegnalazioneDestinatarioOptionDto[] Destinatari { get; set; } = Array.Empty<CommessaSegnalazioneDestinatarioOptionDto>();
    public CommessaSegnalazioneDto[] Segnalazioni { get; set; } = Array.Empty<CommessaSegnalazioneDto>();
    public CommessaSegnalazioneMessaggioDto[] Thread { get; set; } = Array.Empty<CommessaSegnalazioneMessaggioDto>();
}

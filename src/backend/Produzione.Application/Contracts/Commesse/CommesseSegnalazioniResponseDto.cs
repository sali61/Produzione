namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseSegnalazioniResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int Count { get; set; }
    public CommessaSegnalazioneAnalisiRowDto[] Segnalazioni { get; set; } = Array.Empty<CommessaSegnalazioneAnalisiRowDto>();
    public CommessaSegnalazioneMessaggioDto[] Thread { get; set; } = Array.Empty<CommessaSegnalazioneMessaggioDto>();
}

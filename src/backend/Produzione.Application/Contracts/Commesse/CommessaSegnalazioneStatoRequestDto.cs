namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSegnalazioneStatoRequestDto
{
    public int IdSegnalazione { get; set; }
    public int Stato { get; set; }
}

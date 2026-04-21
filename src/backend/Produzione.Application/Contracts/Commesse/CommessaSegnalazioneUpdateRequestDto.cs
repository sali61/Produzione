namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSegnalazioneUpdateRequestDto
{
    public int IdSegnalazione { get; set; }
    public int IdTipoSegnalazione { get; set; }
    public string Titolo { get; set; } = string.Empty;
    public string Testo { get; set; } = string.Empty;
    public int Priorita { get; set; } = 2;
    public bool ImpattaCliente { get; set; }
    public DateTime? DataEvento { get; set; }
    public int? IdRisorsaDestinataria { get; set; }
}

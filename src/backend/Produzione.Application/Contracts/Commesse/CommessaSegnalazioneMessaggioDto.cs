namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSegnalazioneMessaggioDto
{
    public int Id { get; set; }
    public int IdSegnalazione { get; set; }
    public int? IdMessaggioPadre { get; set; }
    public int Livello { get; set; }
    public string Testo { get; set; } = string.Empty;
    public DateTime? DataInserimento { get; set; }
    public int? IdRisorsaInserimento { get; set; }
    public string NomeRisorsaInserimento { get; set; } = string.Empty;
    public DateTime? DataUltimaModifica { get; set; }
    public int? IdRisorsaUltimaModifica { get; set; }
    public string NomeRisorsaUltimaModifica { get; set; } = string.Empty;
}

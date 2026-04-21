namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSegnalazioneAnalisiRowDto
{
    public int Id { get; set; }
    public int IdCommessa { get; set; }
    public string Commessa { get; set; } = string.Empty;
    public int IdTipoSegnalazione { get; set; }
    public string TipoCodice { get; set; } = string.Empty;
    public string TipoDescrizione { get; set; } = string.Empty;
    public string Titolo { get; set; } = string.Empty;
    public string Testo { get; set; } = string.Empty;
    public int Priorita { get; set; }
    public int Stato { get; set; }
    public bool ImpattaCliente { get; set; }
    public DateTime? DataEvento { get; set; }
    public DateTime? DataInserimento { get; set; }
    public int? IdRisorsaInserimento { get; set; }
    public string NomeRisorsaInserimento { get; set; } = string.Empty;
    public DateTime? DataUltimaModifica { get; set; }
    public int? IdRisorsaUltimaModifica { get; set; }
    public string NomeRisorsaUltimaModifica { get; set; } = string.Empty;
    public DateTime? DataChiusura { get; set; }
    public int? IdRisorsaDestinataria { get; set; }
    public string NomeRisorsaDestinataria { get; set; } = string.Empty;
}

namespace Produzione.Application.Contracts.DatiContabili;

public sealed class DatiContabiliAcquistoRowDto
{
    public int? AnnoFattura { get; set; }
    public DateTime? DataDocumento { get; set; }
    public string Commessa { get; set; } = string.Empty;
    public string DescrizioneCommessa { get; set; } = string.Empty;
    public string TipologiaCommessa { get; set; } = string.Empty;
    public string StatoCommessa { get; set; } = string.Empty;
    public string MacroTipologia { get; set; } = string.Empty;
    public string ControparteCommessa { get; set; } = string.Empty;
    public string BusinessUnit { get; set; } = string.Empty;
    public string Rcc { get; set; } = string.Empty;
    public string Pm { get; set; } = string.Empty;
    public string CodiceSocieta { get; set; } = string.Empty;
    public string DescrizioneFattura { get; set; } = string.Empty;
    public string Causale { get; set; } = string.Empty;
    public string Sottoconto { get; set; } = string.Empty;
    public string ControparteMovimento { get; set; } = string.Empty;
    public string Provenienza { get; set; } = string.Empty;
    public decimal ImportoComplessivo { get; set; }
    public decimal ImportoContabilitaDettaglio { get; set; }
    public bool IsFuture { get; set; }
    public bool IsScaduta { get; set; }
    public string StatoTemporale { get; set; } = string.Empty;
}

namespace Produzione.Application.Contracts.DatiContabili;

public sealed class DatiContabiliVenditaRowDto
{
    public int? AnnoFattura { get; set; }
    public DateTime? DataMovimento { get; set; }
    public string Commessa { get; set; } = string.Empty;
    public string DescrizioneCommessa { get; set; } = string.Empty;
    public string TipologiaCommessa { get; set; } = string.Empty;
    public string StatoCommessa { get; set; } = string.Empty;
    public string MacroTipologia { get; set; } = string.Empty;
    public string ControparteCommessa { get; set; } = string.Empty;
    public string BusinessUnit { get; set; } = string.Empty;
    public string Rcc { get; set; } = string.Empty;
    public string Pm { get; set; } = string.Empty;
    public string NumeroDocumento { get; set; } = string.Empty;
    public string DescrizioneMovimento { get; set; } = string.Empty;
    public string Causale { get; set; } = string.Empty;
    public string Sottoconto { get; set; } = string.Empty;
    public string ControparteMovimento { get; set; } = string.Empty;
    public string Provenienza { get; set; } = string.Empty;
    public decimal Importo { get; set; }
    public decimal Fatturato { get; set; }
    public decimal FatturatoFuturo { get; set; }
    public decimal RicavoIpotetico { get; set; }
    public bool IsFuture { get; set; }
    public bool IsScaduta { get; set; }
    public string StatoTemporale { get; set; } = string.Empty;
}

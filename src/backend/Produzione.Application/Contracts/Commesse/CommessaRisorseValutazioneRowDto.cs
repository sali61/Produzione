namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaRisorseValutazioneRowDto
{
    public int AnnoCompetenza { get; set; }
    public int? MeseCompetenza { get; set; }
    public string Commessa { get; set; } = string.Empty;
    public string DescrizioneCommessa { get; set; } = string.Empty;
    public string TipologiaCommessa { get; set; } = string.Empty;
    public string Stato { get; set; } = string.Empty;
    public string MacroTipologia { get; set; } = string.Empty;
    public string Prodotto { get; set; } = string.Empty;
    public string Controparte { get; set; } = string.Empty;
    public string BusinessUnit { get; set; } = string.Empty;
    public string Rcc { get; set; } = string.Empty;
    public string Pm { get; set; } = string.Empty;
    public int IdRisorsa { get; set; }
    public string NomeRisorsa { get; set; } = string.Empty;
    public bool RisorsaInForza { get; set; }
    public decimal OreTotali { get; set; }
    public decimal FatturatoInBaseAdOre { get; set; }
    public decimal FatturatoInBaseACosto { get; set; }
    public decimal UtileInBaseAdOre { get; set; }
    public decimal UtileInBaseACosto { get; set; }
    public decimal CostoSpecificoRisorsa { get; set; }
    public string IdOu { get; set; } = string.Empty;
    public string NomeRuolo { get; set; } = string.Empty;
    public decimal PercentualeUtilizzo { get; set; }
    public string Area { get; set; } = string.Empty;
    public bool OuProduzione { get; set; }
    public string CodiceSocieta { get; set; } = string.Empty;
}

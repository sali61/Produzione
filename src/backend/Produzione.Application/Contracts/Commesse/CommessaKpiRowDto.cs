namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaKpiRowDto
{
    public int AnnoApertura { get; set; }
    public DateTime DataRiferimento { get; set; }
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
    public bool Produzione { get; set; }
    public decimal OrePrevisteFineMesePrecedente { get; set; }
    public decimal OrePrevisteFineAnno { get; set; }
    public decimal OrePrevisteFineCommessa { get; set; }
    public decimal OreLavorateFineMesePrecedente { get; set; }
    public decimal OreLavorateFineAnno { get; set; }
    public decimal OreLavorateFineCommessa { get; set; }
    public decimal SovrapercentualeFineMesePrecedente { get; set; }
    public decimal SovrapercentualeFineAnno { get; set; }
    public decimal SovrapercentualeFineCommessa { get; set; }
    public decimal RicavoFineMesePrecedente { get; set; }
    public decimal RicavoFineAnno { get; set; }
    public decimal RicavoFineCommessa { get; set; }
    public decimal MaturatoNonFatturatoFineMesePrecedente { get; set; }
    public decimal CostoPersonaleFineMesePrecedente { get; set; }
    public decimal CostoPersonaleFineAnno { get; set; }
    public decimal CostoPersonaleFineCommessa { get; set; }
    public decimal AcquistiFineMesePrecedente { get; set; }
    public decimal AcquistiFineAnno { get; set; }
    public decimal AcquistiFineCommessa { get; set; }
    public decimal UtileFineMesePrecedente { get; set; }
    public decimal UtileFineAnno { get; set; }
    public decimal UtileFineCommessa { get; set; }
    public decimal PercentualeUtileFineMesePrecedente { get; set; }
    public decimal PercentualeUtileFineAnno { get; set; }
    public decimal PercentualeUtileFineCommessa { get; set; }
    public decimal SpcMFineMesePrecedente { get; set; }
    public decimal SpcMFineAnno { get; set; }
    public decimal SpcMFineCommessa { get; set; }
}

namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSintesiRowDto
{
    public int? Anno { get; set; }
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
    public decimal OreLavorate { get; set; }
    public decimal CostoPersonale { get; set; }
    public decimal Ricavi { get; set; }
    public decimal Costi { get; set; }
    public decimal UtileSpecifico { get; set; }
    public decimal RicaviFuturi { get; set; }
    public decimal CostiFuturi { get; set; }
}

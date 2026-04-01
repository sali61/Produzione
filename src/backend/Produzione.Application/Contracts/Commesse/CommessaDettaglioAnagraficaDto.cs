namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaDettaglioAnagraficaDto
{
    public string Commessa { get; set; } = string.Empty;
    public string DescrizioneCommessa { get; set; } = string.Empty;
    public string TipologiaCommessa { get; set; } = string.Empty;
    public string Stato { get; set; } = string.Empty;
    public string MacroTipologia { get; set; } = string.Empty;
    public string Prodotto { get; set; } = string.Empty;
    public string BusinessUnit { get; set; } = string.Empty;
    public string Rcc { get; set; } = string.Empty;
    public string Pm { get; set; } = string.Empty;
}

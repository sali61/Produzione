namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaRibaltamentoAnnualeDto
{
    public int Anno { get; set; }
    public string CommessaOrigine { get; set; } = string.Empty;
    public string CommessaDestinazione { get; set; } = string.Empty;
    public decimal Importo { get; set; }
    public string Nota { get; set; } = string.Empty;
}

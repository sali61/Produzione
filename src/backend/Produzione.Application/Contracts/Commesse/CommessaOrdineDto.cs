namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaOrdineDto
{
    public string Protocollo { get; set; } = string.Empty;
    public string DocumentoStato { get; set; } = string.Empty;
    public string Posizione { get; set; } = string.Empty;
    public int IdDettaglioOrdine { get; set; }
    public string Descrizione { get; set; } = string.Empty;
    public decimal Quantita { get; set; }
    public decimal PrezzoUnitario { get; set; }
    public decimal ImportoOrdine { get; set; }
    public decimal QuantitaOriginaleOrdinata { get; set; }
    public decimal QuantitaFatture { get; set; }
}

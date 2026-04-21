namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSegnalazioneTipoDto
{
    public int Id { get; set; }
    public string Codice { get; set; } = string.Empty;
    public string Descrizione { get; set; } = string.Empty;
    public bool ImpattaClienteDefault { get; set; }
    public int OrdineVisualizzazione { get; set; }
}

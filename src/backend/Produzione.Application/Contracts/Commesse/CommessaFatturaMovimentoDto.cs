namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaFatturaMovimentoDto
{
    public DateTime? DataMovimento { get; set; }
    public string NumeroDocumento { get; set; } = string.Empty;
    public string Descrizione { get; set; } = string.Empty;
    public string Controparte { get; set; } = string.Empty;
    public string Provenienza { get; set; } = string.Empty;
    public decimal Importo { get; set; }
    public bool IsFuture { get; set; }
    public string StatoTemporale { get; set; } = string.Empty;
}

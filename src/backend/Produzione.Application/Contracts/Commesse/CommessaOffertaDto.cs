namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaOffertaDto
{
    public string Protocollo { get; set; } = string.Empty;
    public int? Anno { get; set; }
    public DateTime? Data { get; set; }
    public string Oggetto { get; set; } = string.Empty;
    public string DocumentoStato { get; set; } = string.Empty;
    public decimal RicavoPrevisto { get; set; }
    public decimal CostoPrevisto { get; set; }
    public decimal CostoPrevistoPersonale { get; set; }
    public decimal OrePrevisteOfferta { get; set; }
    public decimal PercentualeSuccesso { get; set; }
    public string OrdiniCollegati { get; set; } = string.Empty;
}

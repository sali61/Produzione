namespace Produzione.Application.Contracts.ProcessoOfferta;

public sealed class ProcessoOffertaSintesiRowDto
{
    public int Anno { get; set; }
    public string Aggregazione { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string EsitoPositivoTesto { get; set; } = string.Empty;
    public int Numero { get; set; }
    public decimal ImportoPrevedibile { get; set; }
    public decimal CostoPrevedibile { get; set; }
    public decimal PercentualeRicarico { get; set; }
}

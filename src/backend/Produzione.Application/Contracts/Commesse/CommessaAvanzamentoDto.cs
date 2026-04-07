namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaAvanzamentoDto
{
    public int Id { get; set; }
    public int IdCommessa { get; set; }
    public decimal PercentualeRaggiunto { get; set; }
    public decimal ImportoRiferimento { get; set; }
    public decimal OreFuture { get; set; }
    public decimal OreRestanti { get; set; }
    public decimal CostoPersonaleFuturo { get; set; }
    public DateTime DataRiferimento { get; set; }
    public DateTime DataSalvataggio { get; set; }
    public int IdAutore { get; set; }
}

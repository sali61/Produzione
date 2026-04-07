namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaAvanzamentoSaveRequestDto
{
    public string Commessa { get; set; } = string.Empty;
    public decimal PercentualeRaggiunto { get; set; }
    public decimal ImportoRiferimento { get; set; }
    public decimal OreFuture { get; set; }
    public decimal OreRestanti { get; set; }
    public decimal CostoPersonaleFuturo { get; set; }
    public DateTime DataRiferimento { get; set; }
}

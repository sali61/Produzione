namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaAvanzamentoSaveRequestDto
{
    public string Commessa { get; set; } = string.Empty;
    public decimal PercentualeRaggiunto { get; set; }
    public decimal ImportoRiferimento { get; set; }
    public DateTime DataRiferimento { get; set; }
}

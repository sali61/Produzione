namespace Produzione.Application.Models;

public sealed record CommessaAvanzamentoRow(
    int Id,
    int IdCommessa,
    decimal PercentualeRaggiunto,
    decimal ImportoRiferimento,
    DateTime DataRiferimento,
    DateTime DataSalvataggio,
    int IdAutore);

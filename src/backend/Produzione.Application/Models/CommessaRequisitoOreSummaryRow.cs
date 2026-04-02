namespace Produzione.Application.Models;

public sealed record CommessaRequisitoOreSummaryRow(
    int IdRequisito,
    string Requisito,
    decimal OrePreviste,
    decimal OreSpese,
    decimal OreRestanti,
    decimal PercentualeAvanzamento);

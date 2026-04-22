namespace Produzione.Application.Models;

public sealed record CommessaRequisitoOreRisorsaRow(
    int IdRequisito,
    string Requisito,
    int IdRisorsa,
    string NomeRisorsa,
    decimal DurataRequisito,
    decimal OrePreviste,
    decimal OreSpese,
    decimal OreRestanti,
    decimal PercentualeAvanzamento,
    bool Attivo,
    bool Commerciale);

namespace Produzione.Application.Models;

public sealed record CommessaOreSpeseRisorsaRow(
    int IdRisorsa,
    string NomeRisorsa,
    decimal OreSpeseTotali);

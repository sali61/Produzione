namespace Produzione.Application.Models;

public sealed record AnalisiRccMensileBurccSnapshotRow(
    string BusinessUnit,
    string Rcc,
    int AnnoSnapshot,
    int MeseSnapshot,
    decimal Budget,
    decimal TotaleRisultatoPesato,
    decimal PercentualePesato);

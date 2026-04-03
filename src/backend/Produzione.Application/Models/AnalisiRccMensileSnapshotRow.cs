namespace Produzione.Application.Models;

public sealed record AnalisiRccMensileSnapshotRow(
    string Rcc,
    int AnnoSnapshot,
    int MeseSnapshot,
    decimal Budget,
    decimal TotaleRisultatoPesato,
    decimal PercentualePesato);

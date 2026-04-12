namespace Produzione.Application.Models;

public sealed record AnalisiRccPianoFatturazioneRow(
    int AnnoSnapshot,
    int MeseSnapshot,
    int AnnoRiferimento,
    int MeseRiferimento,
    DateTime? InseritoIl,
    decimal TotaleFatturato,
    decimal TotaleFatturatoFuturo,
    decimal TotaleComplessivo,
    decimal Budget,
    string Aggregazione,
    string? BusinessUnit,
    string TipoAggregazione);

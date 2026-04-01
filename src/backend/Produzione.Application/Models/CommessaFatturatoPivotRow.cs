namespace Produzione.Application.Models;

public sealed record CommessaFatturatoPivotRow(
    int? Anno,
    string Rcc,
    string TotaleFatturato,
    string TotaleFatturatoFuturo,
    string TotaleRicavoIpotetico,
    string TotaleRicavoIpoteticoPesato,
    string TotaleComplessivo,
    string Budget,
    string PercentualeRaggiungimento);

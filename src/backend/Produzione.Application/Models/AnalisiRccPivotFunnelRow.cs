namespace Produzione.Application.Models;

public sealed record AnalisiRccPivotFunnelRow(
    int Anno,
    string Aggregazione,
    string Tipo,
    decimal PercentualeSuccesso,
    int NumeroProtocolli,
    decimal TotaleBudgetRicavo,
    decimal TotaleBudgetCosti,
    decimal TotaleFatturatoFuturo,
    decimal TotaleEmessaAnno,
    decimal TotaleFuturaAnno,
    decimal TotaleRicaviComplessivi);

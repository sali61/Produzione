namespace Produzione.Application.Models;

public sealed record AnalisiRccPivotFatturatoRow(
    int Anno,
    string Rcc,
    decimal FatturatoAnno,
    decimal FatturatoFuturoAnno,
    decimal TotaleFatturatoCerto,
    decimal BudgetPrevisto,
    decimal MargineColBudget,
    decimal PercentualeCertaRaggiunta,
    decimal TotaleRicavoIpotetico,
    decimal TotaleRicavoIpoteticoPesato,
    decimal TotaleIpotetico,
    decimal PercentualeCompresoRicavoIpotetico);

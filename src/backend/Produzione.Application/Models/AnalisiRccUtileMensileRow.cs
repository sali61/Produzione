namespace Produzione.Application.Models;

public sealed record AnalisiRccUtileMensileRow(
    int Anno,
    string Aggregazione,
    decimal TotaleRicavi,
    decimal TotaleCosti,
    decimal TotaleCostoPersonale,
    decimal TotaleUtileSpecifico,
    decimal TotaleOreLavorate,
    decimal TotaleCostoGeneraleRibaltato,
    decimal PercentualeMargineSuRicavi,
    decimal PercentualeMarkupSuCosti,
    decimal PercentualeCostIncome);

namespace Produzione.Application.Models;

public sealed record CommessaConfigDataRow(
    int IdCommessa,
    int? IdTipoCommessa,
    string TipologiaCommessa,
    int? IdProdotto,
    string Prodotto,
    decimal BudgetImportoInvestimento,
    decimal BudgetOreInvestimento,
    decimal PrezzoVenditaInizialeRcc,
    decimal PrezzoVenditaFinaleRcc,
    decimal StimaInizialeOrePm);

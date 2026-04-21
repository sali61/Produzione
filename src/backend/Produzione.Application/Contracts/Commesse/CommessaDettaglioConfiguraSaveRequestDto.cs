namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaDettaglioConfiguraSaveRequestDto
{
    public string Commessa { get; set; } = string.Empty;
    public int? IdTipoCommessa { get; set; }
    public int? IdProdotto { get; set; }
    public decimal BudgetImportoInvestimento { get; set; }
    public decimal BudgetOreInvestimento { get; set; }
    public decimal PrezzoVenditaInizialeRcc { get; set; }
    public decimal PrezzoVenditaFinaleRcc { get; set; }
    public decimal StimaInizialeOrePm { get; set; }
}

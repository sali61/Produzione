namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccPivotFatturatoTotaleAnnoDto
{
    public int Anno { get; set; }
    public decimal FatturatoAnno { get; set; }
    public decimal FatturatoFuturoAnno { get; set; }
    public decimal TotaleFatturatoCerto { get; set; }
    public decimal BudgetPrevisto { get; set; }
    public decimal MargineColBudget { get; set; }
    public decimal PercentualeCertaRaggiunta { get; set; }
    public decimal TotaleRicavoIpotetico { get; set; }
    public decimal TotaleRicavoIpoteticoPesato { get; set; }
    public decimal TotaleIpotetico { get; set; }
    public decimal PercentualeCompresoRicavoIpotetico { get; set; }
}

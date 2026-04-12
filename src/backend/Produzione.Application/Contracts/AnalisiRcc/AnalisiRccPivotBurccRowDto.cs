namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccPivotBurccRowDto
{
    public int Anno { get; set; }
    public string BusinessUnit { get; set; } = string.Empty;
    public string Rcc { get; set; } = string.Empty;
    public decimal FatturatoAnno { get; set; }
    public decimal FatturatoFuturoAnno { get; set; }
    public decimal TotaleFatturatoCerto { get; set; }
    public decimal BudgetPrevisto { get; set; }
    public decimal MargineColBudget { get; set; }
    public decimal PercentualeCertaRaggiunta { get; set; }
    public decimal? PercentualeRaggiungimentoTemporale { get; set; }
    public decimal TotaleRicavoIpotetico { get; set; }
    public decimal TotaleRicavoIpoteticoPesato { get; set; }
    public decimal TotaleIpotetico { get; set; }
    public decimal PercentualeCompresoRicavoIpotetico { get; set; }
}

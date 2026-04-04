namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccPivotFunnelTotaleAnnoDto
{
    public int Anno { get; set; }
    public int NumeroProtocolli { get; set; }
    public decimal PercentualeSuccesso { get; set; }
    public decimal TotaleBudgetRicavo { get; set; }
    public decimal TotaleBudgetCosti { get; set; }
    public decimal TotaleFatturatoFuturo { get; set; }
    public decimal TotaleEmessaAnno { get; set; }
    public decimal TotaleFuturaAnno { get; set; }
    public decimal TotaleRicaviComplessivi { get; set; }
}

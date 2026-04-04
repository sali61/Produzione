namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccPivotFunnelRowDto
{
    public int Anno { get; set; }
    public string Aggregazione { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public decimal PercentualeSuccesso { get; set; }
    public int NumeroProtocolli { get; set; }
    public decimal TotaleBudgetRicavo { get; set; }
    public decimal TotaleBudgetCosti { get; set; }
    public decimal TotaleFatturatoFuturo { get; set; }
    public decimal TotaleEmessaAnno { get; set; }
    public decimal TotaleFuturaAnno { get; set; }
    public decimal TotaleRicaviComplessivi { get; set; }
}

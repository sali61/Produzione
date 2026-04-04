namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccUtileMensileTotaleAnnoDto
{
    public int Anno { get; set; }
    public decimal TotaleRicavi { get; set; }
    public decimal TotaleCosti { get; set; }
    public decimal TotaleCostoPersonale { get; set; }
    public decimal TotaleUtileSpecifico { get; set; }
    public decimal TotaleOreLavorate { get; set; }
    public decimal TotaleCostoGeneraleRibaltato { get; set; }
    public decimal PercentualeMargineSuRicavi { get; set; }
    public decimal PercentualeMarkupSuCosti { get; set; }
    public decimal PercentualeCostIncome { get; set; }
}

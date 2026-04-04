namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccUtileMensileRowDto
{
    public int Anno { get; set; }
    public string Aggregazione { get; set; } = string.Empty;
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

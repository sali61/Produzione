namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseDatiAnnualiAggregatiRowDto
{
    public int Anno { get; set; }
    public string Aggregazione { get; set; } = string.Empty;
    public int NumeroCommesse { get; set; }
    public decimal OreLavorate { get; set; }
    public decimal CostoPersonale { get; set; }
    public decimal Ricavi { get; set; }
    public decimal Costi { get; set; }
    public decimal UtileSpecifico { get; set; }
    public decimal RicaviFuturi { get; set; }
    public decimal CostiFuturi { get; set; }
}

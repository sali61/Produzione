namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaDettaglioAnnoRowDto
{
    public int Anno { get; set; }
    public decimal OreLavorate { get; set; }
    public decimal CostoPersonale { get; set; }
    public decimal Ricavi { get; set; }
    public decimal Costi { get; set; }
    public decimal UtileSpecifico { get; set; }
    public decimal RicaviFuturi { get; set; }
    public decimal CostiFuturi { get; set; }
}

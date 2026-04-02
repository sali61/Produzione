namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaDettaglioMeseRowDto
{
    public int Anno { get; set; }
    public int Mese { get; set; }
    public decimal OreLavorate { get; set; }
    public decimal CostoPersonale { get; set; }
    public decimal Ricavi { get; set; }
    public decimal Costi { get; set; }
    public decimal UtileSpecifico { get; set; }
    public decimal RicaviFuturi { get; set; }
    public decimal CostiFuturi { get; set; }
}

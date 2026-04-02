namespace Produzione.Application.Models;

public sealed record CommessaDettaglioMeseCorrenteRow(
    int Anno,
    int Mese,
    decimal OreLavorate,
    decimal CostoPersonale,
    decimal Ricavi,
    decimal Costi,
    decimal UtileSpecifico,
    decimal RicaviFuturi,
    decimal CostiFuturi);

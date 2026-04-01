namespace Produzione.Application.Models;

public sealed record CommessaDettaglioProgressivoCorrente(
    int Anno,
    int MeseCorrente,
    decimal OreLavorate,
    decimal CostoPersonale,
    decimal Ricavi,
    decimal Costi,
    decimal UtileSpecifico,
    decimal RicaviFuturi,
    decimal CostiFuturi);

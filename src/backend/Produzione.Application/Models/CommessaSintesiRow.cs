namespace Produzione.Application.Models;

public sealed record CommessaSintesiRow(
    int? Anno,
    string Commessa,
    string DescrizioneCommessa,
    string TipologiaCommessa,
    string Stato,
    string MacroTipologia,
    string Prodotto,
    string Controparte,
    string BusinessUnit,
    string Rcc,
    string Pm,
    decimal OreLavorate,
    decimal CostoPersonale,
    decimal Ricavi,
    decimal Costi,
    decimal RicaviMaturati,
    decimal UtileSpecifico,
    decimal RicaviFuturi,
    decimal CostiFuturi,
    decimal OreFuture,
    decimal CostoPersonaleFuturo);

namespace Produzione.Application.Models;

public sealed record CommessaAnomalaRow(
    string TipoAnomalia,
    string DettaglioAnomalia,
    int IdCommessa,
    string Commessa,
    string DescrizioneCommessa,
    string TipologiaCommessa,
    string Stato,
    string MacroTipologia,
    string Controparte,
    string BusinessUnit,
    string Rcc,
    string Pm,
    decimal OreLavorate,
    decimal CostoPersonale,
    decimal Ricavi,
    decimal Costi,
    decimal RicaviFuturi,
    decimal CostiFuturi);

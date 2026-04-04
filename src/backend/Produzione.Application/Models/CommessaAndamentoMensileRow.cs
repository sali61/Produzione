namespace Produzione.Application.Models;

public sealed record CommessaAndamentoMensileRow(
    int AnnoCompetenza,
    int MeseCompetenza,
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
    bool Produzione,
    decimal OreLavorate,
    decimal CostoPersonale,
    decimal Ricavi,
    decimal Costi,
    decimal CostoGeneraleRibaltato,
    decimal UtileSpecifico);

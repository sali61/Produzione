namespace Produzione.Application.Models;

public sealed record CommessaAnagraficaRow(
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
    DateTime? DataApertura,
    DateTime? DataChiusura);

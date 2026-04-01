namespace Produzione.Application.Models;

public sealed record CommessaAnagraficaRow(
    string Commessa,
    string DescrizioneCommessa,
    string TipologiaCommessa,
    string Stato,
    string MacroTipologia,
    string Prodotto,
    string BusinessUnit,
    string Rcc,
    string Pm);

namespace Produzione.Application.Models;

public sealed record CommesseRisorseSearchRequest(
    bool Mensile,
    IReadOnlyCollection<int> Anni,
    IReadOnlyCollection<int>? Mesi,
    string? Commessa,
    string? TipologiaCommessa,
    string? Stato,
    string? MacroTipologia,
    string? Controparte,
    string? BusinessUnit,
    string? Ou,
    string? Rcc,
    string? Pm,
    int? IdRisorsa,
    int Take,
    bool AnalisiOu = false,
    bool AnalisiOuPivot = false);

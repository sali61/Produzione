namespace Produzione.Application.Models;

public sealed record CommesseSintesiSearchRequest(
    IReadOnlyCollection<int> Anni,
    string? Commessa,
    string? TipologiaCommessa,
    string? Stato,
    string? MacroTipologia,
    string? Prodotto,
    string? BusinessUnit,
    string? Rcc,
    string? Pm,
    int Take,
    bool Aggrega,
    int? AttiveDalAnno = null,
    bool? SoloScadute = null,
    string? Provenienza = null,
    int? Mese = null,
    int? MeseDa = null,
    bool EscludiProdotti = false,
    string? ProdottoCommessa = null);

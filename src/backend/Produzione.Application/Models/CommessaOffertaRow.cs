namespace Produzione.Application.Models;

public sealed record CommessaOffertaRow(
    string Protocollo,
    int? Anno,
    DateTime? Data,
    string Oggetto,
    string DocumentoStato,
    decimal RicavoPrevisto,
    decimal CostoPrevisto,
    decimal CostoPrevistoPersonale,
    decimal OrePrevisteOfferta,
    decimal PercentualeSuccesso,
    string OrdiniCollegati);

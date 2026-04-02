namespace Produzione.Application.Models;

public sealed record CommessaOrdineRow(
    string Protocollo,
    string DocumentoStato,
    string Posizione,
    int IdDettaglioOrdine,
    string Descrizione,
    decimal Quantita,
    decimal PrezzoUnitario,
    decimal ImportoOrdine,
    decimal QuantitaOriginaleOrdinata,
    decimal QuantitaFatture);

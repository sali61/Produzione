namespace Produzione.Application.Models;

public sealed record CommessaOrdiniOfferteDettaglio(
    IReadOnlyCollection<CommessaOffertaRow> Offerte,
    IReadOnlyCollection<CommessaOrdineRow> Ordini);

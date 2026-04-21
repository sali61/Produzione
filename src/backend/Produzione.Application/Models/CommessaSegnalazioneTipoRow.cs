namespace Produzione.Application.Models;

public sealed record CommessaSegnalazioneTipoRow(
    int Id,
    string Codice,
    string Descrizione,
    bool ImpattaClienteDefault,
    int OrdineVisualizzazione);

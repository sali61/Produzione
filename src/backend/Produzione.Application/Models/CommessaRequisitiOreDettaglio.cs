namespace Produzione.Application.Models;

public sealed record CommessaRequisitiOreDettaglio(
    IReadOnlyCollection<CommessaRequisitoOreSummaryRow> Requisiti,
    IReadOnlyCollection<CommessaRequisitoOreRisorsaRow> Risorse);

namespace Produzione.Application.Models;

public sealed record CommessaFatturatoDettaglio(
    IReadOnlyCollection<CommessaFatturaMovimentoRow> Vendite,
    IReadOnlyCollection<CommessaFatturaMovimentoRow> Acquisti,
    IReadOnlyCollection<CommessaFatturatoPivotRow> FatturatoPivot);

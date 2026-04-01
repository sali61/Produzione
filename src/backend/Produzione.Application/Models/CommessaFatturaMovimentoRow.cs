namespace Produzione.Application.Models;

public sealed record CommessaFatturaMovimentoRow(
    DateTime? DataMovimento,
    string NumeroDocumento,
    string Descrizione,
    string Controparte,
    string Provenienza,
    decimal Importo,
    bool IsFuture,
    string StatoTemporale);

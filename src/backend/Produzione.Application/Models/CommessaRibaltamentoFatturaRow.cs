namespace Produzione.Application.Models;

public sealed record CommessaRibaltamentoFatturaRow(
    string Tipologia,
    int AnnoCompetenza,
    string Numero,
    string Contabilita,
    DateTime? DataFattura,
    decimal ImportoFattura,
    decimal ImportoRibaltato,
    string CommessaProvenienza,
    string CommessaDestinazione);

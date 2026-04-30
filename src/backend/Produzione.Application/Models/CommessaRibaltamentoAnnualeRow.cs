namespace Produzione.Application.Models;

public sealed record CommessaRibaltamentoAnnualeRow(
    int Anno,
    string CommessaOrigine,
    string CommessaDestinazione,
    decimal Importo,
    string Nota);

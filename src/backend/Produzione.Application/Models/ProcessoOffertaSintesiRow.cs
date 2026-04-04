namespace Produzione.Application.Models;

public sealed record ProcessoOffertaSintesiRow(
    int Anno,
    string Aggregazione,
    string Tipo,
    string EsitoPositivoTesto,
    int Numero,
    decimal ImportoPrevedibile,
    decimal CostoPrevedibile,
    decimal PercentualeRicarico);

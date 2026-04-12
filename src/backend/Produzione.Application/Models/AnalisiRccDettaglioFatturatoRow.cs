namespace Produzione.Application.Models;

public sealed record AnalisiRccDettaglioFatturatoRow(
    int Anno,
    DateTime? Data,
    string Commessa,
    string DescrizioneCommessa,
    string BusinessUnit,
    string Controparte,
    string Provenienza,
    decimal Fatturato,
    decimal FatturatoFuturo,
    decimal RicavoIpotetico,
    string Rcc,
    string Pm,
    string DescrizioneMastro,
    string DescrizioneConto,
    string DescrizioneSottoconto);

namespace Produzione.Application.Models;

public sealed record ContabilitaAcquistoRow(
    int? AnnoFattura,
    DateTime? DataDocumento,
    string Commessa,
    string DescrizioneCommessa,
    string TipologiaCommessa,
    string StatoCommessa,
    string MacroTipologia,
    string ControparteCommessa,
    string BusinessUnit,
    string Rcc,
    string Pm,
    string CodiceSocieta,
    string DescrizioneFattura,
    string ControparteMovimento,
    string Provenienza,
    decimal ImportoComplessivo,
    decimal ImportoContabilitaDettaglio,
    bool IsFuture,
    bool IsScaduta,
    string StatoTemporale);

namespace Produzione.Application.Models;

public sealed record CommessaSegnalazioneRow(
    int Id,
    int IdCommessa,
    int IdTipoSegnalazione,
    string TipoCodice,
    string TipoDescrizione,
    string Titolo,
    string Testo,
    int Priorita,
    int Stato,
    bool ImpattaCliente,
    DateTime? DataEvento,
    DateTime? DataInserimento,
    int? IdRisorsaInserimento,
    string NomeRisorsaInserimento,
    DateTime? DataUltimaModifica,
    int? IdRisorsaUltimaModifica,
    string NomeRisorsaUltimaModifica,
    DateTime? DataChiusura,
    int? IdRisorsaDestinataria,
    string NomeRisorsaDestinataria);

namespace Produzione.Application.Models;

public sealed record CommessaSegnalazioneAnalisiRow(
    int Id,
    int IdCommessa,
    string Commessa,
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

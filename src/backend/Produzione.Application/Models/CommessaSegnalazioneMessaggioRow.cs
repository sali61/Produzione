namespace Produzione.Application.Models;

public sealed record CommessaSegnalazioneMessaggioRow(
    int Id,
    int IdSegnalazione,
    int? IdMessaggioPadre,
    int Livello,
    string Testo,
    DateTime? DataInserimento,
    int? IdRisorsaInserimento,
    string NomeRisorsaInserimento,
    DateTime? DataUltimaModifica,
    int? IdRisorsaUltimaModifica,
    string NomeRisorsaUltimaModifica);

using Produzione.Application.Models;

namespace Produzione.Application.Abstractions.Persistence;

public interface ICommesseFilterRepository
{
    Task<UserContext?> ResolveUserContextAsync(string username, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<string>> GetProfilesAsync(int idRisorsa, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<string>> GetResponsabileOuSigleAsync(int idRisorsa, CancellationToken cancellationToken = default);
    Task<bool> CommessaExistsAsync(string commessa, CancellationToken cancellationToken = default);
    Task<bool> CanAccessCommessaAsync(UserContext user, string profile, string commessa, CancellationToken cancellationToken = default);
    Task<CommessaAnagraficaRow?> GetCommessaAnagraficaAsync(UserContext user, string profile, string commessa, CancellationToken cancellationToken = default);
    Task<CommessaConfigDataRow?> GetCommessaConfigAsync(string commessa, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaConfigOptionRow>> GetTipiCommessaAttiviAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaConfigOptionRow>> GetProdottiAttiviAsync(CancellationToken cancellationToken = default);
    Task<CommessaConfigDataRow?> SaveCommessaConfigAsync(
        string commessa,
        int? idTipoCommessa,
        int? idProdotto,
        decimal budgetImportoInvestimento,
        decimal budgetOreInvestimento,
        decimal prezzoVenditaInizialeRcc,
        decimal prezzoVenditaFinaleRcc,
        decimal stimaInizialeOrePm,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaSegnalazioneTipoRow>> GetTipiSegnalazioneCommessaAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaSegnalazioneRow>> GetSegnalazioniCommessaAsync(
        string commessa,
        bool includeChiuse,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaSegnalazioneAnalisiRow>> SearchSegnalazioniCommesseAsync(
        UserContext user,
        string profile,
        int? stato,
        int? idRisorsaDestinataria,
        int take,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaSegnalazioneMessaggioRow>> GetThreadSegnalazioneCommessaAsync(
        int idSegnalazione,
        CancellationToken cancellationToken = default);
    Task<bool> ApriSegnalazioneCommessaAsync(
        UserContext user,
        string commessa,
        int idTipoSegnalazione,
        string titolo,
        string testo,
        int priorita,
        bool impattaCliente,
        DateTime dataEvento,
        int? idRisorsaDestinataria,
        CancellationToken cancellationToken = default);
    Task<bool> ModificaSegnalazioneCommessaAsync(
        UserContext user,
        int idSegnalazione,
        int idTipoSegnalazione,
        string titolo,
        string testo,
        int priorita,
        bool impattaCliente,
        DateTime dataEvento,
        int? idRisorsaDestinataria,
        CancellationToken cancellationToken = default);
    Task<bool> AggiornaStatoSegnalazioneCommessaAsync(
        UserContext user,
        int idSegnalazione,
        int stato,
        CancellationToken cancellationToken = default);
    Task<bool> ChiudiSegnalazioneCommessaAsync(
        UserContext user,
        int idSegnalazione,
        DateTime? dataChiusura,
        CancellationToken cancellationToken = default);
    Task<bool> RiapriSegnalazioneCommessaAsync(
        UserContext user,
        int idSegnalazione,
        CancellationToken cancellationToken = default);
    Task<bool> EliminaSegnalazioneCommessaAsync(
        UserContext user,
        int idSegnalazione,
        CancellationToken cancellationToken = default);
    Task<bool> InserisciMessaggioSegnalazioneCommessaAsync(
        UserContext user,
        int idSegnalazione,
        int? idMessaggioPadre,
        string testo,
        CancellationToken cancellationToken = default);
    Task<bool> ModificaMessaggioSegnalazioneCommessaAsync(
        UserContext user,
        int idMessaggio,
        string testo,
        CancellationToken cancellationToken = default);
    Task<bool> EliminaMessaggioSegnalazioneCommessaAsync(
        UserContext user,
        int idMessaggio,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaOptionRow>> SearchCommesseAsync(UserContext user, string profile, string? search, int take, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaOptionRow>> SearchProdottiCommesseAsync(UserContext user, string profile, string? search, int take, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaSintesiMailCandidateRow>> GetCommessaSintesiMailCandidatesAsync(
        string commessa,
        CancellationToken cancellationToken = default);
    Task<CommesseSintesiFilters> GetSintesiFiltersAsync(
        UserContext user,
        string profile,
        int? anno,
        CancellationToken cancellationToken = default);
    Task<CommesseSintesiFilters> GetProdottiSintesiFiltersAsync(
        UserContext user,
        string profile,
        int? anno,
        CancellationToken cancellationToken = default);
    Task<CommesseRisorseFilters> GetRisorseValutazioneFiltersAsync(
        UserContext user,
        string profile,
        bool mensile,
        IReadOnlyCollection<int>? anni,
        bool analisiOu = false,
        bool analisiOuPivot = false,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaSintesiRow>> SearchSintesiAsync(
        UserContext user,
        string profile,
        CommesseSintesiSearchRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaSintesiRow>> SearchProdottiSintesiAsync(
        UserContext user,
        string profile,
        CommesseSintesiSearchRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaAndamentoMensileRow>> SearchAndamentoMensileAsync(
        UserContext user,
        string profile,
        CommesseSintesiSearchRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaKpiRow>> SearchKpiCommesseAsync(
        UserContext user,
        string profile,
        CommesseSintesiSearchRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaAnomalaRow>> SearchCommesseAnomaleAsync(
        UserContext user,
        string profile,
        int take,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaRisorseValutazioneRow>> SearchRisorseValutazioneAsync(
        UserContext user,
        string profile,
        CommesseRisorseSearchRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<ContabilitaVenditaRow>> SearchVenditeAsync(
        UserContext user,
        string profile,
        CommesseSintesiSearchRequest request,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<ContabilitaAcquistoRow>> SearchAcquistiAsync(
        UserContext user,
        string profile,
        CommesseSintesiSearchRequest request,
        CancellationToken cancellationToken = default);
    Task<CommessaFatturatoDettaglio> GetCommessaFatturatoDettaglioAsync(
        UserContext user,
        string commessa,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaRibaltamentoAnnualeRow>> GetCommessaRibaltamentiAnnualiAsync(
        string commessa,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaRibaltamentoFatturaRow>> GetCommessaRibaltamentiSuFattureAsync(
        string commessa,
        CancellationToken cancellationToken = default);
    Task<CommessaOrdiniOfferteDettaglio> GetCommessaOrdiniOfferteDettaglioAsync(
        string commessa,
        CancellationToken cancellationToken = default);
    Task<CommessaAvanzamentoRow?> GetCommessaAvanzamentoAsync(
        string commessa,
        DateTime dataRiferimento,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaAvanzamentoRow>> GetCommessaAvanzamentoStoricoAsync(
        string commessa,
        CancellationToken cancellationToken = default);
    Task<CommessaAvanzamentoRow?> SaveCommessaAvanzamentoAsync(
        UserContext user,
        string commessa,
        decimal percentualeRaggiunto,
        decimal importoRiferimento,
        decimal oreFuture,
        decimal oreRestanti,
        decimal costoPersonaleFuturo,
        DateTime dataRiferimento,
        CancellationToken cancellationToken = default);
    Task<CommessaDettaglioProgressivoCorrente?> GetCommessaProgressivoAnnoCorrenteAsync(
        UserContext user,
        string profile,
        string commessa,
        int anno,
        int meseCorrente,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaDettaglioMeseCorrenteRow>> GetCommessaMesiAnnoCorrenteAsync(
        UserContext user,
        string profile,
        string commessa,
        int anno,
        CancellationToken cancellationToken = default);
    Task<CommessaRequisitiOreDettaglio> GetCommessaRequisitiOreDettaglioAsync(
        string commessa,
        DateTime dataFineConsuntivo,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<AppInfoMenuRow>> GetAppInfoMenuVoicesAsync(
        string applicazione,
        CancellationToken cancellationToken = default);
    Task<AppInfoMenuRow?> SaveAppInfoMenuVoiceAsync(
        string applicazione,
        string menu,
        string voce,
        string descrizione,
        CancellationToken cancellationToken = default);
}

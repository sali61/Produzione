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
    Task<IReadOnlyCollection<string>> SearchCommesseAsync(UserContext user, string profile, string? search, int take, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<string>> SearchProdottiCommesseAsync(UserContext user, string profile, string? search, int take, CancellationToken cancellationToken = default);
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

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
    Task<CommesseSintesiFilters> GetSintesiFiltersAsync(
        UserContext user,
        string profile,
        int? anno,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<CommessaSintesiRow>> SearchSintesiAsync(
        UserContext user,
        string profile,
        CommesseSintesiSearchRequest request,
        CancellationToken cancellationToken = default);
    Task<CommessaFatturatoDettaglio> GetCommessaFatturatoDettaglioAsync(
        UserContext user,
        string commessa,
        CancellationToken cancellationToken = default);
    Task<CommessaDettaglioProgressivoCorrente?> GetCommessaProgressivoAnnoCorrenteAsync(
        UserContext user,
        string profile,
        string commessa,
        int anno,
        int meseCorrente,
        CancellationToken cancellationToken = default);
}

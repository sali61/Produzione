using Produzione.Application.Models;

namespace Produzione.Application.Abstractions.Persistence;

public interface ICommesseFilterRepository
{
    Task<UserContext?> ResolveUserContextAsync(string username, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<string>> GetProfilesAsync(int idRisorsa, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<string>> GetResponsabileOuSigleAsync(int idRisorsa, CancellationToken cancellationToken = default);
    Task<IReadOnlyCollection<string>> SearchCommesseAsync(UserContext user, string profile, string? search, int take, CancellationToken cancellationToken = default);
}

using Produzione.Application.Models;

namespace Produzione.Application.Abstractions.Persistence;

public interface IAnalisiRccRepository
{
    Task<string?> GetNomeRisorsaAsync(int idRisorsa, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccMensileSnapshotRow>> GetRisultatoMensileSnapshotAsync(
        int annoSnapshot,
        string? rcc,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccPivotFatturatoRow>> GetPivotFatturatoAsync(
        int idRisorsa,
        int anno,
        string? rcc,
        CancellationToken cancellationToken = default);
}

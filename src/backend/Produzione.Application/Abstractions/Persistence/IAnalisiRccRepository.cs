using Produzione.Application.Models;

namespace Produzione.Application.Abstractions.Persistence;

public interface IAnalisiRccRepository
{
    Task<string?> GetNomeRisorsaAsync(int idRisorsa, CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccMensileSnapshotRow>> GetRisultatoMensileSnapshotAsync(
        int annoSnapshot,
        string? rcc,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccMensileSnapshotRow>> GetRisultatoMensileBusinessUnitSnapshotAsync(
        int annoSnapshot,
        string? businessUnit,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccMensileBurccSnapshotRow>> GetRisultatoMensileBurccSnapshotAsync(
        int annoSnapshot,
        string? businessUnit,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccPianoFatturazioneRow>> GetPianoFatturazioneMensileAsync(
        int annoSnapshot,
        IReadOnlyCollection<int>? mesiSnapshot,
        string? businessUnit,
        string? rcc,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccPivotFatturatoRow>> GetPivotFatturatoAsync(
        int idRisorsa,
        int anno,
        string? rcc,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccPivotFatturatoRow>> GetPivotFatturatoBusinessUnitAsync(
        int idRisorsa,
        int anno,
        string? businessUnit,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccPivotBurccRow>> GetPivotFatturatoBurccAsync(
        int idRisorsa,
        int anno,
        string? businessUnit,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccUtileMensileRow>> GetUtileMensileRccAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        int? meseRiferimento,
        string? rcc,
        int? produzione,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccUtileMensileRow>> GetUtileMensileBusinessUnitAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        int? meseRiferimento,
        string? businessUnit,
        string? rcc,
        int? produzione,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccFunnelRow>> GetFunnelAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        string? rcc,
        string? tipo,
        string? statoDocumento,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccDettaglioFatturatoRow>> GetDettaglioFatturatoAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        string? commessa,
        string? commessaSearch,
        string? provenienza,
        string? controparte,
        string? businessUnit,
        string? rcc,
        string? pm,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccPivotFunnelRow>> GetPivotFunnelAsync(
        int idRisorsa,
        int anno,
        string? rcc,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccPivotFunnelRow>> GetPivotFunnelBusinessUnitAsync(
        int idRisorsa,
        int anno,
        string? businessUnit,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AnalisiRccPivotFunnelRow>> GetPivotFunnelBurccAsync(
        int idRisorsa,
        int anno,
        string? businessUnit,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<ProcessoOffertaDettaglioRow>> GetProcessoOffertaDettaglioAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits,
        IReadOnlyCollection<string>? esitiPositiviTesto,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<ProcessoOffertaSintesiRow>> GetProcessoOffertaSintesiAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        string campoAggregazione,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits,
        IReadOnlyCollection<string>? esitiPositiviTesto,
        CancellationToken cancellationToken = default);
}

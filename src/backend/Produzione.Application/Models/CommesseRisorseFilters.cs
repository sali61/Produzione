namespace Produzione.Application.Models;

public sealed record CommesseRisorseFilters(
    IReadOnlyCollection<CommesseSintesiFilterOption> Anni,
    IReadOnlyCollection<CommesseSintesiFilterOption> Mesi,
    IReadOnlyCollection<CommesseSintesiFilterOption> Commesse,
    IReadOnlyCollection<CommesseSintesiFilterOption> TipologieCommessa,
    IReadOnlyCollection<CommesseSintesiFilterOption> Stati,
    IReadOnlyCollection<CommesseSintesiFilterOption> MacroTipologie,
    IReadOnlyCollection<CommesseSintesiFilterOption> Controparti,
    IReadOnlyCollection<CommesseSintesiFilterOption> BusinessUnits,
    IReadOnlyCollection<CommesseSintesiFilterOption> Ous,
    IReadOnlyCollection<CommesseSintesiFilterOption> Rcc,
    IReadOnlyCollection<CommesseSintesiFilterOption> Pm,
    IReadOnlyCollection<CommesseRisorsaFilterOption> Risorse);

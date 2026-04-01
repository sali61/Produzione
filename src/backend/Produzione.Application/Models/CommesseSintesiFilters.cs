namespace Produzione.Application.Models;

public sealed record CommesseSintesiFilters(
    IReadOnlyCollection<CommesseSintesiFilterOption> Anni,
    IReadOnlyCollection<CommesseSintesiFilterOption> Commesse,
    IReadOnlyCollection<CommesseSintesiFilterOption> TipologieCommessa,
    IReadOnlyCollection<CommesseSintesiFilterOption> Stati,
    IReadOnlyCollection<CommesseSintesiFilterOption> MacroTipologie,
    IReadOnlyCollection<CommesseSintesiFilterOption> Prodotti,
    IReadOnlyCollection<CommesseSintesiFilterOption> BusinessUnits,
    IReadOnlyCollection<CommesseSintesiFilterOption> Rcc,
    IReadOnlyCollection<CommesseSintesiFilterOption> Pm);

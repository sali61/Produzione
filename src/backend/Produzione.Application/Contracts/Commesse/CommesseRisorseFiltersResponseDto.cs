namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseRisorseFiltersResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public bool Mensile { get; set; }
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Anni { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Mesi { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Commesse { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> TipologieCommessa { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Stati { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> MacroTipologie { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Controparti { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> BusinessUnits { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Ous { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Rcc { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Pm { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseRisorseFilterItemDto> Risorse { get; set; } = Array.Empty<CommesseRisorseFilterItemDto>();
}

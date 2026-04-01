namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseSintesiFiltersResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int? Anno { get; set; }
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Anni { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Commesse { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> TipologieCommessa { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Stati { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> MacroTipologie { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Prodotti { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> BusinessUnits { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Rcc { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
    public IReadOnlyCollection<CommesseSintesiFilterItemDto> Pm { get; set; } = Array.Empty<CommesseSintesiFilterItemDto>();
}

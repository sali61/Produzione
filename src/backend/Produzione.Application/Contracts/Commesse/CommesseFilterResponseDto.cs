namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseFilterResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int Count { get; set; }
    public IReadOnlyCollection<CommessaOptionDto> Items { get; set; } = Array.Empty<CommessaOptionDto>();
}

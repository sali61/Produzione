namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseSintesiResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int Count { get; set; }
    public IReadOnlyCollection<CommessaSintesiRowDto> Items { get; set; } = Array.Empty<CommessaSintesiRowDto>();
}

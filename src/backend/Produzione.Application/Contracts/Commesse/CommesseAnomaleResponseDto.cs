namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseAnomaleResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int Count { get; set; }
    public CommessaAnomalaRowDto[] Items { get; set; } = [];
}

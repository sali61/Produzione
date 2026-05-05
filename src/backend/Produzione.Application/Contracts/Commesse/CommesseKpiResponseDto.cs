namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseKpiResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int Count { get; set; }
    public CommessaKpiRowDto[] Items { get; set; } = [];
}

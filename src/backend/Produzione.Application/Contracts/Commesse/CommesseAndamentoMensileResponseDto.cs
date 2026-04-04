namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseAndamentoMensileResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int Count { get; set; }
    public CommessaAndamentoMensileRowDto[] Items { get; set; } = [];
}

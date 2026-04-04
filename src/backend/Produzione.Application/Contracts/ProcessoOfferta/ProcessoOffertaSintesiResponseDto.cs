namespace Produzione.Application.Contracts.ProcessoOfferta;

public sealed class ProcessoOffertaSintesiResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int[] Anni { get; set; } = [];
    public bool VediTutto { get; set; }
    public string? AmbitoFiltro { get; set; }
    public string[] EsitiDisponibili { get; set; } = [];
    public string[] AggregazioniDisponibili { get; set; } = [];
    public ProcessoOffertaSintesiRowDto[] Righe { get; set; } = [];
}

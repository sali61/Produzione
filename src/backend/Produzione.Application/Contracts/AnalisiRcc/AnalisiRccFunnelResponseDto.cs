namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccFunnelResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int[] Anni { get; set; } = [];
    public bool VediTutto { get; set; }
    public string? RccFiltro { get; set; }
    public string[] RccDisponibili { get; set; } = [];
    public string[] TipiDisponibili { get; set; } = [];
    public string[] StatiDocumentoDisponibili { get; set; } = [];
    public AnalisiRccFunnelRowDto[] Items { get; set; } = [];
}

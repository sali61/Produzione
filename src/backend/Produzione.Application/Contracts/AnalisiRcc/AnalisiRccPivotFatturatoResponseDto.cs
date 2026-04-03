namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccPivotFatturatoResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int[] Anni { get; set; } = [];
    public bool VediTutto { get; set; }
    public string? RccFiltro { get; set; }
    public string[] RccDisponibili { get; set; } = [];
    public AnalisiRccPivotFatturatoRowDto[] Righe { get; set; } = [];
    public AnalisiRccPivotFatturatoTotaleAnnoDto[] TotaliPerAnno { get; set; } = [];
}

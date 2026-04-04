namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccPivotFunnelResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int[] Anni { get; set; } = [];
    public bool VediTutto { get; set; }
    public string? AggregazioneFiltro { get; set; }
    public string? RccFiltro { get; set; }
    public string[] AggregazioniDisponibili { get; set; } = [];
    public string[] RccDisponibili { get; set; } = [];
    public AnalisiRccPivotFunnelRowDto[] Righe { get; set; } = [];
    public AnalisiRccPivotFunnelTotaleAnnoDto[] TotaliPerAnno { get; set; } = [];
}

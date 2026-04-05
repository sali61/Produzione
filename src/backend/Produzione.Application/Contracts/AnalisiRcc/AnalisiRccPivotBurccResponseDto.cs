namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccPivotBurccResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int[] Anni { get; set; } = [];
    public bool VediTutto { get; set; }
    public string? BusinessUnitFiltro { get; set; }
    public string? RccFiltro { get; set; }
    public string[] BusinessUnitDisponibili { get; set; } = [];
    public string[] RccDisponibili { get; set; } = [];
    public AnalisiRccPivotBurccRowDto[] Righe { get; set; } = [];
    public AnalisiRccPivotFatturatoTotaleAnnoDto[] TotaliPerAnno { get; set; } = [];
}

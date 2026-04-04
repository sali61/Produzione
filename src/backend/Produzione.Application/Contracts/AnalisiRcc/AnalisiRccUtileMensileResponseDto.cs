namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccUtileMensileResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int[] Anni { get; set; } = [];
    public int MeseRiferimento { get; set; }
    public bool VediTutto { get; set; }
    public string? AggregazioneFiltro { get; set; }
    public string[] AggregazioniDisponibili { get; set; } = [];
    public int? Produzione { get; set; }
    public AnalisiRccUtileMensileRowDto[] Righe { get; set; } = [];
    public AnalisiRccUtileMensileTotaleAnnoDto[] TotaliPerAnno { get; set; } = [];
}

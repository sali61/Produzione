namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccPianoFatturazioneResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int Anno { get; set; }
    public int[] MesiSnapshot { get; set; } = [];
    public int[] MesiRiferimento { get; set; } = [];
    public string TipoCalcolo { get; set; } = "complessivo";
    public bool VediTutto { get; set; }
    public string? RccFiltro { get; set; }
    public string[] RccDisponibili { get; set; } = [];
    public AnalisiRccPianoFatturazioneRowDto[] Righe { get; set; } = [];
}

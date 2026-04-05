namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccPianoFatturazioneRowDto
{
    public string Rcc { get; set; } = string.Empty;
    public bool IsTotale { get; set; }
    public decimal Budget { get; set; }
    public AnalisiRccMensileValueDto[] ValoriMensili { get; set; } = [];
    public decimal TotaleTrim1 { get; set; }
    public decimal PercentualeTrim1Cumulata { get; set; }
    public decimal TotaleTrim2 { get; set; }
    public decimal PercentualeTrim2Cumulata { get; set; }
    public decimal TotaleTrim3 { get; set; }
    public decimal PercentualeTrim3Cumulata { get; set; }
    public decimal TotaleTrim4 { get; set; }
    public decimal PercentualeTrim4Cumulata { get; set; }
    public decimal TotaleComplessivo { get; set; }
    public decimal PercentualeTotaleBudget { get; set; }
}

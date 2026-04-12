namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccRisultatoMensileRowDto
{
    public string Aggregazione { get; set; } = string.Empty;
    public string? BusinessUnit { get; set; }
    public string? Rcc { get; set; }
    public decimal? Budget { get; set; }
    public IReadOnlyCollection<AnalisiRccMensileValueDto> ValoriMensili { get; set; } = [];
}

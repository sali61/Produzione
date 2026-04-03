namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccRisultatoMensileRowDto
{
    public string Aggregazione { get; set; } = string.Empty;
    public decimal? Budget { get; set; }
    public IReadOnlyCollection<AnalisiRccMensileValueDto> ValoriMensili { get; set; } = [];
}

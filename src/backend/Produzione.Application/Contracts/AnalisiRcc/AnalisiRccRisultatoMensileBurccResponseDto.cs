namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccRisultatoMensileBurccResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int Anno { get; set; }
    public bool VediTutto { get; set; }
    public string? BusinessUnitFiltro { get; set; }
    public string? RccFiltro { get; set; }
    public string[] BusinessUnitDisponibili { get; set; } = [];
    public string[] RccDisponibili { get; set; } = [];
    public AnalisiRccRisultatoMensileGridDto RisultatoPesato { get; set; } = new();
    public AnalisiRccRisultatoMensileGridDto PercentualePesata { get; set; } = new();
}

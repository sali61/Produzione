namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccRisultatoMensileGridDto
{
    public string Titolo { get; set; } = string.Empty;
    public IReadOnlyCollection<int> Mesi { get; set; } = [];
    public bool ValoriPercentuali { get; set; }
    public IReadOnlyCollection<AnalisiRccRisultatoMensileRowDto> Righe { get; set; } = [];
}

namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccDettaglioFatturatoResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public int[] Anni { get; set; } = [];
    public bool VediTutto { get; set; }
    public string? BusinessUnitFiltro { get; set; }
    public string? RccFiltro { get; set; }
    public string? PmFiltro { get; set; }
    public string[] BusinessUnitDisponibili { get; set; } = [];
    public string[] RccDisponibili { get; set; } = [];
    public string[] CommesseDisponibili { get; set; } = [];
    public string[] ProvenienzeDisponibili { get; set; } = [];
    public string[] ContropartiDisponibili { get; set; } = [];
    public AnalisiRccDettaglioFatturatoRowDto[] Items { get; set; } = [];
}

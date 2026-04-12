namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccDettaglioFatturatoRowDto
{
    public int Anno { get; set; }
    public DateTime? Data { get; set; }
    public string Commessa { get; set; } = string.Empty;
    public string BusinessUnit { get; set; } = string.Empty;
    public string Controparte { get; set; } = string.Empty;
    public string Provenienza { get; set; } = string.Empty;
    public decimal Fatturato { get; set; }
    public decimal FatturatoFuturo { get; set; }
    public decimal RicavoIpotetico { get; set; }
    public string Rcc { get; set; } = string.Empty;
    public string Pm { get; set; } = string.Empty;
    public string DescrizioneMastro { get; set; } = string.Empty;
    public string DescrizioneConto { get; set; } = string.Empty;
    public string DescrizioneSottoconto { get; set; } = string.Empty;
}

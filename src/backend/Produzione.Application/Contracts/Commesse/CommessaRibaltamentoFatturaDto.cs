namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaRibaltamentoFatturaDto
{
    public string Tipologia { get; set; } = string.Empty;
    public int AnnoCompetenza { get; set; }
    public string Numero { get; set; } = string.Empty;
    public string Contabilita { get; set; } = string.Empty;
    public DateTime? DataFattura { get; set; }
    public decimal ImportoFattura { get; set; }
    public decimal ImportoRibaltato { get; set; }
    public string CommessaProvenienza { get; set; } = string.Empty;
    public string CommessaDestinazione { get; set; } = string.Empty;
}

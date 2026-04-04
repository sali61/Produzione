namespace Produzione.Application.Contracts.ProcessoOfferta;

public sealed class ProcessoOffertaDettaglioRowDto
{
    public int Id { get; set; }
    public string BusinessUnit { get; set; } = string.Empty;
    public string NomeProdotto { get; set; } = string.Empty;
    public string CodiceSocieta { get; set; } = string.Empty;
    public string Rcc { get; set; } = string.Empty;
    public int? IdRcc { get; set; }
    public int Anno { get; set; }
    public int? AnnoLavoro { get; set; }
    public string Commessa { get; set; } = string.Empty;
    public string Esito { get; set; } = string.Empty;
    public string Protocollo { get; set; } = string.Empty;
    public DateTime? Data { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Oggetto { get; set; } = string.Empty;
    public string StatoDocumento { get; set; } = string.Empty;
    public decimal PercentualeSuccesso { get; set; }
    public string Soluzione { get; set; } = string.Empty;
    public string MacroTipologia { get; set; } = string.Empty;
    public string TipoCommessa { get; set; } = string.Empty;
    public string Controparte { get; set; } = string.Empty;
    public bool? EsitoPositivo { get; set; }
    public string EsitoPositivoTesto { get; set; } = string.Empty;
    public decimal ImportoPrevedibile { get; set; }
    public decimal CostoPrevedibile { get; set; }
    public bool CostoPrevisto { get; set; }
}

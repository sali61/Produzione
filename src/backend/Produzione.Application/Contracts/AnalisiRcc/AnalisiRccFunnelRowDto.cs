namespace Produzione.Application.Contracts.AnalisiRcc;

public sealed class AnalisiRccFunnelRowDto
{
    public string BusinessUnit { get; set; } = string.Empty;
    public string NomeProdotto { get; set; } = string.Empty;
    public string CodiceSocieta { get; set; } = string.Empty;
    public string Rcc { get; set; } = string.Empty;
    public int? IdRcc { get; set; }
    public int Anno { get; set; }
    public string Commessa { get; set; } = string.Empty;
    public string Esito { get; set; } = string.Empty;
    public string Protocollo { get; set; } = string.Empty;
    public DateTime? Data { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Oggetto { get; set; } = string.Empty;
    public string StatoDocumento { get; set; } = string.Empty;
    public string EsitoProtocollo { get; set; } = string.Empty;
    public decimal PercentualeSuccesso { get; set; }
    public decimal BudgetRicavo { get; set; }
    public decimal BudgetPersonale { get; set; }
    public decimal BudgetCosti { get; set; }
    public decimal RicavoAtteso { get; set; }
    public decimal FatturatoEmesso { get; set; }
    public decimal FatturatoFuturo { get; set; }
    public decimal FuturaAnno { get; set; }
    public decimal EmessaAnno { get; set; }
    public decimal TotaleAnno { get; set; }
    public bool Infragruppo { get; set; }
    public string Soluzione { get; set; } = string.Empty;
    public string MacroTipologia { get; set; } = string.Empty;
    public string Controparte { get; set; } = string.Empty;
}

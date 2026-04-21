namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseDettaglioConfiguraResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public string Commessa { get; set; } = string.Empty;
    public bool CanEdit { get; set; }
    public bool CanEditTipologiaCommessa { get; set; }
    public bool CanEditProdotto { get; set; }
    public bool CanEditBudgetImportoInvestimento { get; set; }
    public bool CanEditBudgetOreInvestimento { get; set; }
    public bool CanEditPrezzoVenditaInizialeRcc { get; set; }
    public bool CanEditPrezzoVenditaFinaleRcc { get; set; }
    public bool CanEditStimaInizialeOrePm { get; set; }
    public int? IdTipoCommessa { get; set; }
    public string TipologiaCommessa { get; set; } = string.Empty;
    public int? IdProdotto { get; set; }
    public string Prodotto { get; set; } = string.Empty;
    public decimal BudgetImportoInvestimento { get; set; }
    public decimal BudgetOreInvestimento { get; set; }
    public decimal PrezzoVenditaInizialeRcc { get; set; }
    public decimal PrezzoVenditaFinaleRcc { get; set; }
    public decimal StimaInizialeOrePm { get; set; }
    public CommessaConfigOptionDto[] TipiCommessa { get; set; } = Array.Empty<CommessaConfigOptionDto>();
    public CommessaConfigOptionDto[] Prodotti { get; set; } = Array.Empty<CommessaConfigOptionDto>();
}

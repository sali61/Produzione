namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaRequisitoOreRisorsaDto
{
    public int IdRequisito { get; set; }
    public string Requisito { get; set; } = string.Empty;
    public int IdRisorsa { get; set; }
    public string NomeRisorsa { get; set; } = string.Empty;
    public decimal OrePreviste { get; set; }
    public decimal OreSpese { get; set; }
    public decimal OreRestanti { get; set; }
    public decimal PercentualeAvanzamento { get; set; }
}

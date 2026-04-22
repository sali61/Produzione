namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaRequisitoOreRisorsaDto
{
    public int IdRequisito { get; set; }
    public string Requisito { get; set; } = string.Empty;
    public int IdRisorsa { get; set; }
    public string NomeRisorsa { get; set; } = string.Empty;
    public decimal DurataRequisito { get; set; }
    public decimal OrePreviste { get; set; }
    public decimal OreSpese { get; set; }
    public decimal OreRestanti { get; set; }
    public decimal PercentualeAvanzamento { get; set; }
    public bool Attivo { get; set; }
    public bool Commerciale { get; set; }
}

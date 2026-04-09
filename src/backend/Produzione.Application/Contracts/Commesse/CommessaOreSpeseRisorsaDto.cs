namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaOreSpeseRisorsaDto
{
    public int IdRisorsa { get; set; }
    public string NomeRisorsa { get; set; } = string.Empty;
    public decimal OreSpeseTotali { get; set; }
}

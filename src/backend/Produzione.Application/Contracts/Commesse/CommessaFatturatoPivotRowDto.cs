namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaFatturatoPivotRowDto
{
    public int? Anno { get; set; }
    public string Rcc { get; set; } = string.Empty;
    public string TotaleFatturato { get; set; } = string.Empty;
    public string TotaleFatturatoFuturo { get; set; } = string.Empty;
    public string TotaleRicavoIpotetico { get; set; } = string.Empty;
    public string TotaleRicavoIpoteticoPesato { get; set; } = string.Empty;
    public string TotaleComplessivo { get; set; } = string.Empty;
    public string Budget { get; set; } = string.Empty;
    public string PercentualeRaggiungimento { get; set; } = string.Empty;
}

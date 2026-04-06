namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseRisorseFilterItemDto
{
    public int IdRisorsa { get; set; }
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool InForza { get; set; }
}


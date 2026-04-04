namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseDatiAnnualiAggregatiResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public string AggregazioneSelezionata { get; set; } = "cliente";
    public int[] Anni { get; set; } = [];
    public CommesseDatiAnnualiAggregatiRowDto[] Items { get; set; } = [];
    public CommesseDatiAnnualiAggregatiTotaleAnnoDto[] TotaliPerAnno { get; set; } = [];
}

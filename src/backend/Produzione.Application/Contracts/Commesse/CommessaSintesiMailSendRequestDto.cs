namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSintesiMailSendRequestDto
{
    public string Commessa { get; set; } = string.Empty;
    public string[] Ruoli { get; set; } = Array.Empty<string>();
    public bool IncludeAssociatiCommessa { get; set; }
    public string Oggetto { get; set; } = string.Empty;
    public string CorpoHtml { get; set; } = string.Empty;
    public string CorpoTesto { get; set; } = string.Empty;
}

namespace Produzione.Application.Contracts.Commesse;

public sealed class CommesseDettaglioSintesiMailPreviewResponseDto
{
    public string Profile { get; set; } = string.Empty;
    public string Commessa { get; set; } = string.Empty;
    public string SimulatedTargetEmail { get; set; } = string.Empty;
    public string SuggestedSubject { get; set; } = string.Empty;
    public string SuggestedBodyHtml { get; set; } = string.Empty;
    public CommessaSintesiMailRoleOptionDto[] RoleOptions { get; set; } = Array.Empty<CommessaSintesiMailRoleOptionDto>();
    public CommessaSintesiMailRecipientDto[] Recipients { get; set; } = Array.Empty<CommessaSintesiMailRecipientDto>();
}

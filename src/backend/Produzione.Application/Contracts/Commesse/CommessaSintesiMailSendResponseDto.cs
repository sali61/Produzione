namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSintesiMailSendResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string SimulatedTargetEmail { get; set; } = string.Empty;
    public string[] SelectedRoles { get; set; } = Array.Empty<string>();
    public bool IncludeAssociatiCommessa { get; set; }
    public CommessaSintesiMailRecipientDto[] IntendedRecipients { get; set; } = Array.Empty<CommessaSintesiMailRecipientDto>();
    public string[] IntendedEmails { get; set; } = Array.Empty<string>();
    public DateTime SentAtUtc { get; set; }
}

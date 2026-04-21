namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSegnalazioneDestinatarioOptionDto
{
    public string RoleCode { get; set; } = string.Empty;
    public string RoleLabel { get; set; } = string.Empty;
    public int IdRisorsa { get; set; }
    public string NomeRisorsa { get; set; } = string.Empty;
    public string NetUserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
}

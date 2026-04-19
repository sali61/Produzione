namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSintesiMailRecipientDto
{
    public int? IdRisorsa { get; set; }
    public string NomeRisorsa { get; set; } = string.Empty;
    public string NetUserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string[] Ruoli { get; set; } = Array.Empty<string>();
    public bool AssociatoCommessa { get; set; }
}

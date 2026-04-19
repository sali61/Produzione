namespace Produzione.Application.Contracts.Commesse;

public sealed class CommessaSintesiMailRoleOptionDto
{
    public string RoleCode { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool Available { get; set; }
    public string[] Emails { get; set; } = Array.Empty<string>();
}

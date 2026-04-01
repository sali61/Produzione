namespace Produzione.Application.Contracts.Profiles;

public sealed class AvailableProfilesResponseDto
{
    public IReadOnlyCollection<string> Profiles { get; set; } = Array.Empty<string>();
    public IReadOnlyCollection<string> OuScopes { get; set; } = Array.Empty<string>();
    public bool CanImpersonate { get; set; }
    public bool IsImpersonating { get; set; }
    public string AuthenticatedUsername { get; set; } = string.Empty;
    public string EffectiveUsername { get; set; } = string.Empty;
}

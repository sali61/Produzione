namespace Produzione.Application.Models;

public sealed record UserContext(
    int IdRisorsa,
    string Username,
    string? Ou,
    IReadOnlyCollection<string> OuScopes);

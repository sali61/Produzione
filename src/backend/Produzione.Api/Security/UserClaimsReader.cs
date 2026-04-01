using System.Security.Claims;

namespace Produzione.Api.Security;

public static class UserClaimsReader
{
    public static bool TryGetUsername(ClaimsPrincipal principal, out string username, out string error)
    {
        username = string.Empty;
        error = string.Empty;

        var value = principal.FindFirstValue(ClaimTypes.Name)
                    ?? principal.FindFirstValue(ClaimTypes.Upn)
                    ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? string.Empty;
        if (string.IsNullOrWhiteSpace(value))
        {
            error = "Claim username mancante.";
            return false;
        }

        username = value.Trim();
        return true;
    }
}

using System.Security.Claims;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Application.Common.Profiles;
using Produzione.Application.Models;

namespace Produzione.Api.Security;

public sealed record UserExecutionContextData(
    UserContext AuthenticatedUser,
    IReadOnlyCollection<string> AuthenticatedProfiles,
    IReadOnlyCollection<string> AuthenticatedOuScopes,
    UserContext EffectiveUser,
    IReadOnlyCollection<string> EffectiveProfiles,
    IReadOnlyCollection<string> EffectiveOuScopes,
    bool CanImpersonate,
    bool IsImpersonating,
    string? ImpersonatedUsername);

public sealed record UserExecutionContextResolution(
    UserExecutionContextData? Context,
    int StatusCode,
    string? Message)
{
    public bool IsSuccess => Context is not null;

    public static UserExecutionContextResolution Success(UserExecutionContextData context) =>
        new(context, StatusCodes.Status200OK, null);

    public static UserExecutionContextResolution Failure(int statusCode, string message) =>
        new(null, statusCode, message);
}

public sealed class UserExecutionContextService(
    ICommesseFilterRepository commesseFilterRepository,
    ILogger<UserExecutionContextService> logger)
{
    public const string ImpersonationHeaderName = "X-Act-As-Username";

    public async Task<UserExecutionContextResolution> ResolveAsync(
        ClaimsPrincipal principal,
        string? requestedImpersonationUsername,
        CancellationToken cancellationToken = default)
    {
        if (!UserClaimsReader.TryGetUsername(principal, out var username, out var error))
        {
            return UserExecutionContextResolution.Failure(StatusCodes.Status400BadRequest, error);
        }

        var authenticatedUser = await commesseFilterRepository.ResolveUserContextAsync(username, cancellationToken);
        if (authenticatedUser is null)
        {
            return UserExecutionContextResolution.Failure(
                StatusCodes.Status403Forbidden,
                $"Utente '{username}' autenticato ma non censito su Produzione.");
        }

        var authenticatedProfiles = NormalizeProfiles(
            await commesseFilterRepository.GetProfilesAsync(authenticatedUser.IdRisorsa, cancellationToken));
        var authenticatedOuScopes = await commesseFilterRepository.GetResponsabileOuSigleAsync(
            authenticatedUser.IdRisorsa,
            cancellationToken);

        var canImpersonate = authenticatedProfiles.Contains(ProfileCatalog.Supervisore, StringComparer.OrdinalIgnoreCase);
        var requestedTargetUsername = requestedImpersonationUsername?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(requestedTargetUsername) ||
            requestedTargetUsername.Equals(authenticatedUser.Username, StringComparison.OrdinalIgnoreCase))
        {
            return UserExecutionContextResolution.Success(new UserExecutionContextData(
                authenticatedUser,
                authenticatedProfiles,
                authenticatedOuScopes,
                authenticatedUser,
                authenticatedProfiles,
                authenticatedOuScopes,
                canImpersonate,
                false,
                null));
        }

        if (!canImpersonate)
        {
            logger.LogWarning(
                "Tentativo impersonazione bloccato. Utente {Username} senza ruolo Supervisore verso {Target}.",
                authenticatedUser.Username,
                requestedTargetUsername);
            return UserExecutionContextResolution.Failure(
                StatusCodes.Status403Forbidden,
                "Solo il ruolo Supervisore puo' impersonificare utenti in Produzione.");
        }

        var effectiveUser = await commesseFilterRepository.ResolveUserContextAsync(
            requestedTargetUsername,
            cancellationToken);
        if (effectiveUser is null)
        {
            logger.LogWarning(
                "Utente target non trovato in impersonazione. Impersonator: {Impersonator}, target richiesto: {Target}.",
                authenticatedUser.Username,
                requestedTargetUsername);
            return UserExecutionContextResolution.Failure(
                StatusCodes.Status404NotFound,
                $"Utente target '{requestedTargetUsername}' non trovato o non attivo in Produzione.");
        }

        var effectiveProfiles = NormalizeProfiles(
            await commesseFilterRepository.GetProfilesAsync(effectiveUser.IdRisorsa, cancellationToken));
        var effectiveOuScopes = await commesseFilterRepository.GetResponsabileOuSigleAsync(
            effectiveUser.IdRisorsa,
            cancellationToken);

        logger.LogInformation(
            "Impersonazione attiva in Produzione: {Impersonator} -> {Target}",
            authenticatedUser.Username,
            effectiveUser.Username);

        return UserExecutionContextResolution.Success(new UserExecutionContextData(
            authenticatedUser,
            authenticatedProfiles,
            authenticatedOuScopes,
            effectiveUser,
            effectiveProfiles,
            effectiveOuScopes,
            canImpersonate,
            true,
            effectiveUser.Username));
    }

    public static IReadOnlyCollection<string> BuildAvailableProfiles(
        IReadOnlyCollection<string> normalizedProfiles,
        IReadOnlyCollection<string> ouScopes)
    {
        var values = normalizedProfiles.ToList();
        if (ouScopes.Count > 0)
        {
            values.Add(ProfileCatalog.ResponsabileOu);
        }

        return ProfileCatalog.OrderByOperationalPriority(values);
    }

    private static IReadOnlyCollection<string> NormalizeProfiles(IReadOnlyCollection<string> profiles)
    {
        return ProfileCatalog.OrderByOperationalPriority(profiles);
    }
}

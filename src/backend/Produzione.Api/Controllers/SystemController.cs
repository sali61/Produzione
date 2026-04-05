using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;
using Produzione.Api.Security;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Application.Common.Profiles;
using Produzione.Application.Contracts.System;

namespace Produzione.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SystemController(
    UserExecutionContextService executionContextService,
    ICommesseFilterRepository commesseFilterRepository,
    ILogger<SystemController> logger) : ControllerBase
{
    private const string ApplicationName = "Produzione";

    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Ok(new
        {
            service = "Produzione.Api",
            status = "Healthy",
            utcNow = DateTime.UtcNow
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername,
        CancellationToken cancellationToken)
    {
        try
        {
            var resolution = await executionContextService.ResolveAsync(User, actAsUsername, cancellationToken);
            if (!resolution.IsSuccess || resolution.Context is null)
            {
                return StatusCode(resolution.StatusCode, new
                {
                    message = resolution.Message ?? "Contesto utente non risolvibile."
                });
            }

            var context = resolution.Context;
            var ou = context.EffectiveOuScopes.FirstOrDefault() ?? string.Empty;
            var fullNameFromClaims = $"{User.FindFirstValue(ClaimTypes.GivenName) ?? string.Empty} {User.FindFirstValue(ClaimTypes.Surname) ?? string.Empty}".Trim();
            var availableProfiles = UserExecutionContextService.BuildAvailableProfiles(
                context.EffectiveProfiles,
                context.EffectiveOuScopes);

            return Ok(new
            {
                idRisorsa = context.EffectiveUser.IdRisorsa,
                username = context.EffectiveUser.Username,
                fullName = string.IsNullOrWhiteSpace(fullNameFromClaims) || context.IsImpersonating
                    ? context.EffectiveUser.Username
                    : fullNameFromClaims,
                ou,
                ouScopes = context.EffectiveOuScopes,
                roles = context.EffectiveProfiles,
                profiles = availableProfiles,
                canImpersonate = context.CanImpersonate,
                isImpersonating = context.IsImpersonating,
                impersonatedUsername = context.ImpersonatedUsername,
                impersonatorUsername = context.IsImpersonating ? context.AuthenticatedUser.Username : null,
                authenticatedIdRisorsa = context.AuthenticatedUser.IdRisorsa,
                authenticatedUsername = context.AuthenticatedUser.Username,
                authenticatedRoles = context.AuthenticatedProfiles,
                authenticatedOuScopes = context.AuthenticatedOuScopes
            });
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/system/me.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/system/me.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante la risoluzione del contesto utente."
            });
        }
    }

    [HttpGet("app-info")]
    [Authorize]
    [ProducesResponseType(typeof(AppInfoResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> AppInfo(
        [FromQuery] string profile,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername,
        CancellationToken cancellationToken)
    {
        try
        {
            var (isValid, _, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
            if (!isValid || string.IsNullOrWhiteSpace(profileResult))
            {
                return errorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var rows = await commesseFilterRepository.GetAppInfoMenuVoicesAsync(ApplicationName, cancellationToken);
            var response = new AppInfoResponseDto
            {
                Profile = profileResult,
                Applicazione = ApplicationName,
                Items = rows
                    .Where(item => !string.IsNullOrWhiteSpace(item.Menu) && !string.IsNullOrWhiteSpace(item.Voce))
                    .Select(item => new AppInfoMenuItemDto
                    {
                        Menu = item.Menu,
                        Voce = item.Voce,
                        Sintesi = item.Descrizione
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/system/app-info.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/system/app-info.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il caricamento delle descrizioni applicazione."
            });
        }
    }

    [HttpPost("app-info/description")]
    [Authorize]
    [ProducesResponseType(typeof(AppInfoMenuItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SaveAppInfoDescription(
        [FromQuery] string profile,
        [FromBody] AppInfoSaveRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername,
        CancellationToken cancellationToken)
    {
        try
        {
            if (request is null ||
                string.IsNullOrWhiteSpace(request.Menu) ||
                string.IsNullOrWhiteSpace(request.Voce))
            {
                return BadRequest(new
                {
                    message = "Menu e voce sono obbligatori."
                });
            }

            var (isValid, _, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
            if (!isValid || string.IsNullOrWhiteSpace(profileResult))
            {
                return errorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            if (!profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = "Solo il profilo Supervisore puo' aggiornare le descrizioni dell'applicazione."
                });
            }

            var saved = await commesseFilterRepository.SaveAppInfoMenuVoiceAsync(
                ApplicationName,
                request.Menu,
                request.Voce,
                request.Sintesi,
                cancellationToken);

            if (saved is null)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Salvataggio descrizione non riuscito."
                });
            }

            return Ok(new AppInfoMenuItemDto
            {
                Menu = saved.Menu,
                Voce = saved.Voce,
                Sintesi = saved.Descrizione
            });
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/system/app-info/description.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/system/app-info/description.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il salvataggio della descrizione."
            });
        }
    }

    private async Task<(bool IsValid, UserExecutionContextData? Context, IActionResult? ErrorResponse, string? Profile)> ResolveContextAndProfileAsync(
        string profile,
        string? actAsUsername,
        CancellationToken cancellationToken)
    {
        var resolution = await executionContextService.ResolveAsync(User, actAsUsername, cancellationToken);
        if (!resolution.IsSuccess || resolution.Context is null)
        {
            return (false, null, StatusCode(resolution.StatusCode, new
            {
                message = resolution.Message ?? "Contesto utente non risolvibile."
            }), null);
        }

        var normalizedProfile = ProfileCatalog.Normalize(profile);
        if (!ProfileCatalog.IsKnown(normalizedProfile))
        {
            return (false, null, BadRequest(new { message = $"Profilo non riconosciuto: {profile}" }), null);
        }

        var normalizedAllowedProfiles = UserExecutionContextService.BuildAvailableProfiles(
            resolution.Context.EffectiveProfiles,
            resolution.Context.EffectiveOuScopes);

        if (!normalizedAllowedProfiles.Contains(normalizedProfile, StringComparer.OrdinalIgnoreCase))
        {
            return (false, null, StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = $"Profilo '{normalizedProfile}' non autorizzato per l'utente '{resolution.Context.EffectiveUser.Username}'."
            }), null);
        }

        return (true, resolution.Context, null, normalizedProfile);
    }
}

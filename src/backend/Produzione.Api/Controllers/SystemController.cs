using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;
using Produzione.Api.Security;

namespace Produzione.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SystemController(
    UserExecutionContextService executionContextService,
    ILogger<SystemController> logger) : ControllerBase
{
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
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Produzione.Api.Security;
using Produzione.Application.Contracts.Profiles;

namespace Produzione.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class ProfilesController(
    UserExecutionContextService executionContextService,
    ILogger<ProfilesController> logger) : ControllerBase
{
    [HttpGet("available")]
    [ProducesResponseType(typeof(AvailableProfilesResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Available(
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
            var allowedProfiles = UserExecutionContextService.BuildAvailableProfiles(
                context.EffectiveProfiles,
                context.EffectiveOuScopes);

            var response = new AvailableProfilesResponseDto
            {
                Profiles = allowedProfiles,
                OuScopes = context.EffectiveOuScopes,
                CanImpersonate = context.CanImpersonate,
                IsImpersonating = context.IsImpersonating,
                AuthenticatedUsername = context.AuthenticatedUser.Username,
                EffectiveUsername = context.EffectiveUser.Username
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/profiles/available.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/profiles/available.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dei profili disponibili."
            });
        }
    }
}

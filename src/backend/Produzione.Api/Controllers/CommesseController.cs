using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Produzione.Api.Security;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Application.Common.Profiles;
using Produzione.Application.Contracts.Commesse;

namespace Produzione.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class CommesseController(
    UserExecutionContextService executionContextService,
    ICommesseFilterRepository commesseFilterRepository,
    ILogger<CommesseController> logger) : ControllerBase
{
    [HttpGet("options")]
    [ProducesResponseType(typeof(CommesseFilterResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Options(
        [FromQuery] string profile,
        [FromQuery] string? search,
        [FromQuery] int take = 100,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
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
            var normalizedProfile = ProfileCatalog.Normalize(profile);
            if (!ProfileCatalog.IsKnown(normalizedProfile))
            {
                return BadRequest(new { message = $"Profilo non riconosciuto: {profile}" });
            }

            var normalizedAllowedProfiles = UserExecutionContextService.BuildAvailableProfiles(
                context.EffectiveProfiles,
                context.EffectiveOuScopes);

            if (!normalizedAllowedProfiles.Contains(normalizedProfile, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{normalizedProfile}' non autorizzato per l'utente '{context.EffectiveUser.Username}'."
                });
            }

            var commesse = await commesseFilterRepository.SearchCommesseAsync(
                context.EffectiveUser,
                normalizedProfile,
                search,
                take,
                cancellationToken);

            var response = new CommesseFilterResponseDto
            {
                Profile = normalizedProfile,
                Count = commesse.Count,
                Items = commesse.Select(value => new CommessaOptionDto { Commessa = value }).ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/options.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/options.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero delle commesse."
            });
        }
    }
}

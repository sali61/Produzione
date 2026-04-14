using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Produzione.Api.Security;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Application.Common.Profiles;
using Produzione.Application.Contracts.Commesse;
using Produzione.Application.Models;

namespace Produzione.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public sealed class ProdottiController(
    UserExecutionContextService executionContextService,
    ICommesseFilterRepository commesseFilterRepository,
    ILogger<ProdottiController> logger) : ControllerBase
{
    private static readonly string[] AllowedProfiles =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ProjectManager,
        ProfileCatalog.ResponsabileCommercialeCommessa,
        ProfileCatalog.GeneralProjectManager,
        ProfileCatalog.ResponsabileOu
    ];

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
            var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
            if (!isValid || contextData is null || string.IsNullOrWhiteSpace(profileResult))
            {
                return errorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var commesse = await commesseFilterRepository.SearchProdottiCommesseAsync(
                contextData.EffectiveUser,
                profileResult,
                search,
                take,
                cancellationToken);

            var response = new CommesseFilterResponseDto
            {
                Profile = profileResult,
                Count = commesse.Count,
                Items = commesse
                    .Select(item =>
                    {
                        var descrizione = item.DescrizioneCommessa?.Trim() ?? string.Empty;
                        var commessa = item.Commessa?.Trim() ?? string.Empty;
                        return new CommessaOptionDto
                        {
                            Commessa = commessa,
                            DescrizioneCommessa = descrizione,
                            Label = string.IsNullOrWhiteSpace(descrizione)
                                ? commessa
                                : $"{commessa} - {descrizione}"
                        };
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/prodotti/options.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/prodotti/options.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero delle commesse prodotto."
            });
        }
    }

    [HttpGet("sintesi/filters")]
    [ProducesResponseType(typeof(CommesseSintesiFiltersResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SintesiFilters(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
            if (!isValid || contextData is null || string.IsNullOrWhiteSpace(profileResult))
            {
                return errorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var filters = await commesseFilterRepository.GetProdottiSintesiFiltersAsync(
                contextData.EffectiveUser,
                profileResult,
                anno,
                cancellationToken);

            var response = new CommesseSintesiFiltersResponseDto
            {
                Profile = profileResult,
                Anno = anno,
                Anni = filters.Anni.Select(ToFilterItemDto).ToArray(),
                Commesse = filters.Commesse.Select(ToFilterItemDto).ToArray(),
                TipologieCommessa = filters.TipologieCommessa.Select(ToFilterItemDto).ToArray(),
                Stati = filters.Stati.Select(ToFilterItemDto).ToArray(),
                MacroTipologie = filters.MacroTipologie.Select(ToFilterItemDto).ToArray(),
                Prodotti = filters.Prodotti.Select(ToFilterItemDto).ToArray(),
                BusinessUnits = filters.BusinessUnits.Select(ToFilterItemDto).ToArray(),
                Rcc = filters.Rcc.Select(ToFilterItemDto).ToArray(),
                Pm = filters.Pm.Select(ToFilterItemDto).ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/prodotti/sintesi/filters.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/prodotti/sintesi/filters.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dei filtri sintesi prodotti."
            });
        }
    }

    [HttpGet("sintesi")]
    [ProducesResponseType(typeof(CommesseSintesiResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Sintesi(
        [FromQuery] string profile,
        [FromQuery] bool aggrega = false,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] int? attiveDalAnno = null,
        [FromQuery] string? commessa = null,
        [FromQuery] string? tipologiaCommessa = null,
        [FromQuery] string? stato = null,
        [FromQuery] string? macroTipologia = null,
        [FromQuery] string? prodotto = null,
        [FromQuery] string? businessUnit = null,
        [FromQuery] string? rcc = null,
        [FromQuery] string? pm = null,
        [FromQuery] int take = 200,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
            if (!isValid || contextData is null || string.IsNullOrWhiteSpace(profileResult))
            {
                return errorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var selectedAnni = (anni ?? Array.Empty<int>())
                .Where(value => value > 0)
                .Distinct()
                .OrderByDescending(value => value)
                .ToArray();

            if (selectedAnni.Length == 0 && anno.HasValue && anno.Value > 0)
            {
                selectedAnni = [anno.Value];
            }

            var request = new CommesseSintesiSearchRequest(
                selectedAnni,
                commessa,
                tipologiaCommessa,
                stato,
                macroTipologia,
                prodotto,
                businessUnit,
                rcc,
                pm,
                take,
                aggrega,
                AttiveDalAnno: attiveDalAnno);

            var rows = await commesseFilterRepository.SearchProdottiSintesiAsync(
                contextData.EffectiveUser,
                profileResult,
                request,
                cancellationToken);

            var response = new CommesseSintesiResponseDto
            {
                Profile = profileResult,
                Count = rows.Count,
                Items = rows.Select(ToSintesiRowDto).ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/prodotti/sintesi.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/prodotti/sintesi.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dati sintesi prodotti."
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

        if (!AllowedProfiles.Contains(normalizedProfile, StringComparer.OrdinalIgnoreCase))
        {
            return (false, null, StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = $"Profilo '{normalizedProfile}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfiles)}."
            }), null);
        }

        return (true, resolution.Context, null, normalizedProfile);
    }

    private static CommesseSintesiFilterItemDto ToFilterItemDto(CommesseSintesiFilterOption option)
    {
        return new CommesseSintesiFilterItemDto
        {
            Value = option.Value,
            Label = option.Label
        };
    }

    private static CommessaSintesiRowDto ToSintesiRowDto(CommessaSintesiRow row)
    {
        return new CommessaSintesiRowDto
        {
            Anno = row.Anno,
            Commessa = row.Commessa,
            DescrizioneCommessa = row.DescrizioneCommessa,
            TipologiaCommessa = row.TipologiaCommessa,
            Stato = row.Stato,
            MacroTipologia = row.MacroTipologia,
            Prodotto = row.Prodotto,
            Controparte = row.Controparte,
            BusinessUnit = row.BusinessUnit,
            Rcc = row.Rcc,
            Pm = row.Pm,
            OreLavorate = row.OreLavorate,
            CostoPersonale = row.CostoPersonale,
            Ricavi = row.Ricavi,
            Costi = row.Costi,
            RicaviMaturati = row.RicaviMaturati,
            UtileSpecifico = row.UtileSpecifico,
            RicaviFuturi = row.RicaviFuturi,
            CostiFuturi = row.CostiFuturi,
            OreFuture = row.OreFuture,
            CostoPersonaleFuturo = row.CostoPersonaleFuturo
        };
    }
}

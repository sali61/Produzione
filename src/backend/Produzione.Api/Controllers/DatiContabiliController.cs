using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Produzione.Api.Security;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Application.Common.Profiles;
using Produzione.Application.Contracts.DatiContabili;
using Produzione.Application.Models;

namespace Produzione.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dati-contabili")]
public sealed class DatiContabiliController(
    UserExecutionContextService executionContextService,
    ICommesseFilterRepository commesseFilterRepository,
    ILogger<DatiContabiliController> logger) : ControllerBase
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

    [HttpGet("vendite")]
    [HttpGet("vendita")]
    [ProducesResponseType(typeof(DatiContabiliVenditaResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Vendita(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] string? commessa = null,
        [FromQuery] string? tipologiaCommessa = null,
        [FromQuery] string? stato = null,
        [FromQuery] string? macroTipologia = null,
        [FromQuery] string? prodotto = null,
        [FromQuery] string? businessUnit = null,
        [FromQuery] string? rcc = null,
        [FromQuery] string? pm = null,
        [FromQuery] bool? soloScadute = null,
        [FromQuery] string? provenienza = null,
        [FromQuery] int take = 2000,
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
                false,
                SoloScadute: soloScadute,
                Provenienza: provenienza);

            var rows = await commesseFilterRepository.SearchVenditeAsync(
                contextData.EffectiveUser,
                profileResult,
                request,
                cancellationToken);

            var response = new DatiContabiliVenditaResponseDto
            {
                Profile = profileResult,
                Count = rows.Count,
                Items = rows
                    .Select(item => new DatiContabiliVenditaRowDto
                    {
                        AnnoFattura = item.AnnoFattura,
                        DataMovimento = item.DataMovimento,
                        Commessa = item.Commessa,
                        DescrizioneCommessa = item.DescrizioneCommessa,
                        TipologiaCommessa = item.TipologiaCommessa,
                        StatoCommessa = item.StatoCommessa,
                        MacroTipologia = item.MacroTipologia,
                        ControparteCommessa = item.ControparteCommessa,
                        BusinessUnit = item.BusinessUnit,
                        Rcc = item.Rcc,
                        Pm = item.Pm,
                        NumeroDocumento = item.NumeroDocumento,
                        DescrizioneMovimento = item.DescrizioneMovimento,
                        ControparteMovimento = item.ControparteMovimento,
                        Provenienza = item.Provenienza,
                        Importo = item.Importo,
                        Fatturato = item.Fatturato,
                        FatturatoFuturo = item.FatturatoFuturo,
                        RicavoIpotetico = item.RicavoIpotetico,
                        IsFuture = item.IsFuture,
                        IsScaduta = item.IsScaduta,
                        StatoTemporale = item.StatoTemporale
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/dati-contabili/vendita.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/dati-contabili/vendita.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dati vendite."
            });
        }
    }

    [HttpGet("acquisti")]
    [HttpGet("acquisto")]
    [ProducesResponseType(typeof(DatiContabiliAcquistoResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Acquisti(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] string? commessa = null,
        [FromQuery] string? tipologiaCommessa = null,
        [FromQuery] string? stato = null,
        [FromQuery] string? macroTipologia = null,
        [FromQuery] string? prodotto = null,
        [FromQuery] string? businessUnit = null,
        [FromQuery] string? rcc = null,
        [FromQuery] string? pm = null,
        [FromQuery] bool? soloScadute = null,
        [FromQuery] string? provenienza = null,
        [FromQuery] int take = 2000,
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
                false,
                SoloScadute: soloScadute,
                Provenienza: provenienza);

            var rows = await commesseFilterRepository.SearchAcquistiAsync(
                contextData.EffectiveUser,
                profileResult,
                request,
                cancellationToken);

            var response = new DatiContabiliAcquistoResponseDto
            {
                Profile = profileResult,
                Count = rows.Count,
                Items = rows
                    .Select(item => new DatiContabiliAcquistoRowDto
                    {
                        AnnoFattura = item.AnnoFattura,
                        DataDocumento = item.DataDocumento,
                        Commessa = item.Commessa,
                        DescrizioneCommessa = item.DescrizioneCommessa,
                        TipologiaCommessa = item.TipologiaCommessa,
                        StatoCommessa = item.StatoCommessa,
                        MacroTipologia = item.MacroTipologia,
                        ControparteCommessa = item.ControparteCommessa,
                        BusinessUnit = item.BusinessUnit,
                        Rcc = item.Rcc,
                        Pm = item.Pm,
                        CodiceSocieta = item.CodiceSocieta,
                        DescrizioneFattura = item.DescrizioneFattura,
                        ControparteMovimento = item.ControparteMovimento,
                        Provenienza = item.Provenienza,
                        ImportoComplessivo = item.ImportoComplessivo,
                        ImportoContabilitaDettaglio = item.ImportoContabilitaDettaglio,
                        IsFuture = item.IsFuture,
                        IsScaduta = item.IsScaduta,
                        StatoTemporale = item.StatoTemporale
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/dati-contabili/acquisti.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/dati-contabili/acquisti.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dati acquisti."
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

        if (!AllowedProfiles.Contains(normalizedProfile, StringComparer.OrdinalIgnoreCase))
        {
            return (false, null, StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = $"Profilo '{normalizedProfile}' non autorizzato alla consultazione in Dati Contabili."
            }), null);
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

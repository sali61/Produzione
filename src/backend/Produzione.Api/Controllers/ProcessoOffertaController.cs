using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Produzione.Api.Security;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Application.Common.Profiles;
using Produzione.Application.Contracts.ProcessoOfferta;

namespace Produzione.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/processo-offerta")]
public sealed class ProcessoOffertaController(
    UserExecutionContextService executionContextService,
    IAnalisiRccRepository analisiRccRepository,
    ILogger<ProcessoOffertaController> logger) : ControllerBase
{
    private static readonly string[] AllowedProfiles =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommercialeCommessa,
        ProfileCatalog.ResponsabileOu
    ];

    private static readonly string[] FullVisibilityProfiles =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione
    ];

    [HttpGet("offerte")]
    [ProducesResponseType(typeof(ProcessoOffertaOfferteResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Offerte(
        [FromQuery] string profile,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery(Name = "esiti")] string[]? esiti = null,
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

            if (!AllowedProfiles.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfiles)}."
                });
            }

            var anniRiferimento = NormalizeAnni(anni);
            var esitiRiferimento = NormalizeValues(esiti);
            var vediTutto = FullVisibilityProfiles.Contains(profileResult, StringComparer.OrdinalIgnoreCase);
            var analisiIdRisorsa = 0;

            string? rccFiltro = null;
            IReadOnlyCollection<string>? allowedBusinessUnits = null;
            if (!vediTutto)
            {
                if (profileResult.Equals(ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase))
                {
                    rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                        contextData.EffectiveUser.IdRisorsa,
                        cancellationToken);

                    if (string.IsNullOrWhiteSpace(rccFiltro))
                    {
                        return Ok(new ProcessoOffertaOfferteResponseDto
                        {
                            Profile = profileResult,
                            Anni = anniRiferimento,
                            VediTutto = false,
                            AmbitoFiltro = null,
                            EsitiDisponibili = [],
                            Items = []
                        });
                    }
                }
                else if (profileResult.Equals(ProfileCatalog.ResponsabileOu, StringComparison.OrdinalIgnoreCase))
                {
                    var effectiveOuScopes = NormalizeScopes(contextData.EffectiveOuScopes);
                    if (effectiveOuScopes.Length == 0)
                    {
                        return Ok(new ProcessoOffertaOfferteResponseDto
                        {
                            Profile = profileResult,
                            Anni = anniRiferimento,
                            VediTutto = false,
                            AmbitoFiltro = null,
                            EsitiDisponibili = [],
                            Items = []
                        });
                    }

                    allowedBusinessUnits = effectiveOuScopes;
                }
            }

            var rows = await analisiRccRepository.GetProcessoOffertaDettaglioAsync(
                analisiIdRisorsa,
                anniRiferimento,
                rccFiltro,
                allowedBusinessUnits,
                esitiRiferimento.Length > 0 ? esitiRiferimento : null,
                cancellationToken);

            var optionRows = await analisiRccRepository.GetProcessoOffertaDettaglioAsync(
                analisiIdRisorsa,
                anniRiferimento,
                rccFiltro,
                allowedBusinessUnits,
                null,
                cancellationToken);

            var esitiDisponibili = optionRows
                .Select(item => item.EsitoPositivoTesto?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var response = new ProcessoOffertaOfferteResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                VediTutto = vediTutto,
                AmbitoFiltro = vediTutto
                    ? null
                    : (!string.IsNullOrWhiteSpace(rccFiltro)
                        ? rccFiltro
                        : BuildScopeLabel(allowedBusinessUnits)),
                EsitiDisponibili = esitiDisponibili,
                Items = rows
                    .Select(item => new ProcessoOffertaDettaglioRowDto
                    {
                        Id = item.Id,
                        BusinessUnit = item.BusinessUnit,
                        NomeProdotto = item.NomeProdotto,
                        CodiceSocieta = item.CodiceSocieta,
                        Rcc = item.Rcc,
                        IdRcc = item.IdRcc,
                        Anno = item.Anno,
                        AnnoLavoro = item.AnnoLavoro,
                        Commessa = item.Commessa,
                        Esito = item.Esito,
                        Protocollo = item.Protocollo,
                        Data = item.Data,
                        Tipo = item.Tipo,
                        Oggetto = item.Oggetto,
                        StatoDocumento = item.StatoDocumento,
                        PercentualeSuccesso = item.PercentualeSuccesso,
                        Soluzione = item.Soluzione,
                        MacroTipologia = item.MacroTipologia,
                        TipoCommessa = item.TipoCommessa,
                        Controparte = item.Controparte,
                        EsitoPositivo = item.EsitoPositivo,
                        EsitoPositivoTesto = item.EsitoPositivoTesto,
                        ImportoPrevedibile = item.ImportoPrevedibile,
                        CostoPrevedibile = item.CostoPrevedibile,
                        CostoPrevisto = item.CostoPrevisto
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/processo-offerta/offerte.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/processo-offerta/offerte.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero offerte."
            });
        }
    }

    [HttpGet("sintesi-rcc")]
    [ProducesResponseType(typeof(ProcessoOffertaSintesiResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SintesiRcc(
        [FromQuery] string profile,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery(Name = "esiti")] string[]? esiti = null,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        return await GetSintesiAsync(
            profile,
            anni,
            esiti,
            "RCC",
            actAsUsername,
            cancellationToken);
    }

    [HttpGet("sintesi-bu")]
    [ProducesResponseType(typeof(ProcessoOffertaSintesiResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SintesiBusinessUnit(
        [FromQuery] string profile,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery(Name = "esiti")] string[]? esiti = null,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        return await GetSintesiAsync(
            profile,
            anni,
            esiti,
            "BUSINESSUNIT",
            actAsUsername,
            cancellationToken);
    }

    private async Task<IActionResult> GetSintesiAsync(
        string profile,
        IReadOnlyCollection<int>? anni,
        IReadOnlyCollection<string>? esiti,
        string campoAggregazione,
        string? actAsUsername,
        CancellationToken cancellationToken)
    {
        try
        {
            var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
            if (!isValid || contextData is null || string.IsNullOrWhiteSpace(profileResult))
            {
                return errorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            if (!AllowedProfiles.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfiles)}."
                });
            }

            var anniRiferimento = NormalizeAnni(anni);
            var esitiRiferimento = NormalizeValues(esiti);
            var vediTutto = FullVisibilityProfiles.Contains(profileResult, StringComparer.OrdinalIgnoreCase);
            var analisiIdRisorsa = 0;

            string? rccFiltro = null;
            IReadOnlyCollection<string>? allowedBusinessUnits = null;
            if (!vediTutto)
            {
                if (profileResult.Equals(ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase))
                {
                    rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                        contextData.EffectiveUser.IdRisorsa,
                        cancellationToken);

                    if (string.IsNullOrWhiteSpace(rccFiltro))
                    {
                        return Ok(new ProcessoOffertaSintesiResponseDto
                        {
                            Profile = profileResult,
                            Anni = anniRiferimento,
                            VediTutto = false,
                            AmbitoFiltro = null,
                            EsitiDisponibili = [],
                            AggregazioniDisponibili = [],
                            Righe = []
                        });
                    }
                }
                else if (profileResult.Equals(ProfileCatalog.ResponsabileOu, StringComparison.OrdinalIgnoreCase))
                {
                    var effectiveOuScopes = NormalizeScopes(contextData.EffectiveOuScopes);
                    if (effectiveOuScopes.Length == 0)
                    {
                        return Ok(new ProcessoOffertaSintesiResponseDto
                        {
                            Profile = profileResult,
                            Anni = anniRiferimento,
                            VediTutto = false,
                            AmbitoFiltro = null,
                            EsitiDisponibili = [],
                            AggregazioniDisponibili = [],
                            Righe = []
                        });
                    }

                    allowedBusinessUnits = effectiveOuScopes;
                }
            }

            var rows = await analisiRccRepository.GetProcessoOffertaSintesiAsync(
                analisiIdRisorsa,
                anniRiferimento,
                campoAggregazione,
                rccFiltro,
                allowedBusinessUnits,
                esitiRiferimento.Length > 0 ? esitiRiferimento : null,
                cancellationToken);

            var optionRows = await analisiRccRepository.GetProcessoOffertaSintesiAsync(
                analisiIdRisorsa,
                anniRiferimento,
                campoAggregazione,
                rccFiltro,
                allowedBusinessUnits,
                null,
                cancellationToken);

            var esitiDisponibili = optionRows
                .Select(item => item.EsitoPositivoTesto?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var aggregazioniDisponibili = optionRows
                .Select(item => item.Aggregazione?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var response = new ProcessoOffertaSintesiResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                VediTutto = vediTutto,
                AmbitoFiltro = vediTutto
                    ? null
                    : (!string.IsNullOrWhiteSpace(rccFiltro)
                        ? rccFiltro
                        : BuildScopeLabel(allowedBusinessUnits)),
                EsitiDisponibili = esitiDisponibili,
                AggregazioniDisponibili = aggregazioniDisponibili,
                Righe = rows
                    .Select(item => new ProcessoOffertaSintesiRowDto
                    {
                        Anno = item.Anno,
                        Aggregazione = item.Aggregazione,
                        Tipo = item.Tipo,
                        EsitoPositivoTesto = item.EsitoPositivoTesto,
                        Numero = item.Numero,
                        ImportoPrevedibile = item.ImportoPrevedibile,
                        CostoPrevedibile = item.CostoPrevedibile,
                        PercentualeRicarico = item.PercentualeRicarico
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/processo-offerta/sintesi.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/processo-offerta/sintesi.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero sintesi processo offerta."
            });
        }
    }

    private static int[] NormalizeAnni(IReadOnlyCollection<int>? anni)
    {
        var anniRiferimento = (anni ?? Array.Empty<int>())
            .Where(value => value > 0)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();

        if (anniRiferimento.Length == 0)
        {
            anniRiferimento = [DateTime.Now.Year];
        }

        return anniRiferimento;
    }

    private static string[] NormalizeValues(IReadOnlyCollection<string>? values)
    {
        if (values is null || values.Count == 0)
        {
            return [];
        }

        return values
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string[] NormalizeScopes(IReadOnlyCollection<string>? scopes)
    {
        if (scopes is null || scopes.Count == 0)
        {
            return [];
        }

        return scopes
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string? BuildScopeLabel(IReadOnlyCollection<string>? scopes)
    {
        var normalizedScopes = NormalizeScopes(scopes);
        if (normalizedScopes.Length == 0)
        {
            return null;
        }

        return normalizedScopes.Length == 1
            ? normalizedScopes[0]
            : string.Join(", ", normalizedScopes);
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

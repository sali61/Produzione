using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Produzione.Api.Security;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Application.Common.Profiles;
using Produzione.Application.Contracts.AnalisiRcc;
using Produzione.Application.Models;

namespace Produzione.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/analisi-rcc")]
public sealed class AnalisiRccController(
    UserExecutionContextService executionContextService,
    IAnalisiRccRepository analisiRccRepository,
    ILogger<AnalisiRccController> logger) : ControllerBase
{
    private static readonly string[] AllowedProfiles =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileCommercialeCommessa
    ];

    private static readonly string[] AllowedProfilesBu =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileOu
    ];

    private static readonly string[] AllowedProfilesFunnelRcc =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommercialeCommessa
    ];

    private static readonly string[] AllowedProfilesFunnelBu =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileOu
    ];

    private static readonly string[] AllowedProfilesUtileMensileRcc =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommercialeCommessa,
        ProfileCatalog.ResponsabileOu
    ];

    private static readonly string[] AllowedProfilesUtileMensileBu =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommercialeCommessa,
        ProfileCatalog.ResponsabileOu
    ];

    [HttpGet("risultato-mensile")]
    [ProducesResponseType(typeof(AnalisiRccRisultatoMensileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RisultatoMensile(
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

            if (!AllowedProfiles.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfiles)}."
                });
            }

            var annoRiferimento = anno.HasValue && anno.Value > 0
                ? anno.Value
                : DateTime.Now.Year;

            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase);

            string? rccFiltro = null;
            if (!vediTutto)
            {
                rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    cancellationToken);
            }

            var rows = await analisiRccRepository.GetRisultatoMensileSnapshotAsync(
                annoRiferimento,
                rccFiltro,
                cancellationToken);

            var mesi = rows
                .Select(item => item.MeseSnapshot)
                .Where(value => value >= 1 && value <= 12)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            var response = new AnalisiRccRisultatoMensileResponseDto
            {
                Profile = profileResult,
                Anno = annoRiferimento,
                VediTutto = vediTutto,
                RccFiltro = rccFiltro,
                RisultatoPesato = BuildRisultatoPesatoGrid(rows, mesi),
                PercentualePesata = BuildPercentualePesataGrid(rows, mesi)
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/risultato-mensile.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/risultato-mensile.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero analisi RCC."
            });
        }
    }

    [HttpGet("pivot-fatturato")]
    [ProducesResponseType(typeof(AnalisiRccPivotFatturatoResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PivotFatturato(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] string? rcc = null,
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

            var anniRiferimento = (anni ?? Array.Empty<int>())
                .Where(value => value > 0)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            if (anniRiferimento.Length == 0 && anno.HasValue && anno.Value > 0)
            {
                anniRiferimento = [anno.Value];
            }

            if (anniRiferimento.Length == 0)
            {
                anniRiferimento = [DateTime.Now.Year];
            }

            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase);

            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();

            string? rccFiltro;
            if (!vediTutto)
            {
                rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    cancellationToken);

                if (string.IsNullOrWhiteSpace(rccFiltro))
                {
                    return Ok(new AnalisiRccPivotFatturatoResponseDto
                    {
                        Profile = profileResult,
                        Anni = anniRiferimento,
                        VediTutto = false,
                        RccFiltro = null,
                        RccDisponibili = [],
                        Righe = [],
                        TotaliPerAnno = []
                    });
                }
            }
            else
            {
                rccFiltro = requestedRcc;
            }

            var rows = new List<AnalisiRccPivotFatturatoRow>();
            foreach (var currentYear in anniRiferimento)
            {
                var yearRows = await analisiRccRepository.GetPivotFatturatoAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    currentYear,
                    rccFiltro,
                    cancellationToken);
                rows.AddRange(yearRows);
            }

            var rccDisponibili = new List<string>();
            if (vediTutto)
            {
                var optionRows = new List<AnalisiRccPivotFatturatoRow>();
                foreach (var currentYear in anniRiferimento)
                {
                    var yearRows = await analisiRccRepository.GetPivotFatturatoAsync(
                        contextData.EffectiveUser.IdRisorsa,
                        currentYear,
                        null,
                        cancellationToken);
                    optionRows.AddRange(yearRows);
                }

                rccDisponibili = optionRows
                    .Select(item => item.Rcc?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            else if (!string.IsNullOrWhiteSpace(rccFiltro))
            {
                rccDisponibili.Add(rccFiltro);
            }

            var rowsOrdered = rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Rcc, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var totaliPerAnno = rowsOrdered
                .GroupBy(item => item.Anno)
                .OrderBy(group => group.Key)
                .Select(group =>
                {
                    var fatturatoAnno = group.Sum(item => item.FatturatoAnno);
                    var fatturatoFuturoAnno = group.Sum(item => item.FatturatoFuturoAnno);
                    var totaleFatturatoCerto = group.Sum(item => item.TotaleFatturatoCerto);
                    var budgetPrevisto = group.Sum(item => item.BudgetPrevisto);
                    var totaleRicavoIpotetico = group.Sum(item => item.TotaleRicavoIpotetico);
                    var totaleRicavoIpoteticoPesato = group.Sum(item => item.TotaleRicavoIpoteticoPesato);
                    var totaleIpotetico = group.Sum(item => item.TotaleIpotetico);

                    return new AnalisiRccPivotFatturatoTotaleAnnoDto
                    {
                        Anno = group.Key,
                        FatturatoAnno = fatturatoAnno,
                        FatturatoFuturoAnno = fatturatoFuturoAnno,
                        TotaleFatturatoCerto = totaleFatturatoCerto,
                        BudgetPrevisto = budgetPrevisto,
                        MargineColBudget = totaleFatturatoCerto - budgetPrevisto,
                        PercentualeCertaRaggiunta = budgetPrevisto == 0m ? 0m : totaleFatturatoCerto / budgetPrevisto,
                        TotaleRicavoIpotetico = totaleRicavoIpotetico,
                        TotaleRicavoIpoteticoPesato = totaleRicavoIpoteticoPesato,
                        TotaleIpotetico = totaleIpotetico,
                        PercentualeCompresoRicavoIpotetico = budgetPrevisto == 0m ? 0m : totaleIpotetico / budgetPrevisto
                    };
                })
                .ToArray();

            var response = new AnalisiRccPivotFatturatoResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                VediTutto = vediTutto,
                RccFiltro = rccFiltro,
                RccDisponibili = rccDisponibili.ToArray(),
                Righe = rowsOrdered
                    .Select(item => new AnalisiRccPivotFatturatoRowDto
                    {
                        Anno = item.Anno,
                        Rcc = item.Rcc,
                        FatturatoAnno = item.FatturatoAnno,
                        FatturatoFuturoAnno = item.FatturatoFuturoAnno,
                        TotaleFatturatoCerto = item.TotaleFatturatoCerto,
                        BudgetPrevisto = item.BudgetPrevisto,
                        MargineColBudget = item.MargineColBudget,
                        PercentualeCertaRaggiunta = item.PercentualeCertaRaggiunta,
                        TotaleRicavoIpotetico = item.TotaleRicavoIpotetico,
                        TotaleRicavoIpoteticoPesato = item.TotaleRicavoIpoteticoPesato,
                        TotaleIpotetico = item.TotaleIpotetico,
                        PercentualeCompresoRicavoIpotetico = item.PercentualeCompresoRicavoIpotetico
                    })
                    .ToArray(),
                TotaliPerAnno = totaliPerAnno
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/pivot-fatturato.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/pivot-fatturato.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero pivot fatturato RCC."
            });
        }
    }

    [HttpGet("risultato-mensile-bu")]
    [ProducesResponseType(typeof(AnalisiRccRisultatoMensileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RisultatoMensileBusinessUnit(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery] string? businessUnit = null,
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

            if (!AllowedProfilesBu.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesBu)}."
                });
            }

            var annoRiferimento = anno.HasValue && anno.Value > 0
                ? anno.Value
                : DateTime.Now.Year;

            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);

            var requestedBusinessUnit = string.IsNullOrWhiteSpace(businessUnit)
                ? null
                : businessUnit.Trim();

            IReadOnlyCollection<string>? allowedBusinessUnits = null;
            if (!vediTutto)
            {
                var effectiveOuScopes = NormalizeScopes(contextData.EffectiveOuScopes);
                if (effectiveOuScopes.Length == 0)
                {
                    return Ok(new AnalisiRccRisultatoMensileResponseDto
                    {
                        Profile = profileResult,
                        Anno = annoRiferimento,
                        VediTutto = false,
                        RccFiltro = null,
                        RisultatoPesato = new AnalisiRccRisultatoMensileGridDto
                        {
                            Titolo = "Somma totale_risultato_pesato",
                            Mesi = [],
                            ValoriPercentuali = false,
                            Righe = []
                        },
                        PercentualePesata = new AnalisiRccRisultatoMensileGridDto
                        {
                            Titolo = "Media percentuale_pesato",
                            Mesi = [],
                            ValoriPercentuali = true,
                            Righe = []
                        }
                    });
                }

                if (!string.IsNullOrWhiteSpace(requestedBusinessUnit) &&
                    !effectiveOuScopes.Contains(requestedBusinessUnit, StringComparer.OrdinalIgnoreCase))
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = $"Business Unit '{requestedBusinessUnit}' non autorizzata per il profilo '{profileResult}'."
                    });
                }

                allowedBusinessUnits = effectiveOuScopes;
            }

            var rows = await analisiRccRepository.GetRisultatoMensileBusinessUnitSnapshotAsync(
                annoRiferimento,
                requestedBusinessUnit,
                allowedBusinessUnits,
                cancellationToken);

            var mesi = rows
                .Select(item => item.MeseSnapshot)
                .Where(value => value >= 1 && value <= 12)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            var response = new AnalisiRccRisultatoMensileResponseDto
            {
                Profile = profileResult,
                Anno = annoRiferimento,
                VediTutto = vediTutto,
                RccFiltro = vediTutto
                    ? requestedBusinessUnit
                    : (requestedBusinessUnit ?? BuildScopeLabel(allowedBusinessUnits)),
                RisultatoPesato = BuildRisultatoPesatoGrid(rows, mesi),
                PercentualePesata = BuildPercentualePesataGrid(rows, mesi)
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/risultato-mensile-bu.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/risultato-mensile-bu.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero analisi BU."
            });
        }
    }

    [HttpGet("pivot-fatturato-bu")]
    [ProducesResponseType(typeof(AnalisiRccPivotFatturatoResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PivotFatturatoBusinessUnit(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] string? businessUnit = null,
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

            if (!AllowedProfilesBu.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesBu)}."
                });
            }

            var anniRiferimento = (anni ?? Array.Empty<int>())
                .Where(value => value > 0)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            if (anniRiferimento.Length == 0 && anno.HasValue && anno.Value > 0)
            {
                anniRiferimento = [anno.Value];
            }

            if (anniRiferimento.Length == 0)
            {
                anniRiferimento = [DateTime.Now.Year];
            }

            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);

            var requestedBusinessUnit = string.IsNullOrWhiteSpace(businessUnit)
                ? null
                : businessUnit.Trim();

            IReadOnlyCollection<string>? allowedBusinessUnits = null;
            if (!vediTutto)
            {
                var effectiveOuScopes = NormalizeScopes(contextData.EffectiveOuScopes);
                if (effectiveOuScopes.Length == 0)
                {
                    var emptyResponse = new AnalisiRccPivotFatturatoResponseDto
                    {
                        Profile = profileResult,
                        Anni = anniRiferimento,
                        VediTutto = false,
                        RccFiltro = null,
                        RccDisponibili = [],
                        Righe = [],
                        TotaliPerAnno = []
                    };

                    return Ok(emptyResponse);
                }

                if (!string.IsNullOrWhiteSpace(requestedBusinessUnit) &&
                    !effectiveOuScopes.Contains(requestedBusinessUnit, StringComparer.OrdinalIgnoreCase))
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = $"Business Unit '{requestedBusinessUnit}' non autorizzata per il profilo '{profileResult}'."
                    });
                }

                allowedBusinessUnits = effectiveOuScopes;
            }

            var rows = new List<AnalisiRccPivotFatturatoRow>();
            foreach (var currentYear in anniRiferimento)
            {
                var yearRows = await analisiRccRepository.GetPivotFatturatoBusinessUnitAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    currentYear,
                    requestedBusinessUnit,
                    allowedBusinessUnits,
                    cancellationToken);
                rows.AddRange(yearRows);
            }

            List<string> businessUnitDisponibili;
            if (vediTutto)
            {
                var optionRows = new List<AnalisiRccPivotFatturatoRow>();
                foreach (var currentYear in anniRiferimento)
                {
                    var yearRows = await analisiRccRepository.GetPivotFatturatoBusinessUnitAsync(
                        contextData.EffectiveUser.IdRisorsa,
                        currentYear,
                        null,
                        null,
                        cancellationToken);
                    optionRows.AddRange(yearRows);
                }

                businessUnitDisponibili = optionRows
                    .Select(item => item.Rcc?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            else
            {
                businessUnitDisponibili = NormalizeScopes(allowedBusinessUnits)
                    .ToList();
            }

            var rowsOrdered = rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Rcc, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var totaliPerAnno = rowsOrdered
                .GroupBy(item => item.Anno)
                .OrderBy(group => group.Key)
                .Select(group =>
                {
                    var fatturatoAnno = group.Sum(item => item.FatturatoAnno);
                    var fatturatoFuturoAnno = group.Sum(item => item.FatturatoFuturoAnno);
                    var totaleFatturatoCerto = group.Sum(item => item.TotaleFatturatoCerto);
                    var budgetPrevisto = group.Sum(item => item.BudgetPrevisto);
                    var totaleRicavoIpotetico = group.Sum(item => item.TotaleRicavoIpotetico);
                    var totaleRicavoIpoteticoPesato = group.Sum(item => item.TotaleRicavoIpoteticoPesato);
                    var totaleIpotetico = group.Sum(item => item.TotaleIpotetico);

                    return new AnalisiRccPivotFatturatoTotaleAnnoDto
                    {
                        Anno = group.Key,
                        FatturatoAnno = fatturatoAnno,
                        FatturatoFuturoAnno = fatturatoFuturoAnno,
                        TotaleFatturatoCerto = totaleFatturatoCerto,
                        BudgetPrevisto = budgetPrevisto,
                        MargineColBudget = totaleFatturatoCerto - budgetPrevisto,
                        PercentualeCertaRaggiunta = budgetPrevisto == 0m ? 0m : totaleFatturatoCerto / budgetPrevisto,
                        TotaleRicavoIpotetico = totaleRicavoIpotetico,
                        TotaleRicavoIpoteticoPesato = totaleRicavoIpoteticoPesato,
                        TotaleIpotetico = totaleIpotetico,
                        PercentualeCompresoRicavoIpotetico = budgetPrevisto == 0m ? 0m : totaleIpotetico / budgetPrevisto
                    };
                })
                .ToArray();

            var response = new AnalisiRccPivotFatturatoResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                VediTutto = vediTutto,
                RccFiltro = vediTutto
                    ? requestedBusinessUnit
                    : (requestedBusinessUnit ?? BuildScopeLabel(allowedBusinessUnits)),
                RccDisponibili = businessUnitDisponibili.ToArray(),
                Righe = rowsOrdered
                    .Select(item => new AnalisiRccPivotFatturatoRowDto
                    {
                        Anno = item.Anno,
                        Rcc = item.Rcc,
                        FatturatoAnno = item.FatturatoAnno,
                        FatturatoFuturoAnno = item.FatturatoFuturoAnno,
                        TotaleFatturatoCerto = item.TotaleFatturatoCerto,
                        BudgetPrevisto = item.BudgetPrevisto,
                        MargineColBudget = item.MargineColBudget,
                        PercentualeCertaRaggiunta = item.PercentualeCertaRaggiunta,
                        TotaleRicavoIpotetico = item.TotaleRicavoIpotetico,
                        TotaleRicavoIpoteticoPesato = item.TotaleRicavoIpoteticoPesato,
                        TotaleIpotetico = item.TotaleIpotetico,
                        PercentualeCompresoRicavoIpotetico = item.PercentualeCompresoRicavoIpotetico
                    })
                    .ToArray(),
                TotaliPerAnno = totaliPerAnno
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/pivot-fatturato-bu.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/pivot-fatturato-bu.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero report annuale BU."
            });
        }
    }

    [HttpGet("utile-mensile-rcc")]
    [ProducesResponseType(typeof(AnalisiRccUtileMensileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UtileMensileRcc(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery(Name = "meseRiferimento")] int? meseRiferimento = null,
        [FromQuery] string? rcc = null,
        [FromQuery] int? produzione = null,
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

            if (!AllowedProfilesUtileMensileRcc.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesUtileMensileRcc)}."
                });
            }

            var anniRiferimento = (anni ?? Array.Empty<int>())
                .Where(value => value > 0)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            if (anniRiferimento.Length == 0 && anno.HasValue && anno.Value > 0)
            {
                anniRiferimento = [anno.Value];
            }

            if (anniRiferimento.Length == 0)
            {
                anniRiferimento = [DateTime.Now.Year];
            }
            var meseRiferimentoValue = meseRiferimento is >= 1 and <= 12
                ? meseRiferimento.Value
                : GetDefaultReferenceMonth();

            var produzioneFiltro = produzione is 0 or 1 ? produzione : null;
            var requestedRcc = string.IsNullOrWhiteSpace(rcc) ? null : rcc.Trim();
            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);

            IReadOnlyCollection<string>? allowedBusinessUnits = null;
            string? rccFiltro;
            if (vediTutto)
            {
                rccFiltro = requestedRcc;
            }
            else if (profileResult.Equals(ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase))
            {
                rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    cancellationToken);

                if (string.IsNullOrWhiteSpace(rccFiltro))
                {
                    return Ok(BuildEmptyUtileMensileResponse(profileResult, anniRiferimento, meseRiferimentoValue, false, null, produzioneFiltro));
                }
            }
            else
            {
                var effectiveOuScopes = NormalizeScopes(contextData.EffectiveOuScopes);
                if (effectiveOuScopes.Length == 0)
                {
                    return Ok(BuildEmptyUtileMensileResponse(profileResult, anniRiferimento, meseRiferimentoValue, false, null, produzioneFiltro));
                }

                allowedBusinessUnits = effectiveOuScopes;
                rccFiltro = requestedRcc;
            }

            var rows = await analisiRccRepository.GetUtileMensileRccAsync(
                contextData.EffectiveUser.IdRisorsa,
                anniRiferimento,
                meseRiferimentoValue,
                rccFiltro,
                produzioneFiltro,
                allowedBusinessUnits,
                cancellationToken);

            List<string> aggregazioniDisponibili;
            if (vediTutto)
            {
                var optionRows = await analisiRccRepository.GetUtileMensileRccAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    anniRiferimento,
                    meseRiferimentoValue,
                    null,
                    produzioneFiltro,
                    null,
                    cancellationToken);

                aggregazioniDisponibili = optionRows
                    .Select(item => item.Aggregazione?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            else if (!string.IsNullOrWhiteSpace(rccFiltro))
            {
                aggregazioniDisponibili = [rccFiltro];
            }
            else
            {
                aggregazioniDisponibili = rows
                    .Select(item => item.Aggregazione?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }

            var rowsOrdered = rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Aggregazione, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var response = new AnalisiRccUtileMensileResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                MeseRiferimento = meseRiferimentoValue,
                VediTutto = vediTutto,
                AggregazioneFiltro = vediTutto
                    ? requestedRcc
                    : (rccFiltro ?? BuildScopeLabel(allowedBusinessUnits)),
                AggregazioniDisponibili = aggregazioniDisponibili.ToArray(),
                Produzione = produzioneFiltro,
                Righe = rowsOrdered
                    .Select(item => new AnalisiRccUtileMensileRowDto
                    {
                        Anno = item.Anno,
                        Aggregazione = item.Aggregazione,
                        TotaleRicavi = item.TotaleRicavi,
                        TotaleCosti = item.TotaleCosti,
                        TotaleCostoPersonale = item.TotaleCostoPersonale,
                        TotaleUtileSpecifico = item.TotaleUtileSpecifico,
                        TotaleOreLavorate = item.TotaleOreLavorate,
                        TotaleCostoGeneraleRibaltato = item.TotaleCostoGeneraleRibaltato,
                        PercentualeMargineSuRicavi = item.PercentualeMargineSuRicavi,
                        PercentualeMarkupSuCosti = item.PercentualeMarkupSuCosti,
                        PercentualeCostIncome = item.PercentualeCostIncome
                    })
                    .ToArray(),
                TotaliPerAnno = BuildUtileMensileTotaliPerAnno(rowsOrdered)
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/utile-mensile-rcc.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/utile-mensile-rcc.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero utile mensile RCC."
            });
        }
    }

    [HttpGet("utile-mensile-bu")]
    [ProducesResponseType(typeof(AnalisiRccUtileMensileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UtileMensileBusinessUnit(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery(Name = "meseRiferimento")] int? meseRiferimento = null,
        [FromQuery] string? businessUnit = null,
        [FromQuery] int? produzione = null,
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

            if (!AllowedProfilesUtileMensileBu.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesUtileMensileBu)}."
                });
            }

            var anniRiferimento = (anni ?? Array.Empty<int>())
                .Where(value => value > 0)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            if (anniRiferimento.Length == 0 && anno.HasValue && anno.Value > 0)
            {
                anniRiferimento = [anno.Value];
            }

            if (anniRiferimento.Length == 0)
            {
                anniRiferimento = [DateTime.Now.Year];
            }
            var meseRiferimentoValue = meseRiferimento is >= 1 and <= 12
                ? meseRiferimento.Value
                : GetDefaultReferenceMonth();

            var produzioneFiltro = produzione is 0 or 1 ? produzione : null;
            var requestedBusinessUnit = string.IsNullOrWhiteSpace(businessUnit) ? null : businessUnit.Trim();
            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);

            IReadOnlyCollection<string>? allowedBusinessUnits = null;
            string? rccFiltro = null;
            if (!vediTutto)
            {
                if (profileResult.Equals(ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase))
                {
                    rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                        contextData.EffectiveUser.IdRisorsa,
                        cancellationToken);

                    if (string.IsNullOrWhiteSpace(rccFiltro))
                    {
                        return Ok(BuildEmptyUtileMensileResponse(profileResult, anniRiferimento, meseRiferimentoValue, false, null, produzioneFiltro));
                    }
                }
                else
                {
                    var effectiveOuScopes = NormalizeScopes(contextData.EffectiveOuScopes);
                    if (effectiveOuScopes.Length == 0)
                    {
                        return Ok(BuildEmptyUtileMensileResponse(profileResult, anniRiferimento, meseRiferimentoValue, false, null, produzioneFiltro));
                    }

                    if (!string.IsNullOrWhiteSpace(requestedBusinessUnit) &&
                        !effectiveOuScopes.Contains(requestedBusinessUnit, StringComparer.OrdinalIgnoreCase))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new
                        {
                            message = $"Business Unit '{requestedBusinessUnit}' non autorizzata per il profilo '{profileResult}'."
                        });
                    }

                    allowedBusinessUnits = effectiveOuScopes;
                }
            }

            var rows = await analisiRccRepository.GetUtileMensileBusinessUnitAsync(
                contextData.EffectiveUser.IdRisorsa,
                anniRiferimento,
                meseRiferimentoValue,
                requestedBusinessUnit,
                rccFiltro,
                produzioneFiltro,
                allowedBusinessUnits,
                cancellationToken);

            List<string> aggregazioniDisponibili;
            if (vediTutto)
            {
                var optionRows = await analisiRccRepository.GetUtileMensileBusinessUnitAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    anniRiferimento,
                    meseRiferimentoValue,
                    null,
                    null,
                    produzioneFiltro,
                    null,
                    cancellationToken);

                aggregazioniDisponibili = optionRows
                    .Select(item => item.Aggregazione?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            else if (allowedBusinessUnits is not null)
            {
                aggregazioniDisponibili = NormalizeScopes(allowedBusinessUnits).ToList();
            }
            else
            {
                aggregazioniDisponibili = rows
                    .Select(item => item.Aggregazione?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }

            var rowsOrdered = rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Aggregazione, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var response = new AnalisiRccUtileMensileResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                MeseRiferimento = meseRiferimentoValue,
                VediTutto = vediTutto,
                AggregazioneFiltro = vediTutto
                    ? requestedBusinessUnit
                    : (requestedBusinessUnit ?? BuildScopeLabel(allowedBusinessUnits)),
                AggregazioniDisponibili = aggregazioniDisponibili.ToArray(),
                Produzione = produzioneFiltro,
                Righe = rowsOrdered
                    .Select(item => new AnalisiRccUtileMensileRowDto
                    {
                        Anno = item.Anno,
                        Aggregazione = item.Aggregazione,
                        TotaleRicavi = item.TotaleRicavi,
                        TotaleCosti = item.TotaleCosti,
                        TotaleCostoPersonale = item.TotaleCostoPersonale,
                        TotaleUtileSpecifico = item.TotaleUtileSpecifico,
                        TotaleOreLavorate = item.TotaleOreLavorate,
                        TotaleCostoGeneraleRibaltato = item.TotaleCostoGeneraleRibaltato,
                        PercentualeMargineSuRicavi = item.PercentualeMargineSuRicavi,
                        PercentualeMarkupSuCosti = item.PercentualeMarkupSuCosti,
                        PercentualeCostIncome = item.PercentualeCostIncome
                    })
                    .ToArray(),
                TotaliPerAnno = BuildUtileMensileTotaliPerAnno(rowsOrdered)
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/utile-mensile-bu.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/utile-mensile-bu.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero utile mensile BU."
            });
        }
    }

    [HttpGet("funnel")]
    [ProducesResponseType(typeof(AnalisiRccFunnelResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Funnel(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] string? rcc = null,
        [FromQuery] string? tipo = null,
        [FromQuery] string? statoDocumento = null,
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

            if (!AllowedProfilesFunnelRcc.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesFunnelRcc)}."
                });
            }

            var anniRiferimento = (anni ?? Array.Empty<int>())
                .Where(value => value > 0)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            if (anniRiferimento.Length == 0 && anno.HasValue && anno.Value > 0)
            {
                anniRiferimento = [anno.Value];
            }

            if (anniRiferimento.Length == 0)
            {
                anniRiferimento = [DateTime.Now.Year];
            }

            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);

            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();
            var tipoFiltro = string.IsNullOrWhiteSpace(tipo)
                ? null
                : tipo.Trim();
            var statoDocumentoFiltro = string.IsNullOrWhiteSpace(statoDocumento)
                ? null
                : statoDocumento.Trim();

            string? rccFiltro;
            if (!vediTutto)
            {
                rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    cancellationToken);

                if (string.IsNullOrWhiteSpace(rccFiltro))
                {
                    return Ok(new AnalisiRccPivotFunnelResponseDto
                    {
                        Profile = profileResult,
                        Anni = anniRiferimento,
                        VediTutto = false,
                        AggregazioneFiltro = null,
                        AggregazioniDisponibili = [],
                        Righe = [],
                        TotaliPerAnno = []
                    });
                }
            }
            else
            {
                rccFiltro = requestedRcc;
            }

            var rows = await analisiRccRepository.GetFunnelAsync(
                contextData.EffectiveUser.IdRisorsa,
                anniRiferimento,
                rccFiltro,
                tipoFiltro,
                statoDocumentoFiltro,
                cancellationToken);

            var optionRows = await analisiRccRepository.GetFunnelAsync(
                contextData.EffectiveUser.IdRisorsa,
                anniRiferimento,
                rccFiltro,
                null,
                null,
                cancellationToken);

            var rccDisponibili = optionRows
                .Select(item => item.Rcc?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!vediTutto)
            {
                var normalizedRccFiltro = rccFiltro?.Trim();
                if (!string.IsNullOrWhiteSpace(normalizedRccFiltro) &&
                    !rccDisponibili.Contains(normalizedRccFiltro, StringComparer.OrdinalIgnoreCase))
                {
                    rccDisponibili.Add(normalizedRccFiltro);
                }
            }

            var tipiDisponibili = optionRows
                .Select(item => item.Tipo?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var statiDocumentoDisponibili = optionRows
                .Select(item => item.StatoDocumento?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var response = new AnalisiRccFunnelResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                VediTutto = vediTutto,
                RccFiltro = rccFiltro,
                RccDisponibili = rccDisponibili.ToArray(),
                TipiDisponibili = tipiDisponibili,
                StatiDocumentoDisponibili = statiDocumentoDisponibili,
                Items = rows
                    .Select(item => new AnalisiRccFunnelRowDto
                    {
                        BusinessUnit = item.BusinessUnit,
                        NomeProdotto = item.NomeProdotto,
                        CodiceSocieta = item.CodiceSocieta,
                        Rcc = item.Rcc,
                        IdRcc = item.IdRcc,
                        Anno = item.Anno,
                        Commessa = item.Commessa,
                        Esito = item.Esito,
                        Protocollo = item.Protocollo,
                        Data = item.Data,
                        Tipo = item.Tipo,
                        Oggetto = item.Oggetto,
                        StatoDocumento = item.StatoDocumento,
                        EsitoProtocollo = item.EsitoProtocollo,
                        PercentualeSuccesso = item.PercentualeSuccesso,
                        BudgetRicavo = item.BudgetRicavo,
                        BudgetPersonale = item.BudgetPersonale,
                        BudgetCosti = item.BudgetCosti,
                        RicavoAtteso = item.RicavoAtteso,
                        FatturatoEmesso = item.FatturatoEmesso,
                        FatturatoFuturo = item.FatturatoFuturo,
                        FuturaAnno = item.FuturaAnno,
                        EmessaAnno = item.EmessaAnno,
                        TotaleAnno = item.TotaleAnno,
                        Infragruppo = item.Infragruppo,
                        Soluzione = item.Soluzione,
                        MacroTipologia = item.MacroTipologia,
                        Controparte = item.Controparte
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/funnel.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/funnel.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero Funnel."
            });
        }
    }

    [HttpGet("pivot-funnel")]
    [ProducesResponseType(typeof(AnalisiRccPivotFunnelResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PivotFunnel(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] string? rcc = null,
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

            if (!AllowedProfilesFunnelRcc.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesFunnelRcc)}."
                });
            }

            var anniRiferimento = (anni ?? Array.Empty<int>())
                .Where(value => value > 0)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            if (anniRiferimento.Length == 0 && anno.HasValue && anno.Value > 0)
            {
                anniRiferimento = [anno.Value];
            }

            if (anniRiferimento.Length == 0)
            {
                anniRiferimento = [DateTime.Now.Year];
            }

            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);

            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();

            string? rccFiltro;
            if (!vediTutto)
            {
                rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    cancellationToken);
            }
            else
            {
                rccFiltro = requestedRcc;
            }

            var rows = new List<AnalisiRccPivotFunnelRow>();
            foreach (var currentYear in anniRiferimento)
            {
                var yearRows = await analisiRccRepository.GetPivotFunnelAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    currentYear,
                    rccFiltro,
                    cancellationToken);
                rows.AddRange(yearRows);
            }

            var aggregazioniDisponibili = new List<string>();
            if (vediTutto)
            {
                var optionRows = new List<AnalisiRccPivotFunnelRow>();
                foreach (var currentYear in anniRiferimento)
                {
                    var yearRows = await analisiRccRepository.GetPivotFunnelAsync(
                        contextData.EffectiveUser.IdRisorsa,
                        currentYear,
                        null,
                        cancellationToken);
                    optionRows.AddRange(yearRows);
                }

                aggregazioniDisponibili = optionRows
                    .Select(item => item.Aggregazione?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            else if (!string.IsNullOrWhiteSpace(rccFiltro))
            {
                aggregazioniDisponibili.Add(rccFiltro);
            }

            var rowsOrdered = rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Aggregazione, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Tipo, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var dettaglioRows = await analisiRccRepository.GetFunnelAsync(
                contextData.EffectiveUser.IdRisorsa,
                anniRiferimento,
                rccFiltro,
                null,
                null,
                cancellationToken);
            var protocolCountLookup = BuildProtocolCountLookup(dettaglioRows, item => item.Rcc);

            var rowDtos = rowsOrdered
                .Select(item =>
                {
                    var key = BuildPivotFunnelKey(item.Anno, item.Aggregazione, item.Tipo, item.PercentualeSuccesso);
                    var numeroProtocolli = protocolCountLookup.TryGetValue(key, out var count)
                        ? count
                        : item.NumeroProtocolli;
                    var totaleFatturatoFuturo = item.TotaleFatturatoFuturo != 0m
                        ? item.TotaleFatturatoFuturo
                        : item.TotaleFuturaAnno;

                    return new AnalisiRccPivotFunnelRowDto
                    {
                        Anno = item.Anno,
                        Aggregazione = item.Aggregazione,
                        Tipo = item.Tipo,
                        PercentualeSuccesso = item.PercentualeSuccesso,
                        NumeroProtocolli = numeroProtocolli,
                        TotaleBudgetRicavo = item.TotaleBudgetRicavo,
                        TotaleBudgetCosti = item.TotaleBudgetCosti,
                        TotaleFatturatoFuturo = totaleFatturatoFuturo,
                        TotaleEmessaAnno = item.TotaleEmessaAnno,
                        TotaleFuturaAnno = item.TotaleFuturaAnno,
                        TotaleRicaviComplessivi = item.TotaleRicaviComplessivi
                    };
                })
                .ToArray();

            var totaliPerAnno = rowDtos
                .GroupBy(item => item.Anno)
                .OrderBy(group => group.Key)
                .Select(group =>
                {
                    var totaleBudgetRicavo = group.Sum(item => item.TotaleBudgetRicavo);
                    var percentualeSuccesso = totaleBudgetRicavo == 0m
                        ? (group.Any() ? group.Average(item => item.PercentualeSuccesso) : 0m)
                        : group.Sum(item => item.PercentualeSuccesso * item.TotaleBudgetRicavo) / totaleBudgetRicavo;

                    return new AnalisiRccPivotFunnelTotaleAnnoDto
                    {
                        Anno = group.Key,
                        NumeroProtocolli = group.Sum(item => item.NumeroProtocolli),
                        PercentualeSuccesso = percentualeSuccesso,
                        TotaleBudgetRicavo = totaleBudgetRicavo,
                        TotaleBudgetCosti = group.Sum(item => item.TotaleBudgetCosti),
                        TotaleFatturatoFuturo = group.Sum(item => item.TotaleFatturatoFuturo),
                        TotaleEmessaAnno = group.Sum(item => item.TotaleEmessaAnno),
                        TotaleFuturaAnno = group.Sum(item => item.TotaleFuturaAnno),
                        TotaleRicaviComplessivi = group.Sum(item => item.TotaleRicaviComplessivi)
                    };
                })
                .ToArray();

            var response = new AnalisiRccPivotFunnelResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                VediTutto = vediTutto,
                AggregazioneFiltro = rccFiltro,
                RccFiltro = rccFiltro,
                AggregazioniDisponibili = aggregazioniDisponibili.ToArray(),
                RccDisponibili = aggregazioniDisponibili.ToArray(),
                Righe = rowDtos,
                TotaliPerAnno = totaliPerAnno
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/pivot-funnel.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/pivot-funnel.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero Report Funnel RCC."
            });
        }
    }

    [HttpGet("pivot-funnel-bu")]
    [ProducesResponseType(typeof(AnalisiRccPivotFunnelResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PivotFunnelBusinessUnit(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] string? businessUnit = null,
        [FromQuery] string? rcc = null,
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

            if (!AllowedProfilesFunnelBu.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesFunnelBu)}."
                });
            }

            var anniRiferimento = (anni ?? Array.Empty<int>())
                .Where(value => value > 0)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            if (anniRiferimento.Length == 0 && anno.HasValue && anno.Value > 0)
            {
                anniRiferimento = [anno.Value];
            }

            if (anniRiferimento.Length == 0)
            {
                anniRiferimento = [DateTime.Now.Year];
            }

            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);

            var requestedBusinessUnit = string.IsNullOrWhiteSpace(businessUnit)
                ? null
                : businessUnit.Trim();
            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();

            IReadOnlyCollection<string>? allowedBusinessUnits = null;
            if (!vediTutto)
            {
                var effectiveOuScopes = NormalizeScopes(contextData.EffectiveOuScopes);
                if (effectiveOuScopes.Length == 0)
                {
                    return Ok(new AnalisiRccPivotFunnelResponseDto
                    {
                        Profile = profileResult,
                        Anni = anniRiferimento,
                        VediTutto = false,
                        AggregazioneFiltro = null,
                        RccFiltro = requestedRcc,
                        AggregazioniDisponibili = [],
                        RccDisponibili = [],
                        Righe = [],
                        TotaliPerAnno = []
                    });
                }

                if (!string.IsNullOrWhiteSpace(requestedBusinessUnit) &&
                    !effectiveOuScopes.Contains(requestedBusinessUnit, StringComparer.OrdinalIgnoreCase))
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = $"Business Unit '{requestedBusinessUnit}' non autorizzata per il profilo '{profileResult}'."
                    });
                }

                allowedBusinessUnits = effectiveOuScopes;
            }

            var rows = new List<AnalisiRccPivotFunnelRow>();
            foreach (var currentYear in anniRiferimento)
            {
                var yearRows = await analisiRccRepository.GetPivotFunnelBusinessUnitAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    currentYear,
                    requestedBusinessUnit,
                    requestedRcc,
                    allowedBusinessUnits,
                    cancellationToken);
                rows.AddRange(yearRows);
            }

            List<string> aggregazioniDisponibili;
            if (vediTutto)
            {
                var optionRows = new List<AnalisiRccPivotFunnelRow>();
                foreach (var currentYear in anniRiferimento)
                {
                    var yearRows = await analisiRccRepository.GetPivotFunnelBusinessUnitAsync(
                        contextData.EffectiveUser.IdRisorsa,
                        currentYear,
                        null,
                        requestedRcc,
                        null,
                        cancellationToken);
                    optionRows.AddRange(yearRows);
                }

                aggregazioniDisponibili = optionRows
                    .Select(item => item.Aggregazione?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            else
            {
                aggregazioniDisponibili = NormalizeScopes(allowedBusinessUnits).ToList();
            }

            var rowsOrdered = rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Aggregazione, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Tipo, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var dettaglioRows = await analisiRccRepository.GetFunnelAsync(
                contextData.EffectiveUser.IdRisorsa,
                anniRiferimento,
                null,
                null,
                null,
                cancellationToken);

            if (!string.IsNullOrWhiteSpace(requestedBusinessUnit))
            {
                dettaglioRows = dettaglioRows
                    .Where(item => item.BusinessUnit.Equals(requestedBusinessUnit, StringComparison.OrdinalIgnoreCase))
                    .ToArray();
            }

            if (allowedBusinessUnits is not null)
            {
                var allowedBusinessUnitSet = new HashSet<string>(
                    NormalizeScopes(allowedBusinessUnits),
                    StringComparer.OrdinalIgnoreCase);
                dettaglioRows = dettaglioRows
                    .Where(item => allowedBusinessUnitSet.Contains(item.BusinessUnit))
                    .ToArray();
            }

            var rccDisponibili = dettaglioRows
                .Select(item => item.Rcc?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (!string.IsNullOrWhiteSpace(requestedRcc))
            {
                dettaglioRows = dettaglioRows
                    .Where(item => item.Rcc.Equals(requestedRcc, StringComparison.OrdinalIgnoreCase))
                    .ToArray();
            }

            var protocolCountLookup = BuildProtocolCountLookup(dettaglioRows, item => item.BusinessUnit);

            var rowDtos = rowsOrdered
                .Select(item =>
                {
                    var key = BuildPivotFunnelKey(item.Anno, item.Aggregazione, item.Tipo, item.PercentualeSuccesso);
                    var numeroProtocolli = protocolCountLookup.TryGetValue(key, out var count)
                        ? count
                        : item.NumeroProtocolli;
                    var totaleFatturatoFuturo = item.TotaleFatturatoFuturo != 0m
                        ? item.TotaleFatturatoFuturo
                        : item.TotaleFuturaAnno;

                    return new AnalisiRccPivotFunnelRowDto
                    {
                        Anno = item.Anno,
                        Aggregazione = item.Aggregazione,
                        Tipo = item.Tipo,
                        PercentualeSuccesso = item.PercentualeSuccesso,
                        NumeroProtocolli = numeroProtocolli,
                        TotaleBudgetRicavo = item.TotaleBudgetRicavo,
                        TotaleBudgetCosti = item.TotaleBudgetCosti,
                        TotaleFatturatoFuturo = totaleFatturatoFuturo,
                        TotaleEmessaAnno = item.TotaleEmessaAnno,
                        TotaleFuturaAnno = item.TotaleFuturaAnno,
                        TotaleRicaviComplessivi = item.TotaleRicaviComplessivi
                    };
                })
                .ToArray();

            var totaliPerAnno = rowDtos
                .GroupBy(item => item.Anno)
                .OrderBy(group => group.Key)
                .Select(group =>
                {
                    var totaleBudgetRicavo = group.Sum(item => item.TotaleBudgetRicavo);
                    var percentualeSuccesso = totaleBudgetRicavo == 0m
                        ? (group.Any() ? group.Average(item => item.PercentualeSuccesso) : 0m)
                        : group.Sum(item => item.PercentualeSuccesso * item.TotaleBudgetRicavo) / totaleBudgetRicavo;

                    return new AnalisiRccPivotFunnelTotaleAnnoDto
                    {
                        Anno = group.Key,
                        NumeroProtocolli = group.Sum(item => item.NumeroProtocolli),
                        PercentualeSuccesso = percentualeSuccesso,
                        TotaleBudgetRicavo = totaleBudgetRicavo,
                        TotaleBudgetCosti = group.Sum(item => item.TotaleBudgetCosti),
                        TotaleFatturatoFuturo = group.Sum(item => item.TotaleFatturatoFuturo),
                        TotaleEmessaAnno = group.Sum(item => item.TotaleEmessaAnno),
                        TotaleFuturaAnno = group.Sum(item => item.TotaleFuturaAnno),
                        TotaleRicaviComplessivi = group.Sum(item => item.TotaleRicaviComplessivi)
                    };
                })
                .ToArray();

            var response = new AnalisiRccPivotFunnelResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                VediTutto = vediTutto,
                AggregazioneFiltro = vediTutto
                    ? requestedBusinessUnit
                    : (requestedBusinessUnit ?? BuildScopeLabel(allowedBusinessUnits)),
                RccFiltro = requestedRcc,
                AggregazioniDisponibili = aggregazioniDisponibili.ToArray(),
                RccDisponibili = rccDisponibili,
                Righe = rowDtos,
                TotaliPerAnno = totaliPerAnno
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/pivot-funnel-bu.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/pivot-funnel-bu.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero Report Funnel BU."
            });
        }
    }

    private static AnalisiRccUtileMensileResponseDto BuildEmptyUtileMensileResponse(
        string profile,
        IReadOnlyCollection<int> anni,
        int meseRiferimento,
        bool vediTutto,
        string? aggregazioneFiltro,
        int? produzione)
    {
        return new AnalisiRccUtileMensileResponseDto
        {
            Profile = profile,
            Anni = anni.ToArray(),
            MeseRiferimento = meseRiferimento,
            VediTutto = vediTutto,
            AggregazioneFiltro = aggregazioneFiltro,
            AggregazioniDisponibili = [],
            Produzione = produzione,
            Righe = [],
            TotaliPerAnno = []
        };
    }

    private static AnalisiRccUtileMensileTotaleAnnoDto[] BuildUtileMensileTotaliPerAnno(
        IReadOnlyCollection<AnalisiRccUtileMensileRow> rows)
    {
        return rows
            .GroupBy(item => item.Anno)
            .OrderBy(group => group.Key)
            .Select(group =>
            {
                var totaleRicavi = group.Sum(item => item.TotaleRicavi);
                var totaleCosti = group.Sum(item => item.TotaleCosti);
                var totaleCostoPersonale = group.Sum(item => item.TotaleCostoPersonale);
                var totaleUtile = group.Sum(item => item.TotaleUtileSpecifico);
                var totaleCostiComplessivi = totaleCosti + totaleCostoPersonale;

                return new AnalisiRccUtileMensileTotaleAnnoDto
                {
                    Anno = group.Key,
                    TotaleRicavi = totaleRicavi,
                    TotaleCosti = totaleCosti,
                    TotaleCostoPersonale = totaleCostoPersonale,
                    TotaleUtileSpecifico = totaleUtile,
                    TotaleOreLavorate = group.Sum(item => item.TotaleOreLavorate),
                    TotaleCostoGeneraleRibaltato = group.Sum(item => item.TotaleCostoGeneraleRibaltato),
                    PercentualeMargineSuRicavi = totaleRicavi == 0m ? 0m : totaleUtile / totaleRicavi * 100m,
                    PercentualeMarkupSuCosti = totaleCostiComplessivi == 0m ? 0m : totaleUtile / totaleCostiComplessivi * 100m,
                    PercentualeCostIncome = totaleRicavi == 0m ? 0m : totaleCostiComplessivi / totaleRicavi * 100m
                };
            })
            .ToArray();
    }

    private static int GetDefaultReferenceMonth()
    {
        var currentMonth = DateTime.Now.Month;
        return currentMonth <= 1 ? 12 : currentMonth - 1;
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

    private static AnalisiRccRisultatoMensileGridDto BuildRisultatoPesatoGrid(
        IReadOnlyCollection<AnalisiRccMensileSnapshotRow> rows,
        IReadOnlyCollection<int> mesi)
    {
        var righe = rows
            .GroupBy(item => item.Rcc)
            .OrderBy(group => group.Key, StringComparer.OrdinalIgnoreCase)
            .Select(group => new AnalisiRccRisultatoMensileRowDto
            {
                Aggregazione = group.Key,
                Budget = group
                    .OrderBy(item => item.MeseSnapshot)
                    .Select(item => item.Budget)
                    .FirstOrDefault(),
                ValoriMensili = mesi
                    .Select(mese => new AnalisiRccMensileValueDto
                    {
                        Mese = mese,
                        Valore = group
                            .Where(item => item.MeseSnapshot == mese)
                            .Sum(item => item.TotaleRisultatoPesato)
                    })
                    .ToArray()
            })
            .ToList();

        if (righe.Count > 0)
        {
            var totaleBudget = righe.Sum(item => item.Budget ?? 0m);
            righe.Add(new AnalisiRccRisultatoMensileRowDto
            {
                Aggregazione = "Totale complessivo",
                Budget = totaleBudget,
                ValoriMensili = mesi
                    .Select(mese => new AnalisiRccMensileValueDto
                    {
                        Mese = mese,
                        Valore = rows
                            .Where(item => item.MeseSnapshot == mese)
                            .Sum(item => item.TotaleRisultatoPesato)
                    })
                    .ToArray()
            });
        }

        return new AnalisiRccRisultatoMensileGridDto
        {
            Titolo = "Somma totale_risultato_pesato",
            Mesi = mesi,
            ValoriPercentuali = false,
            Righe = righe
        };
    }

    private static AnalisiRccRisultatoMensileGridDto BuildPercentualePesataGrid(
        IReadOnlyCollection<AnalisiRccMensileSnapshotRow> rows,
        IReadOnlyCollection<int> mesi)
    {
        var righe = rows
            .GroupBy(item => item.Rcc)
            .OrderBy(group => group.Key, StringComparer.OrdinalIgnoreCase)
            .Select(group => new AnalisiRccRisultatoMensileRowDto
            {
                Aggregazione = group.Key,
                Budget = null,
                ValoriMensili = mesi
                    .Select(mese =>
                    {
                        var meseRows = group
                            .Where(item => item.MeseSnapshot == mese)
                            .ToArray();
                        var value = meseRows.Length == 0
                            ? 0m
                            : meseRows.Average(item => item.PercentualePesato);
                        return new AnalisiRccMensileValueDto
                        {
                            Mese = mese,
                            Valore = value
                        };
                    })
                    .ToArray()
            })
            .ToList();

        if (righe.Count > 0)
        {
            righe.Add(new AnalisiRccRisultatoMensileRowDto
            {
                Aggregazione = "Totale complessivo",
                Budget = null,
                ValoriMensili = mesi
                    .Select(mese =>
                    {
                        var meseRows = rows
                            .Where(item => item.MeseSnapshot == mese)
                            .ToArray();
                        var value = meseRows.Length == 0
                            ? 0m
                            : meseRows.Average(item => item.PercentualePesato);
                        return new AnalisiRccMensileValueDto
                        {
                            Mese = mese,
                            Valore = value
                        };
                    })
                    .ToArray()
            });
        }

        return new AnalisiRccRisultatoMensileGridDto
        {
            Titolo = "Media percentuale_pesato",
            Mesi = mesi,
            ValoriPercentuali = true,
            Righe = righe
        };
    }

    private static (int Anno, string Aggregazione, string Tipo, decimal PercentualeSuccesso) BuildPivotFunnelKey(
        int anno,
        string? aggregazione,
        string? tipo,
        decimal percentualeSuccesso)
    {
        return (
            anno,
            NormalizePivotFunnelText(aggregazione),
            NormalizePivotFunnelText(tipo),
            NormalizePivotFunnelPercent(percentualeSuccesso)
        );
    }

    private static Dictionary<(int Anno, string Aggregazione, string Tipo, decimal PercentualeSuccesso), int> BuildProtocolCountLookup(
        IEnumerable<AnalisiRccFunnelRow> rows,
        Func<AnalisiRccFunnelRow, string> aggregazioneSelector)
    {
        return rows
            .GroupBy(item => BuildPivotFunnelKey(item.Anno, aggregazioneSelector(item), item.Tipo, item.PercentualeSuccesso))
            .ToDictionary(
                group => group.Key,
                group => group
                    .Select(item => item.Protocollo?.Trim() ?? string.Empty)
                    .Where(value => value.Length > 0)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Count());
    }

    private static string NormalizePivotFunnelText(string? value)
    {
        return (value ?? string.Empty).Trim().ToUpperInvariant();
    }

    private static decimal NormalizePivotFunnelPercent(decimal value)
    {
        var normalized = Math.Abs(value) <= 1m
            ? value * 100m
            : value;
        return decimal.Round(normalized, 4, MidpointRounding.AwayFromZero);
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

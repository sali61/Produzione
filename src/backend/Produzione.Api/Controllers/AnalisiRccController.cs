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
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommercialeCommessa
    ];

    private static readonly string[] AllowedProfilesBu =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileOu
    ];

    private static readonly string[] AllowedProfilesBurcc =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommercialeCommessa,
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

    private static readonly string[] AllowedProfilesPianoFatturazione =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommercialeCommessa
    ];

    private static readonly string[] AllowedProfilesDettaglioFatturato =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommercialeCommessa,
        ProfileCatalog.ProjectManager,
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

            var annoRiferimento = anno.HasValue && anno.Value > 0
                ? anno.Value
                : DateTime.Now.Year;

            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);
            var analisiIdRisorsa = 0;
            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();

            string? rccFiltro = null;
            if (!vediTutto)
            {
                rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    cancellationToken);

                if (!string.IsNullOrWhiteSpace(requestedRcc) &&
                    !string.IsNullOrWhiteSpace(rccFiltro) &&
                    !rccFiltro.Equals(requestedRcc, StringComparison.OrdinalIgnoreCase))
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = $"RCC '{requestedRcc}' non autorizzato per il profilo '{profileResult}'."
                    });
                }
            }
            else
            {
                rccFiltro = requestedRcc;
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
                RccFiltro = vediTutto ? requestedRcc : rccFiltro,
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
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);
            var analisiIdRisorsa = 0;

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
                    analisiIdRisorsa,
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
                        analisiIdRisorsa,
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
                    var percentualeCertaRaggiunta = budgetPrevisto == 0m ? 0m : totaleFatturatoCerto / budgetPrevisto;

                    return new AnalisiRccPivotFatturatoTotaleAnnoDto
                    {
                        Anno = group.Key,
                        FatturatoAnno = fatturatoAnno,
                        FatturatoFuturoAnno = fatturatoFuturoAnno,
                        TotaleFatturatoCerto = totaleFatturatoCerto,
                        BudgetPrevisto = budgetPrevisto,
                        MargineColBudget = totaleFatturatoCerto - budgetPrevisto,
                        PercentualeCertaRaggiunta = percentualeCertaRaggiunta,
                        PercentualeRaggiungimentoTemporale = CalculateAnnualTimeProgressRatio(group.Key, fatturatoAnno, budgetPrevisto),
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
                        PercentualeRaggiungimentoTemporale = CalculateAnnualTimeProgressRatio(item.Anno, item.FatturatoAnno, item.BudgetPrevisto),
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
            var analisiIdRisorsa = 0;

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
            var analisiIdRisorsa = 0;

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
                    analisiIdRisorsa,
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
                        analisiIdRisorsa,
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
                    var percentualeCertaRaggiunta = budgetPrevisto == 0m ? 0m : totaleFatturatoCerto / budgetPrevisto;

                    return new AnalisiRccPivotFatturatoTotaleAnnoDto
                    {
                        Anno = group.Key,
                        FatturatoAnno = fatturatoAnno,
                        FatturatoFuturoAnno = fatturatoFuturoAnno,
                        TotaleFatturatoCerto = totaleFatturatoCerto,
                        BudgetPrevisto = budgetPrevisto,
                        MargineColBudget = totaleFatturatoCerto - budgetPrevisto,
                        PercentualeCertaRaggiunta = percentualeCertaRaggiunta,
                        PercentualeRaggiungimentoTemporale = CalculateAnnualTimeProgressRatio(group.Key, fatturatoAnno, budgetPrevisto),
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
                        PercentualeRaggiungimentoTemporale = CalculateAnnualTimeProgressRatio(item.Anno, item.FatturatoAnno, item.BudgetPrevisto),
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

    [HttpGet("risultato-mensile-burcc")]
    [ProducesResponseType(typeof(AnalisiRccRisultatoMensileBurccResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RisultatoMensileBurcc(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
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

            if (!AllowedProfilesBurcc.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesBurcc)}."
                });
            }

            var annoRiferimento = anno.HasValue && anno.Value > 0
                ? anno.Value
                : DateTime.Now.Year;
            var requestedBusinessUnit = string.IsNullOrWhiteSpace(businessUnit)
                ? null
                : businessUnit.Trim();
            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();
            var profileIsRcc = profileResult.Equals(ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase);
            var profileIsRou = profileResult.Equals(ProfileCatalog.ResponsabileOu, StringComparison.OrdinalIgnoreCase);
            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);
            var analisiIdRisorsa = 0;

            IReadOnlyCollection<string>? allowedBusinessUnits = null;
            string? rccFiltro = requestedRcc;

            if (!vediTutto)
            {
                if (profileIsRcc)
                {
                    rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                        contextData.EffectiveUser.IdRisorsa,
                        cancellationToken);
                    if (string.IsNullOrWhiteSpace(rccFiltro))
                    {
                        return Ok(BuildEmptyRisultatoMensileBurccResponse(profileResult, annoRiferimento, false, requestedBusinessUnit, null));
                    }

                    if (!string.IsNullOrWhiteSpace(requestedRcc) &&
                        !rccFiltro.Equals(requestedRcc, StringComparison.OrdinalIgnoreCase))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new
                        {
                            message = $"RCC '{requestedRcc}' non autorizzato per il profilo '{profileResult}'."
                        });
                    }
                }
                else if (profileIsRou)
                {
                    var effectiveOuScopes = NormalizeScopes(contextData.EffectiveOuScopes);
                    if (effectiveOuScopes.Length == 0)
                    {
                        return Ok(BuildEmptyRisultatoMensileBurccResponse(profileResult, annoRiferimento, false, null, requestedRcc));
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
                    rccFiltro = requestedRcc;
                }
            }

            var rows = await analisiRccRepository.GetRisultatoMensileBurccSnapshotAsync(
                annoRiferimento,
                requestedBusinessUnit,
                rccFiltro,
                allowedBusinessUnits,
                cancellationToken);
            var optionRows = await analisiRccRepository.GetRisultatoMensileBurccSnapshotAsync(
                annoRiferimento,
                null,
                rccFiltro,
                allowedBusinessUnits,
                cancellationToken);

            // Fallback budget: se la snapshot mensile BURCC non riporta il budget, recuperiamolo
            // dal report annuale BURCC (stessa base dati della pagina "Report Annuale RCC-BU").
            if (rows.Any(item => item.Budget == 0m))
            {
                var budgetRows = await analisiRccRepository.GetPivotFatturatoBurccAsync(
                    analisiIdRisorsa,
                    annoRiferimento,
                    requestedBusinessUnit,
                    rccFiltro,
                    allowedBusinessUnits,
                    cancellationToken);

                if (budgetRows.Count > 0)
                {
                    var budgetLookup = budgetRows
                        .Where(item => item.BudgetPrevisto != 0m)
                        .GroupBy(
                            item => BuildBurccKey(item.BusinessUnit, item.Rcc),
                            StringComparer.OrdinalIgnoreCase)
                        .ToDictionary(
                            group => group.Key,
                            group => group
                                .Select(item => item.BudgetPrevisto)
                                .FirstOrDefault(value => value != 0m),
                            StringComparer.OrdinalIgnoreCase);

                    rows = rows
                        .Select(item =>
                        {
                            if (item.Budget != 0m)
                            {
                                return item;
                            }

                            var key = BuildBurccKey(item.BusinessUnit, item.Rcc);
                            if (!budgetLookup.TryGetValue(key, out var fallbackBudget) || fallbackBudget == 0m)
                            {
                                return item;
                            }

                            return item with
                            {
                                Budget = fallbackBudget
                            };
                        })
                        .ToArray();
                }
            }

            var businessUnitDisponibili = optionRows
                .Select(item => item.BusinessUnit?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();
            var rccDisponibili = optionRows
                .Select(item => item.Rcc?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var normalizedRows = rows
                .Select(item => new AnalisiRccMensileSnapshotRow(
                    $"{item.BusinessUnit} - {item.Rcc}",
                    item.AnnoSnapshot,
                    item.MeseSnapshot,
                    item.Budget,
                    item.TotaleRisultatoPesato,
                    item.PercentualePesato))
                .ToArray();
            var mesi = normalizedRows
                .Select(item => item.MeseSnapshot)
                .Where(value => value >= 1 && value <= 12)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            var response = new AnalisiRccRisultatoMensileBurccResponseDto
            {
                Profile = profileResult,
                Anno = annoRiferimento,
                VediTutto = vediTutto,
                BusinessUnitFiltro = requestedBusinessUnit ?? (profileIsRou ? BuildScopeLabel(allowedBusinessUnits) : null),
                RccFiltro = rccFiltro,
                BusinessUnitDisponibili = businessUnitDisponibili,
                RccDisponibili = rccDisponibili,
                RisultatoPesato = BuildRisultatoPesatoGrid(normalizedRows, mesi),
                PercentualePesata = BuildPercentualePesataGrid(normalizedRows, mesi)
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/risultato-mensile-burcc.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/risultato-mensile-burcc.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero analisi BURCC."
            });
        }
    }

    [HttpGet("pivot-fatturato-burcc")]
    [ProducesResponseType(typeof(AnalisiRccPivotBurccResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PivotFatturatoBurcc(
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

            if (!AllowedProfilesBurcc.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesBurcc)}."
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

            var requestedBusinessUnit = string.IsNullOrWhiteSpace(businessUnit)
                ? null
                : businessUnit.Trim();
            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();
            var profileIsRcc = profileResult.Equals(ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase);
            var profileIsRou = profileResult.Equals(ProfileCatalog.ResponsabileOu, StringComparison.OrdinalIgnoreCase);
            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);
            var analisiIdRisorsa = 0;

            IReadOnlyCollection<string>? allowedBusinessUnits = null;
            string? rccFiltro = requestedRcc;

            if (!vediTutto)
            {
                if (profileIsRcc)
                {
                    rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                        contextData.EffectiveUser.IdRisorsa,
                        cancellationToken);
                    if (string.IsNullOrWhiteSpace(rccFiltro))
                    {
                        return Ok(BuildEmptyPivotBurccResponse(profileResult, anniRiferimento, false, requestedBusinessUnit, null));
                    }

                    if (!string.IsNullOrWhiteSpace(requestedRcc) &&
                        !rccFiltro.Equals(requestedRcc, StringComparison.OrdinalIgnoreCase))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new
                        {
                            message = $"RCC '{requestedRcc}' non autorizzato per il profilo '{profileResult}'."
                        });
                    }
                }
                else if (profileIsRou)
                {
                    var effectiveOuScopes = NormalizeScopes(contextData.EffectiveOuScopes);
                    if (effectiveOuScopes.Length == 0)
                    {
                        return Ok(BuildEmptyPivotBurccResponse(profileResult, anniRiferimento, false, null, requestedRcc));
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
                    rccFiltro = requestedRcc;
                }
            }

            var rows = new List<AnalisiRccPivotBurccRow>();
            foreach (var currentYear in anniRiferimento)
            {
                var yearRows = await analisiRccRepository.GetPivotFatturatoBurccAsync(
                    analisiIdRisorsa,
                    currentYear,
                    requestedBusinessUnit,
                    rccFiltro,
                    allowedBusinessUnits,
                    cancellationToken);
                rows.AddRange(yearRows);
            }

            var optionRows = new List<AnalisiRccPivotBurccRow>();
            foreach (var currentYear in anniRiferimento)
            {
                var yearRows = await analisiRccRepository.GetPivotFatturatoBurccAsync(
                    analisiIdRisorsa,
                    currentYear,
                    null,
                    rccFiltro,
                    allowedBusinessUnits,
                    cancellationToken);
                optionRows.AddRange(yearRows);
            }

            var businessUnitDisponibili = optionRows
                .Select(item => item.BusinessUnit?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();
            var rccDisponibili = optionRows
                .Select(item => item.Rcc?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var rowsOrdered = rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.BusinessUnit, StringComparer.OrdinalIgnoreCase)
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
                    var percentualeCertaRaggiunta = budgetPrevisto == 0m ? 0m : totaleFatturatoCerto / budgetPrevisto;

                    return new AnalisiRccPivotFatturatoTotaleAnnoDto
                    {
                        Anno = group.Key,
                        FatturatoAnno = fatturatoAnno,
                        FatturatoFuturoAnno = fatturatoFuturoAnno,
                        TotaleFatturatoCerto = totaleFatturatoCerto,
                        BudgetPrevisto = budgetPrevisto,
                        MargineColBudget = totaleFatturatoCerto - budgetPrevisto,
                        PercentualeCertaRaggiunta = percentualeCertaRaggiunta,
                        PercentualeRaggiungimentoTemporale = CalculateAnnualTimeProgressRatio(group.Key, fatturatoAnno, budgetPrevisto),
                        TotaleRicavoIpotetico = totaleRicavoIpotetico,
                        TotaleRicavoIpoteticoPesato = totaleRicavoIpoteticoPesato,
                        TotaleIpotetico = totaleIpotetico,
                        PercentualeCompresoRicavoIpotetico = budgetPrevisto == 0m ? 0m : totaleIpotetico / budgetPrevisto
                    };
                })
                .ToArray();

            var response = new AnalisiRccPivotBurccResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                VediTutto = vediTutto,
                BusinessUnitFiltro = requestedBusinessUnit ?? (profileIsRou ? BuildScopeLabel(allowedBusinessUnits) : null),
                RccFiltro = rccFiltro,
                BusinessUnitDisponibili = businessUnitDisponibili,
                RccDisponibili = rccDisponibili,
                Righe = rowsOrdered
                    .Select(item => new AnalisiRccPivotBurccRowDto
                    {
                        Anno = item.Anno,
                        BusinessUnit = item.BusinessUnit,
                        Rcc = item.Rcc,
                        FatturatoAnno = item.FatturatoAnno,
                        FatturatoFuturoAnno = item.FatturatoFuturoAnno,
                        TotaleFatturatoCerto = item.TotaleFatturatoCerto,
                        BudgetPrevisto = item.BudgetPrevisto,
                        MargineColBudget = item.MargineColBudget,
                        PercentualeCertaRaggiunta = item.PercentualeCertaRaggiunta,
                        PercentualeRaggiungimentoTemporale = CalculateAnnualTimeProgressRatio(item.Anno, item.FatturatoAnno, item.BudgetPrevisto),
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
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/pivot-fatturato-burcc.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/pivot-fatturato-burcc.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero report annuale BURCC."
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
            var analisiIdRisorsa = 0;

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
                analisiIdRisorsa,
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
                    analisiIdRisorsa,
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
            var analisiIdRisorsa = 0;

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
                analisiIdRisorsa,
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
                    analisiIdRisorsa,
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
            var analisiIdRisorsa = 0;

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
                analisiIdRisorsa,
                anniRiferimento,
                rccFiltro,
                tipoFiltro,
                statoDocumentoFiltro,
                cancellationToken);

            var optionRows = await analisiRccRepository.GetFunnelAsync(
                analisiIdRisorsa,
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
        [FromQuery] string? tipo = null,
        [FromQuery] string? tipoDocumento = null,
        [FromQuery] decimal? percentualeSuccesso = null,
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
            var analisiIdRisorsa = 0;

            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();
            var requestedTipo = string.IsNullOrWhiteSpace(tipo)
                ? null
                : tipo.Trim();
            var requestedTipoDocumento = string.IsNullOrWhiteSpace(tipoDocumento)
                ? null
                : tipoDocumento.Trim();
            var requestedPercentualeSuccesso = percentualeSuccesso.HasValue
                ? NormalizePivotFunnelPercent(percentualeSuccesso.Value)
                : (decimal?)null;

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
                    analisiIdRisorsa,
                    currentYear,
                    rccFiltro,
                    cancellationToken);
                rows.AddRange(yearRows);
            }
            var rowsForFilterOptions = rows.ToArray();

            var aggregazioniDisponibili = new List<string>();
            if (vediTutto)
            {
                var optionRows = new List<AnalisiRccPivotFunnelRow>();
                foreach (var currentYear in anniRiferimento)
                {
                    var yearRows = await analisiRccRepository.GetPivotFunnelAsync(
                        analisiIdRisorsa,
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

            var filteredRows = rows.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(requestedTipo))
            {
                filteredRows = filteredRows.Where(item => item.Tipo.Equals(requestedTipo, StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(requestedTipoDocumento))
            {
                filteredRows = filteredRows.Where(item => item.TipoDocumento.Equals(requestedTipoDocumento, StringComparison.OrdinalIgnoreCase));
            }
            if (requestedPercentualeSuccesso.HasValue)
            {
                filteredRows = filteredRows.Where(item => NormalizePivotFunnelPercent(item.PercentualeSuccesso) == requestedPercentualeSuccesso.Value);
            }

            var rowsOrdered = filteredRows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Aggregazione, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Tipo, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.TipoDocumento, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.PercentualeSuccesso)
                .ToArray();

            var dettaglioRows = await analisiRccRepository.GetFunnelAsync(
                analisiIdRisorsa,
                anniRiferimento,
                rccFiltro,
                requestedTipo,
                requestedTipoDocumento,
                cancellationToken);
            if (requestedPercentualeSuccesso.HasValue)
            {
                dettaglioRows = dettaglioRows
                    .Where(item => NormalizePivotFunnelPercent(item.PercentualeSuccesso) == requestedPercentualeSuccesso.Value)
                    .ToArray();
            }
            var protocolCountLookup = BuildProtocolCountLookup(dettaglioRows, item => item.Rcc);

            var rowDtos = rowsOrdered
                .Select(item =>
                {
                    var key = BuildPivotFunnelKey(item.Anno, item.Aggregazione, item.Tipo, item.TipoDocumento, item.PercentualeSuccesso);
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
                        TipoDocumento = item.TipoDocumento,
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
                TipoFiltro = requestedTipo,
                TipoDocumentoFiltro = requestedTipoDocumento,
                PercentualeSuccessoFiltro = requestedPercentualeSuccesso,
                AggregazioniDisponibili = aggregazioniDisponibili.ToArray(),
                RccDisponibili = aggregazioniDisponibili.ToArray(),
                TipiDisponibili = rowsForFilterOptions
                    .Select(item => item.Tipo?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToArray(),
                TipiDocumentoDisponibili = rowsForFilterOptions
                    .Select(item => item.TipoDocumento?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToArray(),
                PercentualiSuccessoDisponibili = rowsForFilterOptions
                    .Select(item => NormalizePivotFunnelPercent(item.PercentualeSuccesso))
                    .Distinct()
                    .OrderBy(value => value)
                    .ToArray(),
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
        [FromQuery] string? tipo = null,
        [FromQuery] decimal? percentualeSuccesso = null,
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
            var analisiIdRisorsa = 0;

            var requestedBusinessUnit = string.IsNullOrWhiteSpace(businessUnit)
                ? null
                : businessUnit.Trim();
            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();
            var requestedTipo = string.IsNullOrWhiteSpace(tipo)
                ? null
                : tipo.Trim();
            var requestedPercentualeSuccesso = percentualeSuccesso.HasValue
                ? NormalizePivotFunnelPercent(percentualeSuccesso.Value)
                : (decimal?)null;

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
                    analisiIdRisorsa,
                    currentYear,
                    requestedBusinessUnit,
                    requestedRcc,
                    allowedBusinessUnits,
                    cancellationToken);
                rows.AddRange(yearRows);
            }
            var rowsForFilterOptions = rows.ToArray();

            List<string> aggregazioniDisponibili;
            if (vediTutto)
            {
                var optionRows = new List<AnalisiRccPivotFunnelRow>();
                foreach (var currentYear in anniRiferimento)
                {
                    var yearRows = await analisiRccRepository.GetPivotFunnelBusinessUnitAsync(
                        analisiIdRisorsa,
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

            var filteredRows = rows.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(requestedTipo))
            {
                filteredRows = filteredRows.Where(item => item.Tipo.Equals(requestedTipo, StringComparison.OrdinalIgnoreCase));
            }
            if (requestedPercentualeSuccesso.HasValue)
            {
                filteredRows = filteredRows.Where(item => NormalizePivotFunnelPercent(item.PercentualeSuccesso) == requestedPercentualeSuccesso.Value);
            }

            var rowsOrdered = filteredRows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Aggregazione, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Tipo, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.PercentualeSuccesso)
                .ToArray();

            var dettaglioRows = await analisiRccRepository.GetFunnelAsync(
                analisiIdRisorsa,
                anniRiferimento,
                null,
                requestedTipo,
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

            var dettaglioRowsForRccOptions = dettaglioRows;

            var rccDisponibili = dettaglioRowsForRccOptions
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
            if (requestedPercentualeSuccesso.HasValue)
            {
                dettaglioRows = dettaglioRows
                    .Where(item => NormalizePivotFunnelPercent(item.PercentualeSuccesso) == requestedPercentualeSuccesso.Value)
                    .ToArray();
            }

            var protocolCountLookup = BuildProtocolCountLookup(dettaglioRows, item => item.BusinessUnit);

            var rowDtos = rowsOrdered
                .Select(item =>
                {
                    var key = BuildPivotFunnelKey(item.Anno, item.Aggregazione, item.Tipo, item.TipoDocumento, item.PercentualeSuccesso);
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
                        TipoDocumento = item.TipoDocumento,
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
                TipoFiltro = requestedTipo,
                PercentualeSuccessoFiltro = requestedPercentualeSuccesso,
                AggregazioniDisponibili = aggregazioniDisponibili.ToArray(),
                RccDisponibili = rccDisponibili,
                TipiDisponibili = rowsForFilterOptions
                    .Select(item => item.Tipo?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToArray(),
                PercentualiSuccessoDisponibili = rowsForFilterOptions
                    .Select(item => NormalizePivotFunnelPercent(item.PercentualeSuccesso))
                    .Distinct()
                    .OrderBy(value => value)
                    .ToArray(),
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

    [HttpGet("pivot-funnel-burcc")]
    [ProducesResponseType(typeof(AnalisiRccPivotFunnelResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PivotFunnelBurcc(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] string? businessUnit = null,
        [FromQuery] string? rcc = null,
        [FromQuery] string? tipo = null,
        [FromQuery] decimal? percentualeSuccesso = null,
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

            if (!AllowedProfilesBurcc.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesBurcc)}."
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

            var requestedBusinessUnit = string.IsNullOrWhiteSpace(businessUnit)
                ? null
                : businessUnit.Trim();
            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();
            var requestedTipo = string.IsNullOrWhiteSpace(tipo)
                ? null
                : tipo.Trim();
            var requestedPercentualeSuccesso = percentualeSuccesso.HasValue
                ? NormalizePivotFunnelPercent(percentualeSuccesso.Value)
                : (decimal?)null;

            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);
            var analisiIdRisorsa = 0;

            var isRccProfile = profileResult.Equals(ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase);
            var isRouProfile = profileResult.Equals(ProfileCatalog.ResponsabileOu, StringComparison.OrdinalIgnoreCase);

            IReadOnlyCollection<string>? allowedBusinessUnits = null;
            string? enforcedRcc = null;

            if (!vediTutto)
            {
                if (isRccProfile)
                {
                    enforcedRcc = await analisiRccRepository.GetNomeRisorsaAsync(
                        contextData.EffectiveUser.IdRisorsa,
                        cancellationToken);

                    if (!string.IsNullOrWhiteSpace(requestedRcc) &&
                        !string.IsNullOrWhiteSpace(enforcedRcc) &&
                        !requestedRcc.Equals(enforcedRcc, StringComparison.OrdinalIgnoreCase))
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, new
                        {
                            message = $"RCC '{requestedRcc}' non autorizzato per il profilo '{profileResult}'."
                        });
                    }
                }

                if (isRouProfile)
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
                            TipiDisponibili = [],
                            PercentualiSuccessoDisponibili = [],
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
            }

            var effectiveRcc = !string.IsNullOrWhiteSpace(enforcedRcc)
                ? enforcedRcc
                : requestedRcc;

            var rawRows = new List<AnalisiRccPivotFunnelRow>();
            foreach (var currentYear in anniRiferimento)
            {
                var yearRows = await analisiRccRepository.GetPivotFunnelBurccAsync(
                    analisiIdRisorsa,
                    currentYear,
                    requestedBusinessUnit,
                    effectiveRcc,
                    allowedBusinessUnits,
                    cancellationToken);
                rawRows.AddRange(yearRows);
            }

            var allowedBusinessUnitSet = allowedBusinessUnits is null
                ? null
                : new HashSet<string>(NormalizeScopes(allowedBusinessUnits), StringComparer.OrdinalIgnoreCase);

            var rowsWithKeys = rawRows
                .Select(item =>
                {
                    var (rowBusinessUnit, rowRcc) = SplitBurccAggregation(item.Aggregazione);
                    return new
                    {
                        Row = item,
                        BusinessUnit = rowBusinessUnit?.Trim() ?? string.Empty,
                        Rcc = rowRcc?.Trim() ?? string.Empty
                    };
                })
                .Where(item => !string.IsNullOrWhiteSpace(item.BusinessUnit) && !string.IsNullOrWhiteSpace(item.Rcc))
                .Where(item => allowedBusinessUnitSet is null || allowedBusinessUnitSet.Contains(item.BusinessUnit))
                .ToArray();

            var businessUnitOptionsSource = rowsWithKeys
                .Where(item => string.IsNullOrWhiteSpace(effectiveRcc) || item.Rcc.Equals(effectiveRcc, StringComparison.OrdinalIgnoreCase))
                .ToArray();
            var rccOptionsSource = rowsWithKeys
                .Where(item => string.IsNullOrWhiteSpace(requestedBusinessUnit) || item.BusinessUnit.Equals(requestedBusinessUnit, StringComparison.OrdinalIgnoreCase))
                .ToArray();

            var businessUnitOptions = businessUnitOptionsSource
                .Select(item => item.BusinessUnit)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();
            var rccOptions = rccOptionsSource
                .Select(item => item.Rcc)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var scopedRows = rowsWithKeys
                .Where(item => string.IsNullOrWhiteSpace(requestedBusinessUnit) || item.BusinessUnit.Equals(requestedBusinessUnit, StringComparison.OrdinalIgnoreCase))
                .Where(item => string.IsNullOrWhiteSpace(effectiveRcc) || item.Rcc.Equals(effectiveRcc, StringComparison.OrdinalIgnoreCase))
                .ToArray();

            var rowsForFilterOptions = scopedRows.Select(item => item.Row).ToArray();

            var filteredRows = scopedRows.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(requestedTipo))
            {
                filteredRows = filteredRows.Where(item => item.Row.Tipo.Equals(requestedTipo, StringComparison.OrdinalIgnoreCase));
            }
            if (requestedPercentualeSuccesso.HasValue)
            {
                filteredRows = filteredRows.Where(item => NormalizePivotFunnelPercent(item.Row.PercentualeSuccesso) == requestedPercentualeSuccesso.Value);
            }

            var rowsOrdered = filteredRows
                .OrderBy(item => item.Row.Anno)
                .ThenBy(item => item.BusinessUnit, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Rcc, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Row.Tipo, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Row.PercentualeSuccesso)
                .ToArray();

            var dettaglioRows = await analisiRccRepository.GetFunnelAsync(
                analisiIdRisorsa,
                anniRiferimento,
                effectiveRcc,
                requestedTipo,
                null,
                cancellationToken);

            if (!string.IsNullOrWhiteSpace(requestedBusinessUnit))
            {
                dettaglioRows = dettaglioRows
                    .Where(item => item.BusinessUnit.Equals(requestedBusinessUnit, StringComparison.OrdinalIgnoreCase))
                    .ToArray();
            }

            if (allowedBusinessUnitSet is not null)
            {
                dettaglioRows = dettaglioRows
                    .Where(item => allowedBusinessUnitSet.Contains(item.BusinessUnit))
                    .ToArray();
            }

            if (requestedPercentualeSuccesso.HasValue)
            {
                dettaglioRows = dettaglioRows
                    .Where(item => NormalizePivotFunnelPercent(item.PercentualeSuccesso) == requestedPercentualeSuccesso.Value)
                    .ToArray();
            }

            var protocolCountLookup = BuildProtocolCountLookup(dettaglioRows, item => $"{item.BusinessUnit} - {item.Rcc}");

            var rowDtos = rowsOrdered
                .Select(item =>
                {
                    var aggregazioneLabel = $"{item.BusinessUnit} - {item.Rcc}";
                    var key = BuildPivotFunnelKey(item.Row.Anno, aggregazioneLabel, item.Row.Tipo, item.Row.TipoDocumento, item.Row.PercentualeSuccesso);
                    var numeroProtocolli = protocolCountLookup.TryGetValue(key, out var count)
                        ? count
                        : item.Row.NumeroProtocolli;
                    var totaleFatturatoFuturo = item.Row.TotaleFatturatoFuturo != 0m
                        ? item.Row.TotaleFatturatoFuturo
                        : item.Row.TotaleFuturaAnno;

                    return new AnalisiRccPivotFunnelRowDto
                    {
                        Anno = item.Row.Anno,
                        Aggregazione = aggregazioneLabel,
                        Tipo = item.Row.Tipo,
                        TipoDocumento = item.Row.TipoDocumento,
                        PercentualeSuccesso = item.Row.PercentualeSuccesso,
                        NumeroProtocolli = numeroProtocolli,
                        TotaleBudgetRicavo = item.Row.TotaleBudgetRicavo,
                        TotaleBudgetCosti = item.Row.TotaleBudgetCosti,
                        TotaleFatturatoFuturo = totaleFatturatoFuturo,
                        TotaleEmessaAnno = item.Row.TotaleEmessaAnno,
                        TotaleFuturaAnno = item.Row.TotaleFuturaAnno,
                        TotaleRicaviComplessivi = item.Row.TotaleRicaviComplessivi
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
                AggregazioneFiltro = requestedBusinessUnit,
                RccFiltro = effectiveRcc,
                TipoFiltro = requestedTipo,
                PercentualeSuccessoFiltro = requestedPercentualeSuccesso,
                AggregazioniDisponibili = businessUnitOptions,
                RccDisponibili = rccOptions,
                TipiDisponibili = rowsForFilterOptions
                    .Select(item => item.Tipo?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToArray(),
                PercentualiSuccessoDisponibili = rowsForFilterOptions
                    .Select(item => NormalizePivotFunnelPercent(item.PercentualeSuccesso))
                    .Distinct()
                    .OrderBy(value => value)
                    .ToArray(),
                Righe = rowDtos,
                TotaliPerAnno = totaliPerAnno
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/pivot-funnel-burcc.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/pivot-funnel-burcc.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero Report Funnel BU RCC."
            });
        }
    }

    [HttpGet("piano-fatturazione")]
    [ProducesResponseType(typeof(AnalisiRccPianoFatturazioneResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> PianoFatturazione(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "mesiSnapshot")] int[]? mesiSnapshot = null,
        [FromQuery] string? businessUnit = null,
        [FromQuery] string? rcc = null,
        [FromQuery] string? tipoCalcolo = null,
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

            if (!AllowedProfilesPianoFatturazione.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesPianoFatturazione)}."
                });
            }

            var annoRiferimento = anno.HasValue && anno.Value > 0
                ? anno.Value
                : DateTime.Now.Year;

            var mesiSnapshotRiferimento = (mesiSnapshot ?? [])
                .Where(value => value >= 1 && value <= 12)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();
            if (mesiSnapshotRiferimento.Length == 0)
            {
                mesiSnapshotRiferimento = Enumerable.Range(1, 12).ToArray();
            }

            var tipoCalcoloNormalizzato = NormalizePianoTipoCalcolo(tipoCalcolo);
            var mesiRiferimento = Enumerable.Range(1, 12).ToArray();

            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);
            var analisiIdRisorsa = 0;

            var requestedRcc = string.IsNullOrWhiteSpace(rcc)
                ? null
                : rcc.Trim();
            var requestedBusinessUnit = string.IsNullOrWhiteSpace(businessUnit)
                ? null
                : businessUnit.Trim();

            string? rccFiltro;
            if (!vediTutto)
            {
                rccFiltro = await analisiRccRepository.GetNomeRisorsaAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    cancellationToken);

                if (string.IsNullOrWhiteSpace(rccFiltro))
                {
                    return Ok(BuildEmptyPianoFatturazioneResponse(
                        profileResult,
                        annoRiferimento,
                        mesiSnapshotRiferimento,
                        tipoCalcoloNormalizzato,
                        false,
                        requestedBusinessUnit,
                        null));
                }
            }
            else
            {
                rccFiltro = requestedRcc;
            }

            var rows = await analisiRccRepository.GetPianoFatturazioneMensileAsync(
                annoRiferimento,
                mesiSnapshotRiferimento,
                requestedBusinessUnit,
                rccFiltro,
                cancellationToken);

            var mesiSnapshotPresenti = rows
                .Select(item => item.MeseSnapshot)
                .Where(value => value >= 1 && value <= 12)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            var rccDisponibili = rows
                .Select(item => item.Aggregazione?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToList();
            var businessUnitDisponibili = rows
                .Select(item => item.BusinessUnit?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToList();
            if (!string.IsNullOrWhiteSpace(requestedBusinessUnit) &&
                !businessUnitDisponibili.Contains(requestedBusinessUnit, StringComparer.OrdinalIgnoreCase))
            {
                businessUnitDisponibili.Add(requestedBusinessUnit);
                businessUnitDisponibili = businessUnitDisponibili
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }

            if (!vediTutto && !string.IsNullOrWhiteSpace(rccFiltro) &&
                !rccDisponibili.Contains(rccFiltro, StringComparer.OrdinalIgnoreCase))
            {
                rccDisponibili.Add(rccFiltro);
                rccDisponibili = rccDisponibili
                    .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }

            var righe = rows
                .GroupBy(item => item.Aggregazione)
                .OrderBy(group => group.Key, StringComparer.OrdinalIgnoreCase)
                .Select(group => BuildPianoFatturazioneRow(
                    group.Key,
                    false,
                    group.ToArray(),
                    tipoCalcoloNormalizzato,
                    mesiRiferimento))
                .ToList();

            if (righe.Count > 0)
            {
                var totalBudget = righe.Sum(item => item.Budget);
                var totalMonthlyValues = mesiRiferimento
                    .Select(mese => new AnalisiRccMensileValueDto
                    {
                        Mese = mese,
                        Valore = righe.Sum(item => item.ValoriMensili
                            .FirstOrDefault(value => value.Mese == mese)?.Valore ?? 0m)
                    })
                    .ToArray();

                var trim1 = totalMonthlyValues.Where(item => item.Mese is >= 1 and <= 3).Sum(item => item.Valore);
                var trim2 = totalMonthlyValues.Where(item => item.Mese is >= 4 and <= 6).Sum(item => item.Valore);
                var trim3 = totalMonthlyValues.Where(item => item.Mese is >= 7 and <= 9).Sum(item => item.Valore);
                var trim4 = totalMonthlyValues.Where(item => item.Mese is >= 10 and <= 12).Sum(item => item.Valore);
                var totaleComplessivo = trim1 + trim2 + trim3 + trim4;

                righe.Add(new AnalisiRccPianoFatturazioneRowDto
                {
                    Rcc = "Totale complessivo",
                    IsTotale = true,
                    Budget = totalBudget,
                    ValoriMensili = totalMonthlyValues,
                    TotaleTrim1 = trim1,
                    PercentualeTrim1Cumulata = totalBudget == 0m ? 0m : trim1 / totalBudget,
                    TotaleTrim2 = trim2,
                    PercentualeTrim2Cumulata = totalBudget == 0m ? 0m : (trim1 + trim2) / totalBudget,
                    TotaleTrim3 = trim3,
                    PercentualeTrim3Cumulata = totalBudget == 0m ? 0m : (trim1 + trim2 + trim3) / totalBudget,
                    TotaleTrim4 = trim4,
                    PercentualeTrim4Cumulata = totalBudget == 0m ? 0m : totaleComplessivo / totalBudget,
                    TotaleComplessivo = totaleComplessivo,
                    PercentualeTotaleBudget = totalBudget == 0m ? 0m : totaleComplessivo / totalBudget
                });
            }

            var response = new AnalisiRccPianoFatturazioneResponseDto
            {
                Profile = profileResult,
                Anno = annoRiferimento,
                MesiSnapshot = mesiSnapshotPresenti.Length > 0 ? mesiSnapshotPresenti : mesiSnapshotRiferimento,
                MesiRiferimento = mesiRiferimento,
                TipoCalcolo = tipoCalcoloNormalizzato,
                VediTutto = vediTutto,
                BusinessUnitFiltro = requestedBusinessUnit,
                BusinessUnitDisponibili = businessUnitDisponibili.ToArray(),
                RccFiltro = rccFiltro,
                RccDisponibili = rccDisponibili.ToArray(),
                Righe = righe.ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/piano-fatturazione.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/piano-fatturazione.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero Piano Fatturazione."
            });
        }
    }

    [HttpGet("dettaglio-fatturato")]
    [ProducesResponseType(typeof(AnalisiRccDettaglioFatturatoResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DettaglioFatturato(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] string? commessa = null,
        [FromQuery] string? commessaSearch = null,
        [FromQuery] string? provenienza = null,
        [FromQuery] string? controparte = null,
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

            if (!AllowedProfilesDettaglioFatturato.Contains(profileResult, StringComparer.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{profileResult}' non autorizzato. Profili ammessi: {string.Join(", ", AllowedProfilesDettaglioFatturato)}."
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

            var profileIsRou = profileResult.Equals(ProfileCatalog.ResponsabileOu, StringComparison.OrdinalIgnoreCase);
            var vediTutto = profileResult.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
                            profileResult.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);
            var analisiIdRisorsa = 0;

            var commessaFiltro = string.IsNullOrWhiteSpace(commessa) ? null : commessa.Trim();
            var commessaSearchFiltro = string.IsNullOrWhiteSpace(commessaSearch) ? null : commessaSearch.Trim();
            var provenienzaFiltro = string.IsNullOrWhiteSpace(provenienza) ? null : provenienza.Trim();
            var controparteFiltro = string.IsNullOrWhiteSpace(controparte) ? null : controparte.Trim();
            var businessUnitFiltro = string.IsNullOrWhiteSpace(businessUnit) ? null : businessUnit.Trim();
            var requestedRccFiltro = string.IsNullOrWhiteSpace(rcc) ? null : rcc.Trim();
            var allowedBusinessUnits = Array.Empty<string>();

            if (!vediTutto && profileIsRou)
            {
                allowedBusinessUnits = NormalizeScopes(contextData.EffectiveOuScopes);
                if (allowedBusinessUnits.Length == 0)
                {
                    return Ok(new AnalisiRccDettaglioFatturatoResponseDto
                    {
                        Profile = profileResult,
                        Anni = anniRiferimento,
                        VediTutto = false,
                        BusinessUnitFiltro = businessUnitFiltro,
                        RccFiltro = null,
                        PmFiltro = null,
                        BusinessUnitDisponibili = [],
                        RccDisponibili = [],
                        CommesseDisponibili = [],
                        ProvenienzeDisponibili = [],
                        ContropartiDisponibili = [],
                        Items = []
                    });
                }

                if (!string.IsNullOrWhiteSpace(businessUnitFiltro) &&
                    !allowedBusinessUnits.Contains(businessUnitFiltro, StringComparer.OrdinalIgnoreCase))
                {
                    return Ok(new AnalisiRccDettaglioFatturatoResponseDto
                    {
                        Profile = profileResult,
                        Anni = anniRiferimento,
                        VediTutto = false,
                        BusinessUnitFiltro = businessUnitFiltro,
                        RccFiltro = null,
                        PmFiltro = null,
                        BusinessUnitDisponibili = allowedBusinessUnits,
                        RccDisponibili = [],
                        CommesseDisponibili = [],
                        ProvenienzeDisponibili = [],
                        ContropartiDisponibili = [],
                        Items = []
                    });
                }
            }

            string? rccFiltro = null;
            string? pmFiltro = null;
            if (!vediTutto && !profileIsRou)
            {
                var nomeRisorsa = await analisiRccRepository.GetNomeRisorsaAsync(
                    contextData.EffectiveUser.IdRisorsa,
                    cancellationToken);
                if (string.IsNullOrWhiteSpace(nomeRisorsa))
                {
                    return Ok(new AnalisiRccDettaglioFatturatoResponseDto
                    {
                        Profile = profileResult,
                        Anni = anniRiferimento,
                        VediTutto = false,
                        BusinessUnitFiltro = businessUnitFiltro,
                        RccFiltro = null,
                        PmFiltro = null,
                        BusinessUnitDisponibili = [],
                        RccDisponibili = [],
                        CommesseDisponibili = [],
                        ProvenienzeDisponibili = [],
                        ContropartiDisponibili = [],
                        Items = []
                    });
                }

                if (profileResult.Equals(ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase))
                {
                    rccFiltro = nomeRisorsa.Trim();
                }
                else
                {
                    pmFiltro = nomeRisorsa.Trim();
                }
            }

            var effectiveRccFiltro = !string.IsNullOrWhiteSpace(rccFiltro)
                ? rccFiltro
                : requestedRccFiltro;

            var rows = await analisiRccRepository.GetDettaglioFatturatoAsync(
                analisiIdRisorsa,
                anniRiferimento,
                commessaFiltro,
                commessaSearchFiltro,
                provenienzaFiltro,
                controparteFiltro,
                businessUnitFiltro,
                effectiveRccFiltro,
                pmFiltro,
                cancellationToken);

            var scopedRows = rows.AsEnumerable();
            if (!vediTutto && profileIsRou && allowedBusinessUnits.Length > 0)
            {
                scopedRows = scopedRows.Where(item =>
                    allowedBusinessUnits.Contains(item.BusinessUnit?.Trim() ?? string.Empty, StringComparer.OrdinalIgnoreCase));
            }
            var rowsFiltered = scopedRows.ToArray();

            var commesseDisponibili = rowsFiltered
                .Select(item =>
                {
                    var codice = item.Commessa?.Trim() ?? string.Empty;
                    if (string.IsNullOrWhiteSpace(codice))
                    {
                        return string.Empty;
                    }

                    var descrizione = item.DescrizioneCommessa?.Trim() ?? string.Empty;
                    return string.IsNullOrWhiteSpace(descrizione)
                        ? codice
                        : $"{codice} - {descrizione}";
                })
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var provenienzeDisponibili = rowsFiltered
                .Select(item => item.Provenienza?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            var contropartiDisponibili = rowsFiltered
                .Select(item => item.Controparte?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();
            var businessUnitDisponibili = rowsFiltered
                .Select(item => item.BusinessUnit?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();
            var rccDisponibili = rowsFiltered
                .Select(item => item.Rcc?.Trim() ?? string.Empty)
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (!vediTutto && profileIsRou)
            {
                businessUnitDisponibili = businessUnitDisponibili.Length == 0
                    ? allowedBusinessUnits
                    : businessUnitDisponibili;
            }

            var response = new AnalisiRccDettaglioFatturatoResponseDto
            {
                Profile = profileResult,
                Anni = anniRiferimento,
                VediTutto = vediTutto,
                BusinessUnitFiltro = businessUnitFiltro,
                RccFiltro = effectiveRccFiltro,
                PmFiltro = pmFiltro,
                BusinessUnitDisponibili = businessUnitDisponibili,
                RccDisponibili = rccDisponibili,
                CommesseDisponibili = commesseDisponibili,
                ProvenienzeDisponibili = provenienzeDisponibili,
                ContropartiDisponibili = contropartiDisponibili,
                Items = rowsFiltered
                    .Select(item => new AnalisiRccDettaglioFatturatoRowDto
                    {
                        Anno = item.Anno,
                        Data = item.Data,
                        Commessa = item.Commessa,
                        BusinessUnit = item.BusinessUnit,
                        Controparte = item.Controparte,
                        Provenienza = item.Provenienza,
                        Fatturato = item.Fatturato,
                        FatturatoFuturo = item.FatturatoFuturo,
                        RicavoIpotetico = item.RicavoIpotetico,
                        Rcc = item.Rcc,
                        Pm = item.Pm,
                        DescrizioneMastro = item.DescrizioneMastro,
                        DescrizioneConto = item.DescrizioneConto,
                        DescrizioneSottoconto = item.DescrizioneSottoconto
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/analisi-rcc/dettaglio-fatturato.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/analisi-rcc/dettaglio-fatturato.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dettaglio fatturato."
            });
        }
    }

    private static AnalisiRccPianoFatturazioneResponseDto BuildEmptyPianoFatturazioneResponse(
        string profile,
        int anno,
        IReadOnlyCollection<int> mesiSnapshot,
        string tipoCalcolo,
        bool vediTutto,
        string? businessUnitFiltro,
        string? rccFiltro)
    {
        return new AnalisiRccPianoFatturazioneResponseDto
        {
            Profile = profile,
            Anno = anno,
            MesiSnapshot = mesiSnapshot.ToArray(),
            MesiRiferimento = Enumerable.Range(1, 12).ToArray(),
            TipoCalcolo = tipoCalcolo,
            VediTutto = vediTutto,
            BusinessUnitFiltro = businessUnitFiltro,
            BusinessUnitDisponibili = [],
            RccFiltro = rccFiltro,
            RccDisponibili = [],
            Righe = []
        };
    }

    private static AnalisiRccPianoFatturazioneRowDto BuildPianoFatturazioneRow(
        string rcc,
        bool isTotale,
        IReadOnlyCollection<AnalisiRccPianoFatturazioneRow> rows,
        string tipoCalcolo,
        IReadOnlyCollection<int> mesiRiferimento)
    {
        var budget = rows
            .Select(item => item.Budget)
            .FirstOrDefault(value => value != 0m);
        if (budget == 0m)
        {
            budget = rows.Select(item => item.Budget).FirstOrDefault();
        }

        var monthlyValues = mesiRiferimento
            .Select(mese => new AnalisiRccMensileValueDto
            {
                Mese = mese,
                Valore = rows
                    .Where(item => item.MeseRiferimento == mese)
                    .Sum(item => ResolvePianoValore(item, tipoCalcolo))
            })
            .ToArray();

        var trim1 = monthlyValues.Where(item => item.Mese is >= 1 and <= 3).Sum(item => item.Valore);
        var trim2 = monthlyValues.Where(item => item.Mese is >= 4 and <= 6).Sum(item => item.Valore);
        var trim3 = monthlyValues.Where(item => item.Mese is >= 7 and <= 9).Sum(item => item.Valore);
        var trim4 = monthlyValues.Where(item => item.Mese is >= 10 and <= 12).Sum(item => item.Valore);
        var totaleComplessivo = trim1 + trim2 + trim3 + trim4;

        return new AnalisiRccPianoFatturazioneRowDto
        {
            Rcc = rcc,
            IsTotale = isTotale,
            Budget = budget,
            ValoriMensili = monthlyValues,
            TotaleTrim1 = trim1,
            PercentualeTrim1Cumulata = budget == 0m ? 0m : trim1 / budget,
            TotaleTrim2 = trim2,
            PercentualeTrim2Cumulata = budget == 0m ? 0m : (trim1 + trim2) / budget,
            TotaleTrim3 = trim3,
            PercentualeTrim3Cumulata = budget == 0m ? 0m : (trim1 + trim2 + trim3) / budget,
            TotaleTrim4 = trim4,
            PercentualeTrim4Cumulata = budget == 0m ? 0m : totaleComplessivo / budget,
            TotaleComplessivo = totaleComplessivo,
            PercentualeTotaleBudget = budget == 0m ? 0m : totaleComplessivo / budget
        };
    }

    private static decimal ResolvePianoValore(AnalisiRccPianoFatturazioneRow row, string tipoCalcolo)
    {
        return tipoCalcolo switch
        {
            "fatturato" => row.TotaleFatturato,
            "futuro" => row.TotaleFatturatoFuturo,
            _ => row.TotaleComplessivo
        };
    }

    private static string NormalizePianoTipoCalcolo(string? tipoCalcolo)
    {
        var normalized = tipoCalcolo?.Trim().ToLowerInvariant() ?? string.Empty;
        return normalized switch
        {
            "fatturato" => "fatturato",
            "futuro" => "futuro",
            "complessivo" => "complessivo",
            _ => "complessivo"
        };
    }

    private static AnalisiRccRisultatoMensileBurccResponseDto BuildEmptyRisultatoMensileBurccResponse(
        string profile,
        int anno,
        bool vediTutto,
        string? businessUnitFiltro,
        string? rccFiltro)
    {
        return new AnalisiRccRisultatoMensileBurccResponseDto
        {
            Profile = profile,
            Anno = anno,
            VediTutto = vediTutto,
            BusinessUnitFiltro = businessUnitFiltro,
            RccFiltro = rccFiltro,
            BusinessUnitDisponibili = [],
            RccDisponibili = [],
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
        };
    }

    private static AnalisiRccPivotBurccResponseDto BuildEmptyPivotBurccResponse(
        string profile,
        IReadOnlyCollection<int> anni,
        bool vediTutto,
        string? businessUnitFiltro,
        string? rccFiltro)
    {
        return new AnalisiRccPivotBurccResponseDto
        {
            Profile = profile,
            Anni = anni.ToArray(),
            VediTutto = vediTutto,
            BusinessUnitFiltro = businessUnitFiltro,
            RccFiltro = rccFiltro,
            BusinessUnitDisponibili = [],
            RccDisponibili = [],
            Righe = [],
            TotaliPerAnno = []
        };
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
            .Select(group =>
            {
                var groupRows = group.ToArray();
                var (businessUnit, rcc) = SplitBurccAggregation(group.Key);
                return new AnalisiRccRisultatoMensileRowDto
                {
                    Aggregazione = group.Key,
                    BusinessUnit = businessUnit,
                    Rcc = rcc,
                    Budget = ResolveMonthlyBudget(groupRows),
                    ValoriMensili = mesi
                        .Select(mese => new AnalisiRccMensileValueDto
                        {
                            Mese = mese,
                            Valore = groupRows
                                .Where(item => item.MeseSnapshot == mese)
                                .Sum(item => item.TotaleRisultatoPesato)
                        })
                        .ToArray()
                };
            })
            .ToList();

        if (righe.Count > 0)
        {
            var totaleBudget = righe.Sum(item => item.Budget ?? 0m);
            righe.Add(new AnalisiRccRisultatoMensileRowDto
            {
                Aggregazione = "Totale complessivo",
                BusinessUnit = "Totale complessivo",
                Rcc = null,
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
        var budgetTotaleFallback = rows
            .GroupBy(item => item.Rcc)
            .Select(group => ResolveMonthlyBudget(group))
            .Sum();

        var righe = rows
            .GroupBy(item => item.Rcc)
            .OrderBy(group => group.Key, StringComparer.OrdinalIgnoreCase)
            .Select(group =>
            {
                var groupRows = group.ToArray();
                var budgetFallback = ResolveMonthlyBudget(groupRows);
                var (businessUnit, rcc) = SplitBurccAggregation(group.Key);
                return new AnalisiRccRisultatoMensileRowDto
                {
                    Aggregazione = group.Key,
                    BusinessUnit = businessUnit,
                    Rcc = rcc,
                    Budget = null,
                    ValoriMensili = mesi
                        .Select(mese =>
                        {
                            var meseRows = groupRows
                                .Where(item => item.MeseSnapshot == mese)
                                .ToArray();
                            var value = ResolveMonthlyPercent(meseRows, budgetFallback);
                            return new AnalisiRccMensileValueDto
                            {
                                Mese = mese,
                                Valore = value
                            };
                        })
                        .ToArray()
                };
            })
            .ToList();

        if (righe.Count > 0)
        {
            righe.Add(new AnalisiRccRisultatoMensileRowDto
            {
                Aggregazione = "Totale complessivo",
                BusinessUnit = "Totale complessivo",
                Rcc = null,
                Budget = null,
                ValoriMensili = mesi
                    .Select(mese =>
                    {
                        var meseRows = rows
                            .Where(item => item.MeseSnapshot == mese)
                            .ToArray();
                        var value = ResolveMonthlyPercent(meseRows, budgetTotaleFallback);
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

    private static string BuildBurccKey(string? businessUnit, string? rcc)
    {
        return $"{businessUnit?.Trim() ?? string.Empty}|{rcc?.Trim() ?? string.Empty}";
    }

    private static decimal ResolveMonthlyBudget(IEnumerable<AnalisiRccMensileSnapshotRow> rows)
    {
        var budgets = rows
            .Select(item => item.Budget)
            .ToArray();
        if (budgets.Length == 0)
        {
            return 0m;
        }

        var nonZeroBudgets = budgets
            .Where(value => value != 0m)
            .ToArray();
        if (nonZeroBudgets.Length > 0)
        {
            return nonZeroBudgets.Max();
        }

        return budgets.FirstOrDefault();
    }

    private static decimal ResolveMonthlyPercent(
        IReadOnlyCollection<AnalisiRccMensileSnapshotRow> rows,
        decimal budgetFallback = 0m)
    {
        if (rows.Count == 0)
        {
            return 0m;
        }

        var totalRisultato = rows.Sum(item => item.TotaleRisultatoPesato);
        var effectiveBudget = budgetFallback;
        if (effectiveBudget == 0m)
        {
            var monthlyBudgets = rows
                .Select(item => item.Budget)
                .Where(value => value != 0m)
                .ToArray();
            if (monthlyBudgets.Length > 0)
            {
                effectiveBudget = monthlyBudgets.Max();
            }
        }

        if (effectiveBudget != 0m)
        {
            return totalRisultato / effectiveBudget;
        }

        var averagePercent = rows.Average(item => item.PercentualePesato);
        if (averagePercent == 0m && totalRisultato != 0m && budgetFallback != 0m)
        {
            return totalRisultato / budgetFallback;
        }

        return averagePercent;
    }

    private static decimal? CalculateAnnualTimeProgressRatio(int year, decimal fatturatoAnno, decimal budgetAnnuale)
    {
        if (budgetAnnuale <= 0m)
        {
            return null;
        }

        var currentDate = DateTime.Now;
        if (year != currentDate.Year)
        {
            return null;
        }

        var endOfPreviousMonth = new DateTime(currentDate.Year, currentDate.Month, 1).AddDays(-1);
        if (endOfPreviousMonth.Year != year)
        {
            return null;
        }

        const decimal daysInYear = 365m;
        var giorniFineMese = (decimal)endOfPreviousMonth.DayOfYear;
        var fattoreTemporale = giorniFineMese / daysInYear;
        if (fattoreTemporale <= 0m)
        {
            return null;
        }

        var budgetRiparametrato = budgetAnnuale * fattoreTemporale;
        if (budgetRiparametrato <= 0m)
        {
            return null;
        }

        return fatturatoAnno / budgetRiparametrato;
    }

    private static (string? BusinessUnit, string? Rcc) SplitBurccAggregation(string? value)
    {
        var raw = value?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return (null, null);
        }

        var separatorIndex = raw.IndexOf('-', StringComparison.Ordinal);
        if (separatorIndex <= 0 || separatorIndex >= raw.Length - 1)
        {
            return (null, null);
        }

        var businessUnit = raw[..separatorIndex].Trim();
        var rcc = raw[(separatorIndex + 1)..].Trim();
        if (string.IsNullOrWhiteSpace(businessUnit) || string.IsNullOrWhiteSpace(rcc))
        {
            return (null, null);
        }

        return (businessUnit, rcc);
    }

    private static (int Anno, string Aggregazione, string Tipo, string TipoDocumento, decimal PercentualeSuccesso) BuildPivotFunnelKey(
        int anno,
        string? aggregazione,
        string? tipo,
        string? tipoDocumento,
        decimal percentualeSuccesso)
    {
        return (
            anno,
            NormalizePivotFunnelText(aggregazione),
            NormalizePivotFunnelText(tipo),
            NormalizePivotFunnelText(tipoDocumento),
            NormalizePivotFunnelPercent(percentualeSuccesso)
        );
    }

    private static Dictionary<(int Anno, string Aggregazione, string Tipo, string TipoDocumento, decimal PercentualeSuccesso), int> BuildProtocolCountLookup(
        IEnumerable<AnalisiRccFunnelRow> rows,
        Func<AnalisiRccFunnelRow, string> aggregazioneSelector)
    {
        return rows
            .GroupBy(item => BuildPivotFunnelKey(item.Anno, aggregazioneSelector(item), item.Tipo, item.StatoDocumento, item.PercentualeSuccesso))
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

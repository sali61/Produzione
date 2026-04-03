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

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
            var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
            if (!isValid || contextData is null || string.IsNullOrWhiteSpace(profileResult))
            {
                return errorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var commesse = await commesseFilterRepository.SearchCommesseAsync(
                contextData.EffectiveUser,
                profileResult,
                search,
                take,
                cancellationToken);

            var response = new CommesseFilterResponseDto
            {
                Profile = profileResult,
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

            var filters = await commesseFilterRepository.GetSintesiFiltersAsync(
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
            logger.LogError(ex, "Errore SQL durante /api/commesse/sintesi/filters.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/sintesi/filters.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dei filtri sintesi commesse."
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
                aggrega);

            var rows = await commesseFilterRepository.SearchSintesiAsync(
                contextData.EffectiveUser,
                profileResult,
                request,
                cancellationToken);

            var response = new CommesseSintesiResponseDto
            {
                Profile = profileResult,
                Count = rows.Count,
                Items = rows
                    .Select(row => new CommessaSintesiRowDto
                    {
                        Anno = row.Anno,
                        Commessa = row.Commessa,
                        DescrizioneCommessa = row.DescrizioneCommessa,
                        TipologiaCommessa = row.TipologiaCommessa,
                        Stato = row.Stato,
                        MacroTipologia = row.MacroTipologia,
                        Prodotto = row.Prodotto,
                        BusinessUnit = row.BusinessUnit,
                        Rcc = row.Rcc,
                        Pm = row.Pm,
                        OreLavorate = row.OreLavorate,
                        CostoPersonale = row.CostoPersonale,
                        Ricavi = row.Ricavi,
                        Costi = row.Costi,
                        UtileSpecifico = row.UtileSpecifico,
                        RicaviFuturi = row.RicaviFuturi,
                        CostiFuturi = row.CostiFuturi
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/sintesi.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/sintesi.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dati sintesi commesse."
            });
        }
    }

    [HttpGet("dettaglio")]
    [ProducesResponseType(typeof(CommesseDettaglioResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Dettaglio(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(commessa))
            {
                return BadRequest(new { message = "Parametro commessa obbligatorio." });
            }

            var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
            if (!isValid || contextData is null || string.IsNullOrWhiteSpace(profileResult))
            {
                return errorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var normalizedCommessa = commessa.Trim();
            var request = new CommesseSintesiSearchRequest(
                Array.Empty<int>(),
                normalizedCommessa,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                500,
                false);

            var rows = await commesseFilterRepository.SearchSintesiAsync(
                contextData.EffectiveUser,
                profileResult,
                request,
                cancellationToken);

            if (rows.Count == 0)
            {
                var commessaExists = await commesseFilterRepository.CommessaExistsAsync(normalizedCommessa, cancellationToken);
                if (!commessaExists)
                {
                    return NotFound(new
                    {
                        message = $"Commessa '{normalizedCommessa}' non trovata."
                    });
                }

                var hasAccess = await commesseFilterRepository.CanAccessCommessaAsync(
                    contextData.EffectiveUser,
                    profileResult,
                    normalizedCommessa,
                    cancellationToken);
                if (!hasAccess)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = $"Profilo '{profileResult}' non autorizzato alla commessa '{normalizedCommessa}'."
                    });
                }
            }

            var now = DateTime.Now;
            var currentYear = now.Year;
            var currentMonth = now.Month;

            var anagraficaFromRows = rows.Count > 0
                ? rows
                    .OrderByDescending(row => row.Anno ?? int.MinValue)
                    .ThenBy(row => row.BusinessUnit)
                    .First()
                : null;

            var anagraficaFromRepository = await commesseFilterRepository.GetCommessaAnagraficaAsync(
                contextData.EffectiveUser,
                profileResult,
                normalizedCommessa,
                cancellationToken);

            var anniStorici = rows
                .Where(row => row.Anno.HasValue && row.Anno.Value > 0 && row.Anno.Value < currentYear)
                .GroupBy(row => row.Anno!.Value)
                .OrderByDescending(group => group.Key)
                .Select(group => new CommessaDettaglioAnnoRowDto
                {
                    Anno = group.Key,
                    OreLavorate = group.Sum(item => item.OreLavorate),
                    CostoPersonale = group.Sum(item => item.CostoPersonale),
                    Ricavi = group.Sum(item => item.Ricavi),
                    Costi = group.Sum(item => item.Costi),
                    UtileSpecifico = group.Sum(item => item.UtileSpecifico),
                    RicaviFuturi = group.Sum(item => item.RicaviFuturi),
                    CostiFuturi = group.Sum(item => item.CostiFuturi)
                })
                .ToArray();

            var progressivoCorrente = await commesseFilterRepository.GetCommessaProgressivoAnnoCorrenteAsync(
                contextData.EffectiveUser,
                profileResult,
                normalizedCommessa,
                currentYear,
                currentMonth,
                cancellationToken)
                ?? new CommessaDettaglioProgressivoCorrente(
                    currentYear,
                    currentMonth,
                    0m,
                    0m,
                    0m,
                    0m,
                    0m,
                    0m,
                    0m);

            var fatturatoDettaglio = await commesseFilterRepository.GetCommessaFatturatoDettaglioAsync(
                contextData.EffectiveUser,
                normalizedCommessa,
                cancellationToken);

            var response = new CommesseDettaglioResponseDto
            {
                Profile = profileResult,
                Commessa = normalizedCommessa,
                CurrentYear = currentYear,
                CurrentMonth = currentMonth,
                Anagrafica = new CommessaDettaglioAnagraficaDto
                {
                    Commessa = anagraficaFromRows?.Commessa ?? anagraficaFromRepository?.Commessa ?? normalizedCommessa,
                    DescrizioneCommessa = anagraficaFromRows?.DescrizioneCommessa ?? anagraficaFromRepository?.DescrizioneCommessa ?? string.Empty,
                    TipologiaCommessa = anagraficaFromRows?.TipologiaCommessa ?? anagraficaFromRepository?.TipologiaCommessa ?? string.Empty,
                    Stato = anagraficaFromRows?.Stato ?? anagraficaFromRepository?.Stato ?? string.Empty,
                    MacroTipologia = anagraficaFromRows?.MacroTipologia ?? anagraficaFromRepository?.MacroTipologia ?? string.Empty,
                    Prodotto = anagraficaFromRows?.Prodotto ?? anagraficaFromRepository?.Prodotto ?? string.Empty,
                    BusinessUnit = anagraficaFromRows?.BusinessUnit ?? anagraficaFromRepository?.BusinessUnit ?? string.Empty,
                    Rcc = anagraficaFromRows?.Rcc ?? anagraficaFromRepository?.Rcc ?? string.Empty,
                    Pm = anagraficaFromRows?.Pm ?? anagraficaFromRepository?.Pm ?? string.Empty
                },
                AnniStorici = anniStorici,
                AnnoCorrenteProgressivo = new CommessaDettaglioAnnoRowDto
                {
                    Anno = progressivoCorrente.Anno,
                    OreLavorate = progressivoCorrente.OreLavorate,
                    CostoPersonale = progressivoCorrente.CostoPersonale,
                    Ricavi = progressivoCorrente.Ricavi,
                    Costi = progressivoCorrente.Costi,
                    UtileSpecifico = progressivoCorrente.UtileSpecifico,
                    RicaviFuturi = progressivoCorrente.RicaviFuturi,
                    CostiFuturi = progressivoCorrente.CostiFuturi
                },
                Vendite = fatturatoDettaglio.Vendite
                    .Select(item => new CommessaFatturaMovimentoDto
                    {
                        DataMovimento = item.DataMovimento,
                        NumeroDocumento = item.NumeroDocumento,
                        Descrizione = item.Descrizione,
                        Controparte = item.Controparte,
                        Provenienza = item.Provenienza,
                        Importo = item.Importo,
                        IsFuture = item.IsFuture,
                        StatoTemporale = item.StatoTemporale
                    })
                    .ToArray(),
                Acquisti = fatturatoDettaglio.Acquisti
                    .Select(item => new CommessaFatturaMovimentoDto
                    {
                        DataMovimento = item.DataMovimento,
                        NumeroDocumento = item.NumeroDocumento,
                        Descrizione = item.Descrizione,
                        Controparte = item.Controparte,
                        Provenienza = item.Provenienza,
                        Importo = item.Importo,
                        IsFuture = item.IsFuture,
                        StatoTemporale = item.StatoTemporale
                    })
                    .ToArray(),
                FatturatoPivot = fatturatoDettaglio.FatturatoPivot
                    .Select(item => new CommessaFatturatoPivotRowDto
                    {
                        Anno = item.Anno,
                        Rcc = item.Rcc,
                        TotaleFatturato = item.TotaleFatturato,
                        TotaleFatturatoFuturo = item.TotaleFatturatoFuturo,
                        TotaleRicavoIpotetico = item.TotaleRicavoIpotetico,
                        TotaleRicavoIpoteticoPesato = item.TotaleRicavoIpoteticoPesato,
                        TotaleComplessivo = item.TotaleComplessivo,
                        Budget = item.Budget,
                        PercentualeRaggiungimento = item.PercentualeRaggiungimento
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/dettaglio.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/dettaglio.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dettaglio commessa."
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

    private static CommesseSintesiFilterItemDto ToFilterItemDto(CommesseSintesiFilterOption option)
    {
        return new CommesseSintesiFilterItemDto
        {
            Value = option.Value,
            Label = option.Label
        };
    }
}

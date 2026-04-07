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

    private static readonly string[] AllowedProfilesRisorse =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileCommercialeCommessa,
        ProfileCatalog.GeneralProjectManager,
        ProfileCatalog.ResponsabileOu,
        ProfileCatalog.RisorseUmane
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

    [HttpGet("andamento-mensile")]
    [ProducesResponseType(typeof(CommesseAndamentoMensileResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> AndamentoMensile(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] int? mese = null,
        [FromQuery] string? commessa = null,
        [FromQuery] string? tipologiaCommessa = null,
        [FromQuery] string? stato = null,
        [FromQuery] string? macroTipologia = null,
        [FromQuery] string? prodotto = null,
        [FromQuery] string? businessUnit = null,
        [FromQuery] string? rcc = null,
        [FromQuery] string? pm = null,
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
                Mese: mese);

            var rows = await commesseFilterRepository.SearchAndamentoMensileAsync(
                contextData.EffectiveUser,
                profileResult,
                request,
                cancellationToken);

            var response = new CommesseAndamentoMensileResponseDto
            {
                Profile = profileResult,
                Count = rows.Count,
                Items = rows
                    .Select(row => new CommessaAndamentoMensileRowDto
                    {
                        AnnoCompetenza = row.AnnoCompetenza,
                        MeseCompetenza = row.MeseCompetenza,
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
                        Produzione = row.Produzione,
                        OreLavorate = row.OreLavorate,
                        CostoPersonale = row.CostoPersonale,
                        Ricavi = row.Ricavi,
                        Costi = row.Costi,
                        RicaviMaturati = row.RicaviMaturati,
                        OreFuture = row.OreFuture,
                        CostoPersonaleFuturo = row.CostoPersonaleFuturo,
                        CostoGeneraleRibaltato = row.CostoGeneraleRibaltato,
                        UtileSpecifico = row.UtileSpecifico
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/andamento-mensile.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/andamento-mensile.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dell'andamento mensile commesse."
            });
        }
    }

    [HttpGet("risorse/filters")]
    [ProducesResponseType(typeof(CommesseRisorseFiltersResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RisorseFilters(
        [FromQuery] string profile,
        [FromQuery] bool mensile = false,
        [FromQuery] bool analisiOu = false,
        [FromQuery] bool analisiOuPivot = false,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(
                profile,
                actAsUsername,
                AllowedProfilesRisorse,
                cancellationToken);
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

            if (mensile && selectedAnni.Length == 0)
            {
                var currentYear = DateTime.Now.Year;
                selectedAnni = [currentYear - 1, currentYear];
            }

            var filters = await commesseFilterRepository.GetRisorseValutazioneFiltersAsync(
                contextData.EffectiveUser,
                profileResult,
                mensile,
                selectedAnni,
                analisiOu,
                analisiOuPivot,
                cancellationToken);

            var response = new CommesseRisorseFiltersResponseDto
            {
                Profile = profileResult,
                Mensile = mensile,
                Anni = filters.Anni.Select(ToFilterItemDto).ToArray(),
                Mesi = filters.Mesi.Select(ToFilterItemDto).ToArray(),
                Commesse = filters.Commesse.Select(ToFilterItemDto).ToArray(),
                TipologieCommessa = filters.TipologieCommessa.Select(ToFilterItemDto).ToArray(),
                Stati = filters.Stati.Select(ToFilterItemDto).ToArray(),
                MacroTipologie = filters.MacroTipologie.Select(ToFilterItemDto).ToArray(),
                Controparti = filters.Controparti.Select(ToFilterItemDto).ToArray(),
                BusinessUnits = filters.BusinessUnits.Select(ToFilterItemDto).ToArray(),
                Ous = filters.Ous.Select(ToFilterItemDto).ToArray(),
                Rcc = filters.Rcc.Select(ToFilterItemDto).ToArray(),
                Pm = filters.Pm.Select(ToFilterItemDto).ToArray(),
                Risorse = filters.Risorse
                    .Select(item =>
                    {
                        var safeName = item.NomeRisorsa?.Trim() ?? string.Empty;
                        var label = item.InForza ? safeName : $"^ {safeName}";
                        return new CommesseRisorseFilterItemDto
                        {
                            IdRisorsa = item.IdRisorsa,
                            Value = item.IdRisorsa.ToString(),
                            Label = label,
                            InForza = item.InForza
                        };
                    })
                    .OrderBy(item => item.Label, StringComparer.CurrentCultureIgnoreCase)
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/risorse/filters.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/risorse/filters.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero filtri risultati risorse."
            });
        }
    }

    [HttpGet("risorse/valutazione")]
    [ProducesResponseType(typeof(CommesseRisorseValutazioneResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RisorseValutazione(
        [FromQuery] string profile,
        [FromQuery] bool mensile = false,
        [FromQuery] bool analisiOu = false,
        [FromQuery] bool analisiOuPivot = false,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery(Name = "mesi")] int[]? mesi = null,
        [FromQuery] string? commessa = null,
        [FromQuery] string? tipologiaCommessa = null,
        [FromQuery] string? stato = null,
        [FromQuery] string? macroTipologia = null,
        [FromQuery] string? controparte = null,
        [FromQuery] string? businessUnit = null,
        [FromQuery] string? ou = null,
        [FromQuery] string? rcc = null,
        [FromQuery] string? pm = null,
        [FromQuery] int? idRisorsa = null,
        [FromQuery] int take = 10000,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(
                profile,
                actAsUsername,
                AllowedProfilesRisorse,
                cancellationToken);
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

            if (mensile && selectedAnni.Length == 0)
            {
                var currentYear = DateTime.Now.Year;
                selectedAnni = [currentYear - 1, currentYear];
            }

            var selectedMesi = (mesi ?? Array.Empty<int>())
                .Where(value => value is >= 1 and <= 12)
                .Distinct()
                .OrderBy(value => value)
                .ToArray();

            var request = new CommesseRisorseSearchRequest(
                mensile,
                selectedAnni,
                selectedMesi,
                commessa,
                tipologiaCommessa,
                stato,
                macroTipologia,
                controparte,
                businessUnit,
                ou,
                rcc,
                pm,
                idRisorsa is > 0 ? idRisorsa : null,
                Math.Clamp(take, 1, 100000),
                analisiOu,
                analisiOuPivot);

            var rows = await commesseFilterRepository.SearchRisorseValutazioneAsync(
                contextData.EffectiveUser,
                profileResult,
                request,
                cancellationToken);

            var response = new CommesseRisorseValutazioneResponseDto
            {
                Profile = profileResult,
                Mensile = mensile,
                Count = rows.Count,
                Anni = selectedAnni,
                Items = rows
                    .Select(row => new CommessaRisorseValutazioneRowDto
                    {
                        AnnoCompetenza = row.AnnoCompetenza,
                        MeseCompetenza = row.MeseCompetenza,
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
                        IdRisorsa = row.IdRisorsa,
                        NomeRisorsa = row.NomeRisorsa,
                        RisorsaInForza = row.RisorsaInForza,
                        OreTotali = row.OreTotali,
                        FatturatoInBaseAdOre = row.FatturatoInBaseAdOre,
                        FatturatoInBaseACosto = row.FatturatoInBaseACosto,
                        UtileInBaseAdOre = row.UtileInBaseAdOre,
                        UtileInBaseACosto = row.UtileInBaseACosto,
                        CostoSpecificoRisorsa = row.CostoSpecificoRisorsa,
                        IdOu = row.IdOu,
                        NomeRuolo = row.NomeRuolo,
                        PercentualeUtilizzo = row.PercentualeUtilizzo,
                        Area = row.Area,
                        OuProduzione = row.OuProduzione,
                        CodiceSocieta = row.CodiceSocieta
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/risorse/valutazione.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/risorse/valutazione.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero risultati risorse."
            });
        }
    }

    [HttpGet("dati-annuali-aggregati")]
    [ProducesResponseType(typeof(CommesseDatiAnnualiAggregatiResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DatiAnnualiAggregati(
        [FromQuery] string profile,
        [FromQuery] int? anno = null,
        [FromQuery(Name = "anni")] int[]? anni = null,
        [FromQuery] string aggregazione = "cliente",
        [FromQuery] string? commessa = null,
        [FromQuery] string? tipologiaCommessa = null,
        [FromQuery] string? stato = null,
        [FromQuery] string? macroTipologia = null,
        [FromQuery] string? prodotto = null,
        [FromQuery] string? businessUnit = null,
        [FromQuery] string? rcc = null,
        [FromQuery] string? pm = null,
        [FromQuery] int take = 25000,
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

            var aggregazioneSelezionata = NormalizeDatiAnnualiAggregazione(aggregazione);
            if (aggregazioneSelezionata is null)
            {
                return BadRequest(new
                {
                    message = "Valore 'aggregazione' non valido. Usa: cliente, tipologia-commessa, rcc."
                });
            }

            var safeTake = Math.Clamp(take, 100, 100000);
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
                safeTake,
                false);

            var rows = await commesseFilterRepository.SearchSintesiAsync(
                contextData.EffectiveUser,
                profileResult,
                request,
                cancellationToken);

            Func<CommessaSintesiRow, string?> keySelector = aggregazioneSelezionata switch
            {
                "cliente" => row => row.Controparte,
                "tipologia-commessa" => row => row.TipologiaCommessa,
                _ => row => row.Rcc
            };

            var groupedRows = rows
                .Where(row => row.Anno.HasValue && row.Anno.Value > 0)
                .GroupBy(row => new
                {
                    Anno = row.Anno!.Value,
                    Aggregazione = NormalizeDatiAnnualiValue(keySelector(row))
                })
                .Select(group => new CommesseDatiAnnualiAggregatiRowDto
                {
                    Anno = group.Key.Anno,
                    Aggregazione = group.Key.Aggregazione,
                    NumeroCommesse = group
                        .Select(item => (item.Commessa ?? string.Empty).Trim())
                        .Where(value => !string.IsNullOrWhiteSpace(value))
                        .Distinct(StringComparer.OrdinalIgnoreCase)
                        .Count(),
                    OreLavorate = group.Sum(item => item.OreLavorate),
                    CostoPersonale = group.Sum(item => item.CostoPersonale),
                    Ricavi = group.Sum(item => item.Ricavi),
                    Costi = group.Sum(item => item.Costi),
                    UtileSpecifico = group.Sum(item => item.UtileSpecifico),
                    RicaviFuturi = group.Sum(item => item.RicaviFuturi),
                    CostiFuturi = group.Sum(item => item.CostiFuturi)
                })
                .OrderByDescending(item => item.Anno)
                .ThenBy(item => item.Aggregazione, StringComparer.CurrentCultureIgnoreCase)
                .ToArray();

            var totaliPerAnno = groupedRows
                .GroupBy(item => item.Anno)
                .Select(group => new CommesseDatiAnnualiAggregatiTotaleAnnoDto
                {
                    Anno = group.Key,
                    NumeroCommesse = group.Sum(item => item.NumeroCommesse),
                    OreLavorate = group.Sum(item => item.OreLavorate),
                    CostoPersonale = group.Sum(item => item.CostoPersonale),
                    Ricavi = group.Sum(item => item.Ricavi),
                    Costi = group.Sum(item => item.Costi),
                    UtileSpecifico = group.Sum(item => item.UtileSpecifico),
                    RicaviFuturi = group.Sum(item => item.RicaviFuturi),
                    CostiFuturi = group.Sum(item => item.CostiFuturi)
                })
                .OrderByDescending(item => item.Anno)
                .ToArray();

            var response = new CommesseDatiAnnualiAggregatiResponseDto
            {
                Profile = profileResult,
                AggregazioneSelezionata = aggregazioneSelezionata,
                Anni = selectedAnni,
                Items = groupedRows,
                TotaliPerAnno = totaliPerAnno
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/dati-annuali-aggregati.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/dati-annuali-aggregati.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dei dati annuali aggregati."
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
            var dataFineConsuntivoAttivita = new DateTime(currentYear, currentMonth, 1).AddDays(-1);

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

            var aggregatoAnnoCorrente = rows
                .Where(row => row.Anno.HasValue && row.Anno.Value == currentYear)
                .GroupBy(_ => currentYear)
                .Select(group => new CommessaDettaglioAnnoRowDto
                {
                    Anno = currentYear,
                    OreLavorate = group.Sum(item => item.OreLavorate),
                    CostoPersonale = group.Sum(item => item.CostoPersonale),
                    Ricavi = group.Sum(item => item.Ricavi),
                    Costi = group.Sum(item => item.Costi),
                    UtileSpecifico = group.Sum(item => item.UtileSpecifico),
                    RicaviFuturi = group.Sum(item => item.RicaviFuturi),
                    CostiFuturi = group.Sum(item => item.CostiFuturi)
                })
                .FirstOrDefault();
            var ricaviAnniSuccessivi = rows
                .Where(row => row.Anno.HasValue && row.Anno.Value > currentYear)
                .Sum(item => item.RicaviFuturi);

            var mesiAnnoCorrente = await commesseFilterRepository.GetCommessaMesiAnnoCorrenteAsync(
                contextData.EffectiveUser,
                profileResult,
                normalizedCommessa,
                currentYear,
                cancellationToken);

            var fatturatoDettaglio = await commesseFilterRepository.GetCommessaFatturatoDettaglioAsync(
                contextData.EffectiveUser,
                normalizedCommessa,
                cancellationToken);
            var ordiniOfferteDettaglio = await commesseFilterRepository.GetCommessaOrdiniOfferteDettaglioAsync(
                normalizedCommessa,
                cancellationToken);
            var avanzamentoStorico = await commesseFilterRepository.GetCommessaAvanzamentoStoricoAsync(
                normalizedCommessa,
                cancellationToken);
            var avanzamentoSalvato = avanzamentoStorico
                .Where(item => item.DataRiferimento.Date == dataFineConsuntivoAttivita.Date)
                .OrderByDescending(item => item.DataSalvataggio)
                .ThenByDescending(item => item.Id)
                .FirstOrDefault();
            var requisitiOreDettaglio = await commesseFilterRepository.GetCommessaRequisitiOreDettaglioAsync(
                normalizedCommessa,
                dataFineConsuntivoAttivita,
                cancellationToken);

            var orePrevisteTotali = requisitiOreDettaglio.Requisiti.Sum(item => item.OrePreviste);
            var oreSpeseTotali = requisitiOreDettaglio.Requisiti.Sum(item => item.OreSpese);
            var percentualeRaggiuntoProposta = orePrevisteTotali <= 0
                ? 0m
                : Math.Clamp(oreSpeseTotali / orePrevisteTotali, 0m, 1m);

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
                    Prodotto = anagraficaFromRepository?.Prodotto ?? anagraficaFromRows?.Prodotto ?? string.Empty,
                    Controparte = anagraficaFromRepository?.Controparte ?? anagraficaFromRows?.Controparte ?? string.Empty,
                    BusinessUnit = anagraficaFromRows?.BusinessUnit ?? anagraficaFromRepository?.BusinessUnit ?? string.Empty,
                    Rcc = anagraficaFromRows?.Rcc ?? anagraficaFromRepository?.Rcc ?? string.Empty,
                    Pm = anagraficaFromRows?.Pm ?? anagraficaFromRepository?.Pm ?? string.Empty
                },
                AnniStorici = anniStorici,
                AnnoCorrenteProgressivo = aggregatoAnnoCorrente,
                MesiAnnoCorrente = mesiAnnoCorrente
                    .Select(item => new CommessaDettaglioMeseRowDto
                    {
                        Anno = item.Anno,
                        Mese = item.Mese,
                        OreLavorate = item.OreLavorate,
                        CostoPersonale = item.CostoPersonale,
                        Ricavi = item.Ricavi,
                        Costi = item.Costi,
                        UtileSpecifico = item.UtileSpecifico,
                        RicaviFuturi = item.RicaviFuturi,
                        CostiFuturi = item.CostiFuturi
                    })
                    .ToArray(),
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
                    .ToArray(),
                Ordini = ordiniOfferteDettaglio.Ordini
                    .Select(item => new CommessaOrdineDto
                    {
                        Protocollo = item.Protocollo,
                        DocumentoStato = item.DocumentoStato,
                        Posizione = item.Posizione,
                        IdDettaglioOrdine = item.IdDettaglioOrdine,
                        Descrizione = item.Descrizione,
                        Quantita = item.Quantita,
                        PrezzoUnitario = item.PrezzoUnitario,
                        ImportoOrdine = item.ImportoOrdine,
                        QuantitaOriginaleOrdinata = item.QuantitaOriginaleOrdinata,
                        QuantitaFatture = item.QuantitaFatture
                    })
                    .ToArray(),
                Offerte = ordiniOfferteDettaglio.Offerte
                    .Select(item => new CommessaOffertaDto
                    {
                        Protocollo = item.Protocollo,
                        Anno = item.Anno,
                        Data = item.Data,
                        Oggetto = item.Oggetto,
                        DocumentoStato = item.DocumentoStato,
                        RicavoPrevisto = item.RicavoPrevisto,
                        CostoPrevisto = item.CostoPrevisto,
                        CostoPrevistoPersonale = item.CostoPrevistoPersonale,
                        OrePrevisteOfferta = item.OrePrevisteOfferta,
                        PercentualeSuccesso = item.PercentualeSuccesso,
                        OrdiniCollegati = item.OrdiniCollegati
                    })
                    .ToArray(),
                RicaviAnniSuccessivi = ricaviAnniSuccessivi,
                AvanzamentoSalvato = avanzamentoSalvato is null
                    ? null
                    : new CommessaAvanzamentoDto
                    {
                        Id = avanzamentoSalvato.Id,
                        IdCommessa = avanzamentoSalvato.IdCommessa,
                        PercentualeRaggiunto = avanzamentoSalvato.PercentualeRaggiunto,
                        ImportoRiferimento = avanzamentoSalvato.ImportoRiferimento,
                        OreFuture = avanzamentoSalvato.OreFuture,
                        OreRestanti = avanzamentoSalvato.OreRestanti,
                        CostoPersonaleFuturo = avanzamentoSalvato.CostoPersonaleFuturo,
                        DataRiferimento = avanzamentoSalvato.DataRiferimento,
                        DataSalvataggio = avanzamentoSalvato.DataSalvataggio,
                        IdAutore = avanzamentoSalvato.IdAutore
                    },
                AvanzamentoStorico = avanzamentoStorico
                    .OrderBy(item => item.DataRiferimento)
                    .ThenBy(item => item.Id)
                    .Select(item => new CommessaAvanzamentoDto
                    {
                        Id = item.Id,
                        IdCommessa = item.IdCommessa,
                        PercentualeRaggiunto = item.PercentualeRaggiunto,
                        ImportoRiferimento = item.ImportoRiferimento,
                        OreFuture = item.OreFuture,
                        OreRestanti = item.OreRestanti,
                        CostoPersonaleFuturo = item.CostoPersonaleFuturo,
                        DataRiferimento = item.DataRiferimento,
                        DataSalvataggio = item.DataSalvataggio,
                        IdAutore = item.IdAutore
                    })
                    .ToArray(),
                DataConsuntivoAttivita = dataFineConsuntivoAttivita,
                PercentualeRaggiuntoProposta = percentualeRaggiuntoProposta,
                RequisitiOre = requisitiOreDettaglio.Requisiti
                    .Select(item => new CommessaRequisitoOreSummaryDto
                    {
                        IdRequisito = item.IdRequisito,
                        Requisito = item.Requisito,
                        OrePreviste = item.OrePreviste,
                        OreSpese = item.OreSpese,
                        OreRestanti = item.OreRestanti,
                        PercentualeAvanzamento = item.PercentualeAvanzamento
                    })
                    .ToArray(),
                RequisitiOreRisorse = requisitiOreDettaglio.Risorse
                    .Select(item => new CommessaRequisitoOreRisorsaDto
                    {
                        IdRequisito = item.IdRequisito,
                        Requisito = item.Requisito,
                        IdRisorsa = item.IdRisorsa,
                        NomeRisorsa = item.NomeRisorsa,
                        OrePreviste = item.OrePreviste,
                        OreSpese = item.OreSpese,
                        OreRestanti = item.OreRestanti,
                        PercentualeAvanzamento = item.PercentualeAvanzamento
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

    [HttpPost("dettaglio/avanzamento")]
    [ProducesResponseType(typeof(CommessaAvanzamentoDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> SalvaAvanzamento(
        [FromQuery] string profile,
        [FromBody] CommessaAvanzamentoSaveRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Commessa))
            {
                return BadRequest(new { message = "Commessa obbligatoria." });
            }

            var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
            if (!isValid || contextData is null || string.IsNullOrWhiteSpace(profileResult))
            {
                return errorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var normalizedCommessa = request.Commessa.Trim();
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

            var dataRiferimento = request.DataRiferimento.Date;
            if (dataRiferimento == DateTime.MinValue.Date)
            {
                var now = DateTime.Now;
                dataRiferimento = new DateTime(now.Year, now.Month, 1).AddDays(-1).Date;
            }

            var percentuale = Math.Clamp(request.PercentualeRaggiunto, 0m, 100m);
            var oreFuture = request.OreFuture;
            if (oreFuture == 0m && request.OreRestanti != 0m)
            {
                oreFuture = request.OreRestanti;
            }

            var saved = await commesseFilterRepository.SaveCommessaAvanzamentoAsync(
                contextData.EffectiveUser,
                normalizedCommessa,
                percentuale,
                request.ImportoRiferimento,
                oreFuture,
                request.OreRestanti,
                request.CostoPersonaleFuturo,
                dataRiferimento,
                cancellationToken);

            if (saved is null)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Salvataggio avanzamento non riuscito."
                });
            }

            return Ok(new CommessaAvanzamentoDto
            {
                Id = saved.Id,
                IdCommessa = saved.IdCommessa,
                PercentualeRaggiunto = saved.PercentualeRaggiunto,
                ImportoRiferimento = saved.ImportoRiferimento,
                OreFuture = saved.OreFuture,
                OreRestanti = saved.OreRestanti,
                CostoPersonaleFuturo = saved.CostoPersonaleFuturo,
                DataRiferimento = saved.DataRiferimento,
                DataSalvataggio = saved.DataSalvataggio,
                IdAutore = saved.IdAutore
            });
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/dettaglio/avanzamento.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/dettaglio/avanzamento.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il salvataggio avanzamento."
            });
        }
    }

    private Task<(bool IsValid, UserExecutionContextData? Context, IActionResult? ErrorResponse, string? Profile)> ResolveContextAndProfileAsync(
        string profile,
        string? actAsUsername,
        CancellationToken cancellationToken)
    {
        return ResolveContextAndProfileAsync(profile, actAsUsername, AllowedProfiles, cancellationToken);
    }

    private async Task<(bool IsValid, UserExecutionContextData? Context, IActionResult? ErrorResponse, string? Profile)> ResolveContextAndProfileAsync(
        string profile,
        string? actAsUsername,
        IReadOnlyCollection<string> allowedProfiles,
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

        if (!allowedProfiles.Contains(normalizedProfile, StringComparer.OrdinalIgnoreCase))
        {
            return (false, null, StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = $"Profilo '{normalizedProfile}' non autorizzato alla consultazione in Commesse."
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

    private static CommesseSintesiFilterItemDto ToFilterItemDto(CommesseSintesiFilterOption option)
    {
        return new CommesseSintesiFilterItemDto
        {
            Value = option.Value,
            Label = option.Label
        };
    }

    private static string? NormalizeDatiAnnualiAggregazione(string? aggregazione)
    {
        var normalized = (aggregazione ?? "cliente").Trim().ToLowerInvariant();
        return normalized switch
        {
            "" => "cliente",
            "cliente" => "cliente",
            "controparte" => "cliente",
            "tipologia-commessa" => "tipologia-commessa",
            "tipologiacommessa" => "tipologia-commessa",
            "tipologia_commessa" => "tipologia-commessa",
            "tipologia" => "tipologia-commessa",
            "rcc" => "rcc",
            _ => null
        };
    }

    private static string NormalizeDatiAnnualiValue(string? value)
    {
        var normalized = (value ?? string.Empty).Trim();
        return string.IsNullOrWhiteSpace(normalized) ? "(vuoto)" : normalized;
    }
}

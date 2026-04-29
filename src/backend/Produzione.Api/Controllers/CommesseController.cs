using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Produzione.Api.Reports;
using Produzione.Api.Security;
using Produzione.Api.Services;
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
    ICommessaSintesiMailService commessaSintesiMailService,
    ILogger<CommesseController> logger) : ControllerBase
{
    private static readonly string[] SegnalazioniDestinatariRoleOrder =
    [
        "RCC",
        "RP",
        "PM",
        "ROU",
        "RC",
        "CDG"
    ];

    private static readonly IReadOnlyDictionary<string, string> SegnalazioniDestinatariRoleLabels =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["RCC"] = "Responsabile Commerciale Commessa (RCC)",
            ["RP"] = "Responsabile Produzione (RP)",
            ["PM"] = "Project Manager (PM)",
            ["ROU"] = "Responsabile OU (ROU)",
            ["RC"] = "Responsabile Commerciale (RC)",
            ["CDG"] = "Controllo di Gestione (CDG)"
        };

    private static readonly string[] AllowedProfiles =
    [
        ProfileCatalog.Supervisore,
        ProfileCatalog.ResponsabileProduzione,
        ProfileCatalog.ResponsabileCommerciale,
        ProfileCatalog.ResponsabileQualita,
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
        [FromQuery] bool aggrega = false,
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
                aggrega,
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

    [HttpGet("anomale")]
    [ProducesResponseType(typeof(CommesseAnomaleResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Anomale(
        [FromQuery] string profile,
        [FromQuery] int take = 5000,
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

            var rows = await commesseFilterRepository.SearchCommesseAnomaleAsync(
                contextData.EffectiveUser,
                profileResult,
                Math.Clamp(take, 1, 100000),
                cancellationToken);

            var response = new CommesseAnomaleResponseDto
            {
                Profile = profileResult,
                Count = rows.Count,
                Items = rows
                    .Select(row => new CommessaAnomalaRowDto
                    {
                        TipoAnomalia = row.TipoAnomalia,
                        DettaglioAnomalia = row.DettaglioAnomalia,
                        IdCommessa = row.IdCommessa,
                        Commessa = row.Commessa,
                        DescrizioneCommessa = row.DescrizioneCommessa,
                        TipologiaCommessa = row.TipologiaCommessa,
                        Stato = row.Stato,
                        MacroTipologia = row.MacroTipologia,
                        Controparte = row.Controparte,
                        BusinessUnit = row.BusinessUnit,
                        Rcc = row.Rcc,
                        Pm = row.Pm,
                        OreLavorate = row.OreLavorate,
                        CostoPersonale = row.CostoPersonale,
                        Ricavi = row.Ricavi,
                        Costi = row.Costi,
                        RicaviFuturi = row.RicaviFuturi,
                        CostiFuturi = row.CostiFuturi
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/anomale.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/anomale.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero delle commesse anomale."
            });
        }
    }

    [HttpGet("segnalazioni")]
    [ProducesResponseType(typeof(CommesseSegnalazioniResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Segnalazioni(
        [FromQuery] string profile,
        [FromQuery] int? stato = null,
        [FromQuery] int? idRisorsaDestinataria = null,
        [FromQuery] int take = 5000,
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

            var rows = await commesseFilterRepository.SearchSegnalazioniCommesseAsync(
                contextData.EffectiveUser,
                profileResult,
                stato,
                idRisorsaDestinataria,
                Math.Clamp(take, 1, 100000),
                cancellationToken);

            var response = new CommesseSegnalazioniResponseDto
            {
                Profile = profileResult,
                Count = rows.Count,
                Segnalazioni = rows
                    .Select(row => new CommessaSegnalazioneAnalisiRowDto
                    {
                        Id = row.Id,
                        IdCommessa = row.IdCommessa,
                        Commessa = row.Commessa,
                        IdTipoSegnalazione = row.IdTipoSegnalazione,
                        TipoCodice = row.TipoCodice,
                        TipoDescrizione = row.TipoDescrizione,
                        Titolo = row.Titolo,
                        Testo = row.Testo,
                        Priorita = row.Priorita,
                        Stato = row.Stato,
                        ImpattaCliente = row.ImpattaCliente,
                        DataEvento = row.DataEvento,
                        DataInserimento = row.DataInserimento,
                        IdRisorsaInserimento = row.IdRisorsaInserimento,
                        NomeRisorsaInserimento = row.NomeRisorsaInserimento,
                        DataUltimaModifica = row.DataUltimaModifica,
                        IdRisorsaUltimaModifica = row.IdRisorsaUltimaModifica,
                        NomeRisorsaUltimaModifica = row.NomeRisorsaUltimaModifica,
                        DataChiusura = row.DataChiusura,
                        IdRisorsaDestinataria = row.IdRisorsaDestinataria,
                        NomeRisorsaDestinataria = row.NomeRisorsaDestinataria
                    })
                    .ToArray()
            };

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/segnalazioni.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/segnalazioni.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero delle segnalazioni commesse."
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
        var buildResult = await BuildDettaglioResponseAsync(profile, commessa, actAsUsername, cancellationToken);
        if (buildResult.ErrorResponse is not null)
        {
            return buildResult.ErrorResponse;
        }

        return Ok(buildResult.Response);
    }

    [HttpGet("dettaglio/pdf")]
    [Produces("application/pdf")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DettaglioPdf(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        var buildResult = await BuildDettaglioResponseAsync(profile, commessa, actAsUsername, cancellationToken);
        if (buildResult.ErrorResponse is not null)
        {
            return buildResult.ErrorResponse;
        }

        if (buildResult.Response is null)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante la generazione report PDF."
            });
        }

        try
        {
            var bytes = CommesseDettaglioPdfReportGenerator.Generate(buildResult.Response);
            var safeCommessa = SanitizeFileName(buildResult.Response.Commessa);
            var fileName = $"Produzione_Dettaglio_{safeCommessa}_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";

            return File(bytes, "application/pdf", fileName);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/dettaglio/pdf.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante la generazione del PDF."
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

            var readOnlyResponse = await EnsureCommessaEditableAsync(
                contextData.EffectiveUser,
                profileResult,
                normalizedCommessa,
                "salvataggio avanzamento",
                cancellationToken);
            if (readOnlyResponse is not null)
            {
                return readOnlyResponse;
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

    [HttpGet("dettaglio/sintesi-mail/preview")]
    [ProducesResponseType(typeof(CommesseDettaglioSintesiMailPreviewResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DettaglioSintesiMailPreview(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
            if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
            {
                return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var preview = await commessaSintesiMailService.BuildPreviewAsync(
                validation.Profile,
                validation.Commessa,
                cancellationToken);

            return Ok(preview);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/dettaglio/sintesi-mail/preview.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/dettaglio/sintesi-mail/preview.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il caricamento destinatari sintesi commessa."
            });
        }
    }

    [HttpPost("dettaglio/sintesi-mail/send")]
    [ProducesResponseType(typeof(CommessaSintesiMailSendResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DettaglioSintesiMailSend(
        [FromQuery] string profile,
        [FromBody] CommessaSintesiMailSendRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Commessa))
            {
                return BadRequest(new { message = "Commessa obbligatoria." });
            }

            var selectedRoles = (request.Ruoli ?? Array.Empty<string>())
                .Select(role => role?.Trim() ?? string.Empty)
                .Where(role => !string.IsNullOrWhiteSpace(role))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();

            if (selectedRoles.Length == 0 && !request.IncludeAssociatiCommessa)
            {
                return BadRequest(new
                {
                    message = "Selezionare almeno un ruolo o l'opzione utenti associati alla commessa."
                });
            }

            var validation = await ValidateCommessaAccessAsync(profile, request.Commessa, actAsUsername, cancellationToken);
            if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
            {
                return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "invio sintesi mail");
            if (writePermissionError is not null)
            {
                return writePermissionError;
            }

            request.Commessa = validation.Commessa;
            var commessaDetailUrl = BuildCommessaDetailLink(
                Request,
                validation.Commessa);

            byte[]? dettaglioPdfBytes = null;
            string? dettaglioPdfFileName = null;
            try
            {
                var dettaglioResult = await BuildDettaglioResponseAsync(
                    validation.Profile,
                    validation.Commessa,
                    actAsUsername,
                    cancellationToken);

                if (dettaglioResult.Response is not null)
                {
                    dettaglioPdfBytes = CommesseDettaglioPdfReportGenerator.Generate(dettaglioResult.Response);
                    var safeCommessa = SanitizeFileName(dettaglioResult.Response.Commessa);
                    dettaglioPdfFileName = $"Produzione_Dettaglio_{safeCommessa}_{DateTime.Now:yyyyMMdd_HHmmss}.pdf";
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "Impossibile generare allegato PDF per invio sintesi commessa {Commessa}. L'invio proseguira' senza allegato.",
                    validation.Commessa);
            }

            var sendOptions = new CommessaSintesiMailSendOptions(
                CommessaDetailUrl: commessaDetailUrl,
                PdfAttachment: dettaglioPdfBytes,
                PdfAttachmentFileName: dettaglioPdfFileName);

            var sendResult = await commessaSintesiMailService.SendAsync(
                validation.Profile,
                request,
                sendOptions,
                cancellationToken);
            if (!sendResult.Success)
            {
                return BadRequest(new
                {
                    message = sendResult.Message,
                    payload = sendResult
                });
            }

            return Ok(sendResult);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/dettaglio/sintesi-mail/send.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/dettaglio/sintesi-mail/send.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante l'invio della sintesi commessa."
            });
        }
    }

    [HttpGet("dettaglio/configura")]
    [ProducesResponseType(typeof(CommesseDettaglioConfiguraResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DettaglioConfigura(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
            if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
            {
                return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var configData = await commesseFilterRepository.GetCommessaConfigAsync(validation.Commessa, cancellationToken);
            if (configData is null)
            {
                return NotFound(new { message = $"Configurazione commessa '{validation.Commessa}' non trovata." });
            }

            var tipiTask = commesseFilterRepository.GetTipiCommessaAttiviAsync(cancellationToken);
            var prodottiTask = commesseFilterRepository.GetProdottiAttiviAsync(cancellationToken);
            await Task.WhenAll(tipiTask, prodottiTask);
            var permissions = GetCommessaConfigPermissions(validation.Profile);

            return Ok(new CommesseDettaglioConfiguraResponseDto
            {
                Profile = validation.Profile,
                Commessa = validation.Commessa,
                CanEdit = permissions.CanEditAny,
                CanEditTipologiaCommessa = permissions.CanEditTipologiaCommessa,
                CanEditProdotto = permissions.CanEditProdotto,
                CanEditBudgetImportoInvestimento = permissions.CanEditBudgetImportoInvestimento,
                CanEditBudgetOreInvestimento = permissions.CanEditBudgetOreInvestimento,
                CanEditPrezzoVenditaInizialeRcc = permissions.CanEditPrezzoVenditaInizialeRcc,
                CanEditPrezzoVenditaFinaleRcc = permissions.CanEditPrezzoVenditaFinaleRcc,
                CanEditStimaInizialeOrePm = permissions.CanEditStimaInizialeOrePm,
                IdTipoCommessa = configData.IdTipoCommessa,
                TipologiaCommessa = configData.TipologiaCommessa,
                IdProdotto = configData.IdProdotto,
                Prodotto = configData.Prodotto,
                BudgetImportoInvestimento = configData.BudgetImportoInvestimento,
                BudgetOreInvestimento = configData.BudgetOreInvestimento,
                PrezzoVenditaInizialeRcc = configData.PrezzoVenditaInizialeRcc,
                PrezzoVenditaFinaleRcc = configData.PrezzoVenditaFinaleRcc,
                StimaInizialeOrePm = configData.StimaInizialeOrePm,
                TipiCommessa = tipiTask.Result
                    .Select(item => new CommessaConfigOptionDto { Id = item.Id, Label = item.Label })
                    .ToArray(),
                Prodotti = prodottiTask.Result
                    .Select(item => new CommessaConfigOptionDto { Id = item.Id, Label = item.Label })
                    .ToArray()
            });
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/dettaglio/configura.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/dettaglio/configura.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il caricamento configurazione commessa."
            });
        }
    }

    [HttpPost("dettaglio/configura")]
    [ProducesResponseType(typeof(CommesseDettaglioConfiguraResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DettaglioConfiguraSalva(
        [FromQuery] string profile,
        [FromBody] CommessaDettaglioConfiguraSaveRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Commessa))
            {
                return BadRequest(new { message = "Commessa obbligatoria." });
            }

            var validation = await ValidateCommessaAccessAsync(profile, request.Commessa, actAsUsername, cancellationToken);
            if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
            {
                return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "salvataggio configurazione commessa");
            if (writePermissionError is not null)
            {
                return writePermissionError;
            }

            var permissions = GetCommessaConfigPermissions(validation.Profile);
            if (!permissions.CanEditAny)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new
                {
                    message = $"Profilo '{validation.Profile}' non autorizzato alla modifica della configurazione commessa."
                });
            }

            var currentConfig = await commesseFilterRepository.GetCommessaConfigAsync(validation.Commessa, cancellationToken);
            if (currentConfig is null)
            {
                return NotFound(new { message = $"Configurazione commessa '{validation.Commessa}' non trovata." });
            }

            var idTipoCommessa = request.IdTipoCommessa.HasValue && request.IdTipoCommessa.Value > 0
                ? request.IdTipoCommessa.Value
                : (int?)null;
            var idProdotto = request.IdProdotto.HasValue && request.IdProdotto.Value > 0
                ? request.IdProdotto.Value
                : (int?)null;

            var tipiTask = commesseFilterRepository.GetTipiCommessaAttiviAsync(cancellationToken);
            var prodottiTask = commesseFilterRepository.GetProdottiAttiviAsync(cancellationToken);
            await Task.WhenAll(tipiTask, prodottiTask);

            var tipiAttivi = tipiTask.Result;
            var prodottiAttivi = prodottiTask.Result;

            if (permissions.CanEditTipologiaCommessa
                && idTipoCommessa.HasValue
                && !tipiAttivi.Any(item => item.Id == idTipoCommessa.Value))
            {
                return BadRequest(new
                {
                    message = "Tipologia commessa non valida o non attiva."
                });
            }

            if (permissions.CanEditProdotto
                && idProdotto.HasValue
                && !prodottiAttivi.Any(item => item.Id == idProdotto.Value))
            {
                return BadRequest(new
                {
                    message = "Prodotto non valido o obsoleto."
                });
            }

            var idTipoCommessaToSave = permissions.CanEditTipologiaCommessa ? idTipoCommessa : currentConfig.IdTipoCommessa;
            var idProdottoToSave = permissions.CanEditProdotto ? idProdotto : currentConfig.IdProdotto;
            var budgetImportoInvestimentoToSave = permissions.CanEditBudgetImportoInvestimento
                ? request.BudgetImportoInvestimento
                : currentConfig.BudgetImportoInvestimento;
            var budgetOreInvestimentoToSave = permissions.CanEditBudgetOreInvestimento
                ? request.BudgetOreInvestimento
                : currentConfig.BudgetOreInvestimento;
            var prezzoVenditaInizialeRccToSave = permissions.CanEditPrezzoVenditaInizialeRcc
                ? request.PrezzoVenditaInizialeRcc
                : currentConfig.PrezzoVenditaInizialeRcc;
            var prezzoVenditaFinaleRccToSave = permissions.CanEditPrezzoVenditaFinaleRcc
                ? request.PrezzoVenditaFinaleRcc
                : currentConfig.PrezzoVenditaFinaleRcc;
            var stimaInizialeOrePmToSave = permissions.CanEditStimaInizialeOrePm
                ? request.StimaInizialeOrePm
                : currentConfig.StimaInizialeOrePm;

            var saved = await commesseFilterRepository.SaveCommessaConfigAsync(
                validation.Commessa,
                idTipoCommessaToSave,
                idProdottoToSave,
                budgetImportoInvestimentoToSave,
                budgetOreInvestimentoToSave,
                prezzoVenditaInizialeRccToSave,
                prezzoVenditaFinaleRccToSave,
                stimaInizialeOrePmToSave,
                cancellationToken);

            if (saved is null)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Salvataggio configurazione commessa non riuscito."
                });
            }

            return Ok(new CommesseDettaglioConfiguraResponseDto
            {
                Profile = validation.Profile,
                Commessa = validation.Commessa,
                CanEdit = permissions.CanEditAny,
                CanEditTipologiaCommessa = permissions.CanEditTipologiaCommessa,
                CanEditProdotto = permissions.CanEditProdotto,
                CanEditBudgetImportoInvestimento = permissions.CanEditBudgetImportoInvestimento,
                CanEditBudgetOreInvestimento = permissions.CanEditBudgetOreInvestimento,
                CanEditPrezzoVenditaInizialeRcc = permissions.CanEditPrezzoVenditaInizialeRcc,
                CanEditPrezzoVenditaFinaleRcc = permissions.CanEditPrezzoVenditaFinaleRcc,
                CanEditStimaInizialeOrePm = permissions.CanEditStimaInizialeOrePm,
                IdTipoCommessa = saved.IdTipoCommessa,
                TipologiaCommessa = saved.TipologiaCommessa,
                IdProdotto = saved.IdProdotto,
                Prodotto = saved.Prodotto,
                BudgetImportoInvestimento = saved.BudgetImportoInvestimento,
                BudgetOreInvestimento = saved.BudgetOreInvestimento,
                PrezzoVenditaInizialeRcc = saved.PrezzoVenditaInizialeRcc,
                PrezzoVenditaFinaleRcc = saved.PrezzoVenditaFinaleRcc,
                StimaInizialeOrePm = saved.StimaInizialeOrePm,
                TipiCommessa = tipiAttivi
                    .Select(item => new CommessaConfigOptionDto { Id = item.Id, Label = item.Label })
                    .ToArray(),
                Prodotti = prodottiAttivi
                    .Select(item => new CommessaConfigOptionDto { Id = item.Id, Label = item.Label })
                    .ToArray()
            });
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/dettaglio/configura (save).");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/dettaglio/configura (save).");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il salvataggio configurazione commessa."
            });
        }
    }

    [HttpGet("dettaglio/segnalazioni")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DettaglioSegnalazioni(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromQuery] bool includeChiuse = true,
        [FromQuery] int? idSegnalazioneThread = null,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
            if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
            {
                return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
            }

            var response = await BuildSegnalazioniResponseAsync(
                validation.Profile,
                validation.Commessa,
                includeChiuse,
                idSegnalazioneThread,
                cancellationToken);

            return Ok(response);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante /api/commesse/dettaglio/segnalazioni.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante /api/commesse/dettaglio/segnalazioni.");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il caricamento segnalazioni commessa."
            });
        }
    }

    [HttpPost("dettaglio/segnalazioni/apri")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DettaglioSegnalazioniApri(
        [FromQuery] string profile,
        [FromBody] CommessaSegnalazioneCreateRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        if (request is null || string.IsNullOrWhiteSpace(request.Commessa))
        {
            return BadRequest(new { message = "Commessa obbligatoria." });
        }

        var validation = await ValidateCommessaAccessAsync(profile, request.Commessa, actAsUsername, cancellationToken);
        if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
        {
            return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
        }

        var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "apertura segnalazione");
        if (writePermissionError is not null)
        {
            return writePermissionError;
        }

        var success = await commesseFilterRepository.ApriSegnalazioneCommessaAsync(
            validation.Context.EffectiveUser,
            validation.Commessa,
            request.IdTipoSegnalazione,
            request.Titolo ?? string.Empty,
            request.Testo ?? string.Empty,
            request.Priorita <= 0 ? 2 : request.Priorita,
            request.ImpattaCliente,
            (request.DataEvento ?? DateTime.Today).Date,
            request.IdRisorsaDestinataria,
            cancellationToken);

        if (!success)
        {
            return BadRequest(new { message = "Apertura segnalazione non riuscita." });
        }

        var response = await BuildSegnalazioniResponseAsync(validation.Profile, validation.Commessa, true, null, cancellationToken);
        return Ok(response);
    }

    [HttpPut("dettaglio/segnalazioni/modifica")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DettaglioSegnalazioniModifica(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromBody] CommessaSegnalazioneUpdateRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        if (request is null || request.IdSegnalazione <= 0 || string.IsNullOrWhiteSpace(commessa))
        {
            return BadRequest(new { message = "Dati segnalazione non validi." });
        }

        var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
        if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
        {
            return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
        }

        var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "modifica segnalazione");
        if (writePermissionError is not null)
        {
            return writePermissionError;
        }

        var segnalazione = await FindSegnalazioneAsync(validation.Commessa, request.IdSegnalazione, cancellationToken);
        if (segnalazione is null)
        {
            return NotFound(new { message = "Segnalazione non trovata per la commessa selezionata." });
        }

        if (IsSegnalazioneChiusa(segnalazione))
        {
            return BadRequest(new { message = "Segnalazione chiusa: riaprire prima di modificare testata o messaggi." });
        }

        if (!IsOwner(segnalazione.IdRisorsaInserimento, validation.Context.EffectiveUser))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Solo l'autore puo modificare la segnalazione." });
        }

        var success = await commesseFilterRepository.ModificaSegnalazioneCommessaAsync(
            validation.Context.EffectiveUser,
            request.IdSegnalazione,
            request.IdTipoSegnalazione,
            request.Titolo ?? string.Empty,
            request.Testo ?? string.Empty,
            request.Priorita <= 0 ? 2 : request.Priorita,
            request.ImpattaCliente,
            (request.DataEvento ?? DateTime.Today).Date,
            request.IdRisorsaDestinataria,
            cancellationToken);

        if (!success)
        {
            return BadRequest(new { message = "Modifica segnalazione non riuscita." });
        }

        var response = await BuildSegnalazioniResponseAsync(validation.Profile, validation.Commessa, true, request.IdSegnalazione, cancellationToken);
        return Ok(response);
    }

    [HttpDelete("dettaglio/segnalazioni")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DettaglioSegnalazioniElimina(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromBody] CommessaSegnalazioneDeleteRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        if (request is null || request.IdSegnalazione <= 0 || string.IsNullOrWhiteSpace(commessa))
        {
            return BadRequest(new { message = "Dati eliminazione segnalazione non validi." });
        }

        var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
        if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
        {
            return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
        }

        var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "eliminazione segnalazione");
        if (writePermissionError is not null)
        {
            return writePermissionError;
        }

        var segnalazione = await FindSegnalazioneAsync(validation.Commessa, request.IdSegnalazione, cancellationToken);
        if (segnalazione is null)
        {
            return NotFound(new { message = "Segnalazione non trovata per la commessa selezionata." });
        }

        if (!IsOwner(segnalazione.IdRisorsaInserimento, validation.Context.EffectiveUser))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Solo l'autore puo eliminare la segnalazione." });
        }

        var thread = await commesseFilterRepository.GetThreadSegnalazioneCommessaAsync(request.IdSegnalazione, cancellationToken);
        if (thread.Count > 0)
        {
            return BadRequest(new { message = "Segnalazione non eliminabile: sono presenti messaggi collegati." });
        }

        var success = await commesseFilterRepository.EliminaSegnalazioneCommessaAsync(
            validation.Context.EffectiveUser,
            request.IdSegnalazione,
            cancellationToken);

        if (!success)
        {
            return BadRequest(new { message = "Eliminazione segnalazione non riuscita." });
        }

        var response = await BuildSegnalazioniResponseAsync(validation.Profile, validation.Commessa, true, null, cancellationToken);
        return Ok(response);
    }

    [HttpPost("dettaglio/segnalazioni/stato")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DettaglioSegnalazioniCambiaStato(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromBody] CommessaSegnalazioneStatoRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        if (request is null || request.IdSegnalazione <= 0 || string.IsNullOrWhiteSpace(commessa))
        {
            return BadRequest(new { message = "Dati stato segnalazione non validi." });
        }

        var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
        if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
        {
            return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
        }

        var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "aggiornamento stato segnalazione");
        if (writePermissionError is not null)
        {
            return writePermissionError;
        }

        var segnalazione = await FindSegnalazioneAsync(validation.Commessa, request.IdSegnalazione, cancellationToken);
        if (segnalazione is null)
        {
            return NotFound(new { message = "Segnalazione non trovata per la commessa selezionata." });
        }

        if (request.Stato == 4)
        {
            var canClose = await CanCloseSegnalazioneAsync(segnalazione, validation.Context.EffectiveUser, cancellationToken);
            if (!canClose)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Puoi chiudere la segnalazione solo se sei autore o hai inserito almeno una risposta." });
            }
        }

        var success = await commesseFilterRepository.AggiornaStatoSegnalazioneCommessaAsync(
            validation.Context.EffectiveUser,
            request.IdSegnalazione,
            request.Stato,
            cancellationToken);

        if (!success)
        {
            return BadRequest(new { message = "Aggiornamento stato segnalazione non riuscito." });
        }

        var response = await BuildSegnalazioniResponseAsync(validation.Profile, validation.Commessa, true, request.IdSegnalazione, cancellationToken);
        return Ok(response);
    }

    [HttpPost("dettaglio/segnalazioni/chiudi")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DettaglioSegnalazioniChiudi(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromBody] CommessaSegnalazioneStatoRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        if (request is null || request.IdSegnalazione <= 0 || string.IsNullOrWhiteSpace(commessa))
        {
            return BadRequest(new { message = "Dati chiusura segnalazione non validi." });
        }

        var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
        if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
        {
            return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
        }

        var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "chiusura segnalazione");
        if (writePermissionError is not null)
        {
            return writePermissionError;
        }

        var segnalazione = await FindSegnalazioneAsync(validation.Commessa, request.IdSegnalazione, cancellationToken);
        if (segnalazione is null)
        {
            return NotFound(new { message = "Segnalazione non trovata per la commessa selezionata." });
        }

        if (IsSegnalazioneChiusa(segnalazione))
        {
            return BadRequest(new { message = "Segnalazione gia chiusa." });
        }

        var canCloseSegnalazione = await CanCloseSegnalazioneAsync(
            segnalazione,
            validation.Context.EffectiveUser,
            cancellationToken);
        if (!canCloseSegnalazione)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Puoi chiudere la segnalazione solo se sei autore o hai inserito almeno una risposta." });
        }

        var success = await commesseFilterRepository.ChiudiSegnalazioneCommessaAsync(
            validation.Context.EffectiveUser,
            request.IdSegnalazione,
            DateTime.Today,
            cancellationToken);

        // Fallback robusto: in alcuni ambienti la SP dedicata alla chiusura puo fallire
        // pur consentendo il cambio stato tramite SP generica.
        if (!success)
        {
            success = await commesseFilterRepository.AggiornaStatoSegnalazioneCommessaAsync(
                validation.Context.EffectiveUser,
                request.IdSegnalazione,
                4,
                cancellationToken);
        }

        if (!success)
        {
            return BadRequest(new { message = "Chiusura segnalazione non riuscita." });
        }

        var response = await BuildSegnalazioniResponseAsync(validation.Profile, validation.Commessa, true, request.IdSegnalazione, cancellationToken);
        return Ok(response);
    }

    [HttpPost("dettaglio/segnalazioni/riapri")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DettaglioSegnalazioniRiapri(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromBody] CommessaSegnalazioneStatoRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        if (request is null || request.IdSegnalazione <= 0 || string.IsNullOrWhiteSpace(commessa))
        {
            return BadRequest(new { message = "Dati riapertura segnalazione non validi." });
        }

        var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
        if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
        {
            return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
        }

        var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "riapertura segnalazione");
        if (writePermissionError is not null)
        {
            return writePermissionError;
        }

        var segnalazione = await FindSegnalazioneAsync(validation.Commessa, request.IdSegnalazione, cancellationToken);
        if (segnalazione is null)
        {
            return NotFound(new { message = "Segnalazione non trovata per la commessa selezionata." });
        }

        if (!IsSegnalazioneChiusa(segnalazione))
        {
            return BadRequest(new { message = "Segnalazione non chiusa: nessuna riapertura necessaria." });
        }

        var success = await commesseFilterRepository.RiapriSegnalazioneCommessaAsync(
            validation.Context.EffectiveUser,
            request.IdSegnalazione,
            cancellationToken);

        if (!success)
        {
            success = await commesseFilterRepository.AggiornaStatoSegnalazioneCommessaAsync(
                validation.Context.EffectiveUser,
                request.IdSegnalazione,
                1,
                cancellationToken);
        }

        if (!success)
        {
            return BadRequest(new { message = "Riapertura segnalazione non riuscita." });
        }

        var response = await BuildSegnalazioniResponseAsync(validation.Profile, validation.Commessa, true, request.IdSegnalazione, cancellationToken);
        return Ok(response);
    }

    [HttpPost("dettaglio/segnalazioni/messaggi")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DettaglioSegnalazioniInserisciMessaggio(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromBody] CommessaSegnalazioneMessaggioRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        if (request is null || request.IdSegnalazione <= 0 || string.IsNullOrWhiteSpace(commessa))
        {
            return BadRequest(new { message = "Dati messaggio non validi." });
        }

        var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
        if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
        {
            return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
        }

        var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "inserimento messaggio segnalazione");
        if (writePermissionError is not null)
        {
            return writePermissionError;
        }

        var segnalazione = await FindSegnalazioneAsync(validation.Commessa, request.IdSegnalazione, cancellationToken);
        if (segnalazione is null)
        {
            return NotFound(new { message = "Segnalazione non trovata per la commessa selezionata." });
        }

        if (IsSegnalazioneChiusa(segnalazione))
        {
            return BadRequest(new { message = "Segnalazione chiusa: riaprire prima di inserire messaggi." });
        }

        var success = await commesseFilterRepository.InserisciMessaggioSegnalazioneCommessaAsync(
            validation.Context.EffectiveUser,
            request.IdSegnalazione,
            request.IdMessaggioPadre,
            request.Testo ?? string.Empty,
            cancellationToken);

        if (!success)
        {
            return BadRequest(new { message = "Inserimento messaggio non riuscito." });
        }

        var response = await BuildSegnalazioniResponseAsync(validation.Profile, validation.Commessa, true, request.IdSegnalazione, cancellationToken);
        return Ok(response);
    }

    [HttpPut("dettaglio/segnalazioni/messaggi")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DettaglioSegnalazioniModificaMessaggio(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromQuery] int idSegnalazione,
        [FromBody] CommessaSegnalazioneMessaggioUpdateRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        if (request is null || request.IdMessaggio <= 0 || idSegnalazione <= 0 || string.IsNullOrWhiteSpace(commessa))
        {
            return BadRequest(new { message = "Dati messaggio non validi." });
        }

        var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
        if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
        {
            return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
        }

        var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "modifica messaggio segnalazione");
        if (writePermissionError is not null)
        {
            return writePermissionError;
        }

        var segnalazione = await FindSegnalazioneAsync(validation.Commessa, idSegnalazione, cancellationToken);
        if (segnalazione is null)
        {
            return NotFound(new { message = "Segnalazione non trovata per la commessa selezionata." });
        }

        if (IsSegnalazioneChiusa(segnalazione))
        {
            return BadRequest(new { message = "Segnalazione chiusa: riaprire prima di modificare testata o messaggi." });
        }

        var thread = await commesseFilterRepository.GetThreadSegnalazioneCommessaAsync(idSegnalazione, cancellationToken);
        var messaggio = thread.FirstOrDefault(item => item.Id == request.IdMessaggio);
        if (messaggio is null)
        {
            return NotFound(new { message = "Messaggio non trovato per la segnalazione selezionata." });
        }

        if (!IsOwner(messaggio.IdRisorsaInserimento, validation.Context.EffectiveUser))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Solo l'autore puo modificare il messaggio." });
        }

        var success = await commesseFilterRepository.ModificaMessaggioSegnalazioneCommessaAsync(
            validation.Context.EffectiveUser,
            request.IdMessaggio,
            request.Testo ?? string.Empty,
            cancellationToken);

        if (!success)
        {
            return BadRequest(new { message = "Modifica messaggio non riuscita." });
        }

        var response = await BuildSegnalazioniResponseAsync(validation.Profile, validation.Commessa, true, idSegnalazione, cancellationToken);
        return Ok(response);
    }

    [HttpDelete("dettaglio/segnalazioni/messaggi")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DettaglioSegnalazioniEliminaMessaggio(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromQuery] int idSegnalazione,
        [FromBody] CommessaSegnalazioneMessaggioUpdateRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        return await DettaglioSegnalazioniEliminaMessaggioCore(
            profile,
            commessa,
            idSegnalazione,
            request,
            actAsUsername,
            cancellationToken);
    }

    [HttpPost("dettaglio/segnalazioni/messaggi/elimina")]
    [ProducesResponseType(typeof(CommesseDettaglioSegnalazioniResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> DettaglioSegnalazioniEliminaMessaggioPost(
        [FromQuery] string profile,
        [FromQuery] string commessa,
        [FromQuery] int idSegnalazione,
        [FromBody] CommessaSegnalazioneMessaggioUpdateRequestDto request,
        [FromHeader(Name = UserExecutionContextService.ImpersonationHeaderName)] string? actAsUsername = null,
        CancellationToken cancellationToken = default)
    {
        return await DettaglioSegnalazioniEliminaMessaggioCore(
            profile,
            commessa,
            idSegnalazione,
            request,
            actAsUsername,
            cancellationToken);
    }

    private async Task<CommessaSegnalazioneRow?> FindSegnalazioneAsync(
        string commessa,
        int idSegnalazione,
        CancellationToken cancellationToken)
    {
        if (idSegnalazione <= 0 || string.IsNullOrWhiteSpace(commessa))
        {
            return null;
        }

        var segnalazioni = await commesseFilterRepository.GetSegnalazioniCommessaAsync(
            commessa,
            includeChiuse: true,
            cancellationToken);

        return segnalazioni.FirstOrDefault(item => item.Id == idSegnalazione);
    }

    private async Task<IActionResult?> EnsureCommessaEditableAsync(
        UserContext effectiveUser,
        string profile,
        string commessa,
        string operationLabel,
        CancellationToken cancellationToken)
    {
        var anagrafica = await commesseFilterRepository.GetCommessaAnagraficaAsync(
            effectiveUser,
            profile,
            commessa,
            cancellationToken);
        var statoCommessa = anagrafica?.Stato?.Trim();
        if (IsCommessaEditableStatus(statoCommessa))
        {
            return null;
        }

        var statoLabel = string.IsNullOrWhiteSpace(statoCommessa) ? "-" : statoCommessa;
        return StatusCode(StatusCodes.Status403Forbidden, new
        {
            message = $"Commessa '{commessa}' in sola lettura (stato {statoLabel}): {operationLabel} non consentita. Modifiche abilitate solo con stato O."
        });
    }

    private static bool IsCommessaEditableStatus(string? stato)
    {
        return string.Equals(stato?.Trim(), "O", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSegnalazioneChiusa(CommessaSegnalazioneRow segnalazione)
    {
        return segnalazione.Stato == 4;
    }

    private static bool IsOwner(int? idRisorsaOwner, UserContext user)
    {
        return idRisorsaOwner.HasValue && idRisorsaOwner.Value > 0 && user.IdRisorsa > 0 && idRisorsaOwner.Value == user.IdRisorsa;
    }

    private async Task<bool> CanCloseSegnalazioneAsync(
        CommessaSegnalazioneRow segnalazione,
        UserContext user,
        CancellationToken cancellationToken)
    {
        if (IsOwner(segnalazione.IdRisorsaInserimento, user))
        {
            return true;
        }

        if (segnalazione.Id <= 0 || user.IdRisorsa <= 0)
        {
            return false;
        }

        var thread = await commesseFilterRepository.GetThreadSegnalazioneCommessaAsync(segnalazione.Id, cancellationToken);
        return thread.Any(item => IsOwner(item.IdRisorsaInserimento, user));
    }

    private async Task<IActionResult> DettaglioSegnalazioniEliminaMessaggioCore(
        string profile,
        string commessa,
        int idSegnalazione,
        CommessaSegnalazioneMessaggioUpdateRequestDto request,
        string? actAsUsername,
        CancellationToken cancellationToken)
    {
        if (request is null || request.IdMessaggio <= 0 || idSegnalazione <= 0 || string.IsNullOrWhiteSpace(commessa))
        {
            return BadRequest(new { message = "Dati messaggio non validi." });
        }

        var validation = await ValidateCommessaAccessAsync(profile, commessa, actAsUsername, cancellationToken);
        if (!validation.IsValid || validation.Context is null || string.IsNullOrWhiteSpace(validation.Profile))
        {
            return validation.ErrorResponse ?? Problem("Errore interno nella validazione profilo.");
        }

        var writePermissionError = EnsureCommesseWritePermission(validation.Profile, "eliminazione messaggio segnalazione");
        if (writePermissionError is not null)
        {
            return writePermissionError;
        }

        var segnalazione = await FindSegnalazioneAsync(validation.Commessa, idSegnalazione, cancellationToken);
        if (segnalazione is null)
        {
            return NotFound(new { message = "Segnalazione non trovata per la commessa selezionata." });
        }

        if (IsSegnalazioneChiusa(segnalazione))
        {
            return BadRequest(new { message = "Segnalazione chiusa: riaprire prima di eliminare messaggi." });
        }

        var thread = await commesseFilterRepository.GetThreadSegnalazioneCommessaAsync(idSegnalazione, cancellationToken);
        var messaggio = thread.FirstOrDefault(item => item.Id == request.IdMessaggio);
        if (messaggio is null)
        {
            return NotFound(new { message = "Messaggio non trovato per la segnalazione selezionata." });
        }

        if (!IsOwner(messaggio.IdRisorsaInserimento, validation.Context.EffectiveUser))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Solo l'autore puo eliminare il messaggio." });
        }

        var hasChildMessages = thread.Any(item => item.IdMessaggioPadre.HasValue && item.IdMessaggioPadre.Value == messaggio.Id);
        if (hasChildMessages)
        {
            return BadRequest(new { message = "Messaggio non eliminabile: sono presenti risposte collegate." });
        }

        var success = await commesseFilterRepository.EliminaMessaggioSegnalazioneCommessaAsync(
            validation.Context.EffectiveUser,
            request.IdMessaggio,
            cancellationToken);

        if (!success)
        {
            return BadRequest(new { message = "Eliminazione messaggio non riuscita." });
        }

        var response = await BuildSegnalazioniResponseAsync(validation.Profile, validation.Commessa, true, idSegnalazione, cancellationToken);
        return Ok(response);
    }

    private async Task<CommesseDettaglioSegnalazioniResponseDto> BuildSegnalazioniResponseAsync(
        string profile,
        string commessa,
        bool includeChiuse,
        int? idSegnalazioneThread,
        CancellationToken cancellationToken)
    {
        var configTask = commesseFilterRepository.GetCommessaConfigAsync(commessa, cancellationToken);
        var tipiTask = commesseFilterRepository.GetTipiSegnalazioneCommessaAsync(cancellationToken);
        var segnalazioniTask = commesseFilterRepository.GetSegnalazioniCommessaAsync(commessa, includeChiuse, cancellationToken);
        var destinatariTask = commesseFilterRepository.GetCommessaSintesiMailCandidatesAsync(commessa, cancellationToken);
        await Task.WhenAll(configTask, tipiTask, segnalazioniTask, destinatariTask);

        var segnalazioni = segnalazioniTask.Result;
        var segnalazioniIds = segnalazioni
            .Where(item => item.Id > 0)
            .Select(item => item.Id)
            .Distinct()
            .ToArray();
        var thread = Array.Empty<CommessaSegnalazioneMessaggioRow>();
        if (segnalazioniIds.Length > 0)
        {
            var threadTasks = segnalazioniIds
                .Select(id => commesseFilterRepository.GetThreadSegnalazioneCommessaAsync(id, cancellationToken))
                .ToArray();
            await Task.WhenAll(threadTasks);
            thread = threadTasks
                .SelectMany(task => task.Result)
                .OrderBy(item => item.IdSegnalazione)
                .ThenBy(item => item.Livello)
                .ThenBy(item => item.Id)
                .ToArray();
        }
        var destinatari = destinatariTask.Result
            .Select(candidate =>
            {
                var roleCode = NormalizeSegnalazioniDestinatarioRoleCode(candidate.RoleCode);
                var roleLabel = SegnalazioniDestinatariRoleLabels.TryGetValue(roleCode, out var resolvedRoleLabel)
                    ? resolvedRoleLabel
                    : roleCode;
                var idRisorsa = candidate.IdRisorsa.GetValueOrDefault();
                var netUserName = (candidate.NetUserName ?? string.Empty).Trim();
                var email = ResolveEmailFromNetUserName(netUserName);

                return new CommessaSegnalazioneDestinatarioOptionDto
                {
                    RoleCode = roleCode,
                    RoleLabel = roleLabel,
                    IdRisorsa = idRisorsa,
                    NomeRisorsa = (candidate.NomeRisorsa ?? string.Empty).Trim(),
                    NetUserName = netUserName,
                    Email = email
                };
            })
            .Where(item =>
                item.IdRisorsa > 0 &&
                SegnalazioniDestinatariRoleOrder.Contains(item.RoleCode, StringComparer.OrdinalIgnoreCase))
            .GroupBy(item => new { item.RoleCode, item.IdRisorsa })
            .Select(group => group.First())
            .OrderBy(item => Array.IndexOf(SegnalazioniDestinatariRoleOrder, item.RoleCode))
            .ThenBy(item => item.NomeRisorsa, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Email, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new CommesseDettaglioSegnalazioniResponseDto
        {
            Profile = profile,
            Commessa = commessa,
            IdCommessa = configTask.Result?.IdCommessa ?? 0,
            TipiSegnalazione = tipiTask.Result
                .Select(item => new CommessaSegnalazioneTipoDto
                {
                    Id = item.Id,
                    Codice = item.Codice,
                    Descrizione = item.Descrizione,
                    ImpattaClienteDefault = item.ImpattaClienteDefault,
                    OrdineVisualizzazione = item.OrdineVisualizzazione
                })
                .ToArray(),
            Destinatari = destinatari,
            Segnalazioni = segnalazioni
                .Select(item => new CommessaSegnalazioneDto
                {
                    Id = item.Id,
                    IdCommessa = item.IdCommessa,
                    IdTipoSegnalazione = item.IdTipoSegnalazione,
                    TipoCodice = item.TipoCodice,
                    TipoDescrizione = item.TipoDescrizione,
                    Titolo = item.Titolo,
                    Testo = item.Testo,
                    Priorita = item.Priorita,
                    Stato = item.Stato,
                    ImpattaCliente = item.ImpattaCliente,
                    DataEvento = item.DataEvento,
                    DataInserimento = item.DataInserimento,
                    IdRisorsaInserimento = item.IdRisorsaInserimento,
                    NomeRisorsaInserimento = item.NomeRisorsaInserimento,
                    DataUltimaModifica = item.DataUltimaModifica,
                    IdRisorsaUltimaModifica = item.IdRisorsaUltimaModifica,
                    NomeRisorsaUltimaModifica = item.NomeRisorsaUltimaModifica,
                    DataChiusura = item.DataChiusura,
                    IdRisorsaDestinataria = item.IdRisorsaDestinataria,
                    NomeRisorsaDestinataria = item.NomeRisorsaDestinataria
                })
                .ToArray(),
            Thread = thread
                .Select(item => new CommessaSegnalazioneMessaggioDto
                {
                    Id = item.Id,
                    IdSegnalazione = item.IdSegnalazione,
                    IdMessaggioPadre = item.IdMessaggioPadre,
                    Livello = item.Livello,
                    Testo = item.Testo,
                    DataInserimento = item.DataInserimento,
                    IdRisorsaInserimento = item.IdRisorsaInserimento,
                    NomeRisorsaInserimento = item.NomeRisorsaInserimento,
                    DataUltimaModifica = item.DataUltimaModifica,
                    IdRisorsaUltimaModifica = item.IdRisorsaUltimaModifica,
                    NomeRisorsaUltimaModifica = item.NomeRisorsaUltimaModifica
                })
                .ToArray()
        };
    }

    private static CommessaConfigPermissions GetCommessaConfigPermissions(string profile)
    {
        if (string.IsNullOrWhiteSpace(profile))
        {
            return CommessaConfigPermissions.Empty;
        }

        var isSupervisore = string.Equals(profile, ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase);
        var isRc = string.Equals(profile, ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase);
        var isRcc = string.Equals(profile, ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase);
        var isRp = string.Equals(profile, ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase);
        var isPm = string.Equals(profile, ProfileCatalog.ProjectManager, StringComparison.OrdinalIgnoreCase);

        return new CommessaConfigPermissions(
            CanEditTipologiaCommessa: isSupervisore || isRc || isRcc,
            CanEditProdotto: isSupervisore || isRc || isRcc,
            CanEditBudgetImportoInvestimento: isSupervisore || isRp,
            CanEditBudgetOreInvestimento: isSupervisore || isRp,
            CanEditPrezzoVenditaInizialeRcc: isSupervisore || isRc || isRcc,
            CanEditPrezzoVenditaFinaleRcc: isSupervisore || isRc || isRcc,
            CanEditStimaInizialeOrePm: isSupervisore || isRp || isPm);
    }

    private static IActionResult? EnsureCommesseWritePermission(string profile, string operationLabel)
    {
        if (!string.Equals(profile, ProfileCatalog.ResponsabileQualita, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var normalizedOperation = (operationLabel ?? string.Empty).Trim().ToLowerInvariant();
        var allowedForResponsabileQualita = normalizedOperation is
            "invio sintesi mail" or
            "apertura segnalazione" or
            "modifica segnalazione" or
            "eliminazione segnalazione" or
            "aggiornamento stato segnalazione" or
            "chiusura segnalazione" or
            "riapertura segnalazione" or
            "inserimento messaggio segnalazione" or
            "modifica messaggio segnalazione" or
            "eliminazione messaggio segnalazione";
        if (allowedForResponsabileQualita)
        {
            return null;
        }

        return new ObjectResult(new
        {
            message = $"Profilo '{ProfileCatalog.ResponsabileQualita}' in sola visualizzazione: {operationLabel} non consentita."
        })
        {
            StatusCode = StatusCodes.Status403Forbidden
        };
    }

    private readonly record struct CommessaConfigPermissions(
        bool CanEditTipologiaCommessa,
        bool CanEditProdotto,
        bool CanEditBudgetImportoInvestimento,
        bool CanEditBudgetOreInvestimento,
        bool CanEditPrezzoVenditaInizialeRcc,
        bool CanEditPrezzoVenditaFinaleRcc,
        bool CanEditStimaInizialeOrePm)
    {
        public static CommessaConfigPermissions Empty => new(
            CanEditTipologiaCommessa: false,
            CanEditProdotto: false,
            CanEditBudgetImportoInvestimento: false,
            CanEditBudgetOreInvestimento: false,
            CanEditPrezzoVenditaInizialeRcc: false,
            CanEditPrezzoVenditaFinaleRcc: false,
            CanEditStimaInizialeOrePm: false);

        public bool CanEditAny =>
            CanEditTipologiaCommessa
            || CanEditProdotto
            || CanEditBudgetImportoInvestimento
            || CanEditBudgetOreInvestimento
            || CanEditPrezzoVenditaInizialeRcc
            || CanEditPrezzoVenditaFinaleRcc
            || CanEditStimaInizialeOrePm;
    }

    private async Task<(bool IsValid, UserExecutionContextData? Context, string? Profile, string Commessa, IActionResult? ErrorResponse)> ValidateCommessaAccessAsync(
        string profile,
        string commessa,
        string? actAsUsername,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(commessa))
        {
            return (false, null, null, string.Empty, BadRequest(new
            {
                message = "Parametro commessa obbligatorio."
            }));
        }

        var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
        if (!isValid || contextData is null || string.IsNullOrWhiteSpace(profileResult))
        {
            return (false, null, null, string.Empty, errorResponse ?? Problem("Errore interno nella validazione profilo."));
        }

        var normalizedCommessa = commessa.Trim();
        var commessaExists = await commesseFilterRepository.CommessaExistsAsync(normalizedCommessa, cancellationToken);
        if (!commessaExists)
        {
            return (false, null, null, normalizedCommessa, NotFound(new
            {
                message = $"Commessa '{normalizedCommessa}' non trovata."
            }));
        }

        var hasAccess = await commesseFilterRepository.CanAccessCommessaAsync(
            contextData.EffectiveUser,
            profileResult,
            normalizedCommessa,
            cancellationToken);
        if (!hasAccess)
        {
            return (false, null, null, normalizedCommessa, StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = $"Profilo '{profileResult}' non autorizzato alla commessa '{normalizedCommessa}'."
            }));
        }

        return (true, contextData, profileResult, normalizedCommessa, null);
    }

    private async Task<(CommesseDettaglioResponseDto? Response, IActionResult? ErrorResponse)> BuildDettaglioResponseAsync(
        string profile,
        string commessa,
        string? actAsUsername,
        CancellationToken cancellationToken)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(commessa))
            {
                return (null, BadRequest(new { message = "Parametro commessa obbligatorio." }));
            }

            var (isValid, contextData, errorResponse, profileResult) = await ResolveContextAndProfileAsync(profile, actAsUsername, cancellationToken);
            if (!isValid || contextData is null || string.IsNullOrWhiteSpace(profileResult))
            {
                return (null, errorResponse ?? Problem("Errore interno nella validazione profilo."));
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
                    return (null, NotFound(new
                    {
                        message = $"Commessa '{normalizedCommessa}' non trovata."
                    }));
                }

                var hasAccess = await commesseFilterRepository.CanAccessCommessaAsync(
                    contextData.EffectiveUser,
                    profileResult,
                    normalizedCommessa,
                    cancellationToken);
                if (!hasAccess)
                {
                    return (null, StatusCode(StatusCodes.Status403Forbidden, new
                    {
                        message = $"Profilo '{profileResult}' non autorizzato alla commessa '{normalizedCommessa}'."
                    }));
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
            var configurazioneTask = BuildDettaglioConfiguraResponseAsync(profileResult, normalizedCommessa, cancellationToken);
            var segnalazioniTask = BuildSegnalazioniResponseAsync(profileResult, normalizedCommessa, true, null, cancellationToken);

            var orePrevisteTotali = requisitiOreDettaglio.Requisiti.Sum(item => item.OrePreviste > 0m ? item.OrePreviste : item.DurataRequisito);
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
                    Pm = anagraficaFromRows?.Pm ?? anagraficaFromRepository?.Pm ?? string.Empty,
                    DataApertura = anagraficaFromRepository?.DataApertura,
                    DataChiusura = anagraficaFromRepository?.DataChiusura
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
                        Causale = item.Causale,
                        Sottoconto = item.Sottoconto,
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
                        Causale = item.Causale,
                        Sottoconto = item.Sottoconto,
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
                        DurataRequisito = item.DurataRequisito,
                        OrePreviste = item.OrePreviste,
                        OreSpese = item.OreSpese,
                        OreRestanti = item.OreRestanti,
                        PercentualeAvanzamento = item.PercentualeAvanzamento,
                        Attivo = item.Attivo,
                        Commerciale = item.Commerciale
                    })
                    .ToArray(),
                RequisitiOreRisorse = requisitiOreDettaglio.Risorse
                    .Select(item => new CommessaRequisitoOreRisorsaDto
                    {
                        IdRequisito = item.IdRequisito,
                        Requisito = item.Requisito,
                        IdRisorsa = item.IdRisorsa,
                        NomeRisorsa = item.NomeRisorsa,
                        DurataRequisito = item.DurataRequisito,
                        OrePreviste = item.OrePreviste,
                        OreSpese = item.OreSpese,
                        OreRestanti = item.OreRestanti,
                        PercentualeAvanzamento = item.PercentualeAvanzamento,
                        Attivo = item.Attivo,
                        Commerciale = item.Commerciale
                    })
                    .ToArray(),
                OreSpeseRisorse = requisitiOreDettaglio.OreSpeseRisorse
                    .Select(item => new CommessaOreSpeseRisorsaDto
                    {
                        IdRisorsa = item.IdRisorsa,
                        NomeRisorsa = item.NomeRisorsa,
                        OreSpeseTotali = item.OreSpeseTotali,
                        Anno = item.Anno
                    })
                    .ToArray(),
                ConfigurazioneCommessa = await configurazioneTask,
                SegnalazioniCommessa = await segnalazioniTask
            };

            return (response, null);
        }
        catch (SqlException ex)
        {
            logger.LogError(ex, "Errore SQL durante build dettaglio commessa.");
            return (null, StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Database Xenia non raggiungibile da Produzione.Api."
            }));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Errore inatteso durante build dettaglio commessa.");
            return (null, StatusCode(StatusCodes.Status500InternalServerError, new
            {
                message = "Errore interno durante il recupero dettaglio commessa."
            }));
        }
    }

    private async Task<CommesseDettaglioConfiguraResponseDto?> BuildDettaglioConfiguraResponseAsync(
        string profile,
        string commessa,
        CancellationToken cancellationToken)
    {
        var configData = await commesseFilterRepository.GetCommessaConfigAsync(commessa, cancellationToken);
        if (configData is null)
        {
            return null;
        }

        var tipiTask = commesseFilterRepository.GetTipiCommessaAttiviAsync(cancellationToken);
        var prodottiTask = commesseFilterRepository.GetProdottiAttiviAsync(cancellationToken);
        await Task.WhenAll(tipiTask, prodottiTask);

        var permissions = GetCommessaConfigPermissions(profile);

        return new CommesseDettaglioConfiguraResponseDto
        {
            Profile = profile,
            Commessa = commessa,
            CanEdit = permissions.CanEditAny,
            CanEditTipologiaCommessa = permissions.CanEditTipologiaCommessa,
            CanEditProdotto = permissions.CanEditProdotto,
            CanEditBudgetImportoInvestimento = permissions.CanEditBudgetImportoInvestimento,
            CanEditBudgetOreInvestimento = permissions.CanEditBudgetOreInvestimento,
            CanEditPrezzoVenditaInizialeRcc = permissions.CanEditPrezzoVenditaInizialeRcc,
            CanEditPrezzoVenditaFinaleRcc = permissions.CanEditPrezzoVenditaFinaleRcc,
            CanEditStimaInizialeOrePm = permissions.CanEditStimaInizialeOrePm,
            IdTipoCommessa = configData.IdTipoCommessa,
            TipologiaCommessa = configData.TipologiaCommessa,
            IdProdotto = configData.IdProdotto,
            Prodotto = configData.Prodotto,
            BudgetImportoInvestimento = configData.BudgetImportoInvestimento,
            BudgetOreInvestimento = configData.BudgetOreInvestimento,
            PrezzoVenditaInizialeRcc = configData.PrezzoVenditaInizialeRcc,
            PrezzoVenditaFinaleRcc = configData.PrezzoVenditaFinaleRcc,
            StimaInizialeOrePm = configData.StimaInizialeOrePm,
            TipiCommessa = tipiTask.Result
                .Select(item => new CommessaConfigOptionDto { Id = item.Id, Label = item.Label })
                .ToArray(),
            Prodotti = prodottiTask.Result
                .Select(item => new CommessaConfigOptionDto { Id = item.Id, Label = item.Label })
                .ToArray()
        };
    }

    private static string BuildCommessaDetailLink(
        HttpRequest request,
        string commessa)
    {
        var origin = request.Headers.Origin.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(origin))
        {
            var referer = request.Headers.Referer.FirstOrDefault();
            if (Uri.TryCreate(referer, UriKind.Absolute, out var refererUri))
            {
                origin = $"{refererUri.Scheme}://{refererUri.Authority}";
            }
        }

        if (string.IsNullOrWhiteSpace(origin))
        {
            origin = "https://localhost:5643";
        }

        var builder = new UriBuilder(origin.TrimEnd('/'))
        {
            Path = "/",
            Query = string.Empty
        };

        var queryParts = new List<string>
        {
            $"page={Uri.EscapeDataString("commessa-dettaglio")}",
            $"commessa={Uri.EscapeDataString(commessa ?? string.Empty)}"
        };

        builder.Query = string.Join("&", queryParts);
        return builder.Uri.ToString();
    }

    private static string SanitizeFileName(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return "commessa";
        }

        var invalid = Path.GetInvalidFileNameChars();
        var sanitized = new string(value
            .Trim()
            .Select(ch => invalid.Contains(ch) ? '_' : ch)
            .ToArray());

        return string.IsNullOrWhiteSpace(sanitized)
            ? "commessa"
            : sanitized;
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

    private static string NormalizeSegnalazioniDestinatarioRoleCode(string? roleCode)
    {
        var normalized = (roleCode ?? string.Empty).Trim().ToUpperInvariant();
        if (normalized == "PRES")
        {
            return "RC";
        }

        return normalized;
    }

    private static string ResolveEmailFromNetUserName(string? netUserName)
    {
        var normalized = (netUserName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return string.Empty;
        }

        normalized = normalized.Replace('/', '\\');
        var slashIndex = normalized.LastIndexOf('\\');
        if (slashIndex >= 0 && slashIndex < normalized.Length - 1)
        {
            normalized = normalized[(slashIndex + 1)..];
        }

        if (!normalized.Contains('@', StringComparison.Ordinal))
        {
            normalized = $"{normalized}@xeniaprogetti.it";
        }

        return normalized.Trim().ToLowerInvariant();
    }
}

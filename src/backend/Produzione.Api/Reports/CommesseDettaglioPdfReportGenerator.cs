using System.Globalization;
using Produzione.Application.Contracts.Commesse;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Produzione.Api.Reports;

public static class CommesseDettaglioPdfReportGenerator
{
    private static readonly CultureInfo ItCulture = CultureInfo.GetCultureInfo("it-IT");

    public static byte[] Generate(CommesseDettaglioResponseDto detail)
    {
        ArgumentNullException.ThrowIfNull(detail);

        var anagrafica = detail.Anagrafica ?? new CommessaDettaglioAnagraficaDto();
        var lastDayPreviousMonth = detail.DataConsuntivoAttivita.Date;
        var anniStorici = detail.AnniStorici
            .OrderBy(item => item.Anno)
            .ToArray();
        var mesiAnnoCorrente = detail.MesiAnnoCorrente
            .OrderBy(item => item.Mese)
            .ToArray();

        var consuntivoOreLavorate = anniStorici.Sum(item => item.OreLavorate) + (detail.AnnoCorrenteProgressivo?.OreLavorate ?? 0m);
        var consuntivoCostoPersonale = anniStorici.Sum(item => item.CostoPersonale) + (detail.AnnoCorrenteProgressivo?.CostoPersonale ?? 0m);
        var consuntivoRicaviPassati = anniStorici.Sum(item => item.Ricavi) + (detail.AnnoCorrenteProgressivo?.Ricavi ?? 0m);
        var consuntivoCostiPassati = anniStorici.Sum(item => item.Costi) + (detail.AnnoCorrenteProgressivo?.Costi ?? 0m);
        var consuntivoUtile = anniStorici.Sum(item => item.UtileSpecifico) + (detail.AnnoCorrenteProgressivo?.UtileSpecifico ?? 0m);

        var ricaviFuturi = detail.AnnoCorrenteProgressivo?.RicaviFuturi ?? 0m;
        var costiFuturi = detail.AnnoCorrenteProgressivo?.CostiFuturi ?? 0m;

        var avanzamento = detail.AvanzamentoSalvato
            ?? detail.AvanzamentoStorico
                .OrderByDescending(item => item.DataRiferimento)
                .ThenByDescending(item => item.Id)
                .FirstOrDefault();

        var oreFuture = avanzamento?.OreFuture ?? 0m;
        var oreRestanti = avanzamento?.OreRestanti ?? oreFuture;
        var costoPersonaleFuturo = avanzamento?.CostoPersonaleFuturo ?? 0m;
        var ricavoPrevisto = avanzamento?.ImportoRiferimento ?? 0m;

        var percentualeRaggiunto = avanzamento is null
            ? NormalizePercentuale(detail.PercentualeRaggiuntoProposta)
            : Math.Clamp(avanzamento.PercentualeRaggiunto, 0m, 100m);

        var ricavoMaturato = ricavoPrevisto * percentualeRaggiunto / 100m;
        var utileRicalcolato = consuntivoUtile + ricavoMaturato;
        var utileFineProgetto = consuntivoUtile + ricaviFuturi + detail.RicaviAnniSuccessivi - costiFuturi - costoPersonaleFuturo;

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(16);
                page.DefaultTextStyle(text => text.FontSize(8).FontColor(Colors.BlueGrey.Darken4));

                page.Header().Column(column =>
                {
                    column.Spacing(2);
                    column.Item().Text($"Produzione - Report Commessa {Safe(detail.Commessa)}").FontSize(16).Bold().FontColor(Colors.Blue.Darken3);
                    column.Item().Text($"Generato il {DateTime.Now.ToString("dd/MM/yyyy HH:mm", ItCulture)}").FontSize(9).FontColor(Colors.Grey.Darken2);
                    column.Item().PaddingTop(3).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().PaddingTop(8).Column(column =>
                {
                    column.Spacing(8);

                    AddSectionTable(
                        column,
                        "Anagrafica Commessa",
                        ["Commessa", "Descrizione", "Tipologia", "Stato", "Macrotipologia", "Prodotto", "Controparte", "Business Unit", "RCC", "PM", "Data apertura", "Data chiusura"],
                        [
                            [
                                Safe(anagrafica.Commessa),
                                Safe(anagrafica.DescrizioneCommessa),
                                Safe(anagrafica.TipologiaCommessa),
                                Safe(anagrafica.Stato),
                                Safe(anagrafica.MacroTipologia),
                                Safe(anagrafica.Prodotto),
                                Safe(anagrafica.Controparte),
                                Safe(anagrafica.BusinessUnit),
                                Safe(anagrafica.Rcc),
                                Safe(anagrafica.Pm),
                                FormatDate(anagrafica.DataApertura),
                                FormatDate(anagrafica.DataChiusura)
                            ]
                        ]);

                    AddSectionTable(
                        column,
                        "Riepilogo Proiezione",
                        ["Ore lavorate", "Costo personale", "Ricavi passati", "Costi passati", "Utile consuntivato", "Ricavi futuri", "Ricavi anni successivi", "Costi futuri", "Ore future", "Ore restanti", "Costo personale futuro", "Ricavo previsto", "% raggiunto", "Ricavo maturato", "Utile ricalcolato", "Utile fine progetto"],
                        [
                            [
                                FormatDecimal(consuntivoOreLavorate),
                                FormatDecimal(consuntivoCostoPersonale),
                                FormatDecimal(consuntivoRicaviPassati),
                                FormatDecimal(consuntivoCostiPassati),
                                FormatDecimal(consuntivoUtile),
                                FormatDecimal(ricaviFuturi),
                                FormatDecimal(detail.RicaviAnniSuccessivi),
                                FormatDecimal(costiFuturi),
                                FormatDecimal(oreFuture),
                                FormatDecimal(oreRestanti),
                                FormatDecimal(costoPersonaleFuturo),
                                FormatDecimal(ricavoPrevisto),
                                FormatPercent(percentualeRaggiunto),
                                FormatDecimal(ricavoMaturato),
                                FormatDecimal(utileRicalcolato),
                                FormatDecimal(utileFineProgetto)
                            ]
                        ]);

                    var consuntivoRows = new List<IReadOnlyList<string>>();
                    consuntivoRows.AddRange(anniStorici.Select(item => (IReadOnlyList<string>)
                    [
                        item.Anno.ToString(ItCulture),
                        string.Empty,
                        FormatDecimal(item.UtileSpecifico),
                        FormatDecimal(item.OreLavorate),
                        FormatDecimal(item.CostoPersonale),
                        FormatDecimal(item.Ricavi),
                        FormatDecimal(item.Costi)
                    ]));

                    consuntivoRows.AddRange(mesiAnnoCorrente.Select(item => (IReadOnlyList<string>)
                    [
                        item.Anno.ToString(ItCulture),
                        item.Mese.ToString("00", ItCulture),
                        FormatDecimal(item.UtileSpecifico),
                        FormatDecimal(item.OreLavorate),
                        FormatDecimal(item.CostoPersonale),
                        FormatDecimal(item.Ricavi),
                        FormatDecimal(item.Costi)
                    ]));

                    if (consuntivoRows.Count > 0)
                    {
                        consuntivoRows.Add([
                            "Totale",
                            string.Empty,
                            FormatDecimal(consuntivoUtile),
                            FormatDecimal(consuntivoOreLavorate),
                            FormatDecimal(consuntivoCostoPersonale),
                            FormatDecimal(consuntivoRicaviPassati),
                            FormatDecimal(consuntivoCostiPassati)
                        ]);
                    }

                    AddSectionTable(
                        column,
                        "Storico - Consuntivo",
                        ["Anno", "Scenario", "Utile", "Ore lavorate", "Costo personale", "Ricavi", "Costi"],
                        consuntivoRows);

                    var avanzamentoRows = detail.AvanzamentoStorico
                        .OrderBy(item => item.DataRiferimento)
                        .ThenBy(item => item.Id)
                        .Select(item => (IReadOnlyList<string>)
                        [
                            FormatDate(item.DataRiferimento),
                            FormatPercent(item.PercentualeRaggiunto),
                            FormatDecimal(item.ImportoRiferimento),
                            FormatDecimal(item.OreFuture != 0m ? item.OreFuture : item.OreRestanti),
                            FormatDecimal(item.CostoPersonaleFuturo)
                        ])
                        .ToArray();

                    AddSectionTable(
                        column,
                        $"Storico - % Raggiungimento (rif. {FormatDate(lastDayPreviousMonth)})",
                        ["Data riferimento", "% raggiunto", "Importo riferimento", "Ore future", "Costo personale futuro"],
                        avanzamentoRows);

                    var venditeRows = detail.Vendite
                        .OrderBy(item => item.DataMovimento)
                        .ThenBy(item => item.NumeroDocumento)
                        .Select(item => (IReadOnlyList<string>)
                        [
                            FormatDate(item.DataMovimento),
                            FormatDecimal(item.Importo),
                            Safe(item.NumeroDocumento),
                            Safe(item.Descrizione),
                            Safe(item.Causale),
                            Safe(item.Sottoconto),
                            Safe(item.Provenienza),
                            Safe(item.StatoTemporale)
                        ])
                        .ToList();
                    if (venditeRows.Count > 0)
                    {
                        venditeRows.Add([
                            "Totale",
                            FormatDecimal(detail.Vendite.Sum(item => item.Importo)),
                            string.Empty,
                            string.Empty,
                            string.Empty,
                            string.Empty,
                            string.Empty,
                            string.Empty
                        ]);
                    }

                    AddSectionTable(
                        column,
                        "Dati Contabili - Vendite ordinate per data",
                        ["Data", "Importo", "Documento", "Descrizione", "Causale", "Sottoconto", "Provenienza", "Temporale"],
                        venditeRows);

                    var acquistiRows = detail.Acquisti
                        .OrderBy(item => item.DataMovimento)
                        .ThenBy(item => item.NumeroDocumento)
                        .Select(item => (IReadOnlyList<string>)
                        [
                            FormatDate(item.DataMovimento),
                            FormatDecimal(item.Importo),
                            Safe(item.NumeroDocumento),
                            Safe(item.Descrizione),
                            Safe(item.Causale),
                            Safe(item.Sottoconto),
                            Safe(item.Controparte),
                            Safe(item.Provenienza),
                            Safe(item.StatoTemporale)
                        ])
                        .ToList();
                    if (acquistiRows.Count > 0)
                    {
                        acquistiRows.Add([
                            "Totale",
                            FormatDecimal(detail.Acquisti.Sum(item => item.Importo)),
                            string.Empty,
                            string.Empty,
                            string.Empty,
                            string.Empty,
                            string.Empty,
                            string.Empty,
                            string.Empty
                        ]);
                    }

                    AddSectionTable(
                        column,
                        "Dati Contabili - Acquisti ordinati per data",
                        ["Data", "Importo", "Documento", "Descrizione", "Causale", "Sottoconto", "Controparte", "Provenienza", "Temporale"],
                        acquistiRows);

                    var ordiniRows = detail.Ordini
                        .OrderBy(item => item.Protocollo)
                        .ThenBy(item => item.Posizione)
                        .ThenBy(item => item.IdDettaglioOrdine)
                        .Select(item =>
                        {
                            var perc = item.Quantita == 0m
                                ? 0m
                                : item.QuantitaFatture / item.Quantita * 100m;

                            return (IReadOnlyList<string>)
                            [
                                Safe(item.Protocollo),
                                Safe(item.DocumentoStato),
                                Safe(item.Posizione),
                                Safe(item.Descrizione),
                                FormatDecimal(item.Quantita),
                                FormatDecimal(item.PrezzoUnitario),
                                FormatDecimal(item.ImportoOrdine),
                                FormatDecimal(item.QuantitaOriginaleOrdinata),
                                FormatDecimal(item.QuantitaFatture),
                                FormatPercent(perc)
                            ];
                        })
                        .ToList();

                    if (ordiniRows.Count > 0)
                    {
                        var sumQuantita = detail.Ordini.Sum(item => item.Quantita);
                        var sumQuantitaFatture = detail.Ordini.Sum(item => item.QuantitaFatture);
                        var percTot = sumQuantita == 0m ? 0m : sumQuantitaFatture / sumQuantita * 100m;

                        ordiniRows.Add([
                            "Totale",
                            string.Empty,
                            string.Empty,
                            string.Empty,
                            string.Empty,
                            string.Empty,
                            FormatDecimal(detail.Ordini.Sum(item => item.ImportoOrdine)),
                            FormatDecimal(detail.Ordini.Sum(item => item.QuantitaOriginaleOrdinata)),
                            FormatDecimal(sumQuantitaFatture),
                            FormatPercent(percTot)
                        ]);
                    }

                    AddSectionTable(
                        column,
                        "Commerciale - Ordini",
                        ["Protocollo", "Stato", "Posizione", "Descrizione", "Quantità", "Prezzo unitario", "Importo ordine", "Q.tà originale", "Q.tà fatture", "% raggiung."],
                        ordiniRows);

                    var offerteRows = detail.Offerte
                        .OrderByDescending(item => item.Anno ?? int.MinValue)
                        .ThenByDescending(item => item.Data)
                        .ThenBy(item => item.Protocollo)
                        .Select(item => (IReadOnlyList<string>)
                        [
                            item.Anno?.ToString(ItCulture) ?? string.Empty,
                            FormatDate(item.Data),
                            Safe(item.Protocollo),
                            Safe(item.Oggetto),
                            Safe(item.DocumentoStato),
                            FormatDecimal(item.RicavoPrevisto),
                            FormatDecimal(item.CostoPrevisto),
                            FormatDecimal(item.CostoPrevistoPersonale),
                            FormatDecimal(item.OrePrevisteOfferta),
                            FormatPercent(item.PercentualeSuccesso),
                            Safe(item.OrdiniCollegati)
                        ])
                        .ToArray();

                    AddSectionTable(
                        column,
                        "Commerciale - Offerte",
                        ["Anno", "Data", "Protocollo", "Oggetto", "Stato", "Ricavo previsto", "Costo previsto", "Costo prev. personale", "Ore previste offerta", "% successo", "Ordini collegati"],
                        offerteRows);

                    var requisitiRows = detail.RequisitiOre
                        .OrderBy(item => item.Requisito)
                        .ThenBy(item => item.IdRequisito)
                        .Select(item => (IReadOnlyList<string>)
                        [
                            Safe(item.Requisito),
                            FormatDecimal(item.DurataRequisito),
                            FormatDecimal(item.OrePreviste),
                            FormatDecimal(item.OreSpese),
                            FormatDecimal(item.OreRestanti),
                            FormatPercent(item.PercentualeAvanzamento * 100m)
                        ])
                        .ToList();

                    if (requisitiRows.Count > 0)
                    {
                        var oreRiferimento = detail.RequisitiOre.Sum(item => item.OrePreviste > 0m ? item.OrePreviste : item.DurataRequisito);
                        var oreSpese = detail.RequisitiOre.Sum(item => item.OreSpese);
                        var percTot = oreRiferimento <= 0m
                            ? 0m
                            : oreSpese / oreRiferimento * 100m;

                        requisitiRows.Add([
                            "Totale",
                            FormatDecimal(detail.RequisitiOre.Sum(item => item.DurataRequisito)),
                            FormatDecimal(detail.RequisitiOre.Sum(item => item.OrePreviste)),
                            FormatDecimal(oreSpese),
                            FormatDecimal(detail.RequisitiOre.Sum(item => item.OreRestanti)),
                            FormatPercent(percTot)
                        ]);
                    }

                    AddSectionTable(
                        column,
                        "Personale - Ore requisiti commessa",
                        ["Requisito", "Durata requisito", "Ore previste", "Ore spese", "Ore restanti", "% avanzamento"],
                        requisitiRows);

                    var requisitiRisorseRows = detail.RequisitiOreRisorse
                        .OrderBy(item => item.Requisito)
                        .ThenBy(item => item.NomeRisorsa)
                        .ThenBy(item => item.IdRisorsa)
                        .Select(item => (IReadOnlyList<string>)
                        [
                            item.IdRequisito.ToString(ItCulture),
                            Safe(item.Requisito),
                            item.IdRisorsa.ToString(ItCulture),
                            Safe(item.NomeRisorsa),
                            FormatDecimal(item.DurataRequisito),
                            FormatDecimal(item.OrePreviste),
                            FormatDecimal(item.OreSpese),
                            FormatDecimal(item.OreRestanti),
                            FormatPercent(item.PercentualeAvanzamento * 100m)
                        ])
                        .ToArray();

                    AddSectionTable(
                        column,
                        "Personale - Dettaglio requisiti per risorsa",
                        ["Id requisito", "Requisito", "Id risorsa", "Nome risorsa", "Durata requisito", "Ore previste", "Ore spese", "Ore restanti", "% avanzamento"],
                        requisitiRisorseRows);

                    var oreSpeseRisorseRows = detail.OreSpeseRisorse
                        .OrderBy(item => item.NomeRisorsa)
                        .ThenBy(item => item.IdRisorsa)
                        .Select(item => (IReadOnlyList<string>)
                        [
                            Safe(item.NomeRisorsa),
                            FormatDecimal(item.OreSpeseTotali)
                        ])
                        .ToList();

                    if (oreSpeseRisorseRows.Count > 0)
                    {
                        oreSpeseRisorseRows.Add([
                            "Totale",
                            FormatDecimal(detail.OreSpeseRisorse.Sum(item => item.OreSpeseTotali))
                        ]);
                    }

                    AddSectionTable(
                        column,
                        "Personale - Ore spese da ogni risorsa",
                        ["Risorsa", "Ore spese totali"],
                        oreSpeseRisorseRows);

                    var configurazione = detail.ConfigurazioneCommessa;
                    if (configurazione is not null)
                    {
                        AddSectionTable(
                            column,
                            "Configurazione commessa",
                            ["Budget importo investimento", "Budget ore investimento", "Prezzo vendita iniziale RCC", "Prezzo vendita finale RCC", "Stima iniziale ore PM"],
                            [
                                [
                                    FormatDecimal(configurazione.BudgetImportoInvestimento),
                                    FormatDecimal(configurazione.BudgetOreInvestimento),
                                    FormatDecimal(configurazione.PrezzoVenditaInizialeRcc),
                                    FormatDecimal(configurazione.PrezzoVenditaFinaleRcc),
                                    FormatDecimal(configurazione.StimaInizialeOrePm)
                                ]
                            ]);
                    }

                    var segnalazioni = detail.SegnalazioniCommessa;
                    if (segnalazioni is not null)
                    {
                        var segnalazioniRows = segnalazioni.Segnalazioni
                            .OrderByDescending(item => item.DataUltimaModifica ?? item.DataInserimento ?? item.DataEvento)
                            .ThenByDescending(item => item.Id)
                            .Select(item => (IReadOnlyList<string>)
                            [
                                Safe(item.TipoDescrizione),
                                Safe(item.Titolo),
                                Safe(item.Testo),
                                FormatPriorita(item.Priorita),
                                FormatStato(item.Stato),
                                item.ImpattaCliente ? "Si" : "No",
                                Safe(string.IsNullOrWhiteSpace(item.NomeRisorsaUltimaModifica) ? item.NomeRisorsaInserimento : item.NomeRisorsaUltimaModifica),
                                FormatDateTime(item.DataUltimaModifica ?? item.DataInserimento ?? item.DataEvento),
                                Safe(item.NomeRisorsaDestinataria)
                            ])
                            .ToArray();

                        AddSectionTable(
                            column,
                            "Segnalazioni - Elenco",
                            ["Tipo", "Titolo", "Testo", "Priorità", "Stato", "Impatta cliente", "Autore", "Data modifica", "Assegnata a"],
                            segnalazioniRows);

                        var threadRows = segnalazioni.Thread
                            .OrderBy(item => item.IdSegnalazione)
                            .ThenBy(item => item.Livello)
                            .ThenBy(item => item.DataUltimaModifica ?? item.DataInserimento)
                            .ThenBy(item => item.Id)
                            .Select(item =>
                            {
                                var parent = segnalazioni.Segnalazioni.FirstOrDefault(segnalazione => segnalazione.Id == item.IdSegnalazione);
                                return (IReadOnlyList<string>)
                                [
                                    parent is null ? item.IdSegnalazione.ToString(ItCulture) : $"{parent.Id} - {Safe(parent.Titolo)}",
                                    item.Livello.ToString(ItCulture),
                                    Safe(item.Testo),
                                    Safe(string.IsNullOrWhiteSpace(item.NomeRisorsaUltimaModifica) ? item.NomeRisorsaInserimento : item.NomeRisorsaUltimaModifica),
                                    FormatDateTime(item.DataUltimaModifica ?? item.DataInserimento)
                                ];
                            })
                            .ToArray();

                        AddSectionTable(
                            column,
                            "Segnalazioni - Thread",
                            ["Segnalazione", "Livello", "Messaggio", "Autore", "Data modifica"],
                            threadRows);
                    }
                });

                page.Footer()
                    .AlignRight()
                    .Text(text =>
                    {
                        text.Span("Pagina ");
                        text.CurrentPageNumber();
                        text.Span(" / ");
                        text.TotalPages();
                    });
            });
        });

        return document.GeneratePdf();
    }

    private static void AddSectionTable(
        ColumnDescriptor column,
        string title,
        IReadOnlyList<string> headers,
        IReadOnlyList<IReadOnlyList<string>> rows)
    {
        column.Item().Column(section =>
        {
            section.Spacing(3);
            section.Item().Text(title).FontSize(10).Bold().FontColor(Colors.Blue.Darken2);
            section.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    foreach (var _ in headers)
                    {
                        columns.RelativeColumn();
                    }
                });

                table.Header(header =>
                {
                    foreach (var caption in headers)
                    {
                        header.Cell().Element(StyleHeaderCell).Text(caption).SemiBold();
                    }
                });

                if (rows.Count == 0)
                {
                    table.Cell()
                        .ColumnSpan((uint)headers.Count)
                        .Element(StyleDataCell)
                        .Text("Nessun dato disponibile.");
                    return;
                }

                foreach (var row in rows)
                {
                    var isTotal = row.Count > 0 && row[0].Equals("Totale", StringComparison.OrdinalIgnoreCase);

                    for (var index = 0; index < headers.Count; index++)
                    {
                        var value = index < row.Count ? row[index] : string.Empty;
                        table.Cell()
                            .Element(isTotal ? StyleTotalCell : StyleDataCell)
                            .Text(Safe(value));
                    }
                }
            });
        });
    }

    private static IContainer StyleHeaderCell(IContainer container)
    {
        return container
            .Border(1)
            .BorderColor(Colors.Grey.Lighten2)
            .Background("#EEF3FA")
            .PaddingVertical(4)
            .PaddingHorizontal(4);
    }

    private static IContainer StyleDataCell(IContainer container)
    {
        return container
            .Border(1)
            .BorderColor(Colors.Grey.Lighten2)
            .PaddingVertical(3)
            .PaddingHorizontal(4);
    }

    private static IContainer StyleTotalCell(IContainer container)
    {
        return StyleDataCell(container)
            .Background("#F3F7FD");
    }

    private static decimal NormalizePercentuale(decimal value)
    {
        if (value <= 0m)
        {
            return 0m;
        }

        var normalized = value <= 1m
            ? value * 100m
            : value;

        return Math.Clamp(normalized, 0m, 100m);
    }

    private static string FormatDecimal(decimal value)
        => value.ToString("N2", ItCulture);

    private static string FormatPercent(decimal value)
        => $"{value.ToString("N2", ItCulture)}%";

    private static string FormatDate(DateTime? value)
        => value?.ToString("dd/MM/yyyy", ItCulture) ?? string.Empty;

    private static string FormatDateTime(DateTime? value)
        => value?.ToString("dd/MM/yyyy HH:mm", ItCulture) ?? string.Empty;

    private static string FormatPriorita(int value)
        => value switch
        {
            1 => "Alta",
            2 => "Media",
            3 => "Bassa",
            _ => value.ToString(ItCulture)
        };

    private static string FormatStato(int value)
        => value switch
        {
            1 => "Aperta",
            2 => "In lavorazione",
            3 => "In attesa",
            4 => "Chiusa",
            _ => value.ToString(ItCulture)
        };

    private static string Safe(string? value)
        => value?.Trim() ?? string.Empty;
}


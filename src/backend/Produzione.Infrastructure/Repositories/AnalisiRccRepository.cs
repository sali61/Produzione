using System.Data;
using System.Globalization;
using Microsoft.Data.SqlClient;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Application.Models;

namespace Produzione.Infrastructure.Repositories;

public sealed class AnalisiRccRepository(string? connectionString) : IAnalisiRccRepository
{
    private const int DefaultAnalisiIdRisorsa = 3;

    private const string NomeRisorsaQuery = """
        select top (1) cast([Nome Risorsa] as nvarchar(128)) as NomeRisorsa
        from risorse
        where id = @IdRisorsa
        """;

    private const string SnapshotMensileStoredProcedure = "produzione.spAnalisiRccRisultatoMensile";
    private const string SnapshotMensileTipoRcc = "RCC";
    private const string SnapshotMensileTipoBusinessUnit = "BUSINESSUNIT";

    private const string PivotFatturatoStoredProcedure = "produzione.spBixeniaValutazioneProiezioni";
    private const string MensileCommesseStoredProcedure = "produzione.spBixeniaAnalisiMensileCommesse";

    public async Task<string?> GetNomeRisorsaAsync(int idRisorsa, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || idRisorsa <= 0)
        {
            return null;
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(NomeRisorsaQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@IdRisorsa", idRisorsa);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            var value = result?.ToString()?.Trim();
            return string.IsNullOrWhiteSpace(value) ? null : value;
        }
        catch
        {
            return null;
        }
    }

    public async Task<IReadOnlyCollection<AnalisiRccMensileSnapshotRow>> GetRisultatoMensileSnapshotAsync(
        int annoSnapshot,
        string? rcc,
        CancellationToken cancellationToken = default)
    {
        return await GetRisultatoMensileSnapshotByAggregazioneAsync(
            annoSnapshot,
            SnapshotMensileTipoRcc,
            rcc,
            null,
            new[] { "Aggregazione", "RCC", "rcc" },
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<AnalisiRccMensileSnapshotRow>> GetRisultatoMensileBusinessUnitSnapshotAsync(
        int annoSnapshot,
        string? businessUnit,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default)
    {
        return await GetRisultatoMensileSnapshotByAggregazioneAsync(
            annoSnapshot,
            SnapshotMensileTipoBusinessUnit,
            businessUnit,
            allowedBusinessUnits,
            new[] { "Aggregazione", "IDBUSINESSUNIT", "idbusinessunit", "BusinessUnit" },
            cancellationToken);
    }

    private async Task<IReadOnlyCollection<AnalisiRccMensileSnapshotRow>> GetRisultatoMensileSnapshotByAggregazioneAsync(
        int annoSnapshot,
        string tipoAggregazione,
        string? aggregazioneFiltro,
        IReadOnlyCollection<string>? allowedAggregazioni,
        IReadOnlyCollection<string> aggregationColumnCandidates,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || annoSnapshot <= 0)
        {
            return [];
        }

        var tipoAggregazioneFiltro = tipoAggregazione.Trim().ToUpperInvariant();
        var requestedAggregazione = aggregazioneFiltro?.Trim();
        var allowedAggregazioneSet = BuildAllowedSet(allowedAggregazioni);
        if (allowedAggregazioneSet is { Count: 0 })
        {
            return [];
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(SnapshotMensileStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@AnnoSnapshot", annoSnapshot);
            command.Parameters.AddWithValue("@TipoAggregazione", NormalizeForSql(tipoAggregazioneFiltro));
            command.Parameters.AddWithValue("@FiltroAggregazione", NormalizeForSql(requestedAggregazione));
            command.Parameters.AddWithValue("@Rcc", DBNull.Value);

            var rows = new List<AnalisiRccMensileSnapshotRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var tipoAggregazioneRow = ReadString(reader, "TipoAggregazione", "tipoaggregazione");
                if (!string.IsNullOrWhiteSpace(tipoAggregazioneRow) &&
                    !tipoAggregazioneRow.Equals(tipoAggregazioneFiltro, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var aggregazioneValue = ReadString(reader, aggregationColumnCandidates.ToArray());
                if (string.IsNullOrWhiteSpace(aggregazioneValue))
                {
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(requestedAggregazione) &&
                    !aggregazioneValue.Equals(requestedAggregazione, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (allowedAggregazioneSet is not null &&
                    !allowedAggregazioneSet.Contains(aggregazioneValue))
                {
                    continue;
                }

                var anno = ReadNullableInt(reader, "AnnoSnapshot", "annoSnapshot", "anno")
                    ?? annoSnapshot;
                var mese = ReadNullableInt(reader, "MeseSnapshot", "meseSnapshot", "mese")
                    ?? 0;
                var budget = ReadDecimal(reader, "Budget", "budget");
                var risultatoPesato = ReadDecimal(reader, "totale_risultato_pesato", "TotaleRisultatoPesato");
                var percentualePesata = ReadDecimal(reader, "percentuale_pesato", "PercentualePesato");

                if (mese <= 0)
                {
                    continue;
                }

                rows.Add(new AnalisiRccMensileSnapshotRow(
                    aggregazioneValue,
                    anno,
                    mese,
                    budget,
                    risultatoPesato,
                    percentualePesata));
            }

            return rows;
        }
        catch
        {
            return [];
        }
    }

    public async Task<IReadOnlyCollection<AnalisiRccPivotFatturatoRow>> GetPivotFatturatoAsync(
        int idRisorsa,
        int anno,
        string? rcc,
        CancellationToken cancellationToken = default)
    {
        return await GetPivotFatturatoCoreAsync(
            idRisorsa,
            anno,
            "RCC",
            "RCC",
            new[] { "RCC", "rcc", "Aggregazione" },
            rcc,
            null,
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<AnalisiRccPivotFatturatoRow>> GetPivotFatturatoBusinessUnitAsync(
        int idRisorsa,
        int anno,
        string? businessUnit,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default)
    {
        return await GetPivotFatturatoCoreAsync(
            idRisorsa,
            anno,
            "BUSINESSUNIT",
            "IDBUSINESSUNIT",
            new[] { "IDBUSINESSUNIT", "idbusinessunit", "Aggregazione", "RCC", "rcc" },
            businessUnit,
            allowedBusinessUnits,
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<AnalisiRccUtileMensileRow>> GetUtileMensileRccAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        int? meseRiferimento,
        string? rcc,
        int? produzione,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default)
    {
        return await GetUtileMensileCoreAsync(
            idRisorsa,
            anni,
            meseRiferimento,
            "RCC",
            new[] { "RCC", "rcc", "Aggregazione" },
            rcc,
            null,
            produzione,
            allowedBusinessUnits,
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<AnalisiRccUtileMensileRow>> GetUtileMensileBusinessUnitAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        int? meseRiferimento,
        string? businessUnit,
        string? rcc,
        int? produzione,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default)
    {
        return await GetUtileMensileCoreAsync(
            idRisorsa,
            anni,
            meseRiferimento,
            "BUSINESSUNIT",
            new[] { "IDBUSINESSUNIT", "idbusinessunit", "Aggregazione", "RCC", "rcc" },
            businessUnit,
            rcc,
            produzione,
            allowedBusinessUnits,
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<AnalisiRccFunnelRow>> GetFunnelAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        string? rcc,
        string? tipo,
        string? statoDocumento,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        var selectedYears = (anni ?? Array.Empty<int>())
            .Where(value => value > 0)
            .Distinct()
            .ToHashSet();
        var rccFilter = rcc?.Trim();
        var tipoFilter = tipo?.Trim();
        var statoDocumentoFilter = statoDocumento?.Trim();
        var idRisorsaParam = idRisorsa > 0
            ? idRisorsa
            : DefaultAnalisiIdRisorsa;

        var filterClauses = new List<string>();
        if (selectedYears.Count == 1)
        {
            filterClauses.Add($"anno = {selectedYears.First()}");
        }
        else if (selectedYears.Count > 1)
        {
            filterClauses.Add($"anno in ({string.Join(", ", selectedYears.OrderBy(value => value))})");
        }

        if (!string.IsNullOrWhiteSpace(rccFilter))
        {
            filterClauses.Add($"RCC = {SqlQuote(rccFilter)}");
        }

        if (!string.IsNullOrWhiteSpace(tipoFilter))
        {
            filterClauses.Add($"Tipo = {SqlQuote(tipoFilter)}");
        }

        if (!string.IsNullOrWhiteSpace(statoDocumentoFilter))
        {
            filterClauses.Add($"documentostato = {SqlQuote(statoDocumentoFilter)}");
        }

        var filter = string.Join(" AND ", filterClauses);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(PivotFatturatoStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@idrisorsa", idRisorsaParam);
            command.Parameters.AddWithValue("@tiporicerca", "Funnel");
            command.Parameters.AddWithValue("@FiltroDaApplicare", string.IsNullOrWhiteSpace(filter) ? DBNull.Value : filter);
            command.Parameters.AddWithValue("@CampoAggregazione", DBNull.Value);

            var rows = new List<AnalisiRccFunnelRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            do
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    var annoValue = ReadNullableInt(reader, "anno", "Anno") ?? 0;
                    var rccValue = ReadString(reader, "RCC", "rcc", "Aggregazione");
                    var tipoValue = ReadString(reader, "Tipo", "tipo");
                    var statoDocumentoValue = ReadString(reader, "documentostato", "DocumentoStato", "statoDocumento");

                    if (annoValue <= 0 || string.IsNullOrWhiteSpace(rccValue))
                    {
                        continue;
                    }

                    if (selectedYears.Count > 0 && !selectedYears.Contains(annoValue))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(rccFilter) &&
                        !rccValue.Equals(rccFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(tipoFilter) &&
                        !tipoValue.Equals(tipoFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(statoDocumentoFilter) &&
                        !statoDocumentoValue.Equals(statoDocumentoFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    rows.Add(new AnalisiRccFunnelRow(
                        ReadString(reader, "idbusinessunit", "IDBUSINESSUNIT"),
                        ReadString(reader, "Nomeprodotto", "nomeprodotto", "NomeProdotto"),
                        ReadString(reader, "CodiceSocieta", "codicesocieta"),
                        rccValue.Trim(),
                        ReadNullableInt(reader, "idRcc", "idrcc"),
                        annoValue,
                        ReadString(reader, "COMMESSA", "commessa"),
                        ReadString(reader, "esito", "Esito"),
                        ReadString(reader, "protocollo", "Protocollo"),
                        ReadNullableDateTime(reader, "data", "Data"),
                        tipoValue,
                        ReadString(reader, "oggetto", "Oggetto"),
                        statoDocumentoValue,
                        ReadString(reader, "esito_protocollo", "EsitoProtocollo"),
                        ReadDecimal(reader, "Percentualesuccesso", "percentualesuccesso"),
                        ReadDecimal(reader, "Budget_Ricavo", "budget_ricavo"),
                        ReadDecimal(reader, "Budget_Personale", "budget_personale"),
                        ReadDecimal(reader, "Budget_costi", "budget_costi"),
                        ReadDecimal(reader, "Ricavo_atteso", "ricavo_atteso"),
                        ReadDecimal(reader, "fatturato_emesso", "FatturatoEmesso"),
                        ReadDecimal(reader, "fatturato_futuro", "FatturatoFuturo"),
                        ReadDecimal(reader, "futura_anno", "FuturaAnno"),
                        ReadDecimal(reader, "emessa_anno", "EmessaAnno"),
                        ReadDecimal(reader, "totale_anno", "TotaleAnno"),
                        ReadBoolean(reader, "infragruppo", "Infragruppo"),
                        ReadString(reader, "soluzione", "Soluzione"),
                        ReadString(reader, "macrotipologia", "MacroTipologia"),
                        ReadString(reader, "controparte", "Controparte")));
                }
            }
            while (await reader.NextResultAsync(cancellationToken));

            return rows
                .OrderByDescending(item => item.Anno)
                .ThenBy(item => item.Rcc, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Tipo, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.StatoDocumento, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Data)
                .ThenBy(item => item.Protocollo, StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<IReadOnlyCollection<AnalisiRccPivotFunnelRow>> GetPivotFunnelAsync(
        int idRisorsa,
        int anno,
        string? rcc,
        CancellationToken cancellationToken = default)
    {
        return await GetPivotFunnelCoreAsync(
            idRisorsa,
            anno,
            "RCC",
            "RCC",
            new[] { "RCC", "rcc", "Aggregazione" },
            rcc,
            null,
            null,
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<AnalisiRccPivotFunnelRow>> GetPivotFunnelBusinessUnitAsync(
        int idRisorsa,
        int anno,
        string? businessUnit,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedRcc = rcc?.Trim();
        var additionalSqlFilter = string.IsNullOrWhiteSpace(normalizedRcc)
            ? null
            : $"RCC = {SqlQuote(normalizedRcc)}";

        return await GetPivotFunnelCoreAsync(
            idRisorsa,
            anno,
            "BUSINESSUNIT",
            "IDBUSINESSUNIT",
            new[] { "IDBUSINESSUNIT", "idbusinessunit", "RCC", "rcc", "Aggregazione" },
            businessUnit,
            allowedBusinessUnits,
            additionalSqlFilter,
            cancellationToken);
    }

    public async Task<IReadOnlyCollection<ProcessoOffertaDettaglioRow>> GetProcessoOffertaDettaglioAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits,
        IReadOnlyCollection<string>? esitiPositiviTesto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        var selectedYears = (anni ?? Array.Empty<int>())
            .Where(value => value > 0)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();
        var allowedBusinessUnitSet = BuildAllowedSet(allowedBusinessUnits);
        if (allowedBusinessUnitSet is { Count: 0 })
        {
            return [];
        }

        var esitiSet = BuildAllowedSet(esitiPositiviTesto);
        if (esitiSet is { Count: 0 })
        {
            return [];
        }

        var idRisorsaParam = idRisorsa > 0
            ? idRisorsa
            : DefaultAnalisiIdRisorsa;

        var filterClauses = new List<string>();
        if (selectedYears.Length == 1)
        {
            filterClauses.Add($"anno = {selectedYears[0]}");
        }
        else if (selectedYears.Length > 1)
        {
            filterClauses.Add($"anno in ({string.Join(", ", selectedYears)})");
        }

        if (!string.IsNullOrWhiteSpace(rcc))
        {
            filterClauses.Add($"RCC = {SqlQuote(rcc)}");
        }

        if (allowedBusinessUnitSet is not null && allowedBusinessUnitSet.Count > 0)
        {
            filterClauses.Add($"IDBUSINESSUNIT in ({string.Join(", ", allowedBusinessUnitSet.Select(SqlQuote))})");
        }

        if (esitiSet is not null && esitiSet.Count > 0)
        {
            filterClauses.Add($"EsitoPositivoTesto in ({string.Join(", ", esitiSet.Select(SqlQuote))})");
        }

        var filter = string.Join(" AND ", filterClauses);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(PivotFatturatoStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@idrisorsa", idRisorsaParam);
            command.Parameters.AddWithValue("@tiporicerca", "FaseOfferta");
            command.Parameters.AddWithValue("@FiltroDaApplicare", string.IsNullOrWhiteSpace(filter) ? DBNull.Value : filter);
            command.Parameters.AddWithValue("@CampoAggregazione", DBNull.Value);

            var rows = new List<ProcessoOffertaDettaglioRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            do
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    rows.Add(new ProcessoOffertaDettaglioRow(
                        ReadNullableInt(reader, "id", "ID") ?? 0,
                        ReadString(reader, "idbusinessunit", "IDBUSINESSUNIT"),
                        ReadString(reader, "Nomeprodotto", "NomeProdotto"),
                        ReadString(reader, "CodiceSocieta", "codicesocieta"),
                        ReadString(reader, "RCC", "rcc"),
                        ReadNullableInt(reader, "idrcc", "idRcc"),
                        ReadNullableInt(reader, "anno", "Anno") ?? 0,
                        ReadNullableInt(reader, "annolavoro", "AnnoLavoro"),
                        ReadString(reader, "COMMESSA", "commessa"),
                        ReadString(reader, "esito", "Esito"),
                        ReadString(reader, "protocollo", "Protocollo"),
                        ReadNullableDateTime(reader, "data", "Data"),
                        ReadString(reader, "Tipo", "tipo"),
                        ReadString(reader, "oggetto", "Oggetto"),
                        ReadString(reader, "documentostato", "DocumentoStato"),
                        ReadDecimal(reader, "PercentualeSuccesso", "percentualesuccesso"),
                        ReadString(reader, "soluzione", "Soluzione"),
                        ReadString(reader, "macrotipologia", "MacroTipologia"),
                        ReadString(reader, "tipo_commessa", "TipoCommessa"),
                        ReadString(reader, "controparte", "Controparte"),
                        ReadNullableBoolean(reader, "esitopositivo", "EsitoPositivo"),
                        ReadString(reader, "EsitoPositivoTesto", "esitopositivotesto"),
                        ReadDecimal(reader, "ImportoPrevedibile", "importoprevedibile"),
                        ReadDecimal(reader, "CostoPrevedibile", "costoprevedibile"),
                        ReadBoolean(reader, "costoprevisto", "CostoPrevisto")));
                }
            }
            while (await reader.NextResultAsync(cancellationToken));

            return rows
                .OrderByDescending(item => item.Anno)
                .ThenBy(item => item.Rcc, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Tipo, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.EsitoPositivoTesto, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Data)
                .ThenBy(item => item.Protocollo, StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<IReadOnlyCollection<ProcessoOffertaSintesiRow>> GetProcessoOffertaSintesiAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        string campoAggregazione,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits,
        IReadOnlyCollection<string>? esitiPositiviTesto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        var normalizedCampoAggregazione = campoAggregazione.Equals("BUSINESSUNIT", StringComparison.OrdinalIgnoreCase)
            ? "BUSINESSUNIT"
            : "RCC";
        var selectedYears = (anni ?? Array.Empty<int>())
            .Where(value => value > 0)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();
        var allowedBusinessUnitSet = BuildAllowedSet(allowedBusinessUnits);
        if (allowedBusinessUnitSet is { Count: 0 })
        {
            return [];
        }

        var esitiSet = BuildAllowedSet(esitiPositiviTesto);
        if (esitiSet is { Count: 0 })
        {
            return [];
        }

        var idRisorsaParam = idRisorsa > 0
            ? idRisorsa
            : DefaultAnalisiIdRisorsa;

        var filterClauses = new List<string>();
        if (selectedYears.Length == 1)
        {
            filterClauses.Add($"anno = {selectedYears[0]}");
        }
        else if (selectedYears.Length > 1)
        {
            filterClauses.Add($"anno in ({string.Join(", ", selectedYears)})");
        }

        if (!string.IsNullOrWhiteSpace(rcc))
        {
            filterClauses.Add($"RCC = {SqlQuote(rcc)}");
        }

        if (allowedBusinessUnitSet is not null && allowedBusinessUnitSet.Count > 0)
        {
            filterClauses.Add($"IDBUSINESSUNIT in ({string.Join(", ", allowedBusinessUnitSet.Select(SqlQuote))})");
        }

        if (esitiSet is not null && esitiSet.Count > 0)
        {
            filterClauses.Add($"EsitoPositivoTesto in ({string.Join(", ", esitiSet.Select(SqlQuote))})");
        }

        var filter = string.Join(" AND ", filterClauses);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(PivotFatturatoStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@idrisorsa", idRisorsaParam);
            command.Parameters.AddWithValue("@tiporicerca", "FaseOffertaPivot");
            command.Parameters.AddWithValue("@FiltroDaApplicare", string.IsNullOrWhiteSpace(filter) ? DBNull.Value : filter);
            command.Parameters.AddWithValue("@CampoAggregazione", normalizedCampoAggregazione);

            var aggregationColumns = normalizedCampoAggregazione.Equals("BUSINESSUNIT", StringComparison.OrdinalIgnoreCase)
                ? new[] { "IDBUSINESSUNIT", "idbusinessunit", "RCC", "rcc", "Aggregazione" }
                : new[] { "RCC", "rcc", "Aggregazione" };

            var rows = new List<ProcessoOffertaSintesiRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            do
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    var aggregazione = ReadString(reader, aggregationColumns);
                    if (string.IsNullOrWhiteSpace(aggregazione))
                    {
                        continue;
                    }

                    rows.Add(new ProcessoOffertaSintesiRow(
                        ReadNullableInt(reader, "anno", "Anno") ?? 0,
                        aggregazione,
                        ReadString(reader, "tipo", "Tipo"),
                        ReadString(reader, "EsitoPositivoTesto", "esitopositivotesto"),
                        ReadNullableInt(reader, "Numero", "numero") ?? 0,
                        ReadDecimal(reader, "ImportoPrevedibile", "importoprevedibile"),
                        ReadDecimal(reader, "CostoPrevedibile", "costoprevedibile"),
                        ReadDecimal(reader, "PercentualeRicarico", "percentualericarico")));
                }
            }
            while (await reader.NextResultAsync(cancellationToken));

            return rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Aggregazione, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Tipo, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.EsitoPositivoTesto, StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    private async Task<IReadOnlyCollection<AnalisiRccUtileMensileRow>> GetUtileMensileCoreAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        int? meseRiferimento,
        string campoAggregazione,
        IReadOnlyCollection<string> aggregationColumnCandidates,
        string? requestedAggregation,
        string? rcc,
        int? produzione,
        IReadOnlyCollection<string>? allowedBusinessUnits,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        var selectedYears = (anni ?? Array.Empty<int>())
            .Where(value => value > 0)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();

        var requestedAggregationValue = requestedAggregation?.Trim();
        var rccValue = rcc?.Trim();
        var allowedBusinessUnitSet = BuildAllowedSet(allowedBusinessUnits);
        if (allowedBusinessUnitSet is { Count: 0 })
        {
            return [];
        }

        var idRisorsaParam = idRisorsa > 0
            ? idRisorsa
            : DefaultAnalisiIdRisorsa;

        var filterClauses = new List<string>();
        if (selectedYears.Length == 1)
        {
            filterClauses.Add($"anno_competenza = {selectedYears[0]}");
        }
        else if (selectedYears.Length > 1)
        {
            filterClauses.Add($"anno_competenza in ({string.Join(", ", selectedYears)})");
        }

        if (!string.IsNullOrWhiteSpace(requestedAggregationValue))
        {
            var filterColumn = campoAggregazione.Equals("BUSINESSUNIT", StringComparison.OrdinalIgnoreCase)
                ? "IDBUSINESSUNIT"
                : "RCC";
            filterClauses.Add($"{filterColumn} = {SqlQuote(requestedAggregationValue)}");
        }

        if (!string.IsNullOrWhiteSpace(rccValue))
        {
            filterClauses.Add($"RCC = {SqlQuote(rccValue)}");
        }

        if (allowedBusinessUnitSet is not null && allowedBusinessUnitSet.Count > 0)
        {
            filterClauses.Add($"IDBUSINESSUNIT in ({string.Join(", ", allowedBusinessUnitSet.Select(SqlQuote))})");
        }

        if (produzione.HasValue && (produzione.Value is 0 or 1))
        {
            filterClauses.Add($"produzione = {produzione.Value}");
        }

        if (meseRiferimento.HasValue && meseRiferimento.Value is >= 1 and <= 12)
        {
            filterClauses.Add($"mese_competenza <= {meseRiferimento.Value}");
        }

        var filter = string.Join(" AND ", filterClauses);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(MensileCommesseStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@idrisorsa", idRisorsaParam);
            command.Parameters.AddWithValue("@tiporicerca", "AnalisiMargini");
            command.Parameters.AddWithValue("@FiltroDaApplicare", string.IsNullOrWhiteSpace(filter) ? DBNull.Value : filter);
            command.Parameters.AddWithValue("@CampoAggregazione", campoAggregazione);

            var rows = new List<AnalisiRccUtileMensileRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            do
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    var annoValue = ReadNullableInt(reader, "anno_competenza", "anno", "Anno");
                    var aggregazioneValue = ReadString(reader, aggregationColumnCandidates.ToArray());

                    if (!annoValue.HasValue || annoValue.Value <= 0 || string.IsNullOrWhiteSpace(aggregazioneValue))
                    {
                        continue;
                    }

                    rows.Add(new AnalisiRccUtileMensileRow(
                        annoValue.Value,
                        aggregazioneValue.Trim(),
                        ReadDecimal(reader, "totale_ricavi"),
                        ReadDecimal(reader, "totale_costi"),
                        ReadDecimal(reader, "totale_costo_personale"),
                        ReadDecimal(reader, "totale_utile_specifico"),
                        ReadDecimal(reader, "totale_ore_lavorate"),
                        ReadDecimal(reader, "totale_costo_generale_ribaltato"),
                        ReadDecimal(reader, "pct_margine_su_ricavi"),
                        ReadDecimal(reader, "pct_markup_su_costi"),
                        ReadDecimal(reader, "pct_cost_income")));
                }
            }
            while (await reader.NextResultAsync(cancellationToken));

            return rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Aggregazione, StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    private async Task<IReadOnlyCollection<AnalisiRccPivotFunnelRow>> GetPivotFunnelCoreAsync(
        int idRisorsa,
        int anno,
        string campoAggregazione,
        string sqlFilterColumn,
        IReadOnlyCollection<string> aggregationColumnCandidates,
        string? requestedAggregation,
        IReadOnlyCollection<string>? allowedAggregations,
        string? additionalSqlFilter = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || anno <= 0)
        {
            return [];
        }

        var allowedAggregationSet = BuildAllowedSet(allowedAggregations);
        if (allowedAggregationSet is { Count: 0 })
        {
            return [];
        }

        var requestedAggregationValue = requestedAggregation?.Trim();
        var idRisorsaParam = idRisorsa > 0
            ? idRisorsa
            : DefaultAnalisiIdRisorsa;

        var filterClauses = new List<string>
        {
            $"anno = {anno}"
        };
        if (!string.IsNullOrWhiteSpace(requestedAggregationValue))
        {
            filterClauses.Add($"{sqlFilterColumn} = {SqlQuote(requestedAggregationValue)}");
        }
        if (!string.IsNullOrWhiteSpace(additionalSqlFilter))
        {
            filterClauses.Add(additionalSqlFilter);
        }

        var filter = string.Join(" AND ", filterClauses);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(PivotFatturatoStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@idrisorsa", idRisorsaParam);
            command.Parameters.AddWithValue("@tiporicerca", "FunnelPivot");
            command.Parameters.AddWithValue("@FiltroDaApplicare", string.IsNullOrWhiteSpace(filter) ? DBNull.Value : filter);
            command.Parameters.AddWithValue("@CampoAggregazione", campoAggregazione);

            var rows = new List<AnalisiRccPivotFunnelRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            do
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    var annoValue = ReadNullableInt(reader, "anno", "Anno") ?? anno;
                    var aggregazioneValue = ReadString(reader, aggregationColumnCandidates.ToArray());
                    if (string.IsNullOrWhiteSpace(aggregazioneValue))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(requestedAggregationValue) &&
                        !aggregazioneValue.Equals(requestedAggregationValue, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (allowedAggregationSet is not null &&
                        !allowedAggregationSet.Contains(aggregazioneValue))
                    {
                        continue;
                    }

                    rows.Add(new AnalisiRccPivotFunnelRow(
                        annoValue,
                        aggregazioneValue.Trim(),
                        ReadString(reader, "tipo", "Tipo"),
                        ReadDecimal(reader, "percentualesuccesso", "PercentualeSuccesso"),
                        ReadNullableInt(reader, "numero", "Numero", "conteggio_protocollo", "conteggio_protocolli") ?? 0,
                        ReadDecimal(reader, "totale_Budget_Ricavo", "totale_budget_ricavo"),
                        ReadDecimal(reader, "totale_Budget_costi", "totale_budget_costi"),
                        ReadDecimal(reader, "totale_fatturato_futuro", "totale_fatturato_futuro_anno", "totale_futura_anno"),
                        ReadDecimal(reader, "totale_emessa_anno"),
                        ReadDecimal(reader, "totale_futura_anno"),
                        ReadDecimal(reader, "totale_ricavi_complessivi")));
                }
            }
            while (await reader.NextResultAsync(cancellationToken));

            return rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.Aggregazione, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Tipo, StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    private async Task<IReadOnlyCollection<AnalisiRccPivotFatturatoRow>> GetPivotFatturatoCoreAsync(
        int idRisorsa,
        int anno,
        string campoAggregazione,
        string sqlFilterColumn,
        IReadOnlyCollection<string> aggregationColumnCandidates,
        string? requestedAggregation,
        IReadOnlyCollection<string>? allowedAggregations,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || anno <= 0)
        {
            return [];
        }

        var allowedAggregationSet = BuildAllowedSet(allowedAggregations);
        if (allowedAggregationSet is { Count: 0 })
        {
            return [];
        }

        var requestedAggregationValue = requestedAggregation?.Trim();
        var idRisorsaParam = idRisorsa > 0
            ? idRisorsa
            : DefaultAnalisiIdRisorsa;

        var filterClauses = new List<string>
        {
            $"anno = {anno}"
        };
        if (!string.IsNullOrWhiteSpace(requestedAggregationValue))
        {
            filterClauses.Add($"{sqlFilterColumn} = {SqlQuote(requestedAggregationValue)}");
        }

        var filter = string.Join(" AND ", filterClauses);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(PivotFatturatoStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@idrisorsa", idRisorsaParam);
            command.Parameters.AddWithValue("@tiporicerca", "FatturatoPivot");
            command.Parameters.AddWithValue("@FiltroDaApplicare", string.IsNullOrWhiteSpace(filter) ? DBNull.Value : filter);
            command.Parameters.AddWithValue("@CampoAggregazione", campoAggregazione);

            var rows = new List<AnalisiRccPivotFatturatoRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            do
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    var annoValue = ReadNullableInt(reader, "anno")
                        ?? ReadNullableInt(reader, "Anno")
                        ?? anno;
                    var aggregazioneValue = ReadString(reader, aggregationColumnCandidates.ToArray());
                    if (string.IsNullOrWhiteSpace(aggregazioneValue))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(requestedAggregationValue) &&
                        !aggregazioneValue.Equals(requestedAggregationValue, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (allowedAggregationSet is not null &&
                        !allowedAggregationSet.Contains(aggregazioneValue))
                    {
                        continue;
                    }

                    var fatturatoAnno = ReadDecimal(reader, "fatturato_anno", "totale_fatturato_numerico", "totale_fatturato_Numerico", "totale_fatturato");
                    var fatturatoFuturoAnno = ReadDecimal(reader, "fatturato_futuro_anno", "totale_fatturato_futuro_numerico", "totale_fatturato_futuro");
                    var totaleFatturatoCerto = fatturatoAnno + fatturatoFuturoAnno;
                    var budgetPrevisto = ReadDecimal(reader, "budget_previsto", "Budget_numerico", "Budget");
                    var totaleRicavoIpotetico = ReadDecimal(reader, "totale_ricavo_ipotetico", "totale_ricavo_ipotetico_numerico");
                    var totaleRicavoIpoteticoPesato = ReadDecimal(reader, "totale_ricavo_ipotetico_pesato", "totale_ricavo_ipotetico_pesato_numerico");
                    var totaleConRicavoIpoteticoPesato = ReadDecimal(reader, "totale_ipotetico", "totale_con_ricavo_ipotetico_pesato_numerico", "totale_con_ricavo_ipotetico_pesato");
                    var percentualeCertaRaggiunta = budgetPrevisto == 0m
                        ? 0m
                        : totaleFatturatoCerto / budgetPrevisto;

                    rows.Add(new AnalisiRccPivotFatturatoRow(
                        annoValue,
                        aggregazioneValue.Trim(),
                        fatturatoAnno,
                        fatturatoFuturoAnno,
                        totaleFatturatoCerto,
                        budgetPrevisto,
                        totaleFatturatoCerto - budgetPrevisto,
                        percentualeCertaRaggiunta,
                        totaleRicavoIpotetico,
                        totaleRicavoIpoteticoPesato,
                        totaleConRicavoIpoteticoPesato,
                        budgetPrevisto == 0m ? 0m : totaleConRicavoIpoteticoPesato / budgetPrevisto));
                }
            }
            while (await reader.NextResultAsync(cancellationToken));

            return rows;
        }
        catch
        {
            return [];
        }
    }

    private static HashSet<string>? BuildAllowedSet(IReadOnlyCollection<string>? values)
    {
        if (values is null)
        {
            return null;
        }

        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var value in values)
        {
            var normalized = value?.Trim();
            if (!string.IsNullOrWhiteSpace(normalized))
            {
                set.Add(normalized);
            }
        }

        return set;
    }

    private static string SqlQuote(string value)
    {
        return $"'{value.Trim().Replace("'", "''")}'";
    }

    private static object NormalizeForSql(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return DBNull.Value;
        }

        return value.Trim();
    }

    private static int? ReadNullableInt(SqlDataReader reader, params string[] columnCandidates)
    {
        foreach (var columnName in columnCandidates)
        {
            if (!TryReadValue(reader, columnName, out var value))
            {
                continue;
            }

            if (value is null)
            {
                return null;
            }

            if (value is int intValue)
            {
                return intValue;
            }

            if (int.TryParse(
                    Convert.ToString(value, CultureInfo.InvariantCulture),
                    NumberStyles.Integer,
                    CultureInfo.InvariantCulture,
                    out var parsed))
            {
                return parsed;
            }
        }

        return null;
    }

    private static string ReadString(SqlDataReader reader, params string[] columnCandidates)
    {
        foreach (var columnName in columnCandidates)
        {
            if (!TryReadValue(reader, columnName, out var value))
            {
                continue;
            }

            return value?.ToString()?.Trim() ?? string.Empty;
        }

        return string.Empty;
    }

    private static decimal ReadDecimal(SqlDataReader reader, params string[] columnCandidates)
    {
        foreach (var columnName in columnCandidates)
        {
            if (!TryReadValue(reader, columnName, out var value))
            {
                continue;
            }

            return ToDecimal(value);
        }

        return 0m;
    }

    private static DateTime? ReadNullableDateTime(SqlDataReader reader, params string[] columnCandidates)
    {
        foreach (var columnName in columnCandidates)
        {
            if (!TryReadValue(reader, columnName, out var value))
            {
                continue;
            }

            if (value is null || value == DBNull.Value)
            {
                return null;
            }

            if (value is DateTime dateTime)
            {
                return dateTime;
            }

            if (DateTime.TryParse(
                    Convert.ToString(value, CultureInfo.InvariantCulture),
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeLocal,
                    out var parsedInvariant))
            {
                return parsedInvariant;
            }

            if (DateTime.TryParse(
                    Convert.ToString(value, CultureInfo.GetCultureInfo("it-IT")),
                    CultureInfo.GetCultureInfo("it-IT"),
                    DateTimeStyles.AssumeLocal,
                    out var parsedItalian))
            {
                return parsedItalian;
            }
        }

        return null;
    }

    private static bool ReadBoolean(SqlDataReader reader, params string[] columnCandidates)
    {
        foreach (var columnName in columnCandidates)
        {
            if (!TryReadValue(reader, columnName, out var value))
            {
                continue;
            }

            if (value is null || value == DBNull.Value)
            {
                return false;
            }

            if (value is bool boolValue)
            {
                return boolValue;
            }

            if (value is byte byteValue)
            {
                return byteValue != 0;
            }

            if (value is short shortValue)
            {
                return shortValue != 0;
            }

            if (value is int intValue)
            {
                return intValue != 0;
            }

            var raw = value.ToString()?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(raw))
            {
                return false;
            }

            if (raw.Equals("1", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("true", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("yes", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("si", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("s", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (raw.Equals("0", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("false", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("no", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("n", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (decimal.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out var numeric))
            {
                return numeric != 0m;
            }
        }

        return false;
    }

    private static bool? ReadNullableBoolean(SqlDataReader reader, params string[] columnCandidates)
    {
        foreach (var columnName in columnCandidates)
        {
            if (!TryReadValue(reader, columnName, out var value))
            {
                continue;
            }

            if (value is null || value == DBNull.Value)
            {
                return null;
            }

            if (value is bool boolValue)
            {
                return boolValue;
            }

            if (value is byte byteValue)
            {
                return byteValue != 0;
            }

            if (value is short shortValue)
            {
                return shortValue != 0;
            }

            if (value is int intValue)
            {
                return intValue != 0;
            }

            var raw = value.ToString()?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            if (raw.Equals("1", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("true", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("yes", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("si", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("s", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (raw.Equals("0", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("false", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("no", StringComparison.OrdinalIgnoreCase) ||
                raw.Equals("n", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            if (decimal.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out var numeric))
            {
                return numeric != 0m;
            }
        }

        return null;
    }

    private static decimal ReadPercentage(SqlDataReader reader, params string[] columnCandidates)
    {
        foreach (var columnName in columnCandidates)
        {
            if (!TryReadValue(reader, columnName, out var value))
            {
                continue;
            }

            if (value is null || value == DBNull.Value)
            {
                return 0m;
            }

            var raw = value.ToString()?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(raw) || raw.Equals("N/D", StringComparison.OrdinalIgnoreCase))
            {
                return 0m;
            }

            var number = ToDecimal(value);
            if (Math.Abs(number) > 1m)
            {
                number /= 100m;
            }

            return number;
        }

        return 0m;
    }

    private static bool TryReadValue(SqlDataReader reader, string columnName, out object? value)
    {
        try
        {
            var ordinal = reader.GetOrdinal(columnName);
            value = reader.IsDBNull(ordinal) ? null : reader.GetValue(ordinal);
            return true;
        }
        catch (IndexOutOfRangeException)
        {
            value = null;
            return false;
        }
    }

    private static decimal ToDecimal(object? value)
    {
        if (value is null || value == DBNull.Value)
        {
            return 0m;
        }

        if (value is decimal decimalValue)
        {
            return decimalValue;
        }

        if (value is double doubleValue)
        {
            return Convert.ToDecimal(doubleValue, CultureInfo.InvariantCulture);
        }

        if (value is float floatValue)
        {
            return Convert.ToDecimal(floatValue, CultureInfo.InvariantCulture);
        }

        if (value is int intValue)
        {
            return intValue;
        }

        var rawString = Convert.ToString(value, CultureInfo.InvariantCulture)?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(rawString))
        {
            return 0m;
        }

        if (rawString.Equals("N/D", StringComparison.OrdinalIgnoreCase))
        {
            return 0m;
        }

        rawString = rawString
            .Replace("€", string.Empty, StringComparison.Ordinal)
            .Replace("%", string.Empty, StringComparison.Ordinal)
            .Replace(" ", string.Empty, StringComparison.Ordinal)
            .Trim();

        var invariantCulture = CultureInfo.InvariantCulture;
        var italianCulture = CultureInfo.GetCultureInfo("it-IT");
        var hasComma = rawString.Contains(",", StringComparison.Ordinal);
        var hasDot = rawString.Contains(".", StringComparison.Ordinal);

        if (hasDot && !hasComma)
        {
            // Esempi: "157.608.850", "-2.548", "-.266"
            var looksLikeItalianThousands =
                rawString.Count(ch => ch == '.') > 1 ||
                System.Text.RegularExpressions.Regex.IsMatch(rawString, @"^-?\d{1,3}\.\d{3}$") ||
                System.Text.RegularExpressions.Regex.IsMatch(rawString, @"^-?\d{1,3}(?:\.\d{3})+$") ||
                System.Text.RegularExpressions.Regex.IsMatch(rawString, @"^-?\.\d{3}$");

            if (looksLikeItalianThousands)
            {
                var normalizedThousands = rawString.Replace(".", string.Empty, StringComparison.Ordinal);
                if (decimal.TryParse(normalizedThousands, NumberStyles.Any, invariantCulture, out var parsedThousands))
                {
                    return parsedThousands;
                }
            }
        }

        if (hasComma && !hasDot)
        {
            // "1576088,50" / "105,78"
            if (decimal.TryParse(rawString, NumberStyles.Any, italianCulture, out var parsedItalianOnlyComma))
            {
                return parsedItalianOnlyComma;
            }

            var commaAsDot = rawString.Replace(",", ".", StringComparison.Ordinal);
            if (decimal.TryParse(commaAsDot, NumberStyles.Any, invariantCulture, out var parsedCommaAsDot))
            {
                return parsedCommaAsDot;
            }
        }

        if (hasComma && hasDot)
        {
            var lastComma = rawString.LastIndexOf(",", StringComparison.Ordinal);
            var lastDot = rawString.LastIndexOf(".", StringComparison.Ordinal);

            if (lastComma > lastDot)
            {
                // "1.576.088,50"
                if (decimal.TryParse(rawString, NumberStyles.Any, italianCulture, out var parsedItalianWithSeparators))
                {
                    return parsedItalianWithSeparators;
                }

                var normalizedItalian = rawString.Replace(".", string.Empty, StringComparison.Ordinal)
                    .Replace(",", ".", StringComparison.Ordinal);
                if (decimal.TryParse(normalizedItalian, NumberStyles.Any, invariantCulture, out var parsedNormalizedItalian))
                {
                    return parsedNormalizedItalian;
                }
            }
            else
            {
                // "1,576,088.50"
                if (decimal.TryParse(rawString, NumberStyles.Any, invariantCulture, out var parsedInvariantWithSeparators))
                {
                    return parsedInvariantWithSeparators;
                }

                var normalizedInvariant = rawString.Replace(",", string.Empty, StringComparison.Ordinal);
                if (decimal.TryParse(normalizedInvariant, NumberStyles.Any, invariantCulture, out var parsedNormalizedInvariant))
                {
                    return parsedNormalizedInvariant;
                }
            }
        }

        if (decimal.TryParse(rawString, NumberStyles.Any, invariantCulture, out var parsedInvariant))
        {
            return parsedInvariant;
        }

        if (decimal.TryParse(rawString, NumberStyles.Any, italianCulture, out var parsedItalian))
        {
            return parsedItalian;
        }

        var normalized = rawString
            .Replace(".", string.Empty, StringComparison.Ordinal)
            .Replace(",", ".", StringComparison.Ordinal);
        if (decimal.TryParse(normalized, NumberStyles.Any, invariantCulture, out var parsedNormalized))
        {
            return parsedNormalized;
        }

        return 0m;
    }
}

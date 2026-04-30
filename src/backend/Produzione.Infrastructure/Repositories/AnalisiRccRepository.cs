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
    private const string SnapshotMensileTipoBurcc = "BURCC";
    private const string SnapshotMensileBurccFallbackQuery = """
        SELECT
            TipoAggregazione = LTRIM(RTRIM(CAST(ISNULL(src.TipoAggregazione, N'') AS NVARCHAR(50)))),
            Aggregazione = LTRIM(RTRIM(CAST(ISNULL(src.Aggregazione, N'') AS NVARCHAR(128)))),
            AnnoSnapshot = src.AnnoSnapshot,
            MeseSnapshot = src.MeseSnapshot,
            Budget = CAST(src.Budget AS NVARCHAR(128)),
            Fatturato = CAST(src.totale_fatturato AS NVARCHAR(128)),
            FatturatoFuturo = CAST(src.totale_fatturato_futuro AS NVARCHAR(128)),
            RicavoIpoteticoPesato = CAST(src.totale_ricavo_ipotetico_pesato AS NVARCHAR(128))
        FROM CDG.BIXeniaValutazioneProiezioni_Mensile src
        WHERE ISNUMERIC(CAST(src.AnnoSnapshot AS NVARCHAR(32))) = 1
          AND CONVERT(INT, src.AnnoSnapshot) = @AnnoSnapshot
          AND UPPER(LTRIM(RTRIM(CAST(ISNULL(src.TipoAggregazione, N'') AS NVARCHAR(50))))) = @TipoAggregazione
        ORDER BY
            CONVERT(INT, src.AnnoSnapshot),
            TRY_CONVERT(INT, src.MeseSnapshot),
            LTRIM(RTRIM(CAST(ISNULL(src.Aggregazione, N'') AS NVARCHAR(128))))
        """;

    private const string PivotFatturatoStoredProcedure = "produzione.spBixeniaValutazioneProiezioni";
    private const string MensileCommesseStoredProcedure = "produzione.spBixeniaAnalisiMensileCommesse";
    private const string PianoFatturazioneTipoRcc = "RCC";
    private const string PianoFatturazioneTipoBurcc = "BURCC";
    private const string CommesseRccPmLookupQuery = """
        select
            cast(ltrim(rtrim(isnull(c.COMMESSA, ''))) as nvarchar(128)) as Commessa,
            cast(max(ltrim(rtrim(isnull(c.descrizione, '')))) as nvarchar(512)) as DescrizioneCommessa,
            cast(max(ltrim(rtrim(isnull(c.RCC, '')))) as nvarchar(256)) as Rcc,
            cast(max(ltrim(rtrim(isnull(c.PM, '')))) as nvarchar(256)) as Pm
        from cdg_qryComessaPmRcc c
        group by cast(ltrim(rtrim(isnull(c.COMMESSA, ''))) as nvarchar(128))
        """;
    private const string BudgetBusinessUnitLookupQuery = """
        select
            Bu = cast(ltrim(rtrim(isnull(oggetto, N''))) as nvarchar(64)),
            Budget = cast(max(isnull(budget, 0)) as decimal(18, 4))
        from CDG.BIBudgetValutazioni
        where eliminato = 0
          and anno = @Anno
          and upper(ltrim(rtrim(isnull(tipo, N'')))) in (N'BUSINESSUNIT', N'IDBUSINESSUNIT')
          and len(ltrim(rtrim(isnull(oggetto, N'')))) > 0
        group by cast(ltrim(rtrim(isnull(oggetto, N''))) as nvarchar(64))
        """;
    private const string PianoFatturazioneBaseQuery = """
        WITH RankedRows AS (
            SELECT
                AnnoSnapshot = src.AnnoSnapshot,
                MeseSnapshot = src.MeseSnapshot,
                AnnoRiferimento = src.AnnoRiferimento,
                MeseRiferimento = src.MeseRiferimento,
                InseritoIl = src.InseritoIl,
                TotaleFatturato = src.totale_fatturato,
                TotaleFatturatoFuturo = src.totale_fatturato_futuro,
                TotaleComplessivo = src.totale_complessivo,
                Budget = src.Budget,
                Aggregazione = LTRIM(RTRIM(CAST(ISNULL(src.Aggregazione, N'') AS NVARCHAR(128)))),
                BusinessUnit = CAST(NULL AS NVARCHAR(64)),
                TipoAggregazione = UPPER(LTRIM(RTRIM(CAST(ISNULL(src.TipoAggregazione, N'') AS NVARCHAR(50))))),
                rn = ROW_NUMBER() OVER (
                    PARTITION BY src.AnnoRiferimento, src.MeseRiferimento, LTRIM(RTRIM(CAST(ISNULL(src.Aggregazione, N'') AS NVARCHAR(128))))
                    ORDER BY src.MeseSnapshot DESC, src.InseritoIl DESC
                )
            FROM CDG.BIXeniaPianoFatturazione_Mensile src
            WHERE src.AnnoSnapshot = @AnnoSnapshot
              AND src.AnnoRiferimento = @AnnoSnapshot
              AND src.MeseSnapshot IN ({0})
              AND src.MeseRiferimento BETWEEN 1 AND 12
              AND UPPER(LTRIM(RTRIM(CAST(ISNULL(src.TipoAggregazione, N'') AS NVARCHAR(50))))) = @TipoAggregazione
              AND LEN(LTRIM(RTRIM(CAST(ISNULL(src.Aggregazione, N'') AS NVARCHAR(128))))) > 0
              AND (@Rcc IS NULL OR LTRIM(RTRIM(CAST(ISNULL(src.Aggregazione, N'') AS NVARCHAR(128)))) = @Rcc)
        )
        SELECT
            AnnoSnapshot,
            MeseSnapshot,
            AnnoRiferimento,
            MeseRiferimento,
            InseritoIl,
            TotaleFatturato,
            TotaleFatturatoFuturo,
            TotaleComplessivo,
            Budget,
            Aggregazione,
            BusinessUnit,
            TipoAggregazione
        FROM RankedRows
        WHERE rn = 1
        ORDER BY Aggregazione, MeseRiferimento
        """;

    private const string PianoFatturazioneBurccQuery = """
        WITH SourceRows AS (
            SELECT
                AnnoSnapshot = src.AnnoSnapshot,
                MeseSnapshot = src.MeseSnapshot,
                AnnoRiferimento = src.AnnoRiferimento,
                MeseRiferimento = src.MeseRiferimento,
                InseritoIl = src.InseritoIl,
                TotaleFatturato = src.totale_fatturato,
                TotaleFatturatoFuturo = src.totale_fatturato_futuro,
                TotaleComplessivo = src.totale_complessivo,
                Budget = src.Budget,
                AggregazioneRaw = LTRIM(RTRIM(CAST(ISNULL(src.Aggregazione, N'') AS NVARCHAR(128)))),
                TipoAggregazione = UPPER(LTRIM(RTRIM(CAST(ISNULL(src.TipoAggregazione, N'') AS NVARCHAR(50)))))
            FROM CDG.BIXeniaPianoFatturazione_Mensile src
            WHERE src.AnnoSnapshot = @AnnoSnapshot
              AND src.AnnoRiferimento = @AnnoSnapshot
              AND src.MeseSnapshot IN ({0})
              AND src.MeseRiferimento BETWEEN 1 AND 12
              AND UPPER(LTRIM(RTRIM(CAST(ISNULL(src.TipoAggregazione, N'') AS NVARCHAR(50))))) = @TipoAggregazione
              AND LEN(LTRIM(RTRIM(CAST(ISNULL(src.Aggregazione, N'') AS NVARCHAR(128))))) > 0
        ),
        ParsedRows AS (
            SELECT
                AnnoSnapshot,
                MeseSnapshot,
                AnnoRiferimento,
                MeseRiferimento,
                InseritoIl,
                TotaleFatturato,
                TotaleFatturatoFuturo,
                TotaleComplessivo,
                Budget,
                BusinessUnit = LTRIM(RTRIM(CASE
                    WHEN CHARINDEX('-', AggregazioneRaw) > 0 THEN LEFT(AggregazioneRaw, CHARINDEX('-', AggregazioneRaw) - 1)
                    ELSE N''
                END)),
                Aggregazione = LTRIM(RTRIM(CASE
                    WHEN CHARINDEX('-', AggregazioneRaw) > 0 THEN SUBSTRING(AggregazioneRaw, CHARINDEX('-', AggregazioneRaw) + 1, 4000)
                    ELSE N''
                END)),
                TipoAggregazione
            FROM SourceRows
        ),
        RankedRows AS (
            SELECT
                AnnoSnapshot,
                MeseSnapshot,
                AnnoRiferimento,
                MeseRiferimento,
                InseritoIl,
                TotaleFatturato,
                TotaleFatturatoFuturo,
                TotaleComplessivo,
                Budget,
                Aggregazione,
                BusinessUnit,
                TipoAggregazione,
                rn = ROW_NUMBER() OVER (
                    PARTITION BY AnnoRiferimento, MeseRiferimento, BusinessUnit, Aggregazione
                    ORDER BY MeseSnapshot DESC, InseritoIl DESC
                )
            FROM ParsedRows
            WHERE LEN(BusinessUnit) > 0
              AND LEN(Aggregazione) > 0
              AND (@BusinessUnit IS NULL OR BusinessUnit = @BusinessUnit)
              AND (@Rcc IS NULL OR Aggregazione = @Rcc)
        )
        SELECT
            AnnoSnapshot,
            MeseSnapshot,
            AnnoRiferimento,
            MeseRiferimento,
            InseritoIl,
            TotaleFatturato,
            TotaleFatturatoFuturo,
            TotaleComplessivo,
            Budget,
            Aggregazione,
            BusinessUnit,
            TipoAggregazione
        FROM RankedRows
        WHERE rn = 1
        ORDER BY BusinessUnit, Aggregazione, MeseRiferimento
        """;

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

    public async Task<IReadOnlyCollection<AnalisiRccMensileBurccSnapshotRow>> GetRisultatoMensileBurccSnapshotAsync(
        int annoSnapshot,
        string? businessUnit,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default)
    {
        var rawRows = await GetRisultatoMensileSnapshotByAggregazioneAsync(
            annoSnapshot,
            SnapshotMensileTipoBurcc,
            null,
            null,
            new[] { "Aggregazione", "RCC", "rcc", "IDBUSINESSUNIT", "idbusinessunit" },
            cancellationToken);

        if (rawRows.Count == 0)
        {
            rawRows = await GetRisultatoMensileBurccSnapshotFallbackAsync(
                annoSnapshot,
                cancellationToken);
        }

        var requestedBusinessUnit = businessUnit?.Trim();
        var requestedRcc = rcc?.Trim();
        var allowedBusinessUnitSet = BuildAllowedSet(allowedBusinessUnits);
        if (allowedBusinessUnitSet is { Count: 0 })
        {
            return [];
        }

        var rows = BuildBurccRows(
            rawRows,
            requestedBusinessUnit,
            requestedRcc,
            allowedBusinessUnitSet);

        if (rows.Count == 0)
        {
            var fallbackRows = await GetRisultatoMensileBurccSnapshotFallbackAsync(
                annoSnapshot,
                cancellationToken);

            rows = BuildBurccRows(
                fallbackRows,
                requestedBusinessUnit,
                requestedRcc,
                allowedBusinessUnitSet);
        }

        return rows
            .OrderBy(item => item.AnnoSnapshot)
            .ThenBy(item => item.MeseSnapshot)
            .ThenBy(item => item.BusinessUnit, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Rcc, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    public async Task<IReadOnlyCollection<AnalisiRccPianoFatturazioneRow>> GetPianoFatturazioneMensileAsync(
        int annoSnapshot,
        IReadOnlyCollection<int>? mesiSnapshot,
        string? businessUnit,
        string? rcc,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || annoSnapshot <= 0)
        {
            return [];
        }

        var normalizedMesiSnapshot = (mesiSnapshot ?? [])
            .Where(value => value >= 1 && value <= 12)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();
        if (normalizedMesiSnapshot.Length == 0)
        {
            normalizedMesiSnapshot = Enumerable.Range(1, 12).ToArray();
        }

        var snapshotParamNames = normalizedMesiSnapshot
            .Select((_, index) => $"@MeseSnapshot{index}")
            .ToArray();
        var normalizedBusinessUnit = businessUnit?.Trim();
        var normalizedRcc = rcc?.Trim();
        var queryIsBurcc = !string.IsNullOrWhiteSpace(normalizedBusinessUnit);
        var sql = string.Format(
            CultureInfo.InvariantCulture,
            queryIsBurcc ? PianoFatturazioneBurccQuery : PianoFatturazioneBaseQuery,
            string.Join(", ", snapshotParamNames));

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new SqlCommand(sql, connection);
        command.CommandType = CommandType.Text;
        command.Parameters.AddWithValue("@AnnoSnapshot", annoSnapshot);
        command.Parameters.AddWithValue("@TipoAggregazione", queryIsBurcc ? PianoFatturazioneTipoBurcc : PianoFatturazioneTipoRcc);
        command.Parameters.AddWithValue("@BusinessUnit", NormalizeForSql(normalizedBusinessUnit));
        command.Parameters.AddWithValue("@Rcc", NormalizeForSql(normalizedRcc));

        for (var index = 0; index < normalizedMesiSnapshot.Length; index += 1)
        {
            command.Parameters.AddWithValue(snapshotParamNames[index], normalizedMesiSnapshot[index]);
        }

        var rows = new List<AnalisiRccPianoFatturazioneRow>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var aggregationValue = ReadString(reader, "Aggregazione", "aggregazione");
            if (string.IsNullOrWhiteSpace(aggregationValue))
            {
                continue;
            }

            var meseRiferimento = ReadNullableInt(reader, "MeseRiferimento", "meseRiferimento", "mese")
                ?? 0;
            if (meseRiferimento is < 1 or > 12)
            {
                continue;
            }

            var row = new AnalisiRccPianoFatturazioneRow(
                AnnoSnapshot: ReadNullableInt(reader, "AnnoSnapshot", "annoSnapshot", "anno")
                    ?? annoSnapshot,
                MeseSnapshot: ReadNullableInt(reader, "MeseSnapshot", "meseSnapshot", "mese")
                    ?? 0,
                AnnoRiferimento: ReadNullableInt(reader, "AnnoRiferimento", "annoRiferimento")
                    ?? annoSnapshot,
                MeseRiferimento: meseRiferimento,
                InseritoIl: ReadNullableDateTime(reader, "InseritoIl", "inseritoIl"),
                TotaleFatturato: ReadDecimal(reader, "TotaleFatturato", "totale_fatturato"),
                TotaleFatturatoFuturo: ReadDecimal(reader, "TotaleFatturatoFuturo", "totale_fatturato_futuro"),
                TotaleComplessivo: ReadDecimal(reader, "TotaleComplessivo", "totale_complessivo"),
                Budget: ReadDecimal(reader, "Budget", "budget"),
                Aggregazione: aggregationValue.Trim(),
                BusinessUnit: ReadString(reader, "BusinessUnit", "businessUnit", "IDBUSINESSUNIT", "idbusinessunit"),
                TipoAggregazione: ReadString(reader, "TipoAggregazione", "tipoAggregazione"));
            rows.Add(row);
        }

        return rows
            .OrderBy(item => item.BusinessUnit, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Aggregazione, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.MeseRiferimento)
            .ThenByDescending(item => item.MeseSnapshot)
            .ToArray();
    }

    private async Task<IReadOnlyCollection<AnalisiRccMensileSnapshotRow>> GetRisultatoMensileBurccSnapshotFallbackAsync(
        int annoSnapshot,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || annoSnapshot <= 0)
        {
            return [];
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(SnapshotMensileBurccFallbackQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@AnnoSnapshot", annoSnapshot);
            command.Parameters.AddWithValue("@TipoAggregazione", SnapshotMensileTipoBurcc);

            var rows = new List<AnalisiRccMensileSnapshotRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var aggregazioneValue = ReadString(reader, "Aggregazione", "aggregazione");
                if (string.IsNullOrWhiteSpace(aggregazioneValue))
                {
                    continue;
                }

                var anno = ReadNullableInt(reader, "AnnoSnapshot", "annoSnapshot", "anno")
                    ?? annoSnapshot;
                var mese = ReadNullableInt(reader, "MeseSnapshot", "meseSnapshot", "mese")
                    ?? 0;
                if (mese <= 0)
                {
                    continue;
                }

                var budget = ReadDecimal(reader, "Budget", "budget");
                var fatturato = ReadDecimal(reader, "Fatturato", "totale_fatturato");
                var fatturatoFuturo = ReadDecimal(reader, "FatturatoFuturo", "totale_fatturato_futuro");
                var ricavoIpoteticoPesato = ReadDecimal(reader, "RicavoIpoteticoPesato", "totale_ricavo_ipotetico_pesato");
                var totaleRisultatoPesato = fatturato + fatturatoFuturo + ricavoIpoteticoPesato;
                var percentualePesato = budget == 0m
                    ? 0m
                    : totaleRisultatoPesato / budget;

                rows.Add(new AnalisiRccMensileSnapshotRow(
                    aggregazioneValue,
                    anno,
                    mese,
                    budget,
                    totaleRisultatoPesato,
                    percentualePesato));
            }

            return rows;
        }
        catch
        {
            return [];
        }
    }

    private static List<AnalisiRccMensileBurccSnapshotRow> BuildBurccRows(
        IReadOnlyCollection<AnalisiRccMensileSnapshotRow> rawRows,
        string? requestedBusinessUnit,
        string? requestedRcc,
        HashSet<string>? allowedBusinessUnitSet)
    {
        var rows = new List<AnalisiRccMensileBurccSnapshotRow>();
        foreach (var raw in rawRows)
        {
            var (businessUnitValue, rccValue) = SplitBurccAggregation(raw.Rcc);
            if (string.IsNullOrWhiteSpace(businessUnitValue) || string.IsNullOrWhiteSpace(rccValue))
            {
                continue;
            }

            if (!string.IsNullOrWhiteSpace(requestedBusinessUnit) &&
                !businessUnitValue.Equals(requestedBusinessUnit, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (!string.IsNullOrWhiteSpace(requestedRcc) &&
                !rccValue.Equals(requestedRcc, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (allowedBusinessUnitSet is not null &&
                !allowedBusinessUnitSet.Contains(businessUnitValue))
            {
                continue;
            }

            rows.Add(new AnalisiRccMensileBurccSnapshotRow(
                businessUnitValue,
                rccValue,
                raw.AnnoSnapshot,
                raw.MeseSnapshot,
                raw.Budget,
                raw.TotaleRisultatoPesato,
                raw.PercentualePesato));
        }

        return rows;
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

    public async Task<IReadOnlyCollection<AnalisiRccPivotBurccRow>> GetPivotFatturatoBurccAsync(
        int idRisorsa,
        int anno,
        string? businessUnit,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || anno <= 0)
        {
            return [];
        }

        var requestedBusinessUnit = businessUnit?.Trim();
        var requestedRcc = rcc?.Trim();
        var allowedBusinessUnitSet = BuildAllowedSet(allowedBusinessUnits);
        if (allowedBusinessUnitSet is { Count: 0 })
        {
            return [];
        }

        var idRisorsaParam = idRisorsa > 0
            ? idRisorsa
            : DefaultAnalisiIdRisorsa;

        var filterClauses = new List<string>
        {
            $"anno = {anno}"
        };

        if (!string.IsNullOrWhiteSpace(requestedBusinessUnit))
        {
            filterClauses.Add($"IDBUSINESSUNIT = {SqlQuote(requestedBusinessUnit)}");
        }

        if (!string.IsNullOrWhiteSpace(requestedRcc))
        {
            filterClauses.Add($"RCC = {SqlQuote(requestedRcc)}");
        }

        if (allowedBusinessUnitSet is not null && allowedBusinessUnitSet.Count > 0)
        {
            filterClauses.Add($"IDBUSINESSUNIT in ({string.Join(", ", allowedBusinessUnitSet.Select(SqlQuote))})");
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
            command.Parameters.AddWithValue("@CampoAggregazione", "BURCC");

            var rows = new List<AnalisiRccPivotBurccRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            do
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    var annoValue = ReadNullableInt(reader, "anno")
                        ?? ReadNullableInt(reader, "Anno")
                        ?? anno;

                    var businessUnitValue = ReadString(reader, "IDBUSINESSUNIT", "idbusinessunit", "BusinessUnit");
                    var rccValue = ReadString(reader, "RCC", "rcc");

                    if (string.IsNullOrWhiteSpace(businessUnitValue) || string.IsNullOrWhiteSpace(rccValue))
                    {
                        var aggregazione = ReadString(reader, "Aggregazione");
                        var parsed = SplitBurccAggregation(aggregazione);
                        if (string.IsNullOrWhiteSpace(businessUnitValue))
                        {
                            businessUnitValue = parsed.BusinessUnit;
                        }

                        if (string.IsNullOrWhiteSpace(rccValue))
                        {
                            rccValue = parsed.Rcc;
                        }
                    }

                    if (string.IsNullOrWhiteSpace(businessUnitValue) || string.IsNullOrWhiteSpace(rccValue))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(requestedBusinessUnit) &&
                        !businessUnitValue.Equals(requestedBusinessUnit, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(requestedRcc) &&
                        !rccValue.Equals(requestedRcc, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (allowedBusinessUnitSet is not null &&
                        !allowedBusinessUnitSet.Contains(businessUnitValue))
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

                    rows.Add(new AnalisiRccPivotBurccRow(
                        annoValue,
                        businessUnitValue.Trim(),
                        rccValue.Trim(),
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

            return rows
                .OrderBy(item => item.Anno)
                .ThenBy(item => item.BusinessUnit, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Rcc, StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            return [];
        }
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
        string? businessUnit,
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
        var businessUnitFilter = businessUnit?.Trim();
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

        if (!string.IsNullOrWhiteSpace(businessUnitFilter))
        {
            filterClauses.Add($"idbusinessunit = {SqlQuote(businessUnitFilter)}");
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
                    var businessUnitValue = ReadString(reader, "idbusinessunit", "IDBUSINESSUNIT");
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

                    if (!string.IsNullOrWhiteSpace(businessUnitFilter) &&
                        !businessUnitValue.Equals(businessUnitFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    rows.Add(new AnalisiRccFunnelRow(
                        businessUnitValue,
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

    public async Task<IReadOnlyCollection<AnalisiRccDettaglioFatturatoRow>> GetDettaglioFatturatoAsync(
        int idRisorsa,
        IReadOnlyCollection<int>? anni,
        string? commessa,
        string? commessaSearch,
        string? provenienza,
        string? controparte,
        string? businessUnit,
        string? rcc,
        string? pm,
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
        var commessaFilter = commessa?.Trim();
        var commessaSearchFilter = commessaSearch?.Trim();
        var provenienzaFilter = provenienza?.Trim();
        var controparteFilter = controparte?.Trim();
        var businessUnitFilter = businessUnit?.Trim();
        var rccFilter = rcc?.Trim();
        var pmFilter = pm?.Trim();
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

        if (!string.IsNullOrWhiteSpace(commessaFilter))
        {
            filterClauses.Add($"commessa = {SqlQuote(commessaFilter)}");
        }

        if (!string.IsNullOrWhiteSpace(commessaSearchFilter))
        {
            filterClauses.Add($"commessa like {SqlQuote($"%{commessaSearchFilter}%")}");
        }

        if (!string.IsNullOrWhiteSpace(provenienzaFilter))
        {
            filterClauses.Add($"provenienza = {SqlQuote(provenienzaFilter)}");
        }

        if (!string.IsNullOrWhiteSpace(controparteFilter))
        {
            filterClauses.Add($"controparte = {SqlQuote(controparteFilter)}");
        }

        if (!string.IsNullOrWhiteSpace(businessUnitFilter))
        {
            filterClauses.Add($"IDBUSINESSUNIT = {SqlQuote(businessUnitFilter)}");
        }

        if (!string.IsNullOrWhiteSpace(rccFilter))
        {
            filterClauses.Add($"RCC = {SqlQuote(rccFilter)}");
        }

        if (!string.IsNullOrWhiteSpace(pmFilter))
        {
            filterClauses.Add($"PM = {SqlQuote(pmFilter)}");
        }

        var filter = string.Join(" AND ", filterClauses);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            var commessaMap = await LoadCommesseRccPmMapAsync(connection, cancellationToken);

            await using var command = new SqlCommand(PivotFatturatoStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@idrisorsa", idRisorsaParam);
            command.Parameters.AddWithValue("@tiporicerca", "Fatturato");
            command.Parameters.AddWithValue("@FiltroDaApplicare", string.IsNullOrWhiteSpace(filter) ? DBNull.Value : filter);
            command.Parameters.AddWithValue("@CampoAggregazione", DBNull.Value);

            var rows = new List<AnalisiRccDettaglioFatturatoRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            do
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    var dataValue = ReadNullableDateTime(reader, "data", "Data");
                    var annoValue = ReadNullableInt(reader, "anno", "Anno") ?? (dataValue?.Year ?? 0);
                    var commessaValue = ReadString(reader, "COMMESSA", "commessa");
                    if (string.IsNullOrWhiteSpace(commessaValue))
                    {
                        continue;
                    }

                    var descrizioneCommessa = ReadString(reader, "descrizionecommessa", "DescrizioneCommessa", "descrizione", "Descrizione");
                    var businessUnitValue = ReadString(reader, "IDBUSINESSUNIT", "idbusinessunit", "BusinessUnit");
                    var controparteValue = ReadString(reader, "controparte", "Controparte");
                    var provenienzaValue = ReadString(reader, "provenienza", "Provenienza");
                    var rccValue = ReadString(reader, "RCC", "rcc");
                    var pmValue = ReadString(reader, "PM", "pm");

                    if (commessaMap.TryGetValue(commessaValue, out var fallback))
                    {
                        if (string.IsNullOrWhiteSpace(descrizioneCommessa))
                        {
                            descrizioneCommessa = fallback.DescrizioneCommessa;
                        }

                        if (string.IsNullOrWhiteSpace(rccValue))
                        {
                            rccValue = fallback.Rcc;
                        }

                        if (string.IsNullOrWhiteSpace(pmValue))
                        {
                            pmValue = fallback.Pm;
                        }
                    }

                    if (selectedYears.Count > 0 && (annoValue <= 0 || !selectedYears.Contains(annoValue)))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(commessaFilter) &&
                        !commessaValue.Equals(commessaFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(commessaSearchFilter))
                    {
                        var commessaContains = commessaValue.Contains(commessaSearchFilter, StringComparison.OrdinalIgnoreCase);
                        var descrizioneContains = descrizioneCommessa.Contains(commessaSearchFilter, StringComparison.OrdinalIgnoreCase);
                        if (!commessaContains && !descrizioneContains)
                        {
                            continue;
                        }
                    }

                    if (!string.IsNullOrWhiteSpace(provenienzaFilter) &&
                        !provenienzaValue.Equals(provenienzaFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(controparteFilter) &&
                        !controparteValue.Equals(controparteFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(businessUnitFilter) &&
                        !businessUnitValue.Equals(businessUnitFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(rccFilter) &&
                        !rccValue.Equals(rccFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(pmFilter) &&
                        !pmValue.Equals(pmFilter, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    rows.Add(new AnalisiRccDettaglioFatturatoRow(
                        annoValue,
                        dataValue,
                        commessaValue,
                        descrizioneCommessa,
                        businessUnitValue,
                        controparteValue,
                        provenienzaValue,
                        ReadDecimal(reader, "fatturato", "Fatturato", "fatturato_emesso"),
                        ReadDecimal(reader, "fatturato_futuro", "FatturatoFuturo", "futura_anno"),
                        ReadDecimal(reader, "ricavo_ipotetico", "Ricavo_ipotetico", "totale_ricavo_ipotetico"),
                        rccValue,
                        pmValue,
                        ReadString(reader, "DescrizioneMastro", "descrizionemastro"),
                        ReadString(reader, "DescrizioneConto", "descrizioneconto"),
                        ReadString(reader, "DescrizioneSottoconto", "descrizionesottoconto")));
                }
            }
            while (await reader.NextResultAsync(cancellationToken));

            return rows
                .OrderByDescending(item => item.Anno)
                .ThenBy(item => item.Data)
                .ThenBy(item => item.Commessa, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Provenienza, StringComparer.OrdinalIgnoreCase)
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

    public async Task<IReadOnlyCollection<AnalisiRccPivotFunnelRow>> GetPivotFunnelBurccAsync(
        int idRisorsa,
        int anno,
        string? businessUnit,
        string? rcc,
        IReadOnlyCollection<string>? allowedBusinessUnits = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || anno <= 0)
        {
            return [];
        }

        var requestedBusinessUnitValue = businessUnit?.Trim();
        var requestedRccValue = rcc?.Trim();
        var allowedBusinessUnitSet = BuildAllowedSet(allowedBusinessUnits);
        if (allowedBusinessUnitSet is { Count: 0 })
        {
            return [];
        }

        var idRisorsaParam = idRisorsa > 0
            ? idRisorsa
            : DefaultAnalisiIdRisorsa;

        var filterClauses = new List<string>
        {
            $"anno = {anno}"
        };
        if (!string.IsNullOrWhiteSpace(requestedBusinessUnitValue))
        {
            filterClauses.Add($"IDBUSINESSUNIT = {SqlQuote(requestedBusinessUnitValue)}");
        }
        if (!string.IsNullOrWhiteSpace(requestedRccValue))
        {
            filterClauses.Add($"RCC = {SqlQuote(requestedRccValue)}");
        }
        if (allowedBusinessUnitSet is not null && allowedBusinessUnitSet.Count > 0)
        {
            filterClauses.Add($"IDBUSINESSUNIT in ({string.Join(", ", allowedBusinessUnitSet.Select(SqlQuote))})");
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
            command.Parameters.AddWithValue("@CampoAggregazione", "BURCC");

            var rows = new List<AnalisiRccPivotFunnelRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            do
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    var annoValue = ReadNullableInt(reader, "anno", "Anno") ?? anno;
                    var businessUnitValue = ReadString(reader, "IDBUSINESSUNIT", "idbusinessunit", "BusinessUnit", "bu");
                    var rccValue = ReadString(reader, "RCC", "rcc");
                    if (string.IsNullOrWhiteSpace(businessUnitValue) || string.IsNullOrWhiteSpace(rccValue))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(requestedBusinessUnitValue) &&
                        !businessUnitValue.Equals(requestedBusinessUnitValue, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(requestedRccValue) &&
                        !rccValue.Equals(requestedRccValue, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (allowedBusinessUnitSet is not null &&
                        !allowedBusinessUnitSet.Contains(businessUnitValue))
                    {
                        continue;
                    }

                    rows.Add(new AnalisiRccPivotFunnelRow(
                        annoValue,
                        $"{businessUnitValue.Trim()} - {rccValue.Trim()}",
                        ReadString(reader, "tipo", "Tipo"),
                        ReadString(reader, "documentostato", "DocumentoStato", "statoDocumento", "tipodocumento", "TipoDocumento"),
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
                .ThenBy(item => item.TipoDocumento, StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            return [];
        }
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
                        ReadString(reader, "documentostato", "DocumentoStato", "statoDocumento", "tipodocumento", "TipoDocumento"),
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
                .ThenBy(item => item.TipoDocumento, StringComparer.OrdinalIgnoreCase)
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

            await reader.CloseAsync();

            if (campoAggregazione.Equals("BUSINESSUNIT", StringComparison.OrdinalIgnoreCase) &&
                rows.Any(item => item.BudgetPrevisto == 0m))
            {
                var budgetByBusinessUnit = await LoadBudgetByBusinessUnitAsync(connection, anno, cancellationToken);
                if (budgetByBusinessUnit.Count > 0)
                {
                    rows = rows
                        .Select(item =>
                        {
                            if (item.BudgetPrevisto != 0m)
                            {
                                return item;
                            }

                            if (!budgetByBusinessUnit.TryGetValue(item.Rcc, out var fallbackBudget) || fallbackBudget == 0m)
                            {
                                return item;
                            }

                            var percentualeCertaRaggiunta = item.TotaleFatturatoCerto / fallbackBudget;
                            var percentualeCompresoRicavoIpotetico = item.TotaleIpotetico / fallbackBudget;

                            return item with
                            {
                                BudgetPrevisto = fallbackBudget,
                                MargineColBudget = item.TotaleFatturatoCerto - fallbackBudget,
                                PercentualeCertaRaggiunta = percentualeCertaRaggiunta,
                                PercentualeCompresoRicavoIpotetico = percentualeCompresoRicavoIpotetico
                            };
                        })
                        .ToList();
                }
            }

            return rows;
        }
        catch
        {
            return [];
        }
    }

    private static (string BusinessUnit, string Rcc) SplitBurccAggregation(string? value)
    {
        var raw = value?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(raw))
        {
            return (string.Empty, string.Empty);
        }

        var separatorIndex = raw.IndexOf('-', StringComparison.Ordinal);
        if (separatorIndex <= 0 || separatorIndex >= raw.Length - 1)
        {
            return (string.Empty, string.Empty);
        }

        var businessUnit = raw[..separatorIndex].Trim();
        var rcc = raw[(separatorIndex + 1)..].Trim();
        return string.IsNullOrWhiteSpace(businessUnit) || string.IsNullOrWhiteSpace(rcc)
            ? (string.Empty, string.Empty)
            : (businessUnit, rcc);
    }

    private static async Task<Dictionary<string, (string DescrizioneCommessa, string Rcc, string Pm)>> LoadCommesseRccPmMapAsync(
        SqlConnection connection,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(CommesseRccPmLookupQuery, connection);
        var map = new Dictionary<string, (string DescrizioneCommessa, string Rcc, string Pm)>(StringComparer.OrdinalIgnoreCase);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var commessa = ReadString(reader, "Commessa", "COMMESSA", "commessa");
            if (string.IsNullOrWhiteSpace(commessa))
            {
                continue;
            }

            map[commessa] = (
                ReadString(reader, "DescrizioneCommessa", "descrizione"),
                ReadString(reader, "Rcc", "RCC", "rcc"),
                ReadString(reader, "Pm", "PM", "pm"));
        }

        return map;
    }

    private static async Task<Dictionary<string, decimal>> LoadBudgetByBusinessUnitAsync(
        SqlConnection connection,
        int anno,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(BudgetBusinessUnitLookupQuery, connection);
        command.Parameters.AddWithValue("@Anno", anno);

        var map = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var businessUnit = ReadString(reader, "Bu");
            if (string.IsNullOrWhiteSpace(businessUnit))
            {
                continue;
            }

            var budget = ReadDecimal(reader, "Budget");
            map[businessUnit] = budget;
        }

        return map;
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

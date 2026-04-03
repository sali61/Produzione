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

    private const string SnapshotMensileQuery = """
        select *
        from cdg.BiValutazioneRccMensile
        where AnnoSnapshot = @AnnoSnapshot
        order by AnnoSnapshot, MeseSnapshot
        """;

    private const string PivotFatturatoStoredProcedure = "CDG.BIXeniaValutazioneProiezioni";

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
        if (string.IsNullOrWhiteSpace(connectionString) || annoSnapshot <= 0)
        {
            return [];
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(SnapshotMensileQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@AnnoSnapshot", annoSnapshot);
            var rows = new List<AnalisiRccMensileSnapshotRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var tipoAggregazione = ReadString(reader, "TipoAggregazione", "tipoaggregazione");
                if (!string.IsNullOrWhiteSpace(tipoAggregazione) &&
                    !tipoAggregazione.Equals("RCC", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var rccValue = ReadString(reader, "Aggregazione", "RCC", "rcc");
                if (!string.IsNullOrWhiteSpace(rcc) &&
                    !rccValue.Equals(rcc.Trim(), StringComparison.OrdinalIgnoreCase))
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

                if (string.IsNullOrWhiteSpace(rccValue) || mese <= 0)
                {
                    continue;
                }

                rows.Add(new AnalisiRccMensileSnapshotRow(
                    rccValue,
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
        if (string.IsNullOrWhiteSpace(connectionString) || anno <= 0)
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
        if (!string.IsNullOrWhiteSpace(rcc))
        {
            filterClauses.Add($"RCC = {SqlQuote(rcc)}");
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
            command.Parameters.AddWithValue("@CampoAggregazione", "RCC");

            var rows = new List<AnalisiRccPivotFatturatoRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var annoValue = ReadNullableInt(reader, "anno")
                    ?? ReadNullableInt(reader, "Anno")
                    ?? anno;
                var rccValue = ReadString(reader, "RCC", "rcc", "Aggregazione");
                if (string.IsNullOrWhiteSpace(rccValue))
                {
                    continue;
                }

                // Usiamo i campi *_numerico della SP per evitare parsing su stringhe "22.690"/"1.234,56".
                var fatturatoAnno = ReadDecimal(reader, "totale_fatturato_numerico", "totale_fatturato_Numerico");
                var fatturatoFuturoAnno = ReadDecimal(reader, "totale_fatturato_futuro_numerico");
                var totaleFatturatoCerto = ReadDecimal(reader, "totale_complessivo_numerico");
                var budgetPrevisto = ReadDecimal(reader, "Budget_numerico");
                var totaleRicavoIpotetico = ReadDecimal(reader, "totale_ricavo_ipotetico_numerico");
                var totaleRicavoIpoteticoPesato = ReadDecimal(reader, "totale_ricavo_ipotetico_pesato_numerico");
                var totaleConRicavoIpoteticoPesato = ReadDecimal(reader, "totale_con_ricavo_ipotetico_pesato_numerico");
                var percentualeCertaRaggiunta = budgetPrevisto == 0m
                    ? 0m
                    : totaleFatturatoCerto / budgetPrevisto;

                rows.Add(new AnalisiRccPivotFatturatoRow(
                    annoValue,
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

            return rows;
        }
        catch
        {
            return [];
        }
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

    private static string SqlQuote(string value)
    {
        return $"'{value.Trim().Replace("'", "''")}'";
    }

}

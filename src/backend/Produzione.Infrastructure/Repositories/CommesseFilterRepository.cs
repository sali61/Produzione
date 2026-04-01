using System.Data;
using Microsoft.Data.SqlClient;
using Produzione.Application.Abstractions.Persistence;
using Produzione.Application.Common.Profiles;
using Produzione.Application.Models;

namespace Produzione.Infrastructure.Repositories;

public sealed class CommesseFilterRepository(string? connectionString) : ICommesseFilterRepository
{
    private const string ResolveUserContextQuery = """
        select top (1)
            cast(r.ID as int) as IdRisorsa,
            cast(isnull(r.NetUserName, '') as nvarchar(256)) as Username
        from dbo.Risorse r
        where r.DataFine is null
          and (
                upper(isnull(r.NetUserName, '')) = @UsernameUpper
           or (@DomainSuffixPattern is not null and upper(isnull(r.NetUserName, '')) like @DomainSuffixPattern)
              )
        order by
            case
                when upper(isnull(r.NetUserName, '')) = @UsernameUpper then 0
                else 1
            end,
            r.ID
        """;

    private const string ProfileLookupStoredProcedure = "produzione.spIndividuaRuoli";
    private const string SintesiFiltersStoredProcedure = "produzione.spGeneraFiltri";

    private const string ResponsabileOuQuery = """
        select sigla
        from [orga].[vw_OU_OrganigrammaAncestor]
        where id_responsabile_ou_ancestor = @IdRisorsa
        """;

    private const string CommesseBaseQuery = """
        select distinct top (@Take) cast(c.COMMESSA as nvarchar(128)) as Commessa
        from cdg_qryComessaPmRcc c
        where (@Search is null or c.COMMESSA like '%' + @Search + '%')
          and (
                @IsGlobal = 1
                or (@IsPm = 1 and (c.idpm = @IdRisorsa or upper(isnull(c.NetUserNamePM, '')) = @UsernameUpper))
                or (@IsRcc = 1 and (c.idRCC = @IdRisorsa or upper(isnull(c.NetUserNameRCC, '')) = @UsernameUpper))
                or (@IsResponsabileOu = 1 and exists (
                        select 1
                        from [orga].[vw_OU_OrganigrammaAncestor] ou
                        where ou.id_responsabile_ou_ancestor = @IdRisorsa
                          and ou.sigla = c.idBusinessUnit
                    ))
              )
        order by Commessa
        """;

    private const string CommessaExistsQuery = """
        select top (1) 1
        from cdg_qryComessaPmRcc c
        where upper(ltrim(rtrim(isnull(c.COMMESSA, '')))) = @CommessaUpper
        """;

    private const string CommessaAccessQuery = """
        select top (1) 1
        from cdg_qryComessaPmRcc c
        where upper(ltrim(rtrim(isnull(c.COMMESSA, '')))) = @CommessaUpper
          and (
                @IsGlobal = 1
                or (@IsPm = 1 and (c.idpm = @IdRisorsa or upper(isnull(c.NetUserNamePM, '')) = @UsernameUpper))
                or (@IsRcc = 1 and (c.idRCC = @IdRisorsa or upper(isnull(c.NetUserNameRCC, '')) = @UsernameUpper))
                or (@IsResponsabileOu = 1 and exists (
                        select 1
                        from [orga].[vw_OU_OrganigrammaAncestor] ou
                        where ou.id_responsabile_ou_ancestor = @IdRisorsa
                          and ou.sigla = c.idBusinessUnit
                    ))
              )
        """;

    private const string CommessaAnagraficaQuery = """
        select top (1)
            cast(ltrim(rtrim(isnull(c.COMMESSA, ''))) as nvarchar(128)) as Commessa,
            cast(ltrim(rtrim(isnull(c.descrizione, ''))) as nvarchar(512)) as DescrizioneCommessa,
            cast(ltrim(rtrim(isnull(c.tipo_commessa, ''))) as nvarchar(256)) as TipologiaCommessa,
            cast(ltrim(rtrim(isnull(c.stato, ''))) as nvarchar(128)) as Stato,
            cast(ltrim(rtrim(isnull(c.macrotipologia, ''))) as nvarchar(256)) as MacroTipologia,
            cast(
                case
                    when upper(ltrim(rtrim(isnull(c.Nomeprodotto, '')))) in ('NON DEFINITO', 'NON DEFINTO')
                        then ''
                    else ltrim(rtrim(isnull(c.Nomeprodotto, '')))
                end
            as nvarchar(256)) as Prodotto,
            cast(ltrim(rtrim(isnull(c.idBusinessUnit, ''))) as nvarchar(128)) as BusinessUnit,
            cast(ltrim(rtrim(isnull(c.RCC, ''))) as nvarchar(256)) as Rcc,
            cast(ltrim(rtrim(isnull(c.PM, ''))) as nvarchar(256)) as Pm
        from cdg_qryComessaPmRcc c
        where upper(ltrim(rtrim(isnull(c.COMMESSA, '')))) = @CommessaUpper
          and (
                @IsGlobal = 1
                or (@IsPm = 1 and (c.idpm = @IdRisorsa or upper(isnull(c.NetUserNamePM, '')) = @UsernameUpper))
                or (@IsRcc = 1 and (c.idRCC = @IdRisorsa or upper(isnull(c.NetUserNameRCC, '')) = @UsernameUpper))
                or (@IsResponsabileOu = 1 and exists (
                        select 1
                        from [orga].[vw_OU_OrganigrammaAncestor] ou
                        where ou.id_responsabile_ou_ancestor = @IdRisorsa
                          and ou.sigla = c.idBusinessUnit
                    ))
              )
        order by c.data_commessa desc
        """;

    private const string SintesiCommesseStoredProcedure = "produzione.spSintesiCommesse";
    private const string MensileCommesseStoredProcedure = "produzione.spBixeniaAnalisiMensileCommesse";
    private const string DettaglioCommesseFatturatoStoredProcedure = "produzione.spDettaglioCommesseFatturato";

    private static readonly CommesseSintesiFilters EmptySintesiFilters = new(
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>());

    public async Task<UserContext?> ResolveUserContextAsync(string username, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(username))
        {
            return null;
        }

        await using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        foreach (var candidate in BuildUsernameCandidates(username))
        {
            var resolved = await ResolveSingleCandidateAsync(connection, candidate, cancellationToken);
            if (resolved is not null)
            {
                return resolved;
            }
        }

        return null;
    }

    public async Task<IReadOnlyCollection<string>> GetProfilesAsync(int idRisorsa, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || idRisorsa <= 0)
        {
            return [];
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(ProfileLookupStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@IdRisorsa", idRisorsa);

            var values = new List<string>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var profile = reader["Profilo"]?.ToString()?.Trim();
                if (!string.IsNullOrWhiteSpace(profile))
                {
                    values.Add(ProfileCatalog.Normalize(profile));
                }
            }

            return values
                .Where(ProfileCatalog.IsKnown)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<IReadOnlyCollection<string>> GetResponsabileOuSigleAsync(int idRisorsa, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(ResponsabileOuQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@IdRisorsa", idRisorsa);

            var values = new List<string>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var sigla = reader["sigla"]?.ToString()?.Trim();
                if (!string.IsNullOrWhiteSpace(sigla))
                {
                    values.Add(sigla);
                }
            }

            return values
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<bool> CommessaExistsAsync(string commessa, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(commessa))
        {
            return false;
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommessaExistsQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@CommessaUpper", commessa.Trim().ToUpperInvariant());

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result is not null && result != DBNull.Value;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> CanAccessCommessaAsync(
        UserContext user,
        string profile,
        string commessa,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(commessa))
        {
            return false;
        }

        var visibility = ResolveVisibility(profile);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommessaAccessQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@CommessaUpper", commessa.Trim().ToUpperInvariant());
            ApplyVisibilityParameters(command, user, visibility);

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result is not null && result != DBNull.Value;
        }
        catch
        {
            return false;
        }
    }

    public async Task<CommessaAnagraficaRow?> GetCommessaAnagraficaAsync(
        UserContext user,
        string profile,
        string commessa,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(commessa))
        {
            return null;
        }

        var visibility = ResolveVisibility(profile);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommessaAnagraficaQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@CommessaUpper", commessa.Trim().ToUpperInvariant());
            ApplyVisibilityParameters(command, user, visibility);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            return new CommessaAnagraficaRow(
                ReadString(reader, "Commessa"),
                ReadString(reader, "DescrizioneCommessa"),
                ReadString(reader, "TipologiaCommessa"),
                ReadString(reader, "Stato"),
                ReadString(reader, "MacroTipologia"),
                ReadString(reader, "Prodotto"),
                ReadString(reader, "BusinessUnit"),
                ReadString(reader, "Rcc"),
                ReadString(reader, "Pm"));
        }
        catch
        {
            return null;
        }
    }

    public async Task<IReadOnlyCollection<string>> SearchCommesseAsync(
        UserContext user,
        string profile,
        string? search,
        int take,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        var visibility = ResolveVisibility(profile);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommesseBaseQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@Take", Math.Clamp(take, 1, 300));
            command.Parameters.AddWithValue("@Search", NormalizeForSql(search));
            ApplyVisibilityParameters(command, user, visibility);

            var commesse = new List<string>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var commessa = reader["Commessa"]?.ToString()?.Trim();
                if (!string.IsNullOrWhiteSpace(commessa))
                {
                    commesse.Add(commessa);
                }
            }

            return commesse
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<CommesseSintesiFilters> GetSintesiFiltersAsync(
        UserContext user,
        string profile,
        int? anno,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return EmptySintesiFilters;
        }

        var visibility = ResolveVisibility(profile);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(SintesiFiltersStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            ApplyVisibilityParameters(command, user, visibility);
            command.Parameters.AddWithValue("@Anno", anno.HasValue ? anno.Value : DBNull.Value);
            command.Parameters.AddWithValue("@TakePerFilter", 300);

            var buckets = CreateFilterBuckets();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var key = reader["FilterKey"]?.ToString()?.Trim();
                var value = reader["FilterValue"]?.ToString()?.Trim();
                var label = reader["FilterLabel"]?.ToString()?.Trim();
                if (string.IsNullOrWhiteSpace(key) ||
                    string.IsNullOrWhiteSpace(value) ||
                    string.IsNullOrWhiteSpace(label))
                {
                    continue;
                }

                var normalizedKey = key.ToLowerInvariant();
                if (!buckets.TryGetValue(normalizedKey, out var bucket))
                {
                    continue;
                }

                bucket.Add(new CommesseSintesiFilterOption(value, label));
            }

            return new CommesseSintesiFilters(
                DistinctOptions(buckets["anno"]),
                DistinctOptions(buckets["commessa"]),
                DistinctOptions(buckets["tipologiacommessa"]),
                DistinctOptions(buckets["stato"]),
                DistinctOptions(buckets["macrotipologia"]),
                DistinctOptions(buckets["prodotto"]),
                DistinctOptions(buckets["businessunit"]),
                DistinctOptions(buckets["rcc"]),
                DistinctOptions(buckets["pm"]));
        }
        catch
        {
            return EmptySintesiFilters;
        }
    }

    public async Task<IReadOnlyCollection<CommessaSintesiRow>> SearchSintesiAsync(
        UserContext user,
        string profile,
        CommesseSintesiSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        var visibility = ResolveVisibility(profile);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            var selectedAnni = request.Anni
                .Where(value => value > 0)
                .Distinct()
                .OrderByDescending(value => value)
                .ToArray();
            var filterClause = BuildAnalisiCommesseFilterClause(user, visibility, request);

            await using var command = new SqlCommand(SintesiCommesseStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@IdRisorsa", user.IdRisorsa);
            command.Parameters.AddWithValue("@Anno", selectedAnni.Length == 1 ? selectedAnni[0] : DBNull.Value);
            command.Parameters.AddWithValue("@Aggrega", request.Aggrega ? 1 : 0);
            command.Parameters.AddWithValue("@FiltroDaApplicare",
                string.IsNullOrWhiteSpace(filterClause) ? DBNull.Value : filterClause);
            command.Parameters.AddWithValue("@Take", Math.Clamp(request.Take, 1, 500));

            var rows = new List<CommessaSintesiRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                rows.Add(new CommessaSintesiRow(
                    ReadNullableInt(reader, "anno_competenza"),
                    ReadString(reader, "commessa"),
                    ReadString(reader, "descrizione"),
                    ReadString(reader, "tipo_commessa"),
                    ReadString(reader, "stato"),
                    ReadString(reader, "macrotipologia"),
                    ReadString(reader, "Nomeprodotto"),
                    ReadString(reader, "idbusinessunit"),
                    ReadString(reader, "RCC"),
                    ReadString(reader, "PM"),
                    ReadDecimal(reader, "ore_lavorate"),
                    ReadDecimal(reader, "costo_personale"),
                    ReadDecimal(reader, "ricavi"),
                    ReadDecimal(reader, "costi"),
                    ReadDecimal(reader, "utile_specifico"),
                    ReadDecimal(reader, "ricavi_futuri"),
                    ReadDecimal(reader, "costi_futuri")));
            }

            return rows
                .OrderBy(item => item.Commessa)
                .ThenBy(item => item.Anno)
                .Take(Math.Clamp(request.Take, 1, 500))
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<CommessaFatturatoDettaglio> GetCommessaFatturatoDettaglioAsync(
        UserContext user,
        string commessa,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(commessa))
        {
            return new CommessaFatturatoDettaglio(
                Array.Empty<CommessaFatturaMovimentoRow>(),
                Array.Empty<CommessaFatturaMovimentoRow>(),
                Array.Empty<CommessaFatturatoPivotRow>());
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(DettaglioCommesseFatturatoStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@IdRisorsa", user.IdRisorsa);
            command.Parameters.AddWithValue("@Commessa", commessa.Trim());
            command.Parameters.AddWithValue("@DataRiferimento", DateTime.Today);

            var vendite = new List<CommessaFatturaMovimentoRow>();
            var acquisti = new List<CommessaFatturaMovimentoRow>();
            var pivot = new List<CommessaFatturatoPivotRow>();

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);

            while (await reader.ReadAsync(cancellationToken))
            {
                vendite.Add(new CommessaFatturaMovimentoRow(
                    ReadNullableDate(reader, "DataMovimento"),
                    ReadString(reader, "NumeroDocumento"),
                    ReadString(reader, "Descrizione"),
                    ReadString(reader, "Controparte"),
                    ReadString(reader, "Provenienza"),
                    ReadDecimal(reader, "Importo"),
                    ReadBoolean(reader, "IsFuture"),
                    ReadString(reader, "StatoTemporale")));
            }

            if (await reader.NextResultAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    acquisti.Add(new CommessaFatturaMovimentoRow(
                        ReadNullableDate(reader, "DataMovimento"),
                        ReadString(reader, "NumeroDocumento"),
                        ReadString(reader, "Descrizione"),
                        ReadString(reader, "Controparte"),
                        ReadString(reader, "Provenienza"),
                        ReadDecimal(reader, "Importo"),
                        ReadBoolean(reader, "IsFuture"),
                        ReadString(reader, "StatoTemporale")));
                }
            }

            if (await reader.NextResultAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    pivot.Add(new CommessaFatturatoPivotRow(
                        ReadNullableInt(reader, "anno"),
                        ReadString(reader, "RCC"),
                        ReadString(reader, "totale_fatturato"),
                        ReadString(reader, "totale_fatturato_futuro"),
                        ReadString(reader, "totale_ricavo_ipotetico"),
                        ReadString(reader, "totale_ricavo_ipotetico_pesato"),
                        ReadString(reader, "totale_complessivo"),
                        ReadString(reader, "Budget"),
                        ReadString(reader, "percentuale_raggiungimento")));
                }
            }

            return new CommessaFatturatoDettaglio(
                vendite
                    .OrderBy(item => item.DataMovimento)
                    .ThenBy(item => item.NumeroDocumento)
                    .ToArray(),
                acquisti
                    .OrderBy(item => item.DataMovimento)
                    .ThenBy(item => item.NumeroDocumento)
                    .ToArray(),
                pivot
                    .OrderBy(item => item.Anno)
                    .ThenBy(item => item.Rcc)
                    .ToArray());
        }
        catch
        {
            return new CommessaFatturatoDettaglio(
                Array.Empty<CommessaFatturaMovimentoRow>(),
                Array.Empty<CommessaFatturaMovimentoRow>(),
                Array.Empty<CommessaFatturatoPivotRow>());
        }
    }

    public async Task<CommessaDettaglioProgressivoCorrente?> GetCommessaProgressivoAnnoCorrenteAsync(
        UserContext user,
        string profile,
        string commessa,
        int anno,
        int meseCorrente,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) ||
            string.IsNullOrWhiteSpace(commessa) ||
            anno <= 0 ||
            meseCorrente <= 0)
        {
            return null;
        }

        var visibility = ResolveVisibility(profile);
        var clauses = new List<string>();
        AddStringClause(clauses, "commessa", commessa);
        clauses.Add($"anno_competenza = {anno}");
        clauses.Add($"mese_competenza <= {Math.Clamp(meseCorrente, 1, 12)}");

        var visibilityClause = BuildVisibilityClause(user, visibility);
        if (!string.IsNullOrWhiteSpace(visibilityClause))
        {
            clauses.Add(visibilityClause);
        }

        var filtro = string.Join(" AND ", clauses);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(MensileCommesseStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@idrisorsa", user.IdRisorsa);
            command.Parameters.AddWithValue("@tiporicerca", "AnalisiCommessa");
            command.Parameters.AddWithValue(
                "@FiltroDaApplicare",
                string.IsNullOrWhiteSpace(filtro) ? DBNull.Value : filtro);
            command.Parameters.AddWithValue("@CampoAggregazione", DBNull.Value);

            var oreLavorate = 0m;
            var costoPersonale = 0m;
            var ricavi = 0m;
            var costi = 0m;
            var utileSpecifico = 0m;

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                oreLavorate += ReadDecimal(reader, "ore_lavorate");
                costoPersonale += ReadDecimal(reader, "costo_personale");
                ricavi += ReadDecimal(reader, "ricavi");
                costi += ReadDecimal(reader, "costi");
                utileSpecifico += ReadDecimal(reader, "utile_specifico");
            }

            return new CommessaDettaglioProgressivoCorrente(
                anno,
                Math.Clamp(meseCorrente, 1, 12),
                oreLavorate,
                costoPersonale,
                ricavi,
                costi,
                utileSpecifico,
                0m,
                0m);
        }
        catch
        {
            return null;
        }
    }

    private static IReadOnlyCollection<string> BuildUsernameCandidates(string username)
    {
        var candidates = new List<string>();

        static void AddCandidate(ICollection<string> values, string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return;
            }

            values.Add(value.Trim());
        }

        var normalized = username.Trim();
        AddCandidate(candidates, normalized);

        var slashNormalized = normalized.Replace('/', '\\');
        AddCandidate(candidates, slashNormalized);

        var afterDomain = slashNormalized.Contains('\\', StringComparison.Ordinal)
            ? slashNormalized[(slashNormalized.LastIndexOf('\\') + 1)..]
            : slashNormalized;
        AddCandidate(candidates, afterDomain);

        var beforeAt = slashNormalized.Contains('@', StringComparison.Ordinal)
            ? slashNormalized[..slashNormalized.IndexOf('@')]
            : slashNormalized;
        AddCandidate(candidates, beforeAt);

        if (afterDomain.Contains('@', StringComparison.Ordinal))
        {
            AddCandidate(candidates, afterDomain[..afterDomain.IndexOf('@')]);
        }

        return candidates
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static async Task<UserContext?> ResolveSingleCandidateAsync(
        SqlConnection connection,
        string candidate,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(candidate))
        {
            return null;
        }

        var candidateUpper = candidate.Trim().ToUpperInvariant();
        var domainSuffixPattern = candidate.Contains('\\', StringComparison.Ordinal) || candidate.Contains('@', StringComparison.Ordinal)
            ? null
            : $"%\\{candidateUpper}";

        await using var command = new SqlCommand(ResolveUserContextQuery, connection);
        command.CommandType = CommandType.Text;
        command.Parameters.AddWithValue("@UsernameUpper", candidateUpper);
        command.Parameters.AddWithValue("@DomainSuffixPattern", domainSuffixPattern is null ? DBNull.Value : domainSuffixPattern);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var idRisorsa = reader["IdRisorsa"] == DBNull.Value ? 0 : Convert.ToInt32(reader["IdRisorsa"]);
        var resolvedUsername = reader["Username"]?.ToString()?.Trim();
        if (idRisorsa <= 0 || string.IsNullOrWhiteSpace(resolvedUsername))
        {
            return null;
        }

        return new UserContext(idRisorsa, resolvedUsername, null, Array.Empty<string>());
    }

    private static void ApplyVisibilityParameters(SqlCommand command, UserContext user, VisibilityFlags visibility)
    {
        command.Parameters.AddWithValue("@IdRisorsa", user.IdRisorsa);
        command.Parameters.AddWithValue("@UsernameUpper", user.Username.ToUpperInvariant());
        command.Parameters.AddWithValue("@IsGlobal", visibility.IsGlobal ? 1 : 0);
        command.Parameters.AddWithValue("@IsPm", visibility.IsPm ? 1 : 0);
        command.Parameters.AddWithValue("@IsRcc", visibility.IsRcc ? 1 : 0);
        command.Parameters.AddWithValue("@IsResponsabileOu", visibility.IsResponsabileOu ? 1 : 0);
    }

    private static VisibilityFlags ResolveVisibility(string profile)
    {
        var normalizedProfile = ProfileCatalog.Normalize(profile);

        var isGlobal =
            normalizedProfile.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
            normalizedProfile.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase) ||
            normalizedProfile.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
            normalizedProfile.Equals(ProfileCatalog.GeneralProjectManager, StringComparison.OrdinalIgnoreCase);

        var isPm = normalizedProfile.Equals(ProfileCatalog.ProjectManager, StringComparison.OrdinalIgnoreCase);
        var isRcc = normalizedProfile.Equals(ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase);
        var isResponsabileOu = normalizedProfile.Equals(ProfileCatalog.ResponsabileOu, StringComparison.OrdinalIgnoreCase);

        return new VisibilityFlags(isGlobal, isPm, isRcc, isResponsabileOu);
    }

    private static Dictionary<string, List<CommesseSintesiFilterOption>> CreateFilterBuckets()
    {
        return new Dictionary<string, List<CommesseSintesiFilterOption>>(StringComparer.OrdinalIgnoreCase)
        {
            ["anno"] = [],
            ["commessa"] = [],
            ["tipologiacommessa"] = [],
            ["stato"] = [],
            ["macrotipologia"] = [],
            ["prodotto"] = [],
            ["businessunit"] = [],
            ["rcc"] = [],
            ["pm"] = []
        };
    }

    private static IReadOnlyCollection<CommesseSintesiFilterOption> DistinctOptions(IEnumerable<CommesseSintesiFilterOption> options)
    {
        return options
            .GroupBy(option => option.Value, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .ToArray();
    }

    private static object NormalizeForSql(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return DBNull.Value;
        }

        return value.Trim();
    }

    private static string BuildAnalisiCommesseFilterClause(
        UserContext user,
        VisibilityFlags visibility,
        CommesseSintesiSearchRequest request)
    {
        var clauses = new List<string>();
        var selectedAnni = request.Anni
            .Where(value => value > 0)
            .Distinct()
            .OrderByDescending(value => value)
            .ToArray();

        if (selectedAnni.Length > 1)
        {
            clauses.Add($"anno_competenza IN ({string.Join(", ", selectedAnni)})");
        }

        AddStringClause(clauses, "commessa", request.Commessa);
        AddStringClause(clauses, "tipo_commessa", request.TipologiaCommessa);
        AddStringClause(clauses, "stato", request.Stato);
        AddStringClause(clauses, "macrotipologia", request.MacroTipologia);
        AddStringClause(clauses, "Nomeprodotto", request.Prodotto);
        AddStringClause(clauses, "idbusinessunit", request.BusinessUnit);
        AddStringClause(clauses, "RCC", request.Rcc);
        AddStringClause(clauses, "PM", request.Pm);

        var visibilityClause = BuildVisibilityClause(user, visibility);
        if (!string.IsNullOrWhiteSpace(visibilityClause))
        {
            clauses.Add(visibilityClause);
        }

        return string.Join(" AND ", clauses);
    }

    private static string BuildVisibilityClause(UserContext user, VisibilityFlags visibility)
    {
        var clauses = new List<string>();

        if (visibility.IsPm)
        {
            clauses.Add($"idPM = {user.IdRisorsa}");
        }

        if (visibility.IsRcc)
        {
            clauses.Add($"idRCC = {user.IdRisorsa}");
        }

        if (visibility.IsResponsabileOu)
        {
            clauses.Add(
                $"EXISTS (SELECT 1 FROM [orga].[vw_OU_OrganigrammaAncestor] ou WHERE ou.id_responsabile_ou_ancestor = {user.IdRisorsa} AND ou.sigla = idbusinessunit)");
        }

        return string.Join(" AND ", clauses);
    }

    private static void AddStringClause(ICollection<string> clauses, string columnName, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        clauses.Add($"{columnName} = {SqlQuote(value)}");
    }

    private static string SqlQuote(string value)
    {
        return $"'{value.Trim().Replace("'", "''")}'";
    }

    private static int? ReadNullableInt(SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        if (reader.IsDBNull(ordinal))
        {
            return null;
        }

        return Convert.ToInt32(reader.GetValue(ordinal));
    }

    private static string ReadString(SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        if (reader.IsDBNull(ordinal))
        {
            return string.Empty;
        }

        return reader.GetValue(ordinal)?.ToString()?.Trim() ?? string.Empty;
    }

    private static decimal ReadDecimal(SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        if (reader.IsDBNull(ordinal))
        {
            return 0m;
        }

        return Convert.ToDecimal(reader.GetValue(ordinal));
    }

    private static DateTime? ReadNullableDate(SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        if (reader.IsDBNull(ordinal))
        {
            return null;
        }

        return Convert.ToDateTime(reader.GetValue(ordinal));
    }

    private static bool ReadBoolean(SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        if (reader.IsDBNull(ordinal))
        {
            return false;
        }

        return Convert.ToBoolean(reader.GetValue(ordinal));
    }

    private sealed record VisibilityFlags(
        bool IsGlobal,
        bool IsPm,
        bool IsRcc,
        bool IsResponsabileOu);
}

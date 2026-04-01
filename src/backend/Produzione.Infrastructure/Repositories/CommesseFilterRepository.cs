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
                or (@IsPm = 1 and (c.idpm = @IdRisorsa or upper(isnull(c.NetUsernamePM, '')) = @UsernameUpper))
                or (@IsRcc = 1 and (c.idRCC = @IdRisorsa or upper(isnull(c.NetUsernameRCC, '')) = @UsernameUpper))
                or (@IsResponsabileOu = 1 and exists (
                        select 1
                        from [orga].[vw_OU_OrganigrammaAncestor] ou
                        where ou.id_responsabile_ou_ancestor = @IdRisorsa
                          and ou.sigla = c.idBusinessUnit
                    ))
              )
        order by Commessa
        """;

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

        var normalizedProfile = ProfileCatalog.Normalize(profile);
        var isGlobal =
            normalizedProfile.Equals(ProfileCatalog.Supervisore, StringComparison.OrdinalIgnoreCase) ||
            normalizedProfile.Equals(ProfileCatalog.ResponsabileProduzione, StringComparison.OrdinalIgnoreCase) ||
            normalizedProfile.Equals(ProfileCatalog.ResponsabileCommerciale, StringComparison.OrdinalIgnoreCase) ||
            normalizedProfile.Equals(ProfileCatalog.GeneralProjectManager, StringComparison.OrdinalIgnoreCase);

        var isPm = normalizedProfile.Equals(ProfileCatalog.ProjectManager, StringComparison.OrdinalIgnoreCase);
        var isRcc = normalizedProfile.Equals(ProfileCatalog.ResponsabileCommercialeCommessa, StringComparison.OrdinalIgnoreCase);
        var isResponsabileOu = normalizedProfile.Equals(ProfileCatalog.ResponsabileOu, StringComparison.OrdinalIgnoreCase);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommesseBaseQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@Take", Math.Clamp(take, 1, 300));
            command.Parameters.AddWithValue("@Search", string.IsNullOrWhiteSpace(search) ? DBNull.Value : search.Trim());
            command.Parameters.AddWithValue("@IdRisorsa", user.IdRisorsa);
            command.Parameters.AddWithValue("@UsernameUpper", user.Username.ToUpperInvariant());
            command.Parameters.AddWithValue("@IsGlobal", isGlobal ? 1 : 0);
            command.Parameters.AddWithValue("@IsPm", isPm ? 1 : 0);
            command.Parameters.AddWithValue("@IsRcc", isRcc ? 1 : 0);
            command.Parameters.AddWithValue("@IsResponsabileOu", isResponsabileOu ? 1 : 0);

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
}

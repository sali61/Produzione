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
                          and ou.sigla collate DATABASE_DEFAULT = c.idBusinessUnit collate DATABASE_DEFAULT
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
                          and ou.sigla collate DATABASE_DEFAULT = c.idBusinessUnit collate DATABASE_DEFAULT
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
            cast(ltrim(rtrim(isnull(c.controparte, ''))) as nvarchar(256)) as Controparte,
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
                          and ou.sigla collate DATABASE_DEFAULT = c.idBusinessUnit collate DATABASE_DEFAULT
                    ))
              )
        order by c.data_commessa desc
        """;

    private const string SintesiCommesseStoredProcedure = "produzione.spSintesiCommesse";
    private const string MensileCommesseStoredProcedure = "produzione.spBixeniaAnalisiMensileCommesse";
    private const string DettaglioCommesseFatturatoStoredProcedure = "produzione.spDettaglioCommesseFatturato";
    private const string CommessaRequisitiOreQuery = """
        DECLARE @IdCommessa INT =
        (
            SELECT TOP (1) c.id
            FROM dbo.commesse c
            WHERE UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) = @CommessaUpper
            ORDER BY c.id
        );

        IF @IdCommessa IS NULL
        BEGIN
            SELECT TOP (0)
                CAST(0 AS INT) AS IdRequisito,
                CAST(N'' AS NVARCHAR(512)) AS Requisito,
                CAST(0 AS DECIMAL(18, 2)) AS OrePreviste,
                CAST(0 AS DECIMAL(18, 2)) AS OreSpese,
                CAST(0 AS DECIMAL(18, 2)) AS OreRestanti,
                CAST(0 AS DECIMAL(18, 4)) AS PercentualeAvanzamento;

            SELECT TOP (0)
                CAST(0 AS INT) AS IdRequisito,
                CAST(N'' AS NVARCHAR(512)) AS Requisito,
                CAST(0 AS INT) AS IdRisorsa,
                CAST(N'' AS NVARCHAR(256)) AS NomeRisorsa,
                CAST(0 AS DECIMAL(18, 2)) AS OrePreviste,
                CAST(0 AS DECIMAL(18, 2)) AS OreSpese,
                CAST(0 AS DECIMAL(18, 2)) AS OreRestanti,
                CAST(0 AS DECIMAL(18, 4)) AS PercentualeAvanzamento;

            RETURN;
        END;

        CREATE TABLE #Dettaglio
        (
            IdRequisito INT NOT NULL,
            IdCommessa INT NOT NULL,
            Requisito NVARCHAR(512) NOT NULL,
            IdRisorsa INT NOT NULL,
            OrePreviste DECIMAL(18, 2) NOT NULL,
            OreSpese DECIMAL(18, 2) NOT NULL
        );

        WITH Previsto AS
        (
            SELECT
                rpc.id AS IdRequisito,
                rpc.idcommessa AS IdCommessa,
                CAST(ISNULL(rpc.Requisito, N'') AS NVARCHAR(512)) AS Requisito,
                rpr.idrisorsa AS IdRisorsa,
                CAST(SUM(ISNULL(rpr.orePreviste, 0)) AS DECIMAL(18, 2)) AS OrePreviste
            FROM dbo.requisitiPerRisorse rpr
            INNER JOIN dbo.RequisitiPerCommessa rpc
                ON rpr.idrequisito = rpc.id
            WHERE rpc.idcommessa = @IdCommessa
            GROUP BY
                rpc.id,
                rpc.idcommessa,
                rpc.Requisito,
                rpr.idrisorsa
        ),
        Speso AS
        (
            SELECT
                a.CodiceCommessa,
                a.idrequisito AS IdRequisito,
                a.idrisorsa AS IdRisorsa,
                CAST(SUM(ISNULL(a.ore, 0)) AS DECIMAL(18, 2)) AS OreSpese
            FROM dbo.[Attività] a
            WHERE a.CodiceCommessa = @IdCommessa
              AND a.idrequisito IS NOT NULL
              AND a.idrisorsa IS NOT NULL
              AND (@DataLimite IS NULL OR CAST(a.[data] AS DATE) <= @DataLimite)
            GROUP BY
                a.CodiceCommessa,
                a.idrequisito,
                a.idrisorsa
        )
        INSERT INTO #Dettaglio
        (
            IdRequisito,
            IdCommessa,
            Requisito,
            IdRisorsa,
            OrePreviste,
            OreSpese
        )
        SELECT
            p.IdRequisito,
            p.IdCommessa,
            p.Requisito,
            p.IdRisorsa,
            p.OrePreviste,
            CAST(ISNULL(s.OreSpese, 0) AS DECIMAL(18, 2)) AS OreSpese
        FROM Previsto p
        LEFT JOIN Speso s
            ON s.CodiceCommessa = p.IdCommessa
           AND s.IdRequisito = p.IdRequisito
           AND s.IdRisorsa = p.IdRisorsa;

        SELECT
            d.IdRequisito,
            d.Requisito,
            CAST(SUM(ISNULL(d.OrePreviste, 0)) AS DECIMAL(18, 2)) AS OrePreviste,
            CAST(SUM(ISNULL(d.OreSpese, 0)) AS DECIMAL(18, 2)) AS OreSpese,
            CAST(SUM(ISNULL(d.OrePreviste, 0)) - SUM(ISNULL(d.OreSpese, 0)) AS DECIMAL(18, 2)) AS OreRestanti,
            CAST(
                CASE
                    WHEN SUM(ISNULL(d.OrePreviste, 0)) <= 0 THEN 0
                    ELSE SUM(ISNULL(d.OreSpese, 0)) / NULLIF(SUM(ISNULL(d.OrePreviste, 0)), 0)
                END
                AS DECIMAL(18, 4)
            ) AS PercentualeAvanzamento
        FROM #Dettaglio d
        GROUP BY
            d.IdRequisito,
            d.Requisito
        ORDER BY
            d.Requisito;

        SELECT
            d.IdRequisito,
            d.Requisito,
            d.IdRisorsa,
            CAST(
                LEFT(
                    LTRIM(RTRIM(COALESCE(
                        NULLIF(ISNULL(r.[Nome Risorsa], N''), N''),
                        NULLIF(ISNULL(r.NetUserName, N''), N''),
                        N'ID ' + CAST(d.IdRisorsa AS NVARCHAR(20))
                    ))),
                    256
                ) AS NVARCHAR(256)
            ) AS NomeRisorsa,
            CAST(ISNULL(d.OrePreviste, 0) AS DECIMAL(18, 2)) AS OrePreviste,
            CAST(ISNULL(d.OreSpese, 0) AS DECIMAL(18, 2)) AS OreSpese,
            CAST(ISNULL(d.OrePreviste, 0) - ISNULL(d.OreSpese, 0) AS DECIMAL(18, 2)) AS OreRestanti,
            CAST(
                CASE
                    WHEN ISNULL(d.OrePreviste, 0) <= 0 THEN 0
                    ELSE ISNULL(d.OreSpese, 0) / NULLIF(d.OrePreviste, 0)
                END
                AS DECIMAL(18, 4)
            ) AS PercentualeAvanzamento
        FROM #Dettaglio d
        LEFT JOIN dbo.Risorse r
            ON d.IdRisorsa = r.ID
        ORDER BY
            d.Requisito,
            NomeRisorsa;
        """;
    private const string CommessaOrdiniOfferteQuery = """
        DECLARE @IdCommessa INT =
        (
            SELECT TOP (1) c.id
            FROM dbo.commesse c
            WHERE UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) = @CommessaUpper
            ORDER BY c.id
        );

        IF @IdCommessa IS NULL
        BEGIN
            SELECT TOP (0)
                CAST(N'' AS NVARCHAR(64)) AS Protocollo,
                CAST(NULL AS INT) AS Anno,
                CAST(NULL AS DATE) AS Data,
                CAST(N'' AS NVARCHAR(512)) AS Oggetto,
                CAST(N'' AS NVARCHAR(128)) AS DocumentoStato,
                CAST(0 AS DECIMAL(18, 2)) AS RicavoPrevisto,
                CAST(0 AS DECIMAL(18, 2)) AS CostoPrevisto,
                CAST(0 AS DECIMAL(18, 2)) AS CostoPrevistoPersonale,
                CAST(0 AS DECIMAL(18, 2)) AS OrePrevisteOfferta,
                CAST(0 AS DECIMAL(18, 2)) AS PercentualeSuccesso,
                CAST(N'' AS NVARCHAR(256)) AS OrdiniCollegati;

            SELECT TOP (0)
                CAST(N'' AS NVARCHAR(64)) AS Protocollo,
                CAST(N'' AS NVARCHAR(128)) AS DocumentoStato,
                CAST(N'' AS NVARCHAR(32)) AS Posizione,
                CAST(0 AS INT) AS IdDettaglioOrdine,
                CAST(N'' AS NVARCHAR(512)) AS Descrizione,
                CAST(0 AS DECIMAL(18, 2)) AS Quantita,
                CAST(0 AS DECIMAL(18, 2)) AS PrezzoUnitario,
                CAST(0 AS DECIMAL(18, 2)) AS ImportoOrdine,
                CAST(0 AS DECIMAL(18, 2)) AS QuantitaOriginaleOrdinata,
                CAST(0 AS DECIMAL(18, 2)) AS QuantitaFatture;

            RETURN;
        END;

        SELECT
            CAST(ISNULL(o.protocollo, N'') AS NVARCHAR(64)) AS Protocollo,
            CAST(o.anno AS INT) AS Anno,
            CAST(o.[data] AS DATE) AS Data,
            CAST(ISNULL(o.oggetto, N'') AS NVARCHAR(512)) AS Oggetto,
            CAST(ISNULL(o.documentostato, N'') AS NVARCHAR(128)) AS DocumentoStato,
            CAST(ISNULL(o.ricavoprevisto, 0) AS DECIMAL(18, 2)) AS RicavoPrevisto,
            CAST(ISNULL(o.CostoPrevisto, 0) AS DECIMAL(18, 2)) AS CostoPrevisto,
            CAST(ISNULL(o.CostoPrevistoPersonale, 0) AS DECIMAL(18, 2)) AS CostoPrevistoPersonale,
            CAST(ISNULL(o.oreprevisteofferta, 0) AS DECIMAL(18, 2)) AS OrePrevisteOfferta,
            CAST(ISNULL(o.PercentualeSuccesso, 0) AS DECIMAL(18, 2)) AS PercentualeSuccesso,
            CAST(ISNULL(o.ordini_collegati, N'') AS NVARCHAR(256)) AS OrdiniCollegati
        FROM [protocollo].[qryOffertaAnalisiTotale] o
        WHERE o.idcommessa = @IdCommessa
        ORDER BY
            o.anno DESC,
            o.[data] DESC,
            o.protocollo;

        SELECT
            CAST(ISNULL(p.protocollo, N'') AS NVARCHAR(64)) AS Protocollo,
            CAST(ISNULL(t.documentoStato, N'') AS NVARCHAR(128)) AS DocumentoStato,
            CAST(ISNULL(d.posizione, N'') AS NVARCHAR(32)) AS Posizione,
            CAST(ISNULL(d.id, 0) AS INT) AS IdDettaglioOrdine,
            CAST(ISNULL(d.descrizione, N'') AS NVARCHAR(512)) AS Descrizione,
            CAST(ISNULL(d.quantita, 0) AS DECIMAL(18, 2)) AS Quantita,
            CAST(ISNULL(d.prezzoUnitario, 0) AS DECIMAL(18, 2)) AS PrezzoUnitario,
            CAST(ISNULL(d.quantita, 0) * ISNULL(d.prezzoUnitario, 0) AS DECIMAL(18, 2)) AS ImportoOrdine,
            CAST(ISNULL(d.quantitaOriginaleOrdinata, d.quantita) AS DECIMAL(18, 2)) AS QuantitaOriginaleOrdinata,
            CAST(ISNULL(f.quantitaFatture, 0) AS DECIMAL(18, 2)) AS QuantitaFatture
        FROM dbo.tipiDocumentoStato t
        INNER JOIN dbo.Protocollo p
            ON t.id = p.idStatoDocumento
        INNER JOIN dbo.dettaglioOrdini d
            ON d.protocollo = p.protocollo
        LEFT JOIN
        (
            SELECT
                idDettaglioOrdine,
                CAST(SUM(ISNULL(quantita, 0)) AS DECIMAL(18, 2)) AS quantitaFatture
            FROM dbo.dettaglioFatturePreviste
            GROUP BY idDettaglioOrdine
        ) f
            ON f.idDettaglioOrdine = d.id
        WHERE p.IDTipoDocumento = 3
          AND p.idcommessa = @IdCommessa
          AND ISNULL(d.quantita, 0) > 0
        ORDER BY
            p.protocollo,
            d.posizione,
            d.id;
        """;
    private const string CommessaAvanzamentoSelectQuery = """
        SELECT TOP (1)
            a.id,
            a.idcommessa,
            a.valore_percentuale,
            a.importo_riferimento,
            a.data_riferimento,
            a.data_salvataggio,
            a.idautore
        FROM produzione.avanzamento a
        INNER JOIN dbo.commesse c
            ON a.idcommessa = c.id
        WHERE UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) = @CommessaUpper
          AND a.data_riferimento = @DataRiferimento
        ORDER BY a.id DESC;
        """;
    private const string CommessaAvanzamentoStoricoQuery = """
        SELECT
            a.id,
            a.idcommessa,
            a.valore_percentuale,
            a.importo_riferimento,
            a.data_riferimento,
            a.data_salvataggio,
            a.idautore
        FROM produzione.avanzamento a
        INNER JOIN dbo.commesse c
            ON a.idcommessa = c.id
        WHERE UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) = @CommessaUpper
        ORDER BY
            a.data_riferimento ASC,
            a.id ASC;
        """;
    private const string CommessaAvanzamentoUpsertQuery = """
        DECLARE @IdCommessa INT =
        (
            SELECT TOP (1) c.id
            FROM dbo.commesse c
            WHERE UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) = @CommessaUpper
            ORDER BY c.id
        );

        IF @IdCommessa IS NULL
        BEGIN
            SELECT TOP (0)
                CAST(0 AS INT) AS id,
                CAST(0 AS INT) AS idcommessa,
                CAST(0 AS DECIMAL(9, 4)) AS valore_percentuale,
                CAST(0 AS DECIMAL(18, 2)) AS importo_riferimento,
                CAST(NULL AS DATE) AS data_riferimento,
                CAST(NULL AS DATETIME2(0)) AS data_salvataggio,
                CAST(0 AS INT) AS idautore;
            RETURN;
        END;

        UPDATE produzione.avanzamento
        SET
            valore_percentuale = @PercentualeRaggiunto,
            importo_riferimento = @ImportoRiferimento,
            data_salvataggio = SYSDATETIME(),
            idautore = @IdAutore
        WHERE idcommessa = @IdCommessa
          AND data_riferimento = @DataRiferimento;

        IF @@ROWCOUNT = 0
        BEGIN
            INSERT INTO produzione.avanzamento
            (
                idcommessa,
                valore_percentuale,
                importo_riferimento,
                data_riferimento,
                data_salvataggio,
                idautore
            )
            VALUES
            (
                @IdCommessa,
                @PercentualeRaggiunto,
                @ImportoRiferimento,
                @DataRiferimento,
                SYSDATETIME(),
                @IdAutore
            );
        END;

        SELECT TOP (1)
            id,
            idcommessa,
            valore_percentuale,
            importo_riferimento,
            data_riferimento,
            data_salvataggio,
            idautore
        FROM produzione.avanzamento
        WHERE idcommessa = @IdCommessa
          AND data_riferimento = @DataRiferimento
        ORDER BY id DESC;
        """;
    private const int AnalisiCommesseIdRisorsa = 3;

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
                ReadString(reader, "Controparte"),
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
                    ReadString(reader, "controparte"),
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

    public async Task<CommessaOrdiniOfferteDettaglio> GetCommessaOrdiniOfferteDettaglioAsync(
        string commessa,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(commessa))
        {
            return new CommessaOrdiniOfferteDettaglio(
                Array.Empty<CommessaOffertaRow>(),
                Array.Empty<CommessaOrdineRow>());
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommessaOrdiniOfferteQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@CommessaUpper", commessa.Trim().ToUpperInvariant());

            var offerte = new List<CommessaOffertaRow>();
            var ordini = new List<CommessaOrdineRow>();

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                offerte.Add(new CommessaOffertaRow(
                    ReadString(reader, "Protocollo"),
                    ReadNullableInt(reader, "Anno"),
                    ReadNullableDate(reader, "Data"),
                    ReadString(reader, "Oggetto"),
                    ReadString(reader, "DocumentoStato"),
                    ReadDecimal(reader, "RicavoPrevisto"),
                    ReadDecimal(reader, "CostoPrevisto"),
                    ReadDecimal(reader, "CostoPrevistoPersonale"),
                    ReadDecimal(reader, "OrePrevisteOfferta"),
                    ReadDecimal(reader, "PercentualeSuccesso"),
                    ReadString(reader, "OrdiniCollegati")));
            }

            if (await reader.NextResultAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    ordini.Add(new CommessaOrdineRow(
                        ReadString(reader, "Protocollo"),
                        ReadString(reader, "DocumentoStato"),
                        ReadString(reader, "Posizione"),
                        ReadNullableInt(reader, "IdDettaglioOrdine") ?? 0,
                        ReadString(reader, "Descrizione"),
                        ReadDecimal(reader, "Quantita"),
                        ReadDecimal(reader, "PrezzoUnitario"),
                        ReadDecimal(reader, "ImportoOrdine"),
                        ReadDecimal(reader, "QuantitaOriginaleOrdinata"),
                        ReadDecimal(reader, "QuantitaFatture")));
                }
            }

            return new CommessaOrdiniOfferteDettaglio(
                offerte
                    .OrderByDescending(item => item.Anno ?? int.MinValue)
                    .ThenByDescending(item => item.Data)
                    .ThenBy(item => item.Protocollo)
                    .ToArray(),
                ordini
                    .OrderBy(item => item.Protocollo)
                    .ThenBy(item => item.Posizione)
                    .ThenBy(item => item.IdDettaglioOrdine)
                    .ToArray());
        }
        catch
        {
            return new CommessaOrdiniOfferteDettaglio(
                Array.Empty<CommessaOffertaRow>(),
                Array.Empty<CommessaOrdineRow>());
        }
    }

    public async Task<CommessaAvanzamentoRow?> GetCommessaAvanzamentoAsync(
        string commessa,
        DateTime dataRiferimento,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(commessa))
        {
            return null;
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommessaAvanzamentoSelectQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@CommessaUpper", commessa.Trim().ToUpperInvariant());
            command.Parameters.AddWithValue("@DataRiferimento", dataRiferimento.Date);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            return new CommessaAvanzamentoRow(
                ReadNullableInt(reader, "id") ?? 0,
                ReadNullableInt(reader, "idcommessa") ?? 0,
                ReadDecimal(reader, "valore_percentuale"),
                ReadDecimal(reader, "importo_riferimento"),
                ReadNullableDate(reader, "data_riferimento") ?? dataRiferimento.Date,
                ReadNullableDate(reader, "data_salvataggio") ?? DateTime.Now,
                ReadNullableInt(reader, "idautore") ?? 0);
        }
        catch
        {
            return null;
        }
    }

    public async Task<IReadOnlyCollection<CommessaAvanzamentoRow>> GetCommessaAvanzamentoStoricoAsync(
        string commessa,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(commessa))
        {
            return Array.Empty<CommessaAvanzamentoRow>();
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommessaAvanzamentoStoricoQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@CommessaUpper", commessa.Trim().ToUpperInvariant());

            var rows = new List<CommessaAvanzamentoRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                rows.Add(new CommessaAvanzamentoRow(
                    ReadNullableInt(reader, "id") ?? 0,
                    ReadNullableInt(reader, "idcommessa") ?? 0,
                    ReadDecimal(reader, "valore_percentuale"),
                    ReadDecimal(reader, "importo_riferimento"),
                    ReadNullableDate(reader, "data_riferimento") ?? DateTime.MinValue,
                    ReadNullableDate(reader, "data_salvataggio") ?? DateTime.Now,
                    ReadNullableInt(reader, "idautore") ?? 0));
            }

            return rows;
        }
        catch
        {
            return Array.Empty<CommessaAvanzamentoRow>();
        }
    }

    public async Task<CommessaAvanzamentoRow?> SaveCommessaAvanzamentoAsync(
        UserContext user,
        string commessa,
        decimal percentualeRaggiunto,
        decimal importoRiferimento,
        DateTime dataRiferimento,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) ||
            string.IsNullOrWhiteSpace(commessa) ||
            user.IdRisorsa <= 0)
        {
            return null;
        }

        var percentualeClamped = Math.Clamp(percentualeRaggiunto, 0m, 100m);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommessaAvanzamentoUpsertQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@CommessaUpper", commessa.Trim().ToUpperInvariant());
            command.Parameters.AddWithValue("@PercentualeRaggiunto", percentualeClamped);
            command.Parameters.AddWithValue("@ImportoRiferimento", importoRiferimento);
            command.Parameters.AddWithValue("@DataRiferimento", dataRiferimento.Date);
            command.Parameters.AddWithValue("@IdAutore", user.IdRisorsa);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            return new CommessaAvanzamentoRow(
                ReadNullableInt(reader, "id") ?? 0,
                ReadNullableInt(reader, "idcommessa") ?? 0,
                ReadDecimal(reader, "valore_percentuale"),
                ReadDecimal(reader, "importo_riferimento"),
                ReadNullableDate(reader, "data_riferimento") ?? dataRiferimento.Date,
                ReadNullableDate(reader, "data_salvataggio") ?? DateTime.Now,
                ReadNullableInt(reader, "idautore") ?? 0);
        }
        catch
        {
            return null;
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
            command.Parameters.AddWithValue("@idrisorsa", AnalisiCommesseIdRisorsa);
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

    public async Task<IReadOnlyCollection<CommessaDettaglioMeseCorrenteRow>> GetCommessaMesiAnnoCorrenteAsync(
        UserContext user,
        string profile,
        string commessa,
        int anno,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) ||
            string.IsNullOrWhiteSpace(commessa) ||
            anno <= 0)
        {
            return [];
        }

        var visibility = ResolveVisibility(profile);
        var clauses = new List<string>();
        AddStringClause(clauses, "commessa", commessa);
        clauses.Add($"anno_competenza = {anno}");

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
            command.Parameters.AddWithValue("@idrisorsa", AnalisiCommesseIdRisorsa);
            command.Parameters.AddWithValue("@tiporicerca", "AnalisiCommessa");
            command.Parameters.AddWithValue(
                "@FiltroDaApplicare",
                string.IsNullOrWhiteSpace(filtro) ? DBNull.Value : filtro);
            command.Parameters.AddWithValue("@CampoAggregazione", DBNull.Value);

            var rows = new List<CommessaDettaglioMeseCorrenteRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var mese = ReadNullableInt(reader, "mese_competenza");
                if (!mese.HasValue || mese.Value is < 1 or > 12)
                {
                    continue;
                }

                rows.Add(new CommessaDettaglioMeseCorrenteRow(
                    anno,
                    mese.Value,
                    ReadDecimal(reader, "ore_lavorate"),
                    ReadDecimal(reader, "costo_personale"),
                    ReadDecimal(reader, "ricavi"),
                    ReadDecimal(reader, "costi"),
                    ReadDecimal(reader, "utile_specifico"),
                    0m,
                    0m));
            }

            return rows
                .GroupBy(item => item.Mese)
                .OrderBy(group => group.Key)
                .Select(group => new CommessaDettaglioMeseCorrenteRow(
                    anno,
                    group.Key,
                    group.Sum(item => item.OreLavorate),
                    group.Sum(item => item.CostoPersonale),
                    group.Sum(item => item.Ricavi),
                    group.Sum(item => item.Costi),
                    group.Sum(item => item.UtileSpecifico),
                    group.Sum(item => item.RicaviFuturi),
                    group.Sum(item => item.CostiFuturi)))
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<CommessaRequisitiOreDettaglio> GetCommessaRequisitiOreDettaglioAsync(
        string commessa,
        DateTime dataFineConsuntivo,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(commessa))
        {
            return new CommessaRequisitiOreDettaglio(
                Array.Empty<CommessaRequisitoOreSummaryRow>(),
                Array.Empty<CommessaRequisitoOreRisorsaRow>());
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommessaRequisitiOreQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@CommessaUpper", commessa.Trim().ToUpperInvariant());
            command.Parameters.AddWithValue("@DataLimite", dataFineConsuntivo.Date);

            var requisiti = new List<CommessaRequisitoOreSummaryRow>();
            var risorse = new List<CommessaRequisitoOreRisorsaRow>();

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                requisiti.Add(new CommessaRequisitoOreSummaryRow(
                    ReadNullableInt(reader, "IdRequisito") ?? 0,
                    ReadString(reader, "Requisito"),
                    ReadDecimal(reader, "OrePreviste"),
                    ReadDecimal(reader, "OreSpese"),
                    ReadDecimal(reader, "OreRestanti"),
                    ReadDecimal(reader, "PercentualeAvanzamento")));
            }

            if (await reader.NextResultAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    risorse.Add(new CommessaRequisitoOreRisorsaRow(
                        ReadNullableInt(reader, "IdRequisito") ?? 0,
                        ReadString(reader, "Requisito"),
                        ReadNullableInt(reader, "IdRisorsa") ?? 0,
                        ReadString(reader, "NomeRisorsa"),
                        ReadDecimal(reader, "OrePreviste"),
                        ReadDecimal(reader, "OreSpese"),
                        ReadDecimal(reader, "OreRestanti"),
                        ReadDecimal(reader, "PercentualeAvanzamento")));
                }
            }

            return new CommessaRequisitiOreDettaglio(
                requisiti
                    .OrderBy(item => item.Requisito)
                    .ThenBy(item => item.IdRequisito)
                    .ToArray(),
                risorse
                    .OrderBy(item => item.Requisito)
                    .ThenBy(item => item.NomeRisorsa)
                    .ThenBy(item => item.IdRisorsa)
                    .ToArray());
        }
        catch
        {
            return new CommessaRequisitiOreDettaglio(
                Array.Empty<CommessaRequisitoOreSummaryRow>(),
                Array.Empty<CommessaRequisitoOreRisorsaRow>());
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
        AddStringClause(clauses, "controparte", request.Prodotto);
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
                $"EXISTS (SELECT 1 FROM [orga].[vw_OU_OrganigrammaAncestor] ou WHERE ou.id_responsabile_ou_ancestor = {user.IdRisorsa} AND ou.sigla COLLATE DATABASE_DEFAULT = idbusinessunit COLLATE DATABASE_DEFAULT)");
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


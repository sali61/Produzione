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
        select top (@Take)
            cast(ltrim(rtrim(isnull(c.COMMESSA, ''))) as nvarchar(128)) as Commessa,
            cast(max(ltrim(rtrim(isnull(c.descrizione, '')))) as nvarchar(512)) as DescrizioneCommessa
        from cdg_qryComessaPmRcc c
        where (
                @Search is null
                or c.COMMESSA like '%' + @Search + '%'
                or c.descrizione like '%' + @Search + '%'
              )
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
        group by ltrim(rtrim(isnull(c.COMMESSA, '')))
        order by Commessa
        """;

    private const string ProdottiCommesseBaseQuery = """
        select top (@Take)
            cast(ltrim(rtrim(isnull(c.COMMESSA, ''))) as nvarchar(128)) as Commessa,
            cast(max(ltrim(rtrim(isnull(c.descrizione, '')))) as nvarchar(512)) as DescrizioneCommessa
        from cdg_qryComessaPmRcc c
        where (
                @Search is null
                or c.COMMESSA like '%' + @Search + '%'
                or c.descrizione like '%' + @Search + '%'
              )
          and isnull(ltrim(rtrim(c.Nomeprodotto)), '') <> ''
          and upper(ltrim(rtrim(c.Nomeprodotto))) not in ('NON DEFINITO', 'NON DEFINTO')
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
        group by ltrim(rtrim(isnull(c.COMMESSA, '')))
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
            cast(ltrim(rtrim(isnull(c.PM, ''))) as nvarchar(256)) as Pm,
            commessaDate.DataApertura,
            commessaDate.DataChiusura
        from cdg_qryComessaPmRcc c
        outer apply (
            select top (1)
                cast(cm.[data] as date) as DataApertura,
                cast(cm.data_chiu as date) as DataChiusura
            from dbo.commesse cm
            where upper(ltrim(rtrim(isnull(cm.commessa, '')))) = @CommessaUpper
            order by cm.id desc
        ) commessaDate
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

    private const string CommesseAnomaleQuery = """
        DECLARE @Anomalie TABLE
        (
            TipoAnomalia NVARCHAR(200) NULL,
            DettaglioAnomalia NVARCHAR(500) NULL,
            IdCommessa INT NOT NULL,
            Commessa NVARCHAR(128) NULL,
            DescrizioneCommessa NVARCHAR(512) NULL,
            TipologiaCommessa NVARCHAR(256) NULL,
            Stato NVARCHAR(128) NULL,
            MacroTipologia NVARCHAR(256) NULL,
            Controparte NVARCHAR(256) NULL,
            BusinessUnit NVARCHAR(128) NULL,
            Rcc NVARCHAR(256) NULL,
            Pm NVARCHAR(256) NULL,
            OreLavorate DECIMAL(18, 2) NULL,
            CostoPersonale DECIMAL(18, 2) NULL,
            Ricavi DECIMAL(18, 2) NULL,
            Costi DECIMAL(18, 2) NULL,
            RicaviFuturi DECIMAL(18, 2) NULL,
            CostiFuturi DECIMAL(18, 2) NULL,
            IdPm INT NULL,
            IdRcc INT NULL,
            NetUserNamePmUpper NVARCHAR(256) NULL,
            NetUserNameRccUpper NVARCHAR(256) NULL
        );

        INSERT INTO @Anomalie
        (
            TipoAnomalia,
            DettaglioAnomalia,
            IdCommessa,
            Commessa,
            DescrizioneCommessa,
            TipologiaCommessa,
            Stato,
            MacroTipologia,
            Controparte,
            BusinessUnit,
            Rcc,
            Pm,
            OreLavorate,
            CostoPersonale,
            Ricavi,
            Costi,
            RicaviFuturi,
            CostiFuturi,
            IdPm,
            IdRcc,
            NetUserNamePmUpper,
            NetUserNameRccUpper
        )
        EXEC produzione.spCommesseAnomale;

        SELECT TOP (@Take)
            CAST(ISNULL(a.TipoAnomalia, N'') AS NVARCHAR(200)) AS TipoAnomalia,
            CAST(ISNULL(a.DettaglioAnomalia, N'') AS NVARCHAR(500)) AS DettaglioAnomalia,
            CAST(a.IdCommessa AS INT) AS IdCommessa,
            CAST(ISNULL(a.Commessa, N'') AS NVARCHAR(128)) AS Commessa,
            CAST(ISNULL(a.DescrizioneCommessa, N'') AS NVARCHAR(512)) AS DescrizioneCommessa,
            CAST(ISNULL(a.TipologiaCommessa, N'') AS NVARCHAR(256)) AS TipologiaCommessa,
            CAST(ISNULL(a.Stato, N'') AS NVARCHAR(128)) AS Stato,
            CAST(ISNULL(a.MacroTipologia, N'') AS NVARCHAR(256)) AS MacroTipologia,
            CAST(ISNULL(a.Controparte, N'') AS NVARCHAR(256)) AS Controparte,
            CAST(ISNULL(a.BusinessUnit, N'') AS NVARCHAR(128)) AS BusinessUnit,
            CAST(ISNULL(a.Rcc, N'') AS NVARCHAR(256)) AS Rcc,
            CAST(ISNULL(a.Pm, N'') AS NVARCHAR(256)) AS Pm,
            CAST(ISNULL(a.OreLavorate, 0) AS DECIMAL(18, 2)) AS OreLavorate,
            CAST(ISNULL(a.CostoPersonale, 0) AS DECIMAL(18, 2)) AS CostoPersonale,
            CAST(ISNULL(a.Ricavi, 0) AS DECIMAL(18, 2)) AS Ricavi,
            CAST(ISNULL(a.Costi, 0) AS DECIMAL(18, 2)) AS Costi,
            CAST(ISNULL(a.RicaviFuturi, 0) AS DECIMAL(18, 2)) AS RicaviFuturi,
            CAST(ISNULL(a.CostiFuturi, 0) AS DECIMAL(18, 2)) AS CostiFuturi
        FROM @Anomalie a
        WHERE
            @IsGlobal = 1
            OR (
                @IsPm = 1
                AND (
                    ISNULL(a.IdPm, 0) = @IdRisorsa
                    OR UPPER(ISNULL(a.NetUserNamePmUpper, N'')) = @UsernameUpper
                )
            )
            OR (
                @IsRcc = 1
                AND (
                    ISNULL(a.IdRcc, 0) = @IdRisorsa
                    OR UPPER(ISNULL(a.NetUserNameRccUpper, N'')) = @UsernameUpper
                )
            )
            OR (
                @IsResponsabileOu = 1
                AND EXISTS
                (
                    SELECT 1
                    FROM [orga].[vw_OU_OrganigrammaAncestor] ou
                    WHERE ou.id_responsabile_ou_ancestor = @IdRisorsa
                      AND ou.sigla COLLATE DATABASE_DEFAULT = a.BusinessUnit COLLATE DATABASE_DEFAULT
                )
            )
        ORDER BY
            ISNULL(a.TipoAnomalia, N''),
            ISNULL(a.Commessa, N'');
        """;

    private const string SintesiCommesseStoredProcedure = "produzione.spSintesiCommesse";
    private const string MensileCommesseStoredProcedure = "produzione.spBixeniaAnalisiMensileCommesse";
    private const string AndamentoMensileCommesseStoredProcedure = "produzione.spAndamentoMensileCommesse";
    private const string AnalisiCommesseStoredProcedure = "CDG.BIXeniaAnalisiCommesse";
    private const string RisorseLookupQuery = """
        SELECT
            CAST(r.id AS INT) AS IdRisorsa,
            CAST(LTRIM(RTRIM(ISNULL(r.[Nome Risorsa], N''))) AS NVARCHAR(256)) AS NomeRisorsa,
            CAST(CASE WHEN r.DataFine IS NULL THEN 1 ELSE 0 END AS BIT) AS InForza
        FROM dbo.Risorse r
        ORDER BY
            LTRIM(RTRIM(ISNULL(r.[Nome Risorsa], N''))),
            r.id;
        """;
    private const string DettaglioCommesseFatturatoStoredProcedure = "produzione.spDettaglioCommesseFatturato";
    private const string CommessaRequisitiOreQuery = """
        DECLARE @IdCommessa INT =
        (
            SELECT TOP (1) c.id
            FROM dbo.commesse c
            WHERE UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) = @CommessaUpper
            ORDER BY c.id DESC
        );

        IF @IdCommessa IS NULL
        BEGIN
            SELECT TOP (0)
                CAST(0 AS INT) AS IdRequisito,
                CAST(N'' AS NVARCHAR(512)) AS Requisito,
                CAST(0 AS DECIMAL(18, 2)) AS DurataRequisito,
                CAST(0 AS DECIMAL(18, 2)) AS OrePreviste,
                CAST(0 AS DECIMAL(18, 2)) AS OreSpese,
                CAST(0 AS DECIMAL(18, 2)) AS OreRestanti,
                CAST(0 AS DECIMAL(18, 4)) AS PercentualeAvanzamento;

            SELECT TOP (0)
                CAST(0 AS INT) AS IdRequisito,
                CAST(N'' AS NVARCHAR(512)) AS Requisito,
                CAST(0 AS INT) AS IdRisorsa,
                CAST(N'' AS NVARCHAR(256)) AS NomeRisorsa,
                CAST(0 AS DECIMAL(18, 2)) AS DurataRequisito,
                CAST(0 AS DECIMAL(18, 2)) AS OrePreviste,
                CAST(0 AS DECIMAL(18, 2)) AS OreSpese,
                CAST(0 AS DECIMAL(18, 2)) AS OreRestanti,
                CAST(0 AS DECIMAL(18, 4)) AS PercentualeAvanzamento;

            SELECT TOP (0)
                CAST(0 AS INT) AS IdRisorsa,
                CAST(N'' AS NVARCHAR(256)) AS NomeRisorsa,
                CAST(0 AS DECIMAL(18, 2)) AS OreSpeseTotali;

            RETURN;
        END;

        CREATE TABLE #RequisitiBase
        (
            IdRequisito INT NOT NULL,
            Requisito NVARCHAR(512) NOT NULL,
            DurataRequisito DECIMAL(18, 2) NOT NULL
        );

        CREATE TABLE #PrevistoRisorsa
        (
            IdRequisito INT NOT NULL,
            IdRisorsa INT NOT NULL,
            OrePreviste DECIMAL(18, 2) NOT NULL
        );

        CREATE TABLE #SpesoRisorsa
        (
            IdRequisito INT NOT NULL,
            IdRisorsa INT NOT NULL,
            OreSpese DECIMAL(18, 2) NOT NULL
        );

        CREATE TABLE #Dettaglio
        (
            IdRequisito INT NOT NULL,
            Requisito NVARCHAR(512) NOT NULL,
            IdRisorsa INT NOT NULL,
            DurataRequisito DECIMAL(18, 2) NOT NULL,
            OrePreviste DECIMAL(18, 2) NOT NULL,
            OreSpese DECIMAL(18, 2) NOT NULL
        );

        INSERT INTO #RequisitiBase
        (
            IdRequisito,
            Requisito,
            DurataRequisito
        )
        SELECT
            rpc.id AS IdRequisito,
            CAST(ISNULL(rpc.Requisito, N'') AS NVARCHAR(512)) AS Requisito,
            CAST(ISNULL(rpc.DurataPrevista, 0) AS DECIMAL(18, 2)) AS DurataRequisito
        FROM dbo.RequisitiPerCommessa rpc
        WHERE rpc.idcommessa = @IdCommessa;

        INSERT INTO #PrevistoRisorsa
        (
            IdRequisito,
            IdRisorsa,
            OrePreviste
        )
        SELECT
            rpr.idrequisito AS IdRequisito,
            rpr.idrisorsa AS IdRisorsa,
            CAST(SUM(ISNULL(rpr.orePreviste, 0)) AS DECIMAL(18, 2)) AS OrePreviste
        FROM dbo.requisitiPerRisorse rpr
        INNER JOIN #RequisitiBase rb
            ON rb.IdRequisito = rpr.idrequisito
        WHERE rpr.idrisorsa IS NOT NULL
        GROUP BY
            rpr.idrequisito,
            rpr.idrisorsa;

        INSERT INTO #SpesoRisorsa
        (
            IdRequisito,
            IdRisorsa,
            OreSpese
        )
        SELECT
            a.idrequisito AS IdRequisito,
            a.idrisorsa AS IdRisorsa,
            CAST(SUM(ISNULL(a.ore, 0)) AS DECIMAL(18, 2)) AS OreSpese
        FROM dbo.[Attività] a
        INNER JOIN #RequisitiBase rb
            ON rb.IdRequisito = a.idrequisito
        WHERE a.CodiceCommessa = @IdCommessa
          AND a.idrequisito IS NOT NULL
          AND a.idrisorsa IS NOT NULL
          AND (@DataLimite IS NULL OR CAST(a.[data] AS DATE) <= @DataLimite)
        GROUP BY
            a.idrequisito,
            a.idrisorsa;

        WITH
        ChiaviDettaglio AS
        (
            SELECT p.IdRequisito, p.IdRisorsa
            FROM #PrevistoRisorsa p
            WHERE p.IdRisorsa IS NOT NULL

            UNION

            SELECT s.IdRequisito, s.IdRisorsa
            FROM #SpesoRisorsa s
            WHERE s.IdRisorsa IS NOT NULL
        )
        INSERT INTO #Dettaglio
        (
            IdRequisito,
            Requisito,
            IdRisorsa,
            DurataRequisito,
            OrePreviste,
            OreSpese
        )
        SELECT
            k.IdRequisito,
            rb.Requisito,
            k.IdRisorsa,
            rb.DurataRequisito,
            CAST(ISNULL(p.OrePreviste, 0) AS DECIMAL(18, 2)) AS OrePreviste,
            CAST(ISNULL(s.OreSpese, 0) AS DECIMAL(18, 2)) AS OreSpese
        FROM ChiaviDettaglio k
        INNER JOIN #RequisitiBase rb
            ON rb.IdRequisito = k.IdRequisito
        LEFT JOIN #PrevistoRisorsa p
            ON p.IdRequisito = k.IdRequisito
           AND p.IdRisorsa = k.IdRisorsa
        LEFT JOIN #SpesoRisorsa s
            ON s.IdRequisito = k.IdRequisito
           AND s.IdRisorsa = k.IdRisorsa;

        WITH PrevistoTotale AS
        (
            SELECT
                p.IdRequisito,
                CAST(SUM(ISNULL(p.OrePreviste, 0)) AS DECIMAL(18, 2)) AS OrePreviste
            FROM #PrevistoRisorsa p
            GROUP BY p.IdRequisito
        ),
        SpesoTotale AS
        (
            SELECT
                s.IdRequisito,
                CAST(SUM(ISNULL(s.OreSpese, 0)) AS DECIMAL(18, 2)) AS OreSpese
            FROM #SpesoRisorsa s
            GROUP BY s.IdRequisito
        ),
        Riepilogo AS
        (
            SELECT
                rb.IdRequisito,
                rb.Requisito,
                rb.DurataRequisito,
                CAST(ISNULL(pt.OrePreviste, 0) AS DECIMAL(18, 2)) AS OrePreviste,
                CAST(ISNULL(st.OreSpese, 0) AS DECIMAL(18, 2)) AS OreSpese,
                CAST(
                    CASE
                        WHEN ISNULL(pt.OrePreviste, 0) > 0 THEN ISNULL(pt.OrePreviste, 0)
                        ELSE rb.DurataRequisito
                    END
                AS DECIMAL(18, 2)) AS OreRiferimento
            FROM #RequisitiBase rb
            LEFT JOIN PrevistoTotale pt
                ON pt.IdRequisito = rb.IdRequisito
            LEFT JOIN SpesoTotale st
                ON st.IdRequisito = rb.IdRequisito
        )
        SELECT
            r.IdRequisito,
            r.Requisito,
            CAST(ISNULL(r.DurataRequisito, 0) AS DECIMAL(18, 2)) AS DurataRequisito,
            CAST(ISNULL(r.OrePreviste, 0) AS DECIMAL(18, 2)) AS OrePreviste,
            CAST(ISNULL(r.OreSpese, 0) AS DECIMAL(18, 2)) AS OreSpese,
            CAST(ISNULL(r.OreRiferimento, 0) - ISNULL(r.OreSpese, 0) AS DECIMAL(18, 2)) AS OreRestanti,
            CAST(
                CASE
                    WHEN ISNULL(r.OreRiferimento, 0) <= 0 THEN 0
                    ELSE ISNULL(r.OreSpese, 0) / NULLIF(r.OreRiferimento, 0)
                END
                AS DECIMAL(18, 4)
            ) AS PercentualeAvanzamento
        FROM Riepilogo r
        ORDER BY
            r.Requisito;

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
            CAST(ISNULL(d.DurataRequisito, 0) AS DECIMAL(18, 2)) AS DurataRequisito,
            CAST(ISNULL(d.OrePreviste, 0) AS DECIMAL(18, 2)) AS OrePreviste,
            CAST(ISNULL(d.OreSpese, 0) AS DECIMAL(18, 2)) AS OreSpese,
            CAST(
                CASE
                    WHEN ISNULL(d.OrePreviste, 0) > 0 THEN ISNULL(d.OrePreviste, 0)
                    ELSE ISNULL(d.DurataRequisito, 0)
                END
                - ISNULL(d.OreSpese, 0)
                AS DECIMAL(18, 2)
            ) AS OreRestanti,
            CAST(
                CASE
                    WHEN
                        (
                            CASE
                                WHEN ISNULL(d.OrePreviste, 0) > 0 THEN ISNULL(d.OrePreviste, 0)
                                ELSE ISNULL(d.DurataRequisito, 0)
                            END
                        ) <= 0 THEN 0
                    ELSE ISNULL(d.OreSpese, 0) / NULLIF(
                        CASE
                            WHEN ISNULL(d.OrePreviste, 0) > 0 THEN ISNULL(d.OrePreviste, 0)
                            ELSE ISNULL(d.DurataRequisito, 0)
                        END,
                        0
                    )
                END
                AS DECIMAL(18, 4)
            ) AS PercentualeAvanzamento
        FROM #Dettaglio d
        LEFT JOIN dbo.Risorse r
            ON d.IdRisorsa = r.ID
        ORDER BY
            d.Requisito,
            NomeRisorsa;

        SELECT
            CAST(r.ID AS INT) AS IdRisorsa,
            CAST(
                LEFT(
                    LTRIM(RTRIM(COALESCE(
                        NULLIF(ISNULL(r.[Nome Risorsa], N''), N''),
                        NULLIF(ISNULL(r.NetUserName, N''), N''),
                        N'ID ' + CAST(r.ID AS NVARCHAR(20))
                    ))),
                    256
                ) AS NVARCHAR(256)
            ) AS NomeRisorsa,
            CAST(SUM(ISNULL(a.ore, 0)) AS DECIMAL(18, 2)) AS OreSpeseTotali
        FROM dbo.[Attività] a
        INNER JOIN dbo.Risorse r
            ON r.ID = a.idrisorsa
        WHERE a.CodiceCommessa = @IdCommessa
          AND (@DataLimite IS NULL OR CAST(a.[data] AS DATE) <= @DataLimite)
        GROUP BY
            r.ID,
            r.[Nome Risorsa],
            r.NetUserName
        ORDER BY
            NomeRisorsa;
        """;
    private const string CommessaOrdiniOfferteQuery = """
        DECLARE @IdCommessa INT =
        (
            SELECT TOP (1) c.id
            FROM dbo.commesse c
            WHERE UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) = @CommessaUpper
            ORDER BY c.id DESC
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
            CAST(ISNULL(a.ImportoAvanzamento, a.importo_riferimento) AS DECIMAL(18, 2)) AS importo_riferimento,
            CAST(ISNULL(a.OreFuture, a.ore_restanti) AS DECIMAL(18, 2)) AS ore_future,
            CAST(ISNULL(a.ore_restanti, 0) AS DECIMAL(18, 2)) AS ore_restanti,
            CAST(ISNULL(a.CostoPersonaleFuturo, a.costo_personale_futuro) AS DECIMAL(18, 2)) AS costo_personale_futuro,
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
            CAST(ISNULL(a.ImportoAvanzamento, a.importo_riferimento) AS DECIMAL(18, 2)) AS importo_riferimento,
            CAST(ISNULL(a.OreFuture, a.ore_restanti) AS DECIMAL(18, 2)) AS ore_future,
            CAST(ISNULL(a.ore_restanti, 0) AS DECIMAL(18, 2)) AS ore_restanti,
            CAST(ISNULL(a.CostoPersonaleFuturo, a.costo_personale_futuro) AS DECIMAL(18, 2)) AS costo_personale_futuro,
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
            ORDER BY c.id DESC
        );

        IF @IdCommessa IS NULL
        BEGIN
            SELECT TOP (0)
                CAST(0 AS INT) AS id,
                CAST(0 AS INT) AS idcommessa,
                CAST(0 AS DECIMAL(9, 4)) AS valore_percentuale,
                CAST(0 AS DECIMAL(18, 2)) AS importo_riferimento,
                CAST(0 AS DECIMAL(18, 2)) AS ore_future,
                CAST(0 AS DECIMAL(18, 2)) AS ore_restanti,
                CAST(0 AS DECIMAL(18, 2)) AS costo_personale_futuro,
                CAST(NULL AS DATE) AS data_riferimento,
                CAST(NULL AS DATETIME2(0)) AS data_salvataggio,
                CAST(0 AS INT) AS idautore;
            RETURN;
        END;

        UPDATE produzione.avanzamento
        SET
            valore_percentuale = @PercentualeRaggiunto,
            importo_riferimento = @ImportoRiferimento,
            ImportoAvanzamento = @ImportoRiferimento,
            OreFuture = @OreFuture,
            ore_restanti = @OreRestanti,
            CostoPersonaleFuturo = @CostoPersonaleFuturo,
            costo_personale_futuro = @CostoPersonaleFuturo,
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
                ImportoAvanzamento,
                OreFuture,
                ore_restanti,
                CostoPersonaleFuturo,
                costo_personale_futuro,
                data_riferimento,
                data_salvataggio,
                idautore
            )
            VALUES
            (
                @IdCommessa,
                @PercentualeRaggiunto,
                @ImportoRiferimento,
                @ImportoRiferimento,
                @OreFuture,
                @OreRestanti,
                @CostoPersonaleFuturo,
                @CostoPersonaleFuturo,
                @DataRiferimento,
                SYSDATETIME(),
                @IdAutore
            );
        END;

        SELECT TOP (1)
            id,
            idcommessa,
            valore_percentuale,
            CAST(ISNULL(ImportoAvanzamento, importo_riferimento) AS DECIMAL(18, 2)) AS importo_riferimento,
            CAST(ISNULL(OreFuture, ore_restanti) AS DECIMAL(18, 2)) AS ore_future,
            CAST(ISNULL(ore_restanti, 0) AS DECIMAL(18, 2)) AS ore_restanti,
            CAST(ISNULL(CostoPersonaleFuturo, costo_personale_futuro) AS DECIMAL(18, 2)) AS costo_personale_futuro,
            data_riferimento,
            data_salvataggio,
            idautore
        FROM produzione.avanzamento
        WHERE idcommessa = @IdCommessa
          AND data_riferimento = @DataRiferimento
        ORDER BY id DESC;
        """;
    private const string EnsureAvanzamentoTableQuery = """
        IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
        BEGIN
            EXEC ('CREATE SCHEMA produzione');
        END;

        IF OBJECT_ID('produzione.avanzamento', 'U') IS NULL
        BEGIN
            CREATE TABLE produzione.avanzamento
            (
                id INT IDENTITY(1, 1) NOT NULL,
                idcommessa INT NOT NULL,
                valore_percentuale DECIMAL(9, 4) NOT NULL,
                importo_riferimento DECIMAL(18, 2) NOT NULL,
                ImportoAvanzamento DECIMAL(18, 2) NULL,
                OreFuture DECIMAL(18, 2) NULL,
                ore_restanti DECIMAL(18, 2) NULL,
                CostoPersonaleFuturo DECIMAL(18, 2) NULL,
                costo_personale_futuro DECIMAL(18, 2) NULL,
                data_riferimento DATE NOT NULL,
                data_salvataggio DATETIME2(0) NOT NULL
                    CONSTRAINT DF_produzione_avanzamento_data_salvataggio DEFAULT (SYSDATETIME()),
                idautore INT NOT NULL,
                CONSTRAINT PK_produzione_avanzamento PRIMARY KEY CLUSTERED (id)
            );
        END;

        IF COL_LENGTH('produzione.avanzamento', 'ore_restanti') IS NULL
        BEGIN
            ALTER TABLE produzione.avanzamento
            ADD ore_restanti DECIMAL(18, 2) NULL;
        END;

        IF COL_LENGTH('produzione.avanzamento', 'ImportoAvanzamento') IS NULL
        BEGIN
            ALTER TABLE produzione.avanzamento
            ADD ImportoAvanzamento DECIMAL(18, 2) NULL;
        END;

        IF COL_LENGTH('produzione.avanzamento', 'OreFuture') IS NULL
        BEGIN
            ALTER TABLE produzione.avanzamento
            ADD OreFuture DECIMAL(18, 2) NULL;
        END;

        IF COL_LENGTH('produzione.avanzamento', 'costo_personale_futuro') IS NULL
        BEGIN
            ALTER TABLE produzione.avanzamento
            ADD costo_personale_futuro DECIMAL(18, 2) NULL;
        END;

        IF COL_LENGTH('produzione.avanzamento', 'CostoPersonaleFuturo') IS NULL
        BEGIN
            ALTER TABLE produzione.avanzamento
            ADD CostoPersonaleFuturo DECIMAL(18, 2) NULL;
        END;

        EXEC sp_executesql N'
            UPDATE produzione.avanzamento
            SET
                ImportoAvanzamento = ISNULL(ImportoAvanzamento, importo_riferimento),
                OreFuture = ISNULL(OreFuture, ore_restanti),
                CostoPersonaleFuturo = ISNULL(CostoPersonaleFuturo, costo_personale_futuro),
                importo_riferimento = ISNULL(importo_riferimento, ImportoAvanzamento),
                ore_restanti = ISNULL(ore_restanti, OreFuture),
                costo_personale_futuro = ISNULL(costo_personale_futuro, CostoPersonaleFuturo);';

        IF NOT EXISTS (
            SELECT 1
            FROM sys.foreign_keys
            WHERE name = 'FK_produzione_avanzamento_commesse'
              AND parent_object_id = OBJECT_ID('produzione.avanzamento')
        )
        BEGIN
            ALTER TABLE produzione.avanzamento
            ADD CONSTRAINT FK_produzione_avanzamento_commesse
                FOREIGN KEY (idcommessa) REFERENCES dbo.commesse(id);
        END;

        IF NOT EXISTS (
            SELECT 1
            FROM sys.foreign_keys
            WHERE name = 'FK_produzione_avanzamento_risorse'
              AND parent_object_id = OBJECT_ID('produzione.avanzamento')
        )
        BEGIN
            ALTER TABLE produzione.avanzamento
            ADD CONSTRAINT FK_produzione_avanzamento_risorse
                FOREIGN KEY (idautore) REFERENCES dbo.Risorse(ID);
        END;

        IF NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE object_id = OBJECT_ID('produzione.avanzamento')
              AND name = 'UX_produzione_avanzamento_idcommessa_data'
        )
        BEGIN
            CREATE UNIQUE INDEX UX_produzione_avanzamento_idcommessa_data
                ON produzione.avanzamento (idcommessa, data_riferimento);
        END;
        """;
    private const int AnalisiCommesseIdRisorsa = 3;
    private const string EnsureSignificatoMenuTableQuery = """
        IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'cdg')
        BEGIN
            EXEC ('CREATE SCHEMA cdg');
        END;

        IF OBJECT_ID('cdg.significatomenu', 'U') IS NULL
        BEGIN
            CREATE TABLE cdg.significatomenu
            (
                applicazione NVARCHAR(100) NOT NULL,
                [menu] NVARCHAR(150) NOT NULL,
                voce NVARCHAR(150) NOT NULL,
                descrizione NVARCHAR(2000) NULL,
                CONSTRAINT PK_significatomenu PRIMARY KEY CLUSTERED (applicazione, [menu], voce)
            );
        END
        ELSE IF COL_LENGTH('cdg.significatomenu', 'descrizione') IS NULL
        BEGIN
            ALTER TABLE cdg.significatomenu
            ADD descrizione NVARCHAR(2000) NULL;
        END;
        """;
    private const string SignificatoMenuSelectQuery = """
        SELECT
            CAST(ISNULL(applicazione, N'') AS NVARCHAR(100)) AS Applicazione,
            CAST(ISNULL([menu], N'') AS NVARCHAR(150)) AS [Menu],
            CAST(ISNULL(voce, N'') AS NVARCHAR(150)) AS Voce,
            CAST(ISNULL(descrizione, N'') AS NVARCHAR(2000)) AS Descrizione
        FROM cdg.significatomenu
        WHERE applicazione = @Applicazione
        ORDER BY [menu], voce;
        """;
    private const string SignificatoMenuUpsertQuery = """
        MERGE cdg.significatomenu AS target
        USING
        (
            SELECT
                @Applicazione AS applicazione,
                @Menu AS [menu],
                @Voce AS voce
        ) AS source
            ON target.applicazione = source.applicazione
           AND target.[menu] = source.[menu]
           AND target.voce = source.voce
        WHEN MATCHED THEN
            UPDATE SET descrizione = @Descrizione
        WHEN NOT MATCHED THEN
            INSERT (applicazione, [menu], voce, descrizione)
            VALUES (source.applicazione, source.[menu], source.voce, @Descrizione);

        SELECT TOP (1)
            CAST(ISNULL(applicazione, N'') AS NVARCHAR(100)) AS Applicazione,
            CAST(ISNULL([menu], N'') AS NVARCHAR(150)) AS [Menu],
            CAST(ISNULL(voce, N'') AS NVARCHAR(150)) AS Voce,
            CAST(ISNULL(descrizione, N'') AS NVARCHAR(2000)) AS Descrizione
        FROM cdg.significatomenu
        WHERE applicazione = @Applicazione
          AND [menu] = @Menu
          AND voce = @Voce;
        """;
    private const string VenditeProvenienzaFatturaContabilita = "Fattura in contabilitÃ ";
    private const string VenditeProvenienzaFatturaFutura = "Fattura Futura";
    private const string VenditeProvenienzaRicavoIpotetico = "Ricavo Ipotetico";

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

    private static readonly CommesseRisorseFilters EmptyRisorseFilters = new(
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseSintesiFilterOption>(),
        Array.Empty<CommesseRisorsaFilterOption>());

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
                ReadString(reader, "Pm"),
                ReadNullableDate(reader, "DataApertura"),
                ReadNullableDate(reader, "DataChiusura"));
        }
        catch
        {
            return null;
        }
    }

    public async Task<IReadOnlyCollection<CommessaOptionRow>> SearchCommesseAsync(
        UserContext user,
        string profile,
        string? search,
        int take,
        CancellationToken cancellationToken = default)
    {
        var visibility = ResolveVisibility(profile);
        return await SearchCommesseByQueryAsync(CommesseBaseQuery, user, visibility, search, take, cancellationToken);
    }

    public async Task<IReadOnlyCollection<CommessaOptionRow>> SearchProdottiCommesseAsync(
        UserContext user,
        string profile,
        string? search,
        int take,
        CancellationToken cancellationToken = default)
    {
        var visibility = ResolveVisibility(profile);
        return await SearchCommesseByQueryAsync(ProdottiCommesseBaseQuery, user, visibility, search, take, cancellationToken);
    }

    private async Task<IReadOnlyCollection<CommessaOptionRow>> SearchCommesseByQueryAsync(
        string query,
        UserContext user,
        VisibilityFlags visibility,
        string? search,
        int take,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(query, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@Take", Math.Clamp(take, 1, 500));
            command.Parameters.AddWithValue("@Search", NormalizeForSql(search));
            ApplyVisibilityParameters(command, user, visibility);

            var commesse = new List<CommessaOptionRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var commessa = reader["Commessa"]?.ToString()?.Trim();
                var descrizione = reader["DescrizioneCommessa"]?.ToString()?.Trim() ?? string.Empty;
                if (!string.IsNullOrWhiteSpace(commessa))
                {
                    commesse.Add(new CommessaOptionRow(commessa, descrizione));
                }
            }

            return commesse
                .GroupBy(item => item.Commessa, StringComparer.OrdinalIgnoreCase)
                .Select(group =>
                {
                    var withDescription = group.FirstOrDefault(item => !string.IsNullOrWhiteSpace(item.DescrizioneCommessa));
                    return withDescription ?? group.First();
                })
                .OrderBy(item => item.Commessa, StringComparer.OrdinalIgnoreCase)
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

    public async Task<CommesseSintesiFilters> GetProdottiSintesiFiltersAsync(
        UserContext user,
        string profile,
        int? anno,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return EmptySintesiFilters;
        }

        var selectedAnni = anno.HasValue && anno.Value > 0
            ? [anno.Value]
            : Array.Empty<int>();

        var request = new CommesseSintesiSearchRequest(
            selectedAnni,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            5000,
            false);

        var rows = await SearchProdottiSintesiAsync(user, profile, request, cancellationToken);

        var anniOptions = rows
            .Where(row => row.Anno.HasValue && row.Anno.Value > 0)
            .Select(row => row.Anno!.Value.ToString())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(value => int.TryParse(value, out var parsed) ? parsed : int.MinValue)
            .Select(value => new CommesseSintesiFilterOption(value, value))
            .ToArray();

        var commessaOptions = rows
            .Where(row => !string.IsNullOrWhiteSpace(row.Commessa))
            .Select(row =>
            {
                var commessa = row.Commessa.Trim();
                var descrizione = row.DescrizioneCommessa.Trim();
                return new CommesseSintesiFilterOption(
                    commessa,
                    string.IsNullOrWhiteSpace(descrizione) ? commessa : $"{commessa} - {descrizione}");
            })
            .GroupBy(option => option.Value, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .OrderBy(option => option.Label, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var tipologiaOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.TipologiaCommessa));
        var statoOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.Stato));
        var macroOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.MacroTipologia));
        var prodottoOptions = BuildDistinctOptionsFromRows(rows
            .Select(row => row.Prodotto)
            .Where(IsValidProductValue));
        var businessUnitOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.BusinessUnit));
        var rccOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.Rcc));
        var pmOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.Pm));

        return new CommesseSintesiFilters(
            anniOptions,
            commessaOptions,
            tipologiaOptions,
            statoOptions,
            macroOptions,
            prodottoOptions,
            businessUnitOptions,
            rccOptions,
            pmOptions);
    }

    public async Task<CommesseRisorseFilters> GetRisorseValutazioneFiltersAsync(
        UserContext user,
        string profile,
        bool mensile,
        IReadOnlyCollection<int>? anni,
        bool analisiOu = false,
        bool analisiOuPivot = false,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return EmptyRisorseFilters;
        }

        var selectedAnni = (anni ?? [])
            .Where(value => value > 0)
            .Distinct()
            .OrderByDescending(value => value)
            .ToArray();

        var request = new CommesseRisorseSearchRequest(
            mensile,
            selectedAnni,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            100000,
            analisiOu,
            analisiOuPivot);

        var rows = await SearchRisorseValutazioneAsync(
            user,
            profile,
            request,
            cancellationToken);

        var anniOptions = rows
            .Where(row => row.AnnoCompetenza > 0)
            .Select(row => row.AnnoCompetenza.ToString())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderByDescending(value => int.TryParse(value, out var parsed) ? parsed : int.MinValue)
            .Select(value => new CommesseSintesiFilterOption(value, value))
            .ToArray();
        var mesiOptions = rows
            .Where(row => row.MeseCompetenza.HasValue)
            .Select(row => row.MeseCompetenza!.Value)
            .Where(value => value is >= 1 and <= 12)
            .Distinct()
            .OrderBy(value => value)
            .Select(value => new CommesseSintesiFilterOption(value.ToString(), value.ToString("00")))
            .ToArray();

        var commessaOptions = rows
            .Where(row => !string.IsNullOrWhiteSpace(row.Commessa))
            .Select(row =>
            {
                var commessa = row.Commessa.Trim();
                var descrizione = row.DescrizioneCommessa.Trim();
                return new CommesseSintesiFilterOption(
                    commessa,
                    string.IsNullOrWhiteSpace(descrizione) ? commessa : $"{commessa} - {descrizione}");
            })
            .GroupBy(option => option.Value, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .OrderBy(option => option.Label, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var tipologiaOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.TipologiaCommessa));
        var statoOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.Stato));
        var macroOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.MacroTipologia));
        var controparteOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.Controparte));
        var businessUnitOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.BusinessUnit));
        var ouOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.IdOu));
        var rccOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.Rcc));
        var pmOptions = BuildDistinctOptionsFromRows(rows.Select(row => row.Pm));
        var risorseOptions = rows
            .Where(row => row.IdRisorsa > 0)
            .GroupBy(row => row.IdRisorsa)
            .Select(group =>
            {
                var first = group
                    .OrderByDescending(item => item.RisorsaInForza)
                    .ThenBy(item => item.NomeRisorsa, StringComparer.OrdinalIgnoreCase)
                    .First();
                var nomeRisorsa = first.NomeRisorsa.Trim();
                return new CommesseRisorsaFilterOption(first.IdRisorsa, nomeRisorsa, first.RisorsaInForza);
            })
            .OrderBy(item => item.NomeRisorsa, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new CommesseRisorseFilters(
            anniOptions,
            mesiOptions,
            commessaOptions,
            tipologiaOptions,
            statoOptions,
            macroOptions,
            controparteOptions,
            businessUnitOptions,
            ouOptions,
            rccOptions,
            pmOptions,
            risorseOptions);
    }

    public async Task<IReadOnlyCollection<CommessaRisorseValutazioneRow>> SearchRisorseValutazioneAsync(
        UserContext user,
        string profile,
        CommesseRisorseSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        var visibility = ResolveVisibility(profile);
        var normalizedTake = Math.Clamp(request.Take, 1, 100000);
        var filterClause = request.AnalisiOuPivot
            ? BuildRisorseValutazioneOuPivotFilterClause(user, visibility, request)
            : BuildRisorseValutazioneFilterClause(user, visibility, request);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            var risorseLookup = request.AnalisiOuPivot
                ? new Dictionary<int, (string NomeRisorsa, bool InForza)>()
                : await LoadRisorseLookupAsync(connection, cancellationToken);

            var storedProcedure = request.AnalisiOu || request.AnalisiOuPivot
                ? "CDG.BIXeniaAnalisiOU"
                : (request.Mensile ? MensileCommesseStoredProcedure : AnalisiCommesseStoredProcedure);
            var tipoRicerca = request.AnalisiOuPivot
                ? "ValutazioneEconomicaPersonaleOUPivot"
                : (request.AnalisiOu
                    ? (request.Mensile ? "ValutazioneEconomicaPersonaleMensileOU" : "ValutazioneEconomicaPersonaleOU")
                    : "ValutazioneEconomicaPersonale");

            await using var command = new SqlCommand(
                storedProcedure,
                connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@idrisorsa", AnalisiCommesseIdRisorsa);
            command.Parameters.AddWithValue("@tiporicerca", tipoRicerca);
            command.Parameters.AddWithValue(
                "@FiltroDaApplicare",
                string.IsNullOrWhiteSpace(filterClause) ? DBNull.Value : filterClause);
            command.Parameters.AddWithValue("@CampoAggregazione", request.AnalisiOu && !request.AnalisiOuPivot ? "RCC" : DBNull.Value);

            var rows = new List<CommessaRisorseValutazioneRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            var ordinals = BuildColumnOrdinals(reader);
            while (await reader.ReadAsync(cancellationToken))
            {
                var annoCompetenza = ReadNullableInt(reader, ordinals, "anno_competenza") ?? 0;
                if (annoCompetenza <= 0)
                {
                    continue;
                }

                var meseCompetenza = request.Mensile
                    ? ReadNullableInt(reader, ordinals, "mese_competenza")
                    : null;

                var idRisorsa = ReadNullableInt(reader, ordinals, "idRisorsa", "idrisorsa")
                    ?? 0;

                if (request.IdRisorsa.HasValue && request.IdRisorsa.Value > 0 && idRisorsa != request.IdRisorsa.Value)
                {
                    continue;
                }

                var idOu = ReadString(reader, ordinals, "idOU", "idOu", "idou");
                var nomeRisorsa = ReadString(reader, ordinals, "nome_risorsa", "nomeRisorsa", "Nome Risorsa");
                var risorsaInForza = true;
                if (idRisorsa > 0 && risorseLookup.TryGetValue(idRisorsa, out var risorsaInfo))
                {
                    if (!string.IsNullOrWhiteSpace(risorsaInfo.NomeRisorsa))
                    {
                        nomeRisorsa = risorsaInfo.NomeRisorsa;
                    }
                    risorsaInForza = risorsaInfo.InForza;
                }
                else if (request.AnalisiOuPivot)
                {
                    nomeRisorsa = string.IsNullOrWhiteSpace(idOu) ? "OU non definita" : idOu;
                }

                var businessUnit = ReadString(reader, ordinals, "idbusinessunit");

                var rcc = ReadString(reader, ordinals, "RCC");
                if (request.AnalisiOuPivot && string.IsNullOrWhiteSpace(rcc))
                {
                    rcc = idOu;
                }

                rows.Add(new CommessaRisorseValutazioneRow(
                    annoCompetenza,
                    meseCompetenza,
                    ReadString(reader, ordinals, "commessa"),
                    ReadString(reader, ordinals, "descrizione"),
                    ReadString(reader, ordinals, "tipo_commessa"),
                    ReadString(reader, ordinals, "stato"),
                    ReadString(reader, ordinals, "macrotipologia"),
                    ReadString(reader, ordinals, "Nomeprodotto"),
                    ReadString(reader, ordinals, "controparte"),
                    businessUnit,
                    rcc,
                    ReadString(reader, ordinals, "PM"),
                    idRisorsa,
                    nomeRisorsa,
                    risorsaInForza,
                    ReadDecimal(reader, ordinals, "OreTotali"),
                    ReadDecimal(reader, ordinals, "FatturatoInBaseAdOre", "FatturatoInBaseAdOreRilEcon"),
                    ReadDecimal(reader, ordinals, "FatturatoInBaseACosto"),
                    ReadDecimal(reader, ordinals, "UtileInBaseAdOre", "UtileInBaseAdOreRilEcon"),
                    ReadDecimal(reader, ordinals, "UtileInBaseACosto"),
                    ReadDecimal(reader, ordinals, "CostoSpecificoRisorsa"),
                    idOu,
                    ReadString(reader, ordinals, "NomeRuolo"),
                    ReadDecimal(reader, ordinals, "PercentualeUtilizzo"),
                    ReadString(reader, ordinals, "area"),
                    ReadBoolean(reader, ordinals, "ou_produzione"),
                    ReadString(reader, ordinals, "codicesocieta")));
            }

            return rows
                .OrderByDescending(item => item.AnnoCompetenza)
                .ThenByDescending(item => item.MeseCompetenza ?? 0)
                .ThenBy(item => item.NomeRisorsa, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.Commessa, StringComparer.OrdinalIgnoreCase)
                .Take(normalizedTake)
                .ToArray();
        }
        catch
        {
            return [];
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
            var rows = await ExecuteSintesiStoredProcedureAsync(
                connection,
                user.IdRisorsa,
                selectedAnni,
                request.Aggrega,
                filterClause,
                Math.Clamp(request.Take, 1, 100000),
                cancellationToken);

            if (rows.Count > 0)
            {
                try
                {
                    rows = (await EnrichRicaviMaturatiFromAnalisiTableAsync(connection, rows, cancellationToken)).ToList();
                }
                catch
                {
                    // Non bloccare la sintesi in caso di mismatch schema su tabella analisi.
                }
            }

            var normalizedRows = ApplyRicaviMaturatiRules(rows, request.Aggrega, selectedAnni);
            if (request.Aggrega && normalizedRows.Count > 0)
            {
                var detailRows = await ExecuteSintesiStoredProcedureAsync(
                    connection,
                    user.IdRisorsa,
                    selectedAnni,
                    false,
                    filterClause,
                    100000,
                    cancellationToken);
                normalizedRows = ApplyLatestFutureProjectionForAggregatedRows(normalizedRows, detailRows);
            }

            return normalizedRows
                .OrderBy(item => item.Commessa)
                .ThenBy(item => item.Anno)
                .Take(Math.Clamp(request.Take, 1, 100000))
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<IReadOnlyCollection<CommessaSintesiRow>> SearchProdottiSintesiAsync(
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
            var filterClause = BuildAnalisiProdottiFilterClause(user, visibility, request);
            var baseRows = await ExecuteSintesiStoredProcedureAsync(
                connection,
                user.IdRisorsa,
                selectedAnni,
                request.Aggrega,
                filterClause,
                Math.Clamp(request.Take, 1, 5000),
                cancellationToken);
            var rows = baseRows
                .Where(row => IsValidProductValue(row.Prodotto))
                .Select(row => row with
                {
                    Prodotto = row.Prodotto
                })
                .ToList();

            if (rows.Count > 0)
            {
                try
                {
                    rows = (await EnrichRicaviMaturatiFromAnalisiTableAsync(connection, rows, cancellationToken)).ToList();
                }
                catch
                {
                    // Non bloccare la sintesi in caso di mismatch schema su tabella analisi.
                }
            }

            var normalizedRows = ApplyRicaviMaturatiRules(rows, request.Aggrega, selectedAnni);
            if (request.Aggrega && normalizedRows.Count > 0)
            {
                var detailRows = await ExecuteSintesiStoredProcedureAsync(
                    connection,
                    user.IdRisorsa,
                    selectedAnni,
                    false,
                    filterClause,
                    100000,
                    cancellationToken);
                var filteredDetailRows = detailRows
                    .Where(row => IsValidProductValue(row.Prodotto))
                    .ToArray();
                normalizedRows = ApplyLatestFutureProjectionForAggregatedRows(normalizedRows, filteredDetailRows);
            }

            return normalizedRows
                .OrderBy(row => row.Prodotto, StringComparer.OrdinalIgnoreCase)
                .ThenBy(row => row.Commessa, StringComparer.OrdinalIgnoreCase)
                .ThenBy(row => row.Anno)
                .Take(Math.Clamp(request.Take, 1, 5000))
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<IReadOnlyCollection<CommessaAndamentoMensileRow>> SearchAndamentoMensileAsync(
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
        var selectedAnni = request.Anni
            .Where(value => value > 0)
            .Distinct()
            .OrderByDescending(value => value)
            .ToArray();

        var filterRequest = request.Aggrega
            ? request with { Mese = null }
            : request;
        var filterClause = BuildAnalisiCommesseFilterClause(user, visibility, filterRequest);
        if (selectedAnni.Length == 1)
        {
            var annoClause = $"anno_competenza = {selectedAnni[0]}";
            filterClause = string.IsNullOrWhiteSpace(filterClause)
                ? annoClause
                : $"{filterClause} AND {annoClause}";
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            var meseRiferimento = request.Mese.HasValue && request.Mese.Value is >= 1 and <= 12
                ? request.Mese.Value
                : (int?)null;

            await using var command = new SqlCommand(AndamentoMensileCommesseStoredProcedure, connection);
            command.CommandType = CommandType.StoredProcedure;
            command.Parameters.AddWithValue("@idrisorsa", AnalisiCommesseIdRisorsa);
            command.Parameters.AddWithValue(
                "@FiltroDaApplicare",
                string.IsNullOrWhiteSpace(filterClause) ? DBNull.Value : filterClause);
            command.Parameters.AddWithValue("@Aggrega", false);
            command.Parameters.AddWithValue("@AnnoCorrente", DateTime.Today.Year);
            command.Parameters.AddWithValue("@MeseRiferimento", DBNull.Value);
            command.Parameters.AddWithValue("@Take", Math.Clamp(request.Take, 1, 100000));

            var rows = new List<CommessaAndamentoMensileRow>();
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
            {
                var ordinals = BuildColumnOrdinals(reader);
                while (await reader.ReadAsync(cancellationToken))
                {
                    var anno = ReadNullableInt(reader, ordinals, "anno_competenza", "anno", "Anno Competenza");
                    var mese = ReadNullableInt(reader, ordinals, "mese_competenza", "mese", "Mese Competenza");
                    if (!anno.HasValue || !mese.HasValue || anno.Value <= 0 || mese.Value is < 0 or > 12)
                    {
                        continue;
                    }

                    if (!request.Aggrega && mese.Value == 0)
                    {
                        continue;
                    }

                    rows.Add(new CommessaAndamentoMensileRow(
                        anno.Value,
                        mese.Value,
                        ReadString(reader, ordinals, "commessa"),
                        ReadString(reader, ordinals, "descrizione"),
                        ReadString(reader, ordinals, "tipo_commessa"),
                        ReadString(reader, ordinals, "stato"),
                        ReadString(reader, ordinals, "macrotipologia"),
                        ReadString(reader, ordinals, "Nomeprodotto"),
                        ReadString(reader, ordinals, "controparte"),
                        ReadString(reader, ordinals, "idbusinessunit"),
                        ReadString(reader, ordinals, "RCC"),
                        ReadString(reader, ordinals, "PM"),
                        ReadDecimal(reader, ordinals, "produzione") > 0m,
                        ReadDecimal(reader, ordinals, "ore_lavorate"),
                        ReadDecimal(reader, ordinals, "costo_personale"),
                        ReadDecimal(reader, ordinals, "ricavi"),
                        ReadDecimal(reader, ordinals, "costi"),
                        ReadDecimal(reader, ordinals, "ricavi_maturati", "RicaviMaturati"),
                        ReadDecimal(reader, ordinals, "ore_future", "OreFuture", "ore_restanti"),
                        ReadDecimal(reader, ordinals, "costo_personale_futuro", "CostoPersonaleFuturo"),
                        ReadDecimal(reader, ordinals, "CostoGeneraleRibaltato"),
                        ReadDecimal(reader, ordinals, "utile_specifico")));
                }
            }
            var currentYear = DateTime.Today.Year;
            if (request.Aggrega && meseRiferimento.HasValue)
            {
                var maxMese = Math.Clamp(meseRiferimento.Value, 1, 12);
                rows = rows
                    .Where(row =>
                        row.AnnoCompetenza != currentYear ||
                        (row.AnnoCompetenza == currentYear && row.MeseCompetenza <= maxMese))
                    .ToList();
            }

            var normalizedRows = ApplyAndamentoMensileProjectionRules(rows);
            var outputRows = request.Aggrega
                ? AggregateAndamentoMensileRows(normalizedRows, meseRiferimento)
                : normalizedRows;

            return outputRows
                .OrderByDescending(row => row.AnnoCompetenza)
                .ThenByDescending(row => row.MeseCompetenza)
                .ThenBy(row => row.Commessa, StringComparer.OrdinalIgnoreCase)
                .Take(Math.Clamp(request.Take, 1, 100000))
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<IReadOnlyCollection<CommessaAnomalaRow>> SearchCommesseAnomaleAsync(
        UserContext user,
        string profile,
        int take,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        var visibility = ResolveVisibility(profile);
        var normalizedTake = Math.Clamp(take, 1, 100000);

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(CommesseAnomaleQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@Take", normalizedTake);
            ApplyVisibilityParameters(command, user, visibility);

            var rows = new List<CommessaAnomalaRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            var ordinals = BuildColumnOrdinals(reader);
            while (await reader.ReadAsync(cancellationToken))
            {
                rows.Add(new CommessaAnomalaRow(
                    ReadString(reader, ordinals, "TipoAnomalia"),
                    ReadString(reader, ordinals, "DettaglioAnomalia"),
                    ReadNullableInt(reader, ordinals, "IdCommessa") ?? 0,
                    ReadString(reader, ordinals, "Commessa"),
                    ReadString(reader, ordinals, "DescrizioneCommessa"),
                    ReadString(reader, ordinals, "TipologiaCommessa"),
                    ReadString(reader, ordinals, "Stato"),
                    ReadString(reader, ordinals, "MacroTipologia"),
                    ReadString(reader, ordinals, "Controparte"),
                    ReadString(reader, ordinals, "BusinessUnit"),
                    ReadString(reader, ordinals, "Rcc"),
                    ReadString(reader, ordinals, "Pm"),
                    ReadDecimal(reader, ordinals, "OreLavorate"),
                    ReadDecimal(reader, ordinals, "CostoPersonale"),
                    ReadDecimal(reader, ordinals, "Ricavi"),
                    ReadDecimal(reader, ordinals, "Costi"),
                    ReadDecimal(reader, ordinals, "RicaviFuturi"),
                    ReadDecimal(reader, ordinals, "CostiFuturi")));
            }

            return rows;
        }
        catch
        {
            return [];
        }
    }

    public async Task<IReadOnlyCollection<ContabilitaVenditaRow>> SearchVenditeAsync(
        UserContext user,
        string profile,
        CommesseSintesiSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        var normalizedTake = Math.Clamp(request.Take, 1, 5000);
        var selectedInvoiceYears = request.Anni
            .Where(value => value > 0)
            .Distinct()
            .ToHashSet();
        var normalizedProvenienzaFilter = NormalizeVenditeProvenienzaFilter(request.Provenienza);
        var includeOnlyScadute = request.SoloScadute == true;

        var lookupRequest = request with
        {
            Anni = Array.Empty<int>(),
            Take = normalizedTake,
            Aggrega = false,
            SoloScadute = null,
            Provenienza = null
        };

        var commesseRows = await SearchSintesiAsync(user, profile, lookupRequest, cancellationToken);
        if (commesseRows.Count == 0)
        {
            return [];
        }

        var commesseLookup = commesseRows
            .Where(item => !string.IsNullOrWhiteSpace(item.Commessa))
            .GroupBy(item => NormalizeCommessaKey(item.Commessa), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var first = group.First();
                    return new VenditaCommessaLookupRow(
                        first.Commessa,
                        first.DescrizioneCommessa,
                        first.TipologiaCommessa,
                        first.Stato,
                        first.MacroTipologia,
                        first.Controparte,
                        first.BusinessUnit,
                        first.Rcc,
                        first.Pm);
                },
                StringComparer.OrdinalIgnoreCase);

        if (commesseLookup.Count == 0)
        {
            return [];
        }

        var commesseInClause = string.Join(", ", commesseLookup.Keys.Select(SqlQuote));
        if (string.IsNullOrWhiteSpace(commesseInClause))
        {
            return [];
        }

        var venditaQuery = $"""
            SELECT
                CAST(CASE WHEN a.[data] IS NULL THEN NULL ELSE YEAR(CAST(a.[data] AS DATE)) END AS INT) AS AnnoFattura,
                CAST(a.[data] AS DATE) AS DataMovimento,
                CAST(LEFT(LTRIM(RTRIM(COALESCE(NULLIF(a.[numero], N''), NULLIF(a.[numerooriginale], N''), CAST(a.[numeroregistrazione] AS NVARCHAR(32))))), 64) AS NVARCHAR(64)) AS NumeroDocumento,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(a.[descrizionefattura], N''))), 512) AS NVARCHAR(512)) AS DescrizioneMovimento,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Causale,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[cb_CodiceSottoConto] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Sottoconto,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(a.[codice_cliente] AS NVARCHAR(64)), N''))), 256) AS NVARCHAR(256)) AS ControparteMovimento,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(a.[provenienza], N''))), 128) AS NVARCHAR(128)) AS Provenienza,
                CAST(COALESCE(
                    CONVERT(DECIMAL(18, 2), a.[importocomplessivo]),
                    CONVERT(DECIMAL(18, 2), a.[impcomplessivodettaglio]),
                    CONVERT(DECIMAL(18, 2), a.[ImportoImponibileEuro]),
                    0
                ) AS DECIMAL(18, 2)) AS Importo,
                CAST(UPPER(LTRIM(RTRIM(ISNULL(a.[commessaintranet], N'')))) AS NVARCHAR(128)) AS CommessaIntranetUpper,
                CAST(UPPER(LTRIM(RTRIM(ISNULL(a.[cont_commessa], N'')))) AS NVARCHAR(128)) AS ContCommessaUpper
            FROM [CDG].[CdgFattureAttive] a
            OUTER APPLY
            (
                SELECT TOP (1)
                    x.[CB_CodiceCausale],
                    x.[cb_CodiceSottoConto]
                FROM [CDG].[CDG_IncrocioContabilitaIntranet] x
                WHERE UPPER(LTRIM(RTRIM(ISNULL(x.[CDG_Commessa], N'')))) IN
                (
                    UPPER(LTRIM(RTRIM(ISNULL(a.[commessaintranet], N'')))),
                    UPPER(LTRIM(RTRIM(ISNULL(a.[cont_commessa], N''))))
                )
                  AND
                  (
                      NULLIF(LTRIM(RTRIM(CAST(x.[CB_NumeroDocumento] AS NVARCHAR(64)))), N'') =
                      NULLIF(LTRIM(RTRIM(COALESCE(NULLIF(a.[numero], N''), NULLIF(a.[numerooriginale], N''), CAST(a.[numeroregistrazione] AS NVARCHAR(32))))), N'')
                      OR
                      (
                          a.[numeroregistrazione] IS NOT NULL
                          AND CASE
                                  WHEN ISNUMERIC(NULLIF(LTRIM(RTRIM(CAST(x.[CB_NumRegistrazione] AS NVARCHAR(32)))), N'')) = 1
                                      THEN CONVERT(INT, NULLIF(LTRIM(RTRIM(CAST(x.[CB_NumRegistrazione] AS NVARCHAR(32)))), N''))
                                  ELSE NULL
                              END = a.[numeroregistrazione]
                      )
                  )
                ORDER BY
                    CASE
                        WHEN NULLIF(LTRIM(RTRIM(CAST(x.[CB_NumeroDocumento] AS NVARCHAR(64)))), N'') =
                             NULLIF(LTRIM(RTRIM(COALESCE(NULLIF(a.[numero], N''), NULLIF(a.[numerooriginale], N''), CAST(a.[numeroregistrazione] AS NVARCHAR(32))))), N'')
                            THEN 0
                        ELSE 1
                    END,
                    CASE
                        WHEN CAST(x.[CDG_Data] AS DATE) = CAST(a.[data] AS DATE) THEN 0
                        ELSE 1
                    END
            ) inc
            WHERE (
                    UPPER(LTRIM(RTRIM(ISNULL(a.[commessaintranet], N'')))) IN ({commesseInClause})
                    OR UPPER(LTRIM(RTRIM(ISNULL(a.[cont_commessa], N'')))) IN ({commesseInClause})
                  )
              AND (
                    inc.[CB_CodiceCausale] IS NULL
                    OR UPPER(LTRIM(RTRIM(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256))))) <> N'BIC'
                  )
            ORDER BY
                CAST(a.[data] AS DATE),
                NumeroDocumento;
            """;

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(venditaQuery, connection);
            command.CommandType = CommandType.Text;

            var today = DateTime.Today;
            var vendite = new List<ContabilitaVenditaRow>();

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var commessaIntranetUpper = ReadString(reader, "CommessaIntranetUpper");
                var contCommessaUpper = ReadString(reader, "ContCommessaUpper");

                var matchedKey =
                    (!string.IsNullOrWhiteSpace(commessaIntranetUpper) && commesseLookup.ContainsKey(commessaIntranetUpper))
                        ? commessaIntranetUpper
                        : (!string.IsNullOrWhiteSpace(contCommessaUpper) && commesseLookup.ContainsKey(contCommessaUpper)
                            ? contCommessaUpper
                            : null);
                if (string.IsNullOrWhiteSpace(matchedKey) || !commesseLookup.TryGetValue(matchedKey, out var commessaInfo))
                {
                    continue;
                }

                var dataMovimento = ReadNullableDate(reader, "DataMovimento");
                var annoFattura = ReadNullableInt(reader, "AnnoFattura");
                var provenienzaRaw = ReadString(reader, "Provenienza");
                var isFutureByDate = dataMovimento.HasValue && dataMovimento.Value.Date > today;
                var isFutureBySource = provenienzaRaw.Equals("intranet", StringComparison.OrdinalIgnoreCase);
                var isFuture = isFutureByDate || isFutureBySource;
                var isScaduta = isFutureBySource && dataMovimento.HasValue && dataMovimento.Value.Date < today;
                var statoTemporale = isFutureByDate ? "Futuro" : "Passato";
                var provenienza = MapVenditeProvenienzaLabel(provenienzaRaw, isFuture);
                var importo = ReadDecimal(reader, "Importo");
                var fatturato = provenienza.Equals(VenditeProvenienzaFatturaContabilita, StringComparison.OrdinalIgnoreCase)
                    ? importo
                    : 0m;
                var fatturatoFuturo = provenienza.Equals(VenditeProvenienzaFatturaFutura, StringComparison.OrdinalIgnoreCase)
                    ? importo
                    : 0m;
                var ricavoIpotetico = provenienza.Equals(VenditeProvenienzaRicavoIpotetico, StringComparison.OrdinalIgnoreCase)
                    ? importo
                    : 0m;

                if (selectedInvoiceYears.Count > 0 &&
                    (!annoFattura.HasValue || !selectedInvoiceYears.Contains(annoFattura.Value)))
                {
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(normalizedProvenienzaFilter) &&
                    !provenienza.Equals(normalizedProvenienzaFilter, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (includeOnlyScadute && !isScaduta)
                {
                    continue;
                }

                vendite.Add(new ContabilitaVenditaRow(
                    annoFattura,
                    dataMovimento,
                    commessaInfo.Commessa,
                    commessaInfo.DescrizioneCommessa,
                    commessaInfo.TipologiaCommessa,
                    commessaInfo.StatoCommessa,
                    commessaInfo.MacroTipologia,
                    commessaInfo.ControparteCommessa,
                    commessaInfo.BusinessUnit,
                    commessaInfo.Rcc,
                    commessaInfo.Pm,
                    ReadString(reader, "NumeroDocumento"),
                    ReadString(reader, "DescrizioneMovimento"),
                    ReadString(reader, "Causale"),
                    ReadString(reader, "Sottoconto"),
                    ReadString(reader, "ControparteMovimento"),
                    provenienza,
                    importo,
                    fatturato,
                    fatturatoFuturo,
                    ricavoIpotetico,
                    isFuture,
                    isScaduta,
                    statoTemporale));
            }

            return vendite
                .OrderBy(item => item.DataMovimento)
                .ThenBy(item => item.Commessa, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.NumeroDocumento, StringComparer.OrdinalIgnoreCase)
                .Take(normalizedTake)
                .ToArray();
        }
        catch
        {
            return [];
        }
    }

    public async Task<IReadOnlyCollection<ContabilitaAcquistoRow>> SearchAcquistiAsync(
        UserContext user,
        string profile,
        CommesseSintesiSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return [];
        }

        var normalizedTake = Math.Clamp(request.Take, 1, 5000);
        var selectedInvoiceYears = request.Anni
            .Where(value => value > 0)
            .Distinct()
            .ToHashSet();
        var normalizedProvenienzaFilter = NormalizeVenditeProvenienzaFilter(request.Provenienza);
        var includeOnlyScadute = request.SoloScadute == true;

        var lookupRequest = request with
        {
            Anni = Array.Empty<int>(),
            Take = normalizedTake,
            Aggrega = false,
            SoloScadute = null,
            Provenienza = null
        };

        var commesseRows = await SearchSintesiAsync(user, profile, lookupRequest, cancellationToken);
        if (commesseRows.Count == 0)
        {
            return [];
        }

        var commesseLookup = commesseRows
            .Where(item => !string.IsNullOrWhiteSpace(item.Commessa))
            .GroupBy(item => NormalizeCommessaKey(item.Commessa), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var first = group.First();
                    return new VenditaCommessaLookupRow(
                        first.Commessa,
                        first.DescrizioneCommessa,
                        first.TipologiaCommessa,
                        first.Stato,
                        first.MacroTipologia,
                        first.Controparte,
                        first.BusinessUnit,
                        first.Rcc,
                        first.Pm);
                },
                StringComparer.OrdinalIgnoreCase);

        if (commesseLookup.Count == 0)
        {
            return [];
        }

        var commesseInClause = string.Join(", ", commesseLookup.Keys.Select(SqlQuote));
        if (string.IsNullOrWhiteSpace(commesseInClause))
        {
            return [];
        }

        var acquistiQuery = $"""
            SELECT
                CAST(CASE WHEN p.[anno] IS NULL THEN NULL ELSE p.[anno] END AS INT) AS AnnoFattura,
                CAST(p.[Data Documento] AS DATE) AS DataDocumento,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(p.[idsocieta] AS NVARCHAR(64)), N''))), 64) AS NVARCHAR(64)) AS CodiceSocieta,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(p.[descrizionefattura], N''))), 512) AS NVARCHAR(512)) AS DescrizioneFattura,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Causale,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[cb_CodiceSottoConto] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Sottoconto,
                CAST(COALESCE(CONVERT(DECIMAL(18, 2), p.[importocomplessivo]), 0) AS DECIMAL(18, 2)) AS ImportoComplessivo,
                CAST(COALESCE(CONVERT(DECIMAL(18, 2), p.[importocontabilitadettaglio]), 0) AS DECIMAL(18, 2)) AS ImportoContabilitaDettaglio,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(p.[provenienza], N''))), 128) AS NVARCHAR(128)) AS Provenienza,
                CAST(LEFT(LTRIM(RTRIM(ISNULL(p.[controparte], N''))), 256) AS NVARCHAR(256)) AS ControparteMovimento,
                CAST(LEFT(LTRIM(RTRIM(COALESCE(NULLIF(CAST(q.[COMMESSA] AS NVARCHAR(128)), N''), NULLIF(p.[commessa], N''), N''))), 128) AS NVARCHAR(128)) AS Commessa,
                CAST(UPPER(LTRIM(RTRIM(COALESCE(NULLIF(CAST(q.[COMMESSA] AS NVARCHAR(128)), N''), NULLIF(p.[commessa], N''), N'')))) AS NVARCHAR(128)) AS CommessaUpper
            FROM [CDG].[CdgFatturePassive] p
            LEFT JOIN [cdg_qryComessaPmRcc] q
                ON q.[idcommessa] = p.[idcommessa]
            OUTER APPLY
            (
                SELECT TOP (1)
                    x.[CB_CodiceCausale],
                    x.[cb_CodiceSottoConto]
                FROM [CDG].[CDG_IncrocioContabilitaIntranet] x
                WHERE UPPER(LTRIM(RTRIM(ISNULL(x.[CDG_Commessa], N'')))) =
                      UPPER(LTRIM(RTRIM(COALESCE(NULLIF(CAST(q.[COMMESSA] AS NVARCHAR(128)), N''), NULLIF(p.[commessa], N''), N''))))
                  AND
                  (
                      NULLIF(LTRIM(RTRIM(CAST(x.[CB_NumeroDocumento] AS NVARCHAR(64)))), N'') =
                      NULLIF(LTRIM(RTRIM(COALESCE(NULLIF(p.[NumeroDocumento], N''), CAST(p.[numeroregistrazione] AS NVARCHAR(32))))), N'')
                      OR
                      (
                          p.[numeroregistrazione] IS NOT NULL
                          AND CASE
                                  WHEN ISNUMERIC(NULLIF(LTRIM(RTRIM(CAST(x.[CB_NumRegistrazione] AS NVARCHAR(32)))), N'')) = 1
                                      THEN CONVERT(INT, NULLIF(LTRIM(RTRIM(CAST(x.[CB_NumRegistrazione] AS NVARCHAR(32)))), N''))
                                  ELSE NULL
                              END = p.[numeroregistrazione]
                      )
                  )
                ORDER BY
                    CASE
                        WHEN NULLIF(LTRIM(RTRIM(CAST(x.[CB_NumeroDocumento] AS NVARCHAR(64)))), N'') =
                             NULLIF(LTRIM(RTRIM(COALESCE(NULLIF(p.[NumeroDocumento], N''), CAST(p.[numeroregistrazione] AS NVARCHAR(32))))), N'')
                            THEN 0
                        ELSE 1
                    END,
                    CASE
                        WHEN CAST(x.[CDG_Data] AS DATE) = CAST(p.[Data Documento] AS DATE) THEN 0
                        ELSE 1
                    END
            ) inc
            WHERE UPPER(LTRIM(RTRIM(COALESCE(NULLIF(CAST(q.[COMMESSA] AS NVARCHAR(128)), N''), NULLIF(p.[commessa], N''), N'')))) IN ({commesseInClause})
              AND (
                    inc.[CB_CodiceCausale] IS NULL
                    OR UPPER(LTRIM(RTRIM(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256))))) <> N'BIC'
                  );
            """;

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = new SqlCommand(acquistiQuery, connection);
            command.CommandType = CommandType.Text;

            var today = DateTime.Today;
            var acquisti = new List<ContabilitaAcquistoRow>();

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var commessaUpper = ReadString(reader, "CommessaUpper");
                if (string.IsNullOrWhiteSpace(commessaUpper))
                {
                    commessaUpper = NormalizeCommessaKey(ReadString(reader, "Commessa"));
                }

                if (string.IsNullOrWhiteSpace(commessaUpper) || !commesseLookup.TryGetValue(commessaUpper, out var commessaInfo))
                {
                    continue;
                }

                var dataDocumento = ReadNullableDate(reader, "DataDocumento");
                var annoFattura = ReadNullableInt(reader, "AnnoFattura");
                var provenienzaRaw = ReadString(reader, "Provenienza");
                var isFutureByDate = dataDocumento.HasValue && dataDocumento.Value.Date > today;
                var isFutureBySource = provenienzaRaw.Equals("intranet", StringComparison.OrdinalIgnoreCase);
                var isFuture = isFutureByDate || isFutureBySource;
                var isScaduta = isFutureBySource && dataDocumento.HasValue && dataDocumento.Value.Date < today;
                var statoTemporale = isFutureByDate ? "Futuro" : "Passato";
                var provenienza = MapVenditeProvenienzaLabel(provenienzaRaw, isFuture);

                if (selectedInvoiceYears.Count > 0 &&
                    (!annoFattura.HasValue || !selectedInvoiceYears.Contains(annoFattura.Value)))
                {
                    continue;
                }

                if (!string.IsNullOrWhiteSpace(normalizedProvenienzaFilter) &&
                    !provenienza.Equals(normalizedProvenienzaFilter, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (includeOnlyScadute && !isScaduta)
                {
                    continue;
                }

                acquisti.Add(new ContabilitaAcquistoRow(
                    annoFattura,
                    dataDocumento,
                    commessaInfo.Commessa,
                    commessaInfo.DescrizioneCommessa,
                    commessaInfo.TipologiaCommessa,
                    commessaInfo.StatoCommessa,
                    commessaInfo.MacroTipologia,
                    commessaInfo.ControparteCommessa,
                    commessaInfo.BusinessUnit,
                    commessaInfo.Rcc,
                    commessaInfo.Pm,
                    ReadString(reader, "CodiceSocieta"),
                    ReadString(reader, "DescrizioneFattura"),
                    ReadString(reader, "Causale"),
                    ReadString(reader, "Sottoconto"),
                    ReadString(reader, "ControparteMovimento"),
                    provenienza,
                    ReadDecimal(reader, "ImportoComplessivo"),
                    ReadDecimal(reader, "ImportoContabilitaDettaglio"),
                    isFuture,
                    isScaduta,
                    statoTemporale));
            }

            return acquisti
                .OrderBy(item => item.DataDocumento)
                .ThenBy(item => item.Commessa, StringComparer.OrdinalIgnoreCase)
                .ThenBy(item => item.CodiceSocieta, StringComparer.OrdinalIgnoreCase)
                .Take(normalizedTake)
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
                    ReadString(reader, "Causale"),
                    ReadString(reader, "Sottoconto"),
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
                        ReadString(reader, "Causale"),
                        ReadString(reader, "Sottoconto"),
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
            await EnsureAvanzamentoTableAsync(connection, cancellationToken);

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
                ReadDecimal(reader, "ore_future"),
                ReadDecimal(reader, "ore_restanti"),
                ReadDecimal(reader, "costo_personale_futuro"),
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
            await EnsureAvanzamentoTableAsync(connection, cancellationToken);

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
                    ReadDecimal(reader, "ore_future"),
                    ReadDecimal(reader, "ore_restanti"),
                    ReadDecimal(reader, "costo_personale_futuro"),
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
        decimal oreFuture,
        decimal oreRestanti,
        decimal costoPersonaleFuturo,
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
            await EnsureAvanzamentoTableAsync(connection, cancellationToken);

            await using var command = new SqlCommand(CommessaAvanzamentoUpsertQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@CommessaUpper", commessa.Trim().ToUpperInvariant());
            command.Parameters.AddWithValue("@PercentualeRaggiunto", percentualeClamped);
            command.Parameters.AddWithValue("@ImportoRiferimento", importoRiferimento);
            command.Parameters.AddWithValue("@OreFuture", oreFuture);
            command.Parameters.AddWithValue("@OreRestanti", oreRestanti);
            command.Parameters.AddWithValue("@CostoPersonaleFuturo", costoPersonaleFuturo);
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
                ReadDecimal(reader, "ore_future"),
                ReadDecimal(reader, "ore_restanti"),
                ReadDecimal(reader, "costo_personale_futuro"),
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
                Array.Empty<CommessaRequisitoOreRisorsaRow>(),
                Array.Empty<CommessaOreSpeseRisorsaRow>());
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
            var oreSpeseRisorse = new List<CommessaOreSpeseRisorsaRow>();

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                requisiti.Add(new CommessaRequisitoOreSummaryRow(
                    ReadNullableInt(reader, "IdRequisito") ?? 0,
                    ReadString(reader, "Requisito"),
                    ReadDecimal(reader, "DurataRequisito"),
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
                        ReadDecimal(reader, "DurataRequisito"),
                        ReadDecimal(reader, "OrePreviste"),
                        ReadDecimal(reader, "OreSpese"),
                        ReadDecimal(reader, "OreRestanti"),
                        ReadDecimal(reader, "PercentualeAvanzamento")));
                }
            }

            if (await reader.NextResultAsync(cancellationToken))
            {
                while (await reader.ReadAsync(cancellationToken))
                {
                    oreSpeseRisorse.Add(new CommessaOreSpeseRisorsaRow(
                        ReadNullableInt(reader, "IdRisorsa") ?? 0,
                        ReadString(reader, "NomeRisorsa"),
                        ReadDecimal(reader, "OreSpeseTotali")));
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
                    .ToArray(),
                oreSpeseRisorse
                    .OrderBy(item => item.NomeRisorsa)
                    .ThenBy(item => item.IdRisorsa)
                    .ToArray());
        }
        catch
        {
            return new CommessaRequisitiOreDettaglio(
                Array.Empty<CommessaRequisitoOreSummaryRow>(),
                Array.Empty<CommessaRequisitoOreRisorsaRow>(),
                Array.Empty<CommessaOreSpeseRisorsaRow>());
        }
    }

    public async Task<IReadOnlyCollection<AppInfoMenuRow>> GetAppInfoMenuVoicesAsync(
        string applicazione,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(applicazione))
        {
            return Array.Empty<AppInfoMenuRow>();
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using (var ensureCommand = new SqlCommand(EnsureSignificatoMenuTableQuery, connection))
            {
                ensureCommand.CommandType = CommandType.Text;
                await ensureCommand.ExecuteNonQueryAsync(cancellationToken);
            }

            await using var command = new SqlCommand(SignificatoMenuSelectQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@Applicazione", applicazione.Trim());

            var rows = new List<AppInfoMenuRow>();
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                rows.Add(new AppInfoMenuRow(
                    ReadString(reader, "Applicazione"),
                    ReadString(reader, "Menu"),
                    ReadString(reader, "Voce"),
                    ReadString(reader, "Descrizione")));
            }

            return rows;
        }
        catch
        {
            return Array.Empty<AppInfoMenuRow>();
        }
    }

    public async Task<AppInfoMenuRow?> SaveAppInfoMenuVoiceAsync(
        string applicazione,
        string menu,
        string voce,
        string descrizione,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connectionString) ||
            string.IsNullOrWhiteSpace(applicazione) ||
            string.IsNullOrWhiteSpace(menu) ||
            string.IsNullOrWhiteSpace(voce))
        {
            return null;
        }

        try
        {
            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using (var ensureCommand = new SqlCommand(EnsureSignificatoMenuTableQuery, connection))
            {
                ensureCommand.CommandType = CommandType.Text;
                await ensureCommand.ExecuteNonQueryAsync(cancellationToken);
            }

            await using var command = new SqlCommand(SignificatoMenuUpsertQuery, connection);
            command.CommandType = CommandType.Text;
            command.Parameters.AddWithValue("@Applicazione", applicazione.Trim());
            command.Parameters.AddWithValue("@Menu", menu.Trim());
            command.Parameters.AddWithValue("@Voce", voce.Trim());
            command.Parameters.AddWithValue("@Descrizione", descrizione?.Trim() ?? string.Empty);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            return new AppInfoMenuRow(
                ReadString(reader, "Applicazione"),
                ReadString(reader, "Menu"),
                ReadString(reader, "Voce"),
                ReadString(reader, "Descrizione"));
        }
        catch
        {
            return null;
        }
    }

    private static async Task EnsureAvanzamentoTableAsync(
        SqlConnection connection,
        CancellationToken cancellationToken)
    {
        await using var ensureCommand = new SqlCommand(EnsureAvanzamentoTableQuery, connection);
        ensureCommand.CommandType = CommandType.Text;
        await ensureCommand.ExecuteNonQueryAsync(cancellationToken);
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
            normalizedProfile.Equals(ProfileCatalog.GeneralProjectManager, StringComparison.OrdinalIgnoreCase) ||
            normalizedProfile.Equals(ProfileCatalog.RisorseUmane, StringComparison.OrdinalIgnoreCase);

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

    private static string? NormalizeVenditeProvenienzaFilter(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        if (normalized.Equals(VenditeProvenienzaFatturaContabilita, StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("contabilita", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("contabilitÃ ", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("entrambe", StringComparison.OrdinalIgnoreCase))
        {
            return VenditeProvenienzaFatturaContabilita;
        }

        if (normalized.Equals(VenditeProvenienzaFatturaFutura, StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("intranet", StringComparison.OrdinalIgnoreCase))
        {
            return VenditeProvenienzaFatturaFutura;
        }

        if (normalized.Equals(VenditeProvenienzaRicavoIpotetico, StringComparison.OrdinalIgnoreCase) ||
            normalized.Contains("ipotet", StringComparison.OrdinalIgnoreCase))
        {
            return VenditeProvenienzaRicavoIpotetico;
        }

        return normalized;
    }

    private static string MapVenditeProvenienzaLabel(string? provenienzaRaw, bool isFuture)
    {
        var normalized = provenienzaRaw?.Trim() ?? string.Empty;
        if (normalized.Contains("ipotet", StringComparison.OrdinalIgnoreCase))
        {
            return VenditeProvenienzaRicavoIpotetico;
        }

        if (normalized.Equals("intranet", StringComparison.OrdinalIgnoreCase))
        {
            return VenditeProvenienzaFatturaFutura;
        }

        if (normalized.Equals("contabilita", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("contabilitÃ ", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("entrambe", StringComparison.OrdinalIgnoreCase))
        {
            return VenditeProvenienzaFatturaContabilita;
        }

        if (isFuture)
        {
            return VenditeProvenienzaFatturaFutura;
        }

        return VenditeProvenienzaFatturaContabilita;
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

        if (request.Mese.HasValue && request.Mese.Value is >= 1 and <= 12)
        {
            clauses.Add($"mese_competenza = {request.Mese.Value}");
        }

        if (request.AttiveDalAnno.HasValue && request.AttiveDalAnno.Value > 0)
        {
            clauses.Add(
                $"EXISTS (SELECT 1 FROM dbo.commesse c WHERE c.id = idcommessa AND (c.data_chiu IS NULL OR YEAR(c.data_chiu) >= {request.AttiveDalAnno.Value}))");
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

    private static string BuildAnalisiProdottiFilterClause(
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

        if (request.AttiveDalAnno.HasValue && request.AttiveDalAnno.Value > 0)
        {
            clauses.Add(
                $"EXISTS (SELECT 1 FROM dbo.commesse c WHERE c.id = idcommessa AND (c.data_chiu IS NULL OR YEAR(c.data_chiu) >= {request.AttiveDalAnno.Value}))");
        }

        AddStringClause(clauses, "commessa", request.Commessa);
        AddStringClause(clauses, "tipo_commessa", request.TipologiaCommessa);
        AddStringClause(clauses, "stato", request.Stato);
        AddStringClause(clauses, "macrotipologia", request.MacroTipologia);
        AddStringClause(clauses, "Nomeprodotto", request.Prodotto);
        AddStringClause(clauses, "idbusinessunit", request.BusinessUnit);
        AddStringClause(clauses, "RCC", request.Rcc);
        AddStringClause(clauses, "PM", request.Pm);

        clauses.Add("ISNULL(LTRIM(RTRIM(Nomeprodotto)), '') <> ''");
        clauses.Add("UPPER(LTRIM(RTRIM(Nomeprodotto))) NOT IN ('NON DEFINITO', 'NON DEFINTO')");

        var visibilityClause = BuildVisibilityClause(user, visibility);
        if (!string.IsNullOrWhiteSpace(visibilityClause))
        {
            clauses.Add(visibilityClause);
        }

        return string.Join(" AND ", clauses);
    }

    private static string BuildRisorseValutazioneFilterClause(
        UserContext user,
        VisibilityFlags visibility,
        CommesseRisorseSearchRequest request)
    {
        var clauses = new List<string>();
        var selectedAnni = request.Anni
            .Where(value => value > 0)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();
        var selectedMesi = (request.Mesi ?? [])
            .Where(value => value is >= 1 and <= 12)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();

        if (request.Mensile)
        {
            var monthlyClause = BuildMensileCompetenzaClause(selectedAnni);
            if (!string.IsNullOrWhiteSpace(monthlyClause))
            {
                clauses.Add(monthlyClause);
            }
        }
        else if (selectedAnni.Length > 0)
        {
            if (selectedAnni.Length == 1)
            {
                clauses.Add($"anno_competenza = {selectedAnni[0]}");
            }
            else
            {
                clauses.Add($"anno_competenza IN ({string.Join(", ", selectedAnni)})");
            }
        }

        if (request.Mensile && selectedMesi.Length > 0)
        {
            clauses.Add($"mese_competenza IN ({string.Join(", ", selectedMesi)})");
        }

        AddStringClause(clauses, "commessa", request.Commessa);
        AddStringClause(clauses, "tipo_commessa", request.TipologiaCommessa);
        AddStringClause(clauses, "stato", request.Stato);
        AddStringClause(clauses, "macrotipologia", request.MacroTipologia);
        AddStringClause(clauses, "controparte", request.Controparte);
        AddStringClause(clauses, "idbusinessunit", request.BusinessUnit);
        AddStringClause(clauses, "idOU", request.Ou);
        AddStringClause(clauses, "RCC", request.Rcc);
        AddStringClause(clauses, "PM", request.Pm);

        if (request.IdRisorsa.HasValue && request.IdRisorsa.Value > 0)
        {
            clauses.Add($"idRisorsa = {request.IdRisorsa.Value}");
        }

        var visibilityClause = BuildVisibilityClause(user, visibility, request.AnalisiOu);
        if (!string.IsNullOrWhiteSpace(visibilityClause))
        {
            clauses.Add(visibilityClause);
        }

        return string.Join(" AND ", clauses);
    }

    private static string BuildRisorseValutazioneOuPivotFilterClause(
        UserContext user,
        VisibilityFlags visibility,
        CommesseRisorseSearchRequest request)
    {
        var clauses = new List<string>();
        var selectedAnni = request.Anni
            .Where(value => value > 0)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();
        var selectedMesi = (request.Mesi ?? [])
            .Where(value => value is >= 1 and <= 12)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();

        if (selectedAnni.Length == 1)
        {
            clauses.Add($"anno_competenza = {selectedAnni[0]}");
        }
        else if (selectedAnni.Length > 1)
        {
            clauses.Add($"anno_competenza IN ({string.Join(", ", selectedAnni)})");
        }

        if (request.Mensile && selectedMesi.Length > 0)
        {
            clauses.Add($"mese_competenza IN ({string.Join(", ", selectedMesi)})");
        }

        AddStringClause(clauses, "idbusinessunit", request.BusinessUnit);
        AddStringClause(clauses, "idOU", request.Ou);

        var visibilityClause = BuildVisibilityClause(user, visibility, true);
        if (!string.IsNullOrWhiteSpace(visibilityClause))
        {
            clauses.Add(visibilityClause);
        }

        return string.Join(" AND ", clauses);
    }

    private static string BuildMensileCompetenzaClause(IReadOnlyCollection<int> selectedAnni)
    {
        var now = DateTime.Now;
        var currentYear = now.Year;
        var currentMonth = Math.Clamp(now.Month, 1, 12);

        var years = (selectedAnni.Count == 0
                ? new[] { currentYear - 1, currentYear }
                : selectedAnni.Where(value => value > 0).Distinct().OrderBy(value => value).ToArray())
            .Distinct()
            .OrderBy(value => value)
            .ToArray();

        if (years.Length == 0)
        {
            return string.Empty;
        }

        var clauses = new List<string>();
        foreach (var year in years)
        {
            if (year == currentYear)
            {
                clauses.Add($"(anno_competenza = {year} AND mese_competenza < {currentMonth})");
            }
            else
            {
                clauses.Add($"anno_competenza = {year}");
            }
        }

        if (clauses.Count == 1)
        {
            return clauses[0];
        }

        return $"({string.Join(" OR ", clauses)})";
    }

    private static async Task<Dictionary<int, (string NomeRisorsa, bool InForza)>> LoadRisorseLookupAsync(
        SqlConnection connection,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<int, (string NomeRisorsa, bool InForza)>();

        await using var command = new SqlCommand(RisorseLookupQuery, connection);
        command.CommandType = CommandType.Text;
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var idRisorsa = ReadNullableInt(reader, "IdRisorsa") ?? 0;
            if (idRisorsa <= 0)
            {
                continue;
            }

            var nomeRisorsa = ReadString(reader, "NomeRisorsa");
            if (string.IsNullOrWhiteSpace(nomeRisorsa))
            {
                continue;
            }

            var inForza = ReadBoolean(reader, "InForza");
            result[idRisorsa] = (nomeRisorsa, inForza);
        }

        return result;
    }

    private static async Task<IReadOnlyCollection<CommessaSintesiRow>> EnrichRicaviMaturatiFromAnalisiTableAsync(
        SqlConnection connection,
        IReadOnlyCollection<CommessaSintesiRow> rows,
        CancellationToken cancellationToken)
    {
        var commesse = rows
            .Select(row => NormalizeCommessaKey(row.Commessa))
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var anni = rows
            .Where(row => row.Anno.HasValue && row.Anno.Value > 0)
            .Select(row => row.Anno!.Value)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();

        if (commesse.Length == 0 || anni.Length == 0)
        {
            return rows;
        }

        var annualLookup = new Dictionary<(int Anno, string Commessa), decimal>();
        var annualAttempts = new (string TableName, string YearColumn, string IdCommessaColumn, string RicaviColumn)[]
        {
            ("cdg.CdgAnalisiCommesse", "[anno_competenza]", "[idCommessa]", "[RicaviMaturati]"),
            ("cdg.CdgAnalisiCommesse", "[anno]", "[idCommessa]", "[RicaviMaturati]"),
            ("cdg.CdgAnalisiCommesse", "[Anno Competenza]", "[idCommessa]", "[RicaviMaturati]"),
        };

        foreach (var attempt in annualAttempts)
        {
            var source = await TryLoadRicaviMaturatiLookupAsync(
                connection,
                commesse,
                anni,
                attempt.TableName,
                attempt.YearColumn,
                attempt.IdCommessaColumn,
                attempt.RicaviColumn,
                cancellationToken);
            MergeLookupPreferNonZero(annualLookup, source);
        }

        var monthlyLookup = new Dictionary<(int Anno, string Commessa), decimal>();
        var monthlyAttempts = new (string TableName, string YearColumn, string MonthColumn, string IdCommessaColumn, string RicaviColumn)[]
        {
            ("cdg.CdgAnalisiCommesseMensile", "[anno_competenza]", "[mese_competenza]", "[idCommessa]", "[RicaviMaturati]"),
            ("cdg.CdgAnalisiCommesseMensile", "[anno]", "[mese]", "[idCommessa]", "[RicaviMaturati]"),
            ("cdg.CdgAnalisiCommesseMensile", "[Anno Competenza]", "[Mese Competenza]", "[idCommessa]", "[RicaviMaturati]"),
        };

        foreach (var attempt in monthlyAttempts)
        {
            var source = await TryLoadRicaviMaturatiLatestPerYearLookupAsync(
                connection,
                commesse,
                anni,
                attempt.TableName,
                attempt.YearColumn,
                attempt.MonthColumn,
                attempt.IdCommessaColumn,
                attempt.RicaviColumn,
                cancellationToken);
            MergeLookupPreferNonZero(monthlyLookup, source);
        }

        return rows
            .Select(row =>
            {
                if (!row.Anno.HasValue || row.Anno.Value <= 0)
                {
                    return row;
                }

                var key = (row.Anno.Value, NormalizeCommessaKey(row.Commessa));
                var hasAnnual = annualLookup.TryGetValue(key, out var annualValue);
                var hasMonthly = monthlyLookup.TryGetValue(key, out var monthlyValue);

                var ricaviMaturati = row.RicaviMaturati;
                if (hasMonthly && monthlyValue != 0m)
                {
                    ricaviMaturati = monthlyValue;
                }
                else if (hasAnnual && annualValue != 0m)
                {
                    ricaviMaturati = annualValue;
                }
                else if (hasMonthly)
                {
                    ricaviMaturati = monthlyValue;
                }
                else if (hasAnnual)
                {
                    ricaviMaturati = annualValue;
                }

                return row with { RicaviMaturati = ricaviMaturati };
            })
            .ToArray();
    }

    private static async Task<IReadOnlyCollection<CommessaAndamentoMensileRow>> EnrichRicaviMaturatiFromAnalisiMensileTableAsync(
        SqlConnection connection,
        IReadOnlyCollection<CommessaAndamentoMensileRow> rows,
        CancellationToken cancellationToken)
    {
        var commesse = rows
            .Select(row => NormalizeCommessaKey(row.Commessa))
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var anni = rows
            .Where(row => row.AnnoCompetenza > 0)
            .Select(row => row.AnnoCompetenza)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();

        var mesi = rows
            .Where(row => row.MeseCompetenza is >= 1 and <= 12)
            .Select(row => row.MeseCompetenza)
            .Distinct()
            .OrderBy(value => value)
            .ToArray();

        if (commesse.Length == 0 || anni.Length == 0 || mesi.Length == 0)
        {
            return rows;
        }

        var lookup = new Dictionary<(int Anno, int Mese, string Commessa), decimal>();
        var attempts = new (string TableName, string YearColumn, string MonthColumn, string IdCommessaColumn, string RicaviColumn)[]
        {
            ("cdg.CdgAnalisiCommesseMensile", "[anno_competenza]", "[mese_competenza]", "[idCommessa]", "[RicaviMaturati]"),
            ("cdg.CdgAnalisiCommesseMensile", "[anno]", "[mese]", "[idCommessa]", "[RicaviMaturati]"),
            ("cdg.CdgAnalisiCommesseMensile", "[Anno Competenza]", "[Mese Competenza]", "[idCommessa]", "[RicaviMaturati]"),
        };

        foreach (var attempt in attempts)
        {
            var source = await TryLoadRicaviMaturatiMensileLookupAsync(
                connection,
                commesse,
                anni,
                mesi,
                attempt.TableName,
                attempt.YearColumn,
                attempt.MonthColumn,
                attempt.IdCommessaColumn,
                attempt.RicaviColumn,
                cancellationToken);
            MergeLookupPreferNonZero(lookup, source);
        }

        return rows
            .Select(row =>
            {
                var key = (row.AnnoCompetenza, row.MeseCompetenza, NormalizeCommessaKey(row.Commessa));
                if (!lookup.TryGetValue(key, out var value))
                {
                    return row;
                }

                if (row.RicaviMaturati == 0m || value != 0m)
                {
                    return row with { RicaviMaturati = value };
                }

                return row;
            })
            .ToArray();
    }

    private static async Task<Dictionary<(int Anno, string Commessa), decimal>> TryLoadRicaviMaturatiLookupAsync(
        SqlConnection connection,
        IReadOnlyList<string> commesse,
        IReadOnlyList<int> anni,
        string tableName,
        string yearColumnName,
        string idCommessaColumnName,
        string ricaviColumnName,
        CancellationToken cancellationToken)
    {
        var lookup = new Dictionary<(int Anno, string Commessa), decimal>();
        try
        {
            var commessaParameters = commesse.Select((_, index) => $"@Commessa{index}").ToArray();
            var annoParameters = anni.Select((_, index) => $"@Anno{index}").ToArray();

            var query = $"""
                SELECT
                    CAST(a.{yearColumnName} AS INT) AS AnnoCompetenza,
                    UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) AS CommessaKey,
                    CAST(SUM(ISNULL(a.{ricaviColumnName}, 0)) AS DECIMAL(18, 2)) AS RicaviMaturati
                FROM {tableName} a
                INNER JOIN dbo.commesse c
                    ON c.id = a.{idCommessaColumnName}
                WHERE UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) IN ({string.Join(", ", commessaParameters)})
                  AND CAST(a.{yearColumnName} AS INT) IN ({string.Join(", ", annoParameters)})
                GROUP BY
                    CAST(a.{yearColumnName} AS INT),
                    UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N''))));
                """;

            await using var command = new SqlCommand(query, connection);
            command.CommandType = CommandType.Text;

            for (var index = 0; index < commesse.Count; index += 1)
            {
                command.Parameters.AddWithValue($"@Commessa{index}", commesse[index]);
            }

            for (var index = 0; index < anni.Count; index += 1)
            {
                command.Parameters.AddWithValue($"@Anno{index}", anni[index]);
            }

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var anno = ReadNullableInt(reader, "AnnoCompetenza") ?? 0;
                if (anno <= 0)
                {
                    continue;
                }

                var commessa = NormalizeCommessaKey(ReadString(reader, "CommessaKey"));
                if (string.IsNullOrWhiteSpace(commessa))
                {
                    continue;
                }

                lookup[(anno, commessa)] = ReadDecimal(reader, "RicaviMaturati");
            }
        }
        catch
        {
            return new Dictionary<(int Anno, string Commessa), decimal>();
        }

        return lookup;
    }

    private static async Task<Dictionary<(int Anno, string Commessa), decimal>> TryLoadRicaviMaturatiLatestPerYearLookupAsync(
        SqlConnection connection,
        IReadOnlyList<string> commesse,
        IReadOnlyList<int> anni,
        string tableName,
        string yearColumnName,
        string monthColumnName,
        string idCommessaColumnName,
        string ricaviColumnName,
        CancellationToken cancellationToken)
    {
        var lookup = new Dictionary<(int Anno, string Commessa), decimal>();
        try
        {
            var commessaParameters = commesse.Select((_, index) => $"@Commessa{index}").ToArray();
            var annoParameters = anni.Select((_, index) => $"@Anno{index}").ToArray();

            var query = $"""
                ;WITH base AS
                (
                    SELECT
                        CAST(a.{yearColumnName} AS INT) AS AnnoCompetenza,
                        CAST(a.{monthColumnName} AS INT) AS MeseCompetenza,
                        UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) AS CommessaKey,
                        CAST(SUM(ISNULL(a.{ricaviColumnName}, 0)) AS DECIMAL(18, 2)) AS RicaviMaturati
                    FROM {tableName} a
                    INNER JOIN dbo.commesse c
                        ON c.id = a.{idCommessaColumnName}
                    WHERE UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) IN ({string.Join(", ", commessaParameters)})
                      AND CAST(a.{yearColumnName} AS INT) IN ({string.Join(", ", annoParameters)})
                    GROUP BY
                        CAST(a.{yearColumnName} AS INT),
                        CAST(a.{monthColumnName} AS INT),
                        UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N''))))
                ),
                ranked AS
                (
                    SELECT
                        AnnoCompetenza,
                        MeseCompetenza,
                        CommessaKey,
                        RicaviMaturati,
                        ROW_NUMBER() OVER (
                            PARTITION BY AnnoCompetenza, CommessaKey
                            ORDER BY
                                CASE WHEN RicaviMaturati <> 0 THEN 0 ELSE 1 END,
                                MeseCompetenza DESC
                        ) AS rn
                    FROM base
                )
                SELECT
                    AnnoCompetenza,
                    CommessaKey,
                    RicaviMaturati
                FROM ranked
                WHERE rn = 1;
                """;

            await using var command = new SqlCommand(query, connection);
            command.CommandType = CommandType.Text;

            for (var index = 0; index < commesse.Count; index += 1)
            {
                command.Parameters.AddWithValue($"@Commessa{index}", commesse[index]);
            }

            for (var index = 0; index < anni.Count; index += 1)
            {
                command.Parameters.AddWithValue($"@Anno{index}", anni[index]);
            }

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var anno = ReadNullableInt(reader, "AnnoCompetenza") ?? 0;
                if (anno <= 0)
                {
                    continue;
                }

                var commessa = NormalizeCommessaKey(ReadString(reader, "CommessaKey"));
                if (string.IsNullOrWhiteSpace(commessa))
                {
                    continue;
                }

                lookup[(anno, commessa)] = ReadDecimal(reader, "RicaviMaturati");
            }
        }
        catch
        {
            return new Dictionary<(int Anno, string Commessa), decimal>();
        }

        return lookup;
    }

    private static async Task<Dictionary<(int Anno, int Mese, string Commessa), decimal>> TryLoadRicaviMaturatiMensileLookupAsync(
        SqlConnection connection,
        IReadOnlyList<string> commesse,
        IReadOnlyList<int> anni,
        IReadOnlyList<int> mesi,
        string tableName,
        string yearColumnName,
        string monthColumnName,
        string idCommessaColumnName,
        string ricaviColumnName,
        CancellationToken cancellationToken)
    {
        var lookup = new Dictionary<(int Anno, int Mese, string Commessa), decimal>();
        try
        {
            var commessaParameters = commesse.Select((_, index) => $"@Commessa{index}").ToArray();
            var annoParameters = anni.Select((_, index) => $"@Anno{index}").ToArray();
            var meseParameters = mesi.Select((_, index) => $"@Mese{index}").ToArray();

            var query = $"""
                SELECT
                    CAST(a.{yearColumnName} AS INT) AS AnnoCompetenza,
                    CAST(a.{monthColumnName} AS INT) AS MeseCompetenza,
                    UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) AS CommessaKey,
                    CAST(SUM(ISNULL(a.{ricaviColumnName}, 0)) AS DECIMAL(18, 2)) AS RicaviMaturati
                FROM {tableName} a
                INNER JOIN dbo.commesse c
                    ON c.id = a.{idCommessaColumnName}
                WHERE UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N'')))) IN ({string.Join(", ", commessaParameters)})
                  AND CAST(a.{yearColumnName} AS INT) IN ({string.Join(", ", annoParameters)})
                  AND CAST(a.{monthColumnName} AS INT) IN ({string.Join(", ", meseParameters)})
                GROUP BY
                    CAST(a.{yearColumnName} AS INT),
                    CAST(a.{monthColumnName} AS INT),
                    UPPER(LTRIM(RTRIM(ISNULL(c.commessa, N''))));
                """;

            await using var command = new SqlCommand(query, connection);
            command.CommandType = CommandType.Text;

            for (var index = 0; index < commesse.Count; index += 1)
            {
                command.Parameters.AddWithValue($"@Commessa{index}", commesse[index]);
            }

            for (var index = 0; index < anni.Count; index += 1)
            {
                command.Parameters.AddWithValue($"@Anno{index}", anni[index]);
            }

            for (var index = 0; index < mesi.Count; index += 1)
            {
                command.Parameters.AddWithValue($"@Mese{index}", mesi[index]);
            }

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var anno = ReadNullableInt(reader, "AnnoCompetenza") ?? 0;
                var mese = ReadNullableInt(reader, "MeseCompetenza") ?? 0;
                if (anno <= 0 || mese is < 1 or > 12)
                {
                    continue;
                }

                var commessa = NormalizeCommessaKey(ReadString(reader, "CommessaKey"));
                if (string.IsNullOrWhiteSpace(commessa))
                {
                    continue;
                }

                lookup[(anno, mese, commessa)] = ReadDecimal(reader, "RicaviMaturati");
            }
        }
        catch
        {
            return new Dictionary<(int Anno, int Mese, string Commessa), decimal>();
        }

        return lookup;
    }

    private static void MergeLookupPreferNonZero(
        IDictionary<(int Anno, string Commessa), decimal> target,
        IReadOnlyDictionary<(int Anno, string Commessa), decimal> source)
    {
        foreach (var (key, value) in source)
        {
            if (!target.TryGetValue(key, out var current))
            {
                target[key] = value;
                continue;
            }

            if (current == 0m && value != 0m)
            {
                target[key] = value;
            }
        }
    }

    private static void MergeLookupPreferNonZero(
        IDictionary<(int Anno, int Mese, string Commessa), decimal> target,
        IReadOnlyDictionary<(int Anno, int Mese, string Commessa), decimal> source)
    {
        foreach (var (key, value) in source)
        {
            if (!target.TryGetValue(key, out var current))
            {
                target[key] = value;
                continue;
            }

            if (current == 0m && value != 0m)
            {
                target[key] = value;
            }
        }
    }

    private static CommessaSintesiRow BuildCommessaSintesiRowFromReader(
        SqlDataReader reader,
        IReadOnlyDictionary<string, int> ordinals)
    {
        return new CommessaSintesiRow(
            ReadNullableInt(reader, ordinals, "anno_competenza"),
            ReadString(reader, ordinals, "commessa"),
            ReadString(reader, ordinals, "descrizione"),
            ReadString(reader, ordinals, "tipo_commessa"),
            ReadString(reader, ordinals, "stato"),
            ReadString(reader, ordinals, "macrotipologia"),
            ReadString(reader, ordinals, "Nomeprodotto"),
            ReadString(reader, ordinals, "controparte"),
            ReadString(reader, ordinals, "idbusinessunit"),
            ReadString(reader, ordinals, "RCC"),
            ReadString(reader, ordinals, "PM"),
            ReadDecimal(reader, ordinals, "ore_lavorate"),
            ReadDecimal(reader, ordinals, "costo_personale"),
            ReadDecimal(reader, ordinals, "ricavi"),
            ReadDecimal(reader, ordinals, "costi"),
            ReadDecimal(reader, ordinals, "ricavi_maturati", "RicaviMaturati"),
            ReadDecimal(reader, ordinals, "utile_specifico"),
            ReadDecimal(reader, ordinals, "ricavi_futuri"),
            ReadDecimal(reader, ordinals, "costi_futuri"),
            ReadDecimal(reader, ordinals, "ore_future", "OreFuture", "ore_restanti"),
            ReadDecimal(reader, ordinals, "costo_personale_futuro", "CostoPersonaleFuturo"));
    }

    private static async Task<List<CommessaSintesiRow>> ExecuteSintesiStoredProcedureAsync(
        SqlConnection connection,
        int idRisorsa,
        IReadOnlyCollection<int> selectedAnni,
        bool aggrega,
        string? filterClause,
        int take,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand(SintesiCommesseStoredProcedure, connection);
        command.CommandType = CommandType.StoredProcedure;
        command.Parameters.AddWithValue("@IdRisorsa", idRisorsa);
        command.Parameters.AddWithValue("@Anno", selectedAnni.Count == 1 ? selectedAnni.First() : DBNull.Value);
        command.Parameters.AddWithValue("@Aggrega", aggrega ? 1 : 0);
        command.Parameters.AddWithValue(
            "@FiltroDaApplicare",
            string.IsNullOrWhiteSpace(filterClause) ? DBNull.Value : filterClause);
        command.Parameters.AddWithValue("@Take", Math.Clamp(take, 1, 100000));

        var rows = new List<CommessaSintesiRow>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var ordinals = BuildColumnOrdinals(reader);
        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add(BuildCommessaSintesiRowFromReader(reader, ordinals));
        }

        return rows;
    }

    private static IReadOnlyCollection<CommessaSintesiRow> ApplyLatestFutureProjectionForAggregatedRows(
        IReadOnlyCollection<CommessaSintesiRow> aggregatedRows,
        IReadOnlyCollection<CommessaSintesiRow> detailedRows)
    {
        if (aggregatedRows.Count == 0 || detailedRows.Count == 0)
        {
            return aggregatedRows;
        }

        var latestByCommessa = detailedRows
            .Where(row => !string.IsNullOrWhiteSpace(row.Commessa))
            .GroupBy(row => NormalizeCommessaKey(row.Commessa), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var ordered = group
                        .OrderByDescending(item => item.Anno ?? int.MinValue)
                        .ToArray();
                    var latestNonZero = ordered.FirstOrDefault(item => item.OreFuture != 0m || item.CostoPersonaleFuturo != 0m);
                    var selected = latestNonZero ?? ordered.First();
                    return (selected.OreFuture, selected.CostoPersonaleFuturo);
                },
                StringComparer.OrdinalIgnoreCase);

        return aggregatedRows
            .Select(row =>
            {
                var key = NormalizeCommessaKey(row.Commessa);
                if (string.IsNullOrWhiteSpace(key) || !latestByCommessa.TryGetValue(key, out var latest))
                {
                    return row;
                }

                return row with
                {
                    OreFuture = latest.OreFuture,
                    CostoPersonaleFuturo = latest.CostoPersonaleFuturo
                };
            })
            .ToArray();
    }

    private static IReadOnlyCollection<CommessaSintesiRow> ApplyRicaviMaturatiRules(
        IReadOnlyCollection<CommessaSintesiRow> rows,
        bool aggrega,
        IReadOnlyCollection<int> selectedAnni)
    {
        if (rows.Count == 0)
        {
            return rows;
        }

        var annoRiferimentoRicaviMaturati = ResolveRicaviMaturatiReferenceYear(rows, aggrega, selectedAnni);

        return rows
            .Select(row =>
            {
                var ricaviMaturati = row.RicaviMaturati;
                if (aggrega &&
                    annoRiferimentoRicaviMaturati.HasValue &&
                    row.Anno.HasValue &&
                    row.Anno.Value != annoRiferimentoRicaviMaturati.Value)
                {
                    ricaviMaturati = 0m;
                }

                return row with
                {
                    RicaviMaturati = ricaviMaturati,
                    UtileSpecifico = row.Ricavi + ricaviMaturati - row.Costi - row.CostoPersonale
                };
            })
            .ToArray();
    }

    private static IReadOnlyCollection<CommessaAndamentoMensileRow> ApplyAndamentoMensileProjectionRules(
        IReadOnlyCollection<CommessaAndamentoMensileRow> rows)
    {
        if (rows.Count == 0)
        {
            return rows;
        }

        var referenceMonthByAnnoCommessa = rows
            .GroupBy(row => (row.AnnoCompetenza, Commessa: NormalizeCommessaKey(row.Commessa)))
            .ToDictionary(
                group => group.Key,
                group =>
                {
                    var latestRicaviMaturatiMonth = group
                        .Where(item => item.RicaviMaturati != 0m)
                        .Select(item => item.MeseCompetenza)
                        .DefaultIfEmpty(0)
                        .Max();

                    if (latestRicaviMaturatiMonth > 0)
                    {
                        return latestRicaviMaturatiMonth;
                    }

                    var latestFutureProjectionMonth = group
                        .Where(item => item.OreFuture != 0m || item.CostoPersonaleFuturo != 0m)
                        .Select(item => item.MeseCompetenza)
                        .DefaultIfEmpty(0)
                        .Max();

                    return latestFutureProjectionMonth > 0
                        ? latestFutureProjectionMonth
                        : group.Max(item => item.MeseCompetenza);
                });

        return rows
            .Select(row =>
            {
                var key = (row.AnnoCompetenza, Commessa: NormalizeCommessaKey(row.Commessa));
                var isReferenceMonth =
                    referenceMonthByAnnoCommessa.TryGetValue(key, out var referenceMonth) &&
                    row.MeseCompetenza == referenceMonth;
                var ricaviMaturati = isReferenceMonth ? row.RicaviMaturati : 0m;
                var oreFuture = isReferenceMonth ? row.OreFuture : 0m;
                var costoPersonaleFuturo = isReferenceMonth ? row.CostoPersonaleFuturo : 0m;

                return row with
                {
                    RicaviMaturati = ricaviMaturati,
                    OreFuture = oreFuture,
                    CostoPersonaleFuturo = costoPersonaleFuturo,
                    CostoGeneraleRibaltato = 0m,
                    UtileSpecifico = row.Ricavi + ricaviMaturati - row.Costi - row.CostoPersonale
                };
            })
            .ToArray();
    }

    private static IReadOnlyCollection<CommessaAndamentoMensileRow> AggregateAndamentoMensileRows(
        IReadOnlyCollection<CommessaAndamentoMensileRow> rows,
        int? meseRiferimento)
    {
        if (rows.Count == 0)
        {
            return rows;
        }

        return rows
            .GroupBy(row => new
            {
                row.AnnoCompetenza,
                Commessa = NormalizeCommessaKey(row.Commessa),
                row.DescrizioneCommessa,
                row.TipologiaCommessa,
                row.Stato,
                row.MacroTipologia,
                row.Prodotto,
                row.Controparte,
                row.BusinessUnit,
                row.Rcc,
                row.Pm
            })
            .Select(group =>
            {
                var first = group.First();
                var totaleRicavi = group.Sum(item => item.Ricavi);
                var totaleCosti = group.Sum(item => item.Costi);
                var totaleCostoPersonale = group.Sum(item => item.CostoPersonale);
                var latestReferenceRow = group
                    .OrderByDescending(item => item.MeseCompetenza)
                    .FirstOrDefault(item =>
                        item.RicaviMaturati != 0m ||
                        item.OreFuture != 0m ||
                        item.CostoPersonaleFuturo != 0m)
                    ?? group.OrderByDescending(item => item.MeseCompetenza).First();
                var totaleRicaviMaturati = latestReferenceRow.RicaviMaturati;
                var totaleOreFuture = latestReferenceRow.OreFuture;
                var totaleCostoPersonaleFuturo = latestReferenceRow.CostoPersonaleFuturo;
                var meseOutput = meseRiferimento.HasValue && meseRiferimento.Value is >= 1 and <= 12
                    ? meseRiferimento.Value
                    : group.Max(item => item.MeseCompetenza);

                return new CommessaAndamentoMensileRow(
                    first.AnnoCompetenza,
                    meseOutput,
                    first.Commessa,
                    first.DescrizioneCommessa,
                    first.TipologiaCommessa,
                    first.Stato,
                    first.MacroTipologia,
                    first.Prodotto,
                    first.Controparte,
                    first.BusinessUnit,
                    first.Rcc,
                    first.Pm,
                    group.Any(item => item.Produzione),
                    group.Sum(item => item.OreLavorate),
                    totaleCostoPersonale,
                    totaleRicavi,
                    totaleCosti,
                    totaleRicaviMaturati,
                    totaleOreFuture,
                    totaleCostoPersonaleFuturo,
                    0m,
                    totaleRicavi + totaleRicaviMaturati - totaleCosti - totaleCostoPersonale);
            })
            .ToArray();
    }

    private static int? ResolveRicaviMaturatiReferenceYear(
        IReadOnlyCollection<CommessaSintesiRow> rows,
        bool aggrega,
        IReadOnlyCollection<int> selectedAnni)
    {
        if (!aggrega)
        {
            return null;
        }

        var selectedYear = selectedAnni
            .Where(value => value > 0)
            .DefaultIfEmpty()
            .Max();
        if (selectedYear > 0)
        {
            return selectedYear;
        }

        return rows
            .Where(row => row.Anno.HasValue && row.Anno.Value > 0)
            .Select(row => row.Anno!.Value)
            .DefaultIfEmpty()
            .Max();
    }

    private static IReadOnlyCollection<CommesseSintesiFilterOption> BuildDistinctOptionsFromRows(IEnumerable<string> values)
    {
        return values
            .Select(value => value?.Trim() ?? string.Empty)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
            .Select(value => new CommesseSintesiFilterOption(value, value))
            .ToArray();
    }

    private static bool IsValidProductValue(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var normalized = value.Trim().ToUpperInvariant();
        return normalized is not "NON DEFINITO" and not "NON DEFINTO";
    }

    private static string BuildVisibilityClause(UserContext user, VisibilityFlags visibility, bool useIdOuColumn = false)
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
            var scopeColumn = useIdOuColumn ? "idou" : "idbusinessunit";
            clauses.Add(
                $"EXISTS (SELECT 1 FROM [orga].[vw_OU_OrganigrammaAncestor] ou WHERE ou.id_responsabile_ou_ancestor = {user.IdRisorsa} AND ou.sigla COLLATE DATABASE_DEFAULT = {scopeColumn} COLLATE DATABASE_DEFAULT)");
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

    private static string NormalizeCommessaKey(string value)
    {
        return value.Trim().ToUpperInvariant();
    }

    private static Dictionary<string, int> BuildColumnOrdinals(SqlDataReader reader)
    {
        var result = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (var index = 0; index < reader.FieldCount; index += 1)
        {
            var columnName = reader.GetName(index);
            if (string.IsNullOrWhiteSpace(columnName) || result.ContainsKey(columnName))
            {
                continue;
            }

            result[columnName] = index;
        }

        return result;
    }

    private static int? ReadNullableInt(SqlDataReader reader, IReadOnlyDictionary<string, int> ordinals, params string[] columnNames)
    {
        foreach (var columnName in columnNames)
        {
            if (!ordinals.TryGetValue(columnName, out var ordinal) || reader.IsDBNull(ordinal))
            {
                continue;
            }

            return Convert.ToInt32(reader.GetValue(ordinal));
        }

        return null;
    }

    private static string ReadString(SqlDataReader reader, IReadOnlyDictionary<string, int> ordinals, params string[] columnNames)
    {
        foreach (var columnName in columnNames)
        {
            if (!ordinals.TryGetValue(columnName, out var ordinal) || reader.IsDBNull(ordinal))
            {
                continue;
            }

            return reader.GetValue(ordinal)?.ToString()?.Trim() ?? string.Empty;
        }

        return string.Empty;
    }

    private static decimal ReadDecimal(SqlDataReader reader, IReadOnlyDictionary<string, int> ordinals, params string[] columnNames)
    {
        foreach (var columnName in columnNames)
        {
            if (!ordinals.TryGetValue(columnName, out var ordinal) || reader.IsDBNull(ordinal))
            {
                continue;
            }

            return Convert.ToDecimal(reader.GetValue(ordinal));
        }

        return 0m;
    }

    private static bool ReadBoolean(SqlDataReader reader, IReadOnlyDictionary<string, int> ordinals, params string[] columnNames)
    {
        foreach (var columnName in columnNames)
        {
            if (!ordinals.TryGetValue(columnName, out var ordinal) || reader.IsDBNull(ordinal))
            {
                continue;
            }

            return Convert.ToBoolean(reader.GetValue(ordinal));
        }

        return false;
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

    private sealed record VenditaCommessaLookupRow(
        string Commessa,
        string DescrizioneCommessa,
        string TipologiaCommessa,
        string StatoCommessa,
        string MacroTipologia,
        string ControparteCommessa,
        string BusinessUnit,
        string Rcc,
        string Pm);
}


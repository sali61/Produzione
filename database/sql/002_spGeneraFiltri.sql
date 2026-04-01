/*
    Stored procedure filtri pagina "Commesse > Sintesi"
    Schema: produzione
    Fonte principale: cdg_qryComessaPmRcc
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spGeneraFiltri', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spGeneraFiltri AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spGeneraFiltri
    @IdRisorsa INT,
    @UsernameUpper NVARCHAR(256),
    @IsGlobal BIT,
    @IsPm BIT,
    @IsRcc BIT,
    @IsResponsabileOu BIT,
    @Anno INT = NULL,
    @TakePerFilter INT = 300
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Take INT =
        CASE
            WHEN @TakePerFilter IS NULL OR @TakePerFilter < 10 THEN 10
            WHEN @TakePerFilter > 1000 THEN 1000
            ELSE @TakePerFilter
        END;

    DECLARE @UsernameNormalized NVARCHAR(256) = UPPER(LTRIM(RTRIM(ISNULL(@UsernameUpper, N''))));
    DECLARE @FiltroBix NVARCHAR(MAX) = NULL;

    IF @IsPm = 1
    BEGIN
        SET @FiltroBix =
            CASE
                WHEN @FiltroBix IS NULL THEN N'idPM = ' + CAST(@IdRisorsa AS NVARCHAR(20))
                ELSE @FiltroBix + N' AND idPM = ' + CAST(@IdRisorsa AS NVARCHAR(20))
            END;
    END;

    IF @IsRcc = 1
    BEGIN
        SET @FiltroBix =
            CASE
                WHEN @FiltroBix IS NULL THEN N'idRCC = ' + CAST(@IdRisorsa AS NVARCHAR(20))
                ELSE @FiltroBix + N' AND idRCC = ' + CAST(@IdRisorsa AS NVARCHAR(20))
            END;
    END;

    IF @IsResponsabileOu = 1
    BEGIN
        SET @FiltroBix =
            CASE
                WHEN @FiltroBix IS NULL THEN N'EXISTS (SELECT 1 FROM [orga].[vw_OU_OrganigrammaAncestor] ou WHERE ou.id_responsabile_ou_ancestor = '
                    + CAST(@IdRisorsa AS NVARCHAR(20)) + N' AND ou.sigla = idbusinessunit)'
                ELSE @FiltroBix + N' AND EXISTS (SELECT 1 FROM [orga].[vw_OU_OrganigrammaAncestor] ou WHERE ou.id_responsabile_ou_ancestor = '
                    + CAST(@IdRisorsa AS NVARCHAR(20)) + N' AND ou.sigla = idbusinessunit)'
            END;
    END;

    IF @Anno IS NOT NULL
    BEGIN
        SET @FiltroBix =
            CASE
                WHEN @FiltroBix IS NULL THEN N'anno_competenza = ' + CAST(@Anno AS NVARCHAR(12))
                ELSE @FiltroBix + N' AND anno_competenza = ' + CAST(@Anno AS NVARCHAR(12))
            END;
    END;

    CREATE TABLE #AnalisiCommesse
    (
        idcommessa INT NULL,
        commessa NVARCHAR(100) NULL,
        data_commessa DATE NULL,
        idsocieta INT NULL,
        codicesocieta NVARCHAR(50) NULL,
        descrizione NVARCHAR(255) NULL,
        stato NVARCHAR(100) NULL,
        controparte NVARCHAR(255) NULL,
        idbusinessunit NVARCHAR(255) NULL,
        RCC NVARCHAR(255) NULL,
        idRCC INT NULL,
        PM NVARCHAR(255) NULL,
        idPM INT NULL,
        tipo_commessa NVARCHAR(100) NULL,
        macrotipologia NVARCHAR(100) NULL,
        Nomeprodotto NVARCHAR(255) NULL,
        costostruttura NVARCHAR(100) NULL,
        tipo_cliente NVARCHAR(100) NULL,
        infragruppo BIT NULL,
        tm NVARCHAR(100) NULL,
        produzione NVARCHAR(100) NULL,
        soluzione NVARCHAR(255) NULL,
        anno_competenza INT NULL,
        ore_lavorate DECIMAL(18, 2) NULL,
        costo_personale DECIMAL(18, 2) NULL,
        ricavi DECIMAL(18, 2) NULL,
        ricavi_futuri DECIMAL(18, 2) NULL,
        costi DECIMAL(18, 2) NULL,
        costi_futuri DECIMAL(18, 2) NULL,
        CostoGeneraleRibaltato DECIMAL(18, 2) NULL,
        utile_specifico DECIMAL(18, 2) NULL,
        ricavi_da_emettere DECIMAL(18, 2) NULL,
        costi_da_emettere DECIMAL(18, 2) NULL,
        KPI_Composito DECIMAL(18, 4) NULL,
        ImportoFatturatoInteraziendale DECIMAL(18, 2) NULL,
        ImportoAcquistiInteraziendali DECIMAL(18, 2) NULL,
        Coeff_ril_econ DECIMAL(5, 2) NULL
    );

    INSERT INTO #AnalisiCommesse
    EXEC [produzione].[spBixeniaAnalisiCommesse]
        @idrisorsa = @IdRisorsa,
        @tiporicerca = 'AnalisiCommessa',
        @FiltroDaApplicare = @FiltroBix,
        @CampoAggregazione = NULL;

    ;WITH Base AS
    (
        SELECT
            CASE
                WHEN c.data_commessa IS NULL THEN NULL
                ELSE YEAR(c.data_commessa)
            END AS Anno,
            LTRIM(RTRIM(CAST(ISNULL(c.COMMESSA, N'') AS NVARCHAR(128)))) AS Commessa,
            LTRIM(RTRIM(CAST(ISNULL(c.descrizione, N'') AS NVARCHAR(512)))) AS DescrizioneCommessa,
            LTRIM(RTRIM(CAST(ISNULL(c.Tipo_commessa, N'') AS NVARCHAR(256)))) AS TipologiaCommessa,
            LTRIM(RTRIM(CAST(ISNULL(c.stato, N'') AS NVARCHAR(128)))) AS Stato,
            LTRIM(RTRIM(CAST(ISNULL(c.macrotipologia, N'') AS NVARCHAR(256)))) AS MacroTipologia,
            LTRIM(RTRIM(CAST(ISNULL(c.Nomeprodotto, N'') AS NVARCHAR(256)))) AS Prodotto,
            LTRIM(RTRIM(CAST(ISNULL(c.idBusinessUnit, N'') AS NVARCHAR(128)))) AS BusinessUnit,
            LTRIM(RTRIM(CAST(ISNULL(c.RCC, N'') AS NVARCHAR(256)))) AS RccNome,
            LTRIM(RTRIM(CAST(ISNULL(c.NetUserNameRCC, N'') AS NVARCHAR(256)))) AS RccUsername,
            LTRIM(RTRIM(CAST(ISNULL(c.PM, N'') AS NVARCHAR(256)))) AS PmNome,
            LTRIM(RTRIM(CAST(ISNULL(c.NetUserNamePM, N'') AS NVARCHAR(256)))) AS PmUsername
        FROM cdg_qryComessaPmRcc c
        WHERE (@Anno IS NULL OR YEAR(c.data_commessa) = @Anno)
          AND (
                @IsGlobal = 1
                OR (@IsPm = 1 AND (c.idPM = @IdRisorsa OR UPPER(ISNULL(c.NetUserNamePM, N'')) = @UsernameNormalized))
                OR (@IsRcc = 1 AND (c.idRCC = @IdRisorsa OR UPPER(ISNULL(c.NetUserNameRCC, N'')) = @UsernameNormalized))
                OR (@IsResponsabileOu = 1 AND EXISTS
                    (
                        SELECT 1
                        FROM [orga].[vw_OU_OrganigrammaAncestor] ou
                        WHERE ou.id_responsabile_ou_ancestor = @IdRisorsa
                          AND ou.sigla = c.idBusinessUnit
                    ))
              )
    ),
    AnniFromBix AS
    (
        SELECT DISTINCT
            CAST(a.anno_competenza AS INT) AS Anno
        FROM #AnalisiCommesse a
        WHERE a.anno_competenza IS NOT NULL
    ),
    DistinctRows AS
    (
        SELECT DISTINCT
            Anno,
            Commessa,
            DescrizioneCommessa,
            TipologiaCommessa,
            Stato,
            MacroTipologia,
            Prodotto,
            BusinessUnit,
            RccNome,
            RccUsername,
            PmNome,
            PmUsername
        FROM Base
    ),
    FilterRows AS
    (
        SELECT
            N'anno' AS FilterKey,
            CAST(Anno AS NVARCHAR(16)) AS FilterValue,
            CAST(Anno AS NVARCHAR(16)) AS FilterLabel,
            N'0001|' + RIGHT(N'000000' + CAST(Anno AS NVARCHAR(6)), 6) AS SortKey
        FROM AnniFromBix

        UNION ALL

        SELECT
            N'commessa' AS FilterKey,
            Commessa AS FilterValue,
            CASE
                WHEN DescrizioneCommessa = N'' THEN Commessa
                ELSE Commessa + N' - ' + DescrizioneCommessa
            END AS FilterLabel,
            N'0002|' + Commessa AS SortKey
        FROM DistinctRows
        WHERE Commessa <> N''

        UNION ALL

        SELECT
            N'tipologiaCommessa' AS FilterKey,
            TipologiaCommessa AS FilterValue,
            TipologiaCommessa AS FilterLabel,
            N'0003|' + TipologiaCommessa AS SortKey
        FROM DistinctRows
        WHERE TipologiaCommessa <> N''

        UNION ALL

        SELECT
            N'stato' AS FilterKey,
            Stato AS FilterValue,
            Stato AS FilterLabel,
            N'0004|' + Stato AS SortKey
        FROM DistinctRows
        WHERE Stato <> N''

        UNION ALL

        SELECT
            N'macroTipologia' AS FilterKey,
            MacroTipologia AS FilterValue,
            MacroTipologia AS FilterLabel,
            N'0005|' + MacroTipologia AS SortKey
        FROM DistinctRows
        WHERE MacroTipologia <> N''

        UNION ALL

        SELECT
            N'prodotto' AS FilterKey,
            Prodotto AS FilterValue,
            Prodotto AS FilterLabel,
            N'0006|' + Prodotto AS SortKey
        FROM DistinctRows
        WHERE Prodotto <> N''

        UNION ALL

        SELECT
            N'businessUnit' AS FilterKey,
            BusinessUnit AS FilterValue,
            BusinessUnit AS FilterLabel,
            N'0007|' + BusinessUnit AS SortKey
        FROM DistinctRows
        WHERE BusinessUnit <> N''

        UNION ALL

        SELECT
            N'rcc' AS FilterKey,
            CASE
                WHEN RccNome <> N'' THEN RccNome
                ELSE RccUsername
            END AS FilterValue,
            CASE
                WHEN RccNome <> N'' AND RccUsername <> N'' THEN RccNome + N' (' + RccUsername + N')'
                WHEN RccNome <> N'' THEN RccNome
                ELSE RccUsername
            END AS FilterLabel,
            N'0008|' +
            CASE
                WHEN RccNome <> N'' THEN RccNome
                ELSE RccUsername
            END AS SortKey
        FROM DistinctRows
        WHERE (RccNome <> N'' OR RccUsername <> N'')

        UNION ALL

        SELECT
            N'pm' AS FilterKey,
            CASE
                WHEN PmNome <> N'' THEN PmNome
                ELSE PmUsername
            END AS FilterValue,
            CASE
                WHEN PmNome <> N'' AND PmUsername <> N'' THEN PmNome + N' (' + PmUsername + N')'
                WHEN PmNome <> N'' THEN PmNome
                ELSE PmUsername
            END AS FilterLabel,
            N'0009|' +
            CASE
                WHEN PmNome <> N'' THEN PmNome
                ELSE PmUsername
            END AS SortKey
        FROM DistinctRows
        WHERE (PmNome <> N'' OR PmUsername <> N'')
    ),
    UniqueFilterRows AS
    (
        SELECT DISTINCT
            FilterKey,
            FilterValue,
            FilterLabel,
            SortKey
        FROM FilterRows
        WHERE FilterValue <> N''
    ),
    Ranked AS
    (
        SELECT
            FilterKey,
            FilterValue,
            FilterLabel,
            ROW_NUMBER() OVER
            (
                PARTITION BY FilterKey
                ORDER BY SortKey, FilterLabel, FilterValue
            ) AS rn
        FROM UniqueFilterRows
    )
    SELECT
        FilterKey,
        FilterValue,
        FilterLabel
    FROM Ranked
    WHERE rn <= @Take
    ORDER BY
        FilterKey,
        rn;
END
GO

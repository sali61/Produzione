/*
    Stored procedure area dati pagina "Commesse > Sintesi"
    Schema: produzione
    Non modifica stored esistenti: usa il wrapper produzione.spBixeniaAnalisiCommesse
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spSintesiCommesse', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spSintesiCommesse AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spSintesiCommesse
    @IdRisorsa INT,
    @Anno INT = NULL,
    @Aggrega BIT = 0,
    @FiltroDaApplicare NVARCHAR(MAX) = NULL,
    @Take INT = 500
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @IdRisorsaBix INT = 3;

    DECLARE @TakeClamped INT =
        CASE
            WHEN @Take IS NULL OR @Take < 1 THEN 1
            WHEN @Take > 1000 THEN 1000
            ELSE @Take
        END;

    DECLARE @FiltroFinale NVARCHAR(MAX) = NULL;

    IF @FiltroDaApplicare IS NOT NULL AND LTRIM(RTRIM(@FiltroDaApplicare)) <> N''
    BEGIN
        SET @FiltroFinale = LTRIM(RTRIM(@FiltroDaApplicare));
    END

    IF @Anno IS NOT NULL
    BEGIN
        DECLARE @AnnoClause NVARCHAR(64) = N'anno_competenza = ' + CAST(@Anno AS NVARCHAR(12));
        SET @FiltroFinale =
            CASE
                WHEN @FiltroFinale IS NULL THEN @AnnoClause
                ELSE @FiltroFinale + N' AND ' + @AnnoClause
            END;
    END

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
        @idrisorsa = @IdRisorsaBix,
        @tiporicerca = 'AnalisiCommessa',
        @FiltroDaApplicare = @FiltroFinale,
        @CampoAggregazione = NULL;

    IF ISNULL(@Aggrega, 0) = 0
    BEGIN
        SELECT TOP (@TakeClamped)
            a.anno_competenza,
            CAST(ISNULL(a.commessa, N'') AS NVARCHAR(128)) AS commessa,
            CAST(ISNULL(a.descrizione, N'') AS NVARCHAR(512)) AS descrizione,
            CAST(ISNULL(a.tipo_commessa, N'') AS NVARCHAR(256)) AS tipo_commessa,
            CAST(ISNULL(a.stato, N'') AS NVARCHAR(128)) AS stato,
            CAST(ISNULL(a.macrotipologia, N'') AS NVARCHAR(256)) AS macrotipologia,
            CAST(
                CASE
                    WHEN UPPER(LTRIM(RTRIM(ISNULL(a.Nomeprodotto, N'')))) IN (N'NON DEFINITO', N'NON DEFINTO')
                        THEN N''
                    ELSE LTRIM(RTRIM(ISNULL(a.Nomeprodotto, N'')))
                END
                AS NVARCHAR(256)) AS Nomeprodotto,
            CAST(ISNULL(a.controparte, N'') AS NVARCHAR(256)) AS controparte,
            CAST(ISNULL(a.idbusinessunit, N'') AS NVARCHAR(128)) AS idbusinessunit,
            CAST(ISNULL(a.RCC, N'') AS NVARCHAR(256)) AS RCC,
            CAST(ISNULL(a.PM, N'') AS NVARCHAR(256)) AS PM,
            CAST(ISNULL(a.ore_lavorate, 0) AS DECIMAL(18, 2)) AS ore_lavorate,
            CAST(ISNULL(a.costo_personale, 0) AS DECIMAL(18, 2)) AS costo_personale,
            CAST(ISNULL(a.ricavi, 0) AS DECIMAL(18, 2)) AS ricavi,
            CAST(ISNULL(a.costi, 0) AS DECIMAL(18, 2)) AS costi,
            CAST(ISNULL(a.utile_specifico, 0) AS DECIMAL(18, 2)) AS utile_specifico,
            CAST(ISNULL(a.ricavi_futuri, 0) AS DECIMAL(18, 2)) AS ricavi_futuri,
            CAST(ISNULL(a.costi_futuri, 0) AS DECIMAL(18, 2)) AS costi_futuri
        FROM #AnalisiCommesse a
        ORDER BY
            a.commessa,
            a.anno_competenza;

        RETURN;
    END

    SELECT TOP (@TakeClamped)
        CAST(NULL AS INT) AS anno_competenza,
        CAST(ISNULL(a.commessa, N'') AS NVARCHAR(128)) AS commessa,
        CAST(ISNULL(a.descrizione, N'') AS NVARCHAR(512)) AS descrizione,
        CAST(ISNULL(a.tipo_commessa, N'') AS NVARCHAR(256)) AS tipo_commessa,
        CAST(ISNULL(a.stato, N'') AS NVARCHAR(128)) AS stato,
        CAST(ISNULL(a.macrotipologia, N'') AS NVARCHAR(256)) AS macrotipologia,
        CAST(
            CASE
                WHEN UPPER(LTRIM(RTRIM(ISNULL(a.Nomeprodotto, N'')))) IN (N'NON DEFINITO', N'NON DEFINTO')
                    THEN N''
                ELSE LTRIM(RTRIM(ISNULL(a.Nomeprodotto, N'')))
            END
            AS NVARCHAR(256)) AS Nomeprodotto,
        CAST(ISNULL(a.controparte, N'') AS NVARCHAR(256)) AS controparte,
        CAST(ISNULL(a.idbusinessunit, N'') AS NVARCHAR(128)) AS idbusinessunit,
        CAST(ISNULL(a.RCC, N'') AS NVARCHAR(256)) AS RCC,
        CAST(ISNULL(a.PM, N'') AS NVARCHAR(256)) AS PM,
        CAST(SUM(ISNULL(a.ore_lavorate, 0)) AS DECIMAL(18, 2)) AS ore_lavorate,
        CAST(SUM(ISNULL(a.costo_personale, 0)) AS DECIMAL(18, 2)) AS costo_personale,
        CAST(SUM(ISNULL(a.ricavi, 0)) AS DECIMAL(18, 2)) AS ricavi,
        CAST(SUM(ISNULL(a.costi, 0)) AS DECIMAL(18, 2)) AS costi,
        CAST(SUM(ISNULL(a.utile_specifico, 0)) AS DECIMAL(18, 2)) AS utile_specifico,
        CAST(SUM(ISNULL(a.ricavi_futuri, 0)) AS DECIMAL(18, 2)) AS ricavi_futuri,
        CAST(SUM(ISNULL(a.costi_futuri, 0)) AS DECIMAL(18, 2)) AS costi_futuri
    FROM #AnalisiCommesse a
    GROUP BY
        a.commessa,
        a.descrizione,
        a.tipo_commessa,
        a.stato,
        a.macrotipologia,
        CASE
            WHEN UPPER(LTRIM(RTRIM(ISNULL(a.Nomeprodotto, N'')))) IN (N'NON DEFINITO', N'NON DEFINTO')
                THEN N''
            ELSE LTRIM(RTRIM(ISNULL(a.Nomeprodotto, N'')))
        END,
        a.controparte,
        a.idbusinessunit,
        a.RCC,
        a.PM
    ORDER BY
        a.commessa;
END
GO

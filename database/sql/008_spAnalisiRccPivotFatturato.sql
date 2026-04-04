/*
    Stored applicativa per Analisi RCC - PivotFatturato.
    Espone solo campi numerici tipizzati per evitare parsing lato backend/frontend.
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spAnalisiRccPivotFatturato', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spAnalisiRccPivotFatturato AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spAnalisiRccPivotFatturato
    @idrisorsa INT,
    @Anno INT,
    @Rcc NVARCHAR(128) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @RccFiltro NVARCHAR(128) = NULLIF(LTRIM(RTRIM(@Rcc)), N'');
    DECLARE @FiltroDaApplicare NVARCHAR(MAX) = N'anno=' + CAST(@Anno AS NVARCHAR(10));

    IF @RccFiltro IS NOT NULL
    BEGIN
        SET @FiltroDaApplicare = @FiltroDaApplicare
            + N' and RCC=''' + REPLACE(@RccFiltro, '''', '''''') + N'''';
    END;

    CREATE TABLE #PivotRaw
    (
        anno INT NULL,
        RCC NVARCHAR(128) NULL,
        totale_fatturato DECIMAL(19, 6) NULL,
        totale_fatturato_futuro DECIMAL(19, 6) NULL,
        totale_ricavo_ipotetico DECIMAL(19, 6) NULL,
        totale_ricavo_ipotetico_pesato DECIMAL(19, 6) NULL,
        totale_complessivo DECIMAL(19, 6) NULL,
        Budget DECIMAL(19, 6) NULL,
        percentuale_raggiungimento DECIMAL(19, 6) NULL,
        totale_con_ricavo_ipotetico_pesato DECIMAL(19, 6) NULL
    );

    INSERT INTO #PivotRaw
    EXEC produzione.spBixeniaValutazioneProiezioni
        @idrisorsa = @idrisorsa,
        @tiporicerca = N'FatturatoPivot',
        @FiltroDaApplicare = @FiltroDaApplicare,
        @CampoAggregazione = N'RCC';

    SELECT
        anno = ISNULL(anno, @Anno),
        RCC = LTRIM(RTRIM(ISNULL(RCC, N''))),
        fatturato_anno = ISNULL(totale_fatturato, 0),
        fatturato_futuro_anno = ISNULL(totale_fatturato_futuro, 0),
        totale_fatturato_certo = ISNULL(totale_fatturato, 0) + ISNULL(totale_fatturato_futuro, 0),
        budget_previsto = ISNULL(Budget, 0),
        totale_ricavo_ipotetico = ISNULL(totale_ricavo_ipotetico, 0),
        totale_ricavo_ipotetico_pesato = ISNULL(totale_ricavo_ipotetico_pesato, 0),
        totale_ipotetico = ISNULL(totale_con_ricavo_ipotetico_pesato, 0)
    FROM #PivotRaw
    WHERE LTRIM(RTRIM(ISNULL(RCC, N''))) <> N''
    ORDER BY
        ISNULL(anno, @Anno),
        LTRIM(RTRIM(ISNULL(RCC, N'')));
END
GO

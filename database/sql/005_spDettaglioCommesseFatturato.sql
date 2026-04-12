/*
    Stored procedure dettaglio fatturato commessa per tab Vendite/Acquisti.
    Fonte dati:
    - CDG.CdgFattureAttive
    - CDG.CdgFatturePassive
    - produzione.spBixeniaValutazioneProiezioni (@tiporicerca = 'FatturatoPivot')

    Output:
    1) Vendite (ordinato per data)
    2) Acquisti (ordinato per data)
    3) FatturatoPivot (ordinato per anno, RCC)
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spDettaglioCommesseFatturato', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spDettaglioCommesseFatturato AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spDettaglioCommesseFatturato
    @IdRisorsa INT,
    @Commessa NVARCHAR(128),
    @DataRiferimento DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DataRef DATE = ISNULL(@DataRiferimento, CAST(GETDATE() AS DATE));
    DECLARE @CommessaNorm NVARCHAR(128) = LTRIM(RTRIM(ISNULL(@Commessa, N'')));

    IF @CommessaNorm = N''
    BEGIN
        SELECT TOP (0)
            CAST(NULL AS DATE) AS DataMovimento,
            CAST(N'' AS NVARCHAR(64)) AS NumeroDocumento,
            CAST(N'' AS NVARCHAR(512)) AS Descrizione,
            CAST(N'' AS NVARCHAR(256)) AS Causale,
            CAST(N'' AS NVARCHAR(256)) AS Sottoconto,
            CAST(N'' AS NVARCHAR(256)) AS Controparte,
            CAST(N'' AS NVARCHAR(128)) AS Provenienza,
            CAST(0 AS DECIMAL(18, 2)) AS Importo,
            CAST(0 AS BIT) AS IsFuture,
            CAST(N'' AS NVARCHAR(16)) AS StatoTemporale;

        SELECT TOP (0)
            CAST(NULL AS DATE) AS DataMovimento,
            CAST(N'' AS NVARCHAR(64)) AS NumeroDocumento,
            CAST(N'' AS NVARCHAR(512)) AS Descrizione,
            CAST(N'' AS NVARCHAR(256)) AS Causale,
            CAST(N'' AS NVARCHAR(256)) AS Sottoconto,
            CAST(N'' AS NVARCHAR(256)) AS Controparte,
            CAST(N'' AS NVARCHAR(128)) AS Provenienza,
            CAST(0 AS DECIMAL(18, 2)) AS Importo,
            CAST(0 AS BIT) AS IsFuture,
            CAST(N'' AS NVARCHAR(16)) AS StatoTemporale;

        SELECT TOP (0)
            CAST(0 AS INT) AS anno,
            CAST(N'' AS NVARCHAR(255)) AS RCC,
            CAST(N'' AS NVARCHAR(64)) AS totale_fatturato,
            CAST(N'' AS NVARCHAR(64)) AS totale_fatturato_futuro,
            CAST(N'' AS NVARCHAR(64)) AS totale_ricavo_ipotetico,
            CAST(N'' AS NVARCHAR(64)) AS totale_ricavo_ipotetico_pesato,
            CAST(N'' AS NVARCHAR(64)) AS totale_complessivo,
            CAST(N'' AS NVARCHAR(64)) AS Budget,
            CAST(N'' AS NVARCHAR(64)) AS percentuale_raggiungimento;

        RETURN;
    END

    CREATE TABLE #Vendite
    (
        DataMovimento DATE NULL,
        NumeroDocumento NVARCHAR(64) NULL,
        Descrizione NVARCHAR(512) NULL,
        Causale NVARCHAR(256) NULL,
        Sottoconto NVARCHAR(256) NULL,
        Controparte NVARCHAR(256) NULL,
        Provenienza NVARCHAR(128) NULL,
        Importo DECIMAL(18, 2) NULL,
        IsFuture BIT NOT NULL,
        StatoTemporale NVARCHAR(16) NOT NULL
    );

    INSERT INTO #Vendite
    (
        DataMovimento,
        NumeroDocumento,
        Descrizione,
        Causale,
        Sottoconto,
        Controparte,
        Provenienza,
        Importo,
        IsFuture,
        StatoTemporale
    )
    SELECT
        CAST(a.[data] AS DATE) AS DataMovimento,
        CAST(LEFT(LTRIM(RTRIM(COALESCE(NULLIF(a.[numero], N''), NULLIF(a.[numerooriginale], N''), CAST(a.[numeroregistrazione] AS NVARCHAR(32))))), 64) AS NVARCHAR(64)) AS NumeroDocumento,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(a.[descrizionefattura], N''))), 512) AS NVARCHAR(512)) AS Descrizione,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Causale,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[cb_CodiceSottoConto] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Sottoconto,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(a.[codice_cliente] AS NVARCHAR(64)), N''))), 256) AS NVARCHAR(256)) AS Controparte,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(a.[provenienza], N''))), 128) AS NVARCHAR(128)) AS Provenienza,
        CAST(COALESCE(
            CONVERT(DECIMAL(18, 2), a.[importocomplessivo]),
            CONVERT(DECIMAL(18, 2), a.[impcomplessivodettaglio]),
            CONVERT(DECIMAL(18, 2), a.[ImportoImponibileEuro]),
            0
        ) AS DECIMAL(18, 2)) AS Importo,
        CAST(CASE WHEN CAST(a.[data] AS DATE) > @DataRef THEN 1 ELSE 0 END AS BIT) AS IsFuture,
        CAST(CASE WHEN CAST(a.[data] AS DATE) > @DataRef THEN N'Futuro' ELSE N'Passato' END AS NVARCHAR(16)) AS StatoTemporale
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
    WHERE (UPPER(LTRIM(RTRIM(ISNULL(a.[commessaintranet], N'')))) = UPPER(@CommessaNorm)
       OR UPPER(LTRIM(RTRIM(ISNULL(a.[cont_commessa], N'')))) = UPPER(@CommessaNorm))
      AND (
            inc.[CB_CodiceCausale] IS NULL
            OR UPPER(LTRIM(RTRIM(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256))))) <> N'BIC'
          );

    CREATE TABLE #Acquisti
    (
        DataMovimento DATE NULL,
        NumeroDocumento NVARCHAR(64) NULL,
        Descrizione NVARCHAR(512) NULL,
        Causale NVARCHAR(256) NULL,
        Sottoconto NVARCHAR(256) NULL,
        Controparte NVARCHAR(256) NULL,
        Provenienza NVARCHAR(128) NULL,
        Importo DECIMAL(18, 2) NULL,
        IsFuture BIT NOT NULL,
        StatoTemporale NVARCHAR(16) NOT NULL
    );

    INSERT INTO #Acquisti
    (
        DataMovimento,
        NumeroDocumento,
        Descrizione,
        Causale,
        Sottoconto,
        Controparte,
        Provenienza,
        Importo,
        IsFuture,
        StatoTemporale
    )
    SELECT
        CAST(p.[Data Documento] AS DATE) AS DataMovimento,
        CAST(LEFT(LTRIM(RTRIM(COALESCE(NULLIF(p.[NumeroDocumento], N''), CAST(p.[numeroregistrazione] AS NVARCHAR(32))))), 64) AS NVARCHAR(64)) AS NumeroDocumento,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(p.[descrizionefattura], N''))), 512) AS NVARCHAR(512)) AS Descrizione,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Causale,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[cb_CodiceSottoConto] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Sottoconto,
        CAST(LEFT(LTRIM(RTRIM(COALESCE(NULLIF(p.[RagioneSociale], N''), NULLIF(p.[controparte], N'')))), 256) AS NVARCHAR(256)) AS Controparte,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(p.[provenienza], N''))), 128) AS NVARCHAR(128)) AS Provenienza,
        CAST(ISNULL(CONVERT(DECIMAL(18, 2), p.[importocomplessivo]), 0) AS DECIMAL(18, 2)) AS Importo,
        CAST(CASE WHEN CAST(p.[Data Documento] AS DATE) > @DataRef THEN 1 ELSE 0 END AS BIT) AS IsFuture,
        CAST(CASE WHEN CAST(p.[Data Documento] AS DATE) > @DataRef THEN N'Futuro' ELSE N'Passato' END AS NVARCHAR(16)) AS StatoTemporale
    FROM [CDG].[CdgFatturePassive] p
    OUTER APPLY
    (
        SELECT TOP (1)
            x.[CB_CodiceCausale],
            x.[cb_CodiceSottoConto]
        FROM [CDG].[CDG_IncrocioContabilitaIntranet] x
        WHERE UPPER(LTRIM(RTRIM(ISNULL(x.[CDG_Commessa], N'')))) = UPPER(@CommessaNorm)
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
    WHERE UPPER(LTRIM(RTRIM(ISNULL(p.[commessa], N'')))) = UPPER(@CommessaNorm)
      AND (
            inc.[CB_CodiceCausale] IS NULL
            OR UPPER(LTRIM(RTRIM(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256))))) <> N'BIC'
          );

    CREATE TABLE #Pivot
    (
        anno INT NULL,
        RCC NVARCHAR(255) NULL,
        totale_fatturato NVARCHAR(64) NULL,
        totale_fatturato_futuro NVARCHAR(64) NULL,
        totale_ricavo_ipotetico NVARCHAR(64) NULL,
        totale_ricavo_ipotetico_pesato NVARCHAR(64) NULL,
        totale_complessivo NVARCHAR(64) NULL,
        Budget NVARCHAR(64) NULL,
        percentuale_raggiungimento NVARCHAR(64) NULL
    );

    DECLARE @FiltroPivot NVARCHAR(MAX) = N'COMMESSA = ''' + REPLACE(@CommessaNorm, '''', '''''') + N'''';

    BEGIN TRY
        INSERT INTO #Pivot
        (
            anno,
            RCC,
            totale_fatturato,
            totale_fatturato_futuro,
            totale_ricavo_ipotetico,
            totale_ricavo_ipotetico_pesato,
            totale_complessivo,
            Budget,
            percentuale_raggiungimento
        )
        EXEC [produzione].[spBixeniaValutazioneProiezioni]
            @idrisorsa = @IdRisorsa,
            @tiporicerca = 'FatturatoPivot',
            @FiltroDaApplicare = @FiltroPivot,
            @CampoAggregazione = 'RCC';
    END TRY
    BEGIN CATCH
        -- In caso di differenze schema result-set, restituiamo comunque vendite/acquisti.
    END CATCH;

    IF NOT EXISTS (SELECT 1 FROM #Pivot)
    BEGIN
        DECLARE @IdRccFallback INT =
        (
            SELECT TOP (1) c.idRCC
            FROM cdg_qryComessaPmRcc c
            WHERE UPPER(LTRIM(RTRIM(ISNULL(c.COMMESSA, N'')))) = UPPER(@CommessaNorm)
              AND c.idRCC IS NOT NULL
            ORDER BY c.idRCC
        );

        IF @IdRccFallback IS NOT NULL AND @IdRccFallback > 0 AND @IdRccFallback <> @IdRisorsa
        BEGIN
            BEGIN TRY
                INSERT INTO #Pivot
                (
                    anno,
                    RCC,
                    totale_fatturato,
                    totale_fatturato_futuro,
                    totale_ricavo_ipotetico,
                    totale_ricavo_ipotetico_pesato,
                    totale_complessivo,
                    Budget,
                    percentuale_raggiungimento
                )
                EXEC [produzione].[spBixeniaValutazioneProiezioni]
                    @idrisorsa = @IdRccFallback,
                    @tiporicerca = 'FatturatoPivot',
                    @FiltroDaApplicare = @FiltroPivot,
                    @CampoAggregazione = 'RCC';
            END TRY
            BEGIN CATCH
                -- Best effort: se fallisce il fallback, lasciamo vuoto il pivot.
            END CATCH;
        END
    END

    SELECT
        DataMovimento,
        NumeroDocumento,
        Descrizione,
        Causale,
        Sottoconto,
        Controparte,
        Provenienza,
        Importo,
        IsFuture,
        StatoTemporale
    FROM #Vendite
    ORDER BY DataMovimento, NumeroDocumento;

    SELECT
        DataMovimento,
        NumeroDocumento,
        Descrizione,
        Causale,
        Sottoconto,
        Controparte,
        Provenienza,
        Importo,
        IsFuture,
        StatoTemporale
    FROM #Acquisti
    ORDER BY DataMovimento, NumeroDocumento;

    SELECT
        anno,
        RCC,
        totale_fatturato,
        totale_fatturato_futuro,
        totale_ricavo_ipotetico,
        totale_ricavo_ipotetico_pesato,
        totale_complessivo,
        Budget,
        percentuale_raggiungimento
    FROM #Pivot
    ORDER BY anno, RCC;
END
GO

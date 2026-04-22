/*
    Performance tuning per produzione.spDettaglioCommesseFatturato
    Obiettivo:
    - ridurre scansioni su CDG.CdgFattureAttive / CDG.CdgFatturePassive
    - ridurre costo di OUTER APPLY su CDG.CDG_IncrocioContabilitaIntranet
    - mantenere invariato il contratto dei 3 result-set
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

/* ============================================================
   1) Colonne calcolate normalizzate (persistite) per ricerche SARGable
   ============================================================ */

IF OBJECT_ID(N'CDG.CdgFattureAttive', 'U') IS NOT NULL
   AND COL_LENGTH('CDG.CdgFattureAttive', 'CommessaIntranetNorm') IS NULL
BEGIN
    ALTER TABLE [CDG].[CdgFattureAttive]
    ADD [CommessaIntranetNorm] AS UPPER(LTRIM(RTRIM(ISNULL([commessaintranet], N'')))) PERSISTED;
END
GO

IF OBJECT_ID(N'CDG.CdgFattureAttive', 'U') IS NOT NULL
   AND COL_LENGTH('CDG.CdgFattureAttive', 'ContCommessaNorm') IS NULL
BEGIN
    ALTER TABLE [CDG].[CdgFattureAttive]
    ADD [ContCommessaNorm] AS UPPER(LTRIM(RTRIM(ISNULL([cont_commessa], N'')))) PERSISTED;
END
GO

IF OBJECT_ID(N'CDG.CdgFattureAttive', 'U') IS NOT NULL
   AND COL_LENGTH('CDG.CdgFattureAttive', 'NumeroDocumentoNorm') IS NULL
BEGIN
    ALTER TABLE [CDG].[CdgFattureAttive]
    ADD [NumeroDocumentoNorm] AS UPPER(LTRIM(RTRIM(COALESCE(NULLIF([numero], N''), NULLIF([numerooriginale], N''), CONVERT(NVARCHAR(32), [numeroregistrazione]))))) PERSISTED;
END
GO

IF OBJECT_ID(N'CDG.CdgFatturePassive', 'U') IS NOT NULL
   AND COL_LENGTH('CDG.CdgFatturePassive', 'CommessaNorm') IS NULL
BEGIN
    ALTER TABLE [CDG].[CdgFatturePassive]
    ADD [CommessaNorm] AS UPPER(LTRIM(RTRIM(ISNULL([commessa], N'')))) PERSISTED;
END
GO

IF OBJECT_ID(N'CDG.CdgFatturePassive', 'U') IS NOT NULL
   AND COL_LENGTH('CDG.CdgFatturePassive', 'NumeroDocumentoNorm') IS NULL
BEGIN
    ALTER TABLE [CDG].[CdgFatturePassive]
    ADD [NumeroDocumentoNorm] AS UPPER(LTRIM(RTRIM(COALESCE(NULLIF([NumeroDocumento], N''), CONVERT(NVARCHAR(32), [numeroregistrazione]))))) PERSISTED;
END
GO

IF OBJECT_ID(N'CDG.CDG_IncrocioContabilitaIntranet', 'U') IS NOT NULL
   AND COL_LENGTH('CDG.CDG_IncrocioContabilitaIntranet', 'CDG_CommessaNorm') IS NULL
BEGIN
    ALTER TABLE [CDG].[CDG_IncrocioContabilitaIntranet]
    ADD [CDG_CommessaNorm] AS UPPER(LTRIM(RTRIM(ISNULL([CDG_Commessa], N'')))) PERSISTED;
END
GO

IF OBJECT_ID(N'CDG.CDG_IncrocioContabilitaIntranet', 'U') IS NOT NULL
   AND COL_LENGTH('CDG.CDG_IncrocioContabilitaIntranet', 'CB_NumeroDocumentoNorm') IS NULL
BEGIN
    ALTER TABLE [CDG].[CDG_IncrocioContabilitaIntranet]
    ADD [CB_NumeroDocumentoNorm] AS UPPER(LTRIM(RTRIM(ISNULL(CAST([CB_NumeroDocumento] AS NVARCHAR(64)), N'')))) PERSISTED;
END
GO

IF OBJECT_ID(N'CDG.CDG_IncrocioContabilitaIntranet', 'U') IS NOT NULL
   AND COL_LENGTH('CDG.CDG_IncrocioContabilitaIntranet', 'CB_NumRegistrazioneInt') IS NULL
BEGIN
    ALTER TABLE [CDG].[CDG_IncrocioContabilitaIntranet]
    ADD [CB_NumRegistrazioneInt] AS
    (
        CASE
            WHEN ISNUMERIC(NULLIF(LTRIM(RTRIM(CAST([CB_NumRegistrazione] AS NVARCHAR(32)))), N'')) = 1
                THEN CONVERT(INT, NULLIF(LTRIM(RTRIM(CAST([CB_NumRegistrazione] AS NVARCHAR(32)))), N''))
            ELSE NULL
        END
    ) PERSISTED;
END
GO

/* ============================================================
   2) Indici mirati
   ============================================================ */

IF OBJECT_ID(N'CDG.CdgFattureAttive', 'U') IS NOT NULL
   AND NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'CDG.CdgFattureAttive')
      AND name = N'IX_CdgFattureAttive_CommessaIntranetNorm'
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_CdgFattureAttive_CommessaIntranetNorm]
    ON [CDG].[CdgFattureAttive] ([CommessaIntranetNorm])
    INCLUDE
    (
        [cont_commessa],
        [NumeroDocumentoNorm],
        [numeroregistrazione],
        [data],
        [numero],
        [numerooriginale],
        [descrizionefattura],
        [codice_cliente],
        [provenienza],
        [importocomplessivo],
        [impcomplessivodettaglio],
        [ImportoImponibileEuro]
    );
END
GO

IF OBJECT_ID(N'CDG.CdgFattureAttive', 'U') IS NOT NULL
   AND NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'CDG.CdgFattureAttive')
      AND name = N'IX_CdgFattureAttive_ContCommessaNorm'
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_CdgFattureAttive_ContCommessaNorm]
    ON [CDG].[CdgFattureAttive] ([ContCommessaNorm])
    INCLUDE
    (
        [commessaintranet],
        [NumeroDocumentoNorm],
        [numeroregistrazione],
        [data],
        [numero],
        [numerooriginale],
        [descrizionefattura],
        [codice_cliente],
        [provenienza],
        [importocomplessivo],
        [impcomplessivodettaglio],
        [ImportoImponibileEuro]
    );
END
GO

IF OBJECT_ID(N'CDG.CdgFatturePassive', 'U') IS NOT NULL
   AND NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'CDG.CdgFatturePassive')
      AND name = N'IX_CdgFatturePassive_CommessaNorm'
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_CdgFatturePassive_CommessaNorm]
    ON [CDG].[CdgFatturePassive] ([CommessaNorm])
    INCLUDE
    (
        [NumeroDocumentoNorm],
        [numeroregistrazione],
        [Data Documento],
        [NumeroDocumento],
        [descrizionefattura],
        [RagioneSociale],
        [controparte],
        [provenienza],
        [importocomplessivo]
    );
END
GO

IF OBJECT_ID(N'CDG.CDG_IncrocioContabilitaIntranet', 'U') IS NOT NULL
   AND NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'CDG.CDG_IncrocioContabilitaIntranet')
      AND name = N'IX_CDG_Incrocio_Commessa_Doc'
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_CDG_Incrocio_Commessa_Doc]
    ON [CDG].[CDG_IncrocioContabilitaIntranet] ([CDG_CommessaNorm], [CB_NumeroDocumentoNorm])
    INCLUDE ([CB_NumRegistrazioneInt], [CDG_Data], [CB_CodiceCausale], [cb_CodiceSottoConto]);
END
GO

IF OBJECT_ID(N'CDG.CDG_IncrocioContabilitaIntranet', 'U') IS NOT NULL
   AND NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'CDG.CDG_IncrocioContabilitaIntranet')
      AND name = N'IX_CDG_Incrocio_Commessa_NumReg'
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_CDG_Incrocio_Commessa_NumReg]
    ON [CDG].[CDG_IncrocioContabilitaIntranet] ([CDG_CommessaNorm], [CB_NumRegistrazioneInt])
    INCLUDE ([CB_NumeroDocumentoNorm], [CDG_Data], [CB_CodiceCausale], [cb_CodiceSottoConto]);
END
GO

/* ============================================================
   3) Stored procedure ottimizzata (stesso output)
   ============================================================ */

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
    DECLARE @CommessaUpper NVARCHAR(128) = UPPER(@CommessaNorm);

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

    ;WITH VenditeBase AS
    (
        SELECT
            a.[data] AS DataRaw,
            CAST(a.[data] AS DATE) AS DataMovimentoDate,
            a.[NumeroDocumentoNorm],
            a.[numeroregistrazione] AS NumeroRegistrazione,
            a.[CommessaIntranetNorm],
            a.[ContCommessaNorm],
            a.[numero],
            a.[numerooriginale],
            a.[descrizionefattura],
            a.[codice_cliente],
            a.[provenienza],
            a.[importocomplessivo],
            a.[impcomplessivodettaglio],
            a.[ImportoImponibileEuro]
        FROM [CDG].[CdgFattureAttive] a
        WHERE a.[CommessaIntranetNorm] = @CommessaUpper
           OR a.[ContCommessaNorm] = @CommessaUpper
    )
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
        vb.DataMovimentoDate AS DataMovimento,
        CAST(LEFT(LTRIM(RTRIM(COALESCE(NULLIF(vb.[numero], N''), NULLIF(vb.[numerooriginale], N''), CAST(vb.[NumeroRegistrazione] AS NVARCHAR(32))))), 64) AS NVARCHAR(64)) AS NumeroDocumento,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(vb.[descrizionefattura], N''))), 512) AS NVARCHAR(512)) AS Descrizione,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Causale,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[cb_CodiceSottoConto] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Sottoconto,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(vb.[codice_cliente] AS NVARCHAR(64)), N''))), 256) AS NVARCHAR(256)) AS Controparte,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(vb.[provenienza], N''))), 128) AS NVARCHAR(128)) AS Provenienza,
        CAST(COALESCE(
            CONVERT(DECIMAL(18, 2), vb.[importocomplessivo]),
            CONVERT(DECIMAL(18, 2), vb.[impcomplessivodettaglio]),
            CONVERT(DECIMAL(18, 2), vb.[ImportoImponibileEuro]),
            0
        ) AS DECIMAL(18, 2)) AS Importo,
        CAST(CASE WHEN vb.DataMovimentoDate > @DataRef THEN 1 ELSE 0 END AS BIT) AS IsFuture,
        CAST(CASE WHEN vb.DataMovimentoDate > @DataRef THEN N'Futuro' ELSE N'Passato' END AS NVARCHAR(16)) AS StatoTemporale
    FROM VenditeBase vb
    OUTER APPLY
    (
        SELECT TOP (1)
            x.[CB_CodiceCausale],
            x.[cb_CodiceSottoConto],
            x.[CB_NumeroDocumentoNorm],
            x.[CDG_Data]
        FROM [CDG].[CDG_IncrocioContabilitaIntranet] x
        WHERE x.[CDG_CommessaNorm] IN (vb.[CommessaIntranetNorm], vb.[ContCommessaNorm])
          AND
          (
              x.[CB_NumeroDocumentoNorm] = vb.[NumeroDocumentoNorm]
              OR
              (
                  vb.[NumeroRegistrazione] IS NOT NULL
                  AND x.[CB_NumRegistrazioneInt] = vb.[NumeroRegistrazione]
              )
          )
        ORDER BY
            CASE
                WHEN x.[CB_NumeroDocumentoNorm] = vb.[NumeroDocumentoNorm] THEN 0
                ELSE 1
            END,
            CASE
                WHEN CAST(x.[CDG_Data] AS DATE) = vb.DataMovimentoDate THEN 0
                ELSE 1
            END
    ) inc
    WHERE
        inc.[CB_CodiceCausale] IS NULL
        OR UPPER(LTRIM(RTRIM(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256))))) <> N'BIC'
    OPTION (RECOMPILE);

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

    ;WITH AcquistiBase AS
    (
        SELECT
            p.[Data Documento] AS DataDocumentoRaw,
            CAST(p.[Data Documento] AS DATE) AS DataDocumentoDate,
            p.[NumeroDocumentoNorm],
            p.[numeroregistrazione] AS NumeroRegistrazione,
            p.[NumeroDocumento],
            p.[descrizionefattura],
            p.[RagioneSociale],
            p.[controparte],
            p.[provenienza],
            p.[importocomplessivo]
        FROM [CDG].[CdgFatturePassive] p
        WHERE p.[CommessaNorm] = @CommessaUpper
    )
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
        ab.DataDocumentoDate AS DataMovimento,
        CAST(LEFT(LTRIM(RTRIM(COALESCE(NULLIF(ab.[NumeroDocumento], N''), CAST(ab.[NumeroRegistrazione] AS NVARCHAR(32))))), 64) AS NVARCHAR(64)) AS NumeroDocumento,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(ab.[descrizionefattura], N''))), 512) AS NVARCHAR(512)) AS Descrizione,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Causale,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(CAST(inc.[cb_CodiceSottoConto] AS NVARCHAR(256)), N''))), 256) AS NVARCHAR(256)) AS Sottoconto,
        CAST(LEFT(LTRIM(RTRIM(COALESCE(NULLIF(ab.[RagioneSociale], N''), NULLIF(ab.[controparte], N'')))), 256) AS NVARCHAR(256)) AS Controparte,
        CAST(LEFT(LTRIM(RTRIM(ISNULL(ab.[provenienza], N''))), 128) AS NVARCHAR(128)) AS Provenienza,
        CAST(ISNULL(CONVERT(DECIMAL(18, 2), ab.[importocomplessivo]), 0) AS DECIMAL(18, 2)) AS Importo,
        CAST(CASE WHEN ab.DataDocumentoDate > @DataRef THEN 1 ELSE 0 END AS BIT) AS IsFuture,
        CAST(CASE WHEN ab.DataDocumentoDate > @DataRef THEN N'Futuro' ELSE N'Passato' END AS NVARCHAR(16)) AS StatoTemporale
    FROM AcquistiBase ab
    OUTER APPLY
    (
        SELECT TOP (1)
            x.[CB_CodiceCausale],
            x.[cb_CodiceSottoConto],
            x.[CB_NumeroDocumentoNorm],
            x.[CDG_Data]
        FROM [CDG].[CDG_IncrocioContabilitaIntranet] x
        WHERE x.[CDG_CommessaNorm] = @CommessaUpper
          AND
          (
              x.[CB_NumeroDocumentoNorm] = ab.[NumeroDocumentoNorm]
              OR
              (
                  ab.[NumeroRegistrazione] IS NOT NULL
                  AND x.[CB_NumRegistrazioneInt] = ab.[NumeroRegistrazione]
              )
          )
        ORDER BY
            CASE
                WHEN x.[CB_NumeroDocumentoNorm] = ab.[NumeroDocumentoNorm] THEN 0
                ELSE 1
            END,
            CASE
                WHEN CAST(x.[CDG_Data] AS DATE) = ab.DataDocumentoDate THEN 0
                ELSE 1
            END
    ) inc
    WHERE
        inc.[CB_CodiceCausale] IS NULL
        OR UPPER(LTRIM(RTRIM(CAST(inc.[CB_CodiceCausale] AS NVARCHAR(256))))) <> N'BIC'
    OPTION (RECOMPILE);

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
            WHERE UPPER(LTRIM(RTRIM(ISNULL(c.COMMESSA, N'')))) = @CommessaUpper
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

/*
    Stored procedure elenco anomalie commesse
    Output:
    - TipoAnomalia
    - DettaglioAnomalia
    - IdCommessa
    - Commessa / anagrafica
    - Totali economici per commessa
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spCommesseAnomale', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spCommesseAnomale AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spCommesseAnomale
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @MeseCorrente DATE = DATEADD(MONTH, DATEDIFF(MONTH, 0, GETDATE()), 0);
    DECLARE @Soglia DATE = DATEADD(MONTH, -6, @MeseCorrente);

    CREATE TABLE #Anomalie
    (
        TipoAnomalia NVARCHAR(200) NOT NULL,
        DettaglioAnomalia NVARCHAR(500) NOT NULL,
        IdCommessa INT NOT NULL
    );

    ;WITH AnagraficaCommesse AS
    (
        SELECT
            CAST(q.idcommessa AS INT) AS IdCommessa,
            CAST(LTRIM(RTRIM(ISNULL(q.COMMESSA, N''))) AS NVARCHAR(128)) AS Commessa,
            CAST(LTRIM(RTRIM(ISNULL(q.descrizione, N''))) AS NVARCHAR(512)) AS DescrizioneCommessa,
            CAST(LTRIM(RTRIM(ISNULL(q.tipo_commessa, N''))) AS NVARCHAR(256)) AS TipologiaCommessa,
            CAST(UPPER(LTRIM(RTRIM(ISNULL(q.tipo_commessa, N'')))) AS NVARCHAR(256)) AS TipologiaCommessaUpper,
            CAST(LTRIM(RTRIM(ISNULL(q.stato, N''))) AS NVARCHAR(128)) AS Stato,
            CAST(UPPER(LTRIM(RTRIM(ISNULL(q.stato, N'')))) AS NVARCHAR(64)) AS StatoCodice,
            CAST(LTRIM(RTRIM(ISNULL(q.macrotipologia, N''))) AS NVARCHAR(256)) AS MacroTipologia,
            CAST(LTRIM(RTRIM(ISNULL(q.controparte, N''))) AS NVARCHAR(256)) AS Controparte,
            CAST(LTRIM(RTRIM(ISNULL(q.idBusinessUnit, N''))) AS NVARCHAR(128)) AS BusinessUnit,
            CAST(LTRIM(RTRIM(ISNULL(q.RCC, N''))) AS NVARCHAR(256)) AS Rcc,
            CAST(LTRIM(RTRIM(ISNULL(q.PM, N''))) AS NVARCHAR(256)) AS Pm,
            CAST(ISNULL(q.idpm, 0) AS INT) AS IdPm,
            CAST(ISNULL(q.idRCC, 0) AS INT) AS IdRcc,
            CAST(UPPER(LTRIM(RTRIM(ISNULL(q.NetUserNamePM, N'')))) AS NVARCHAR(256)) AS NetUserNamePmUpper,
            CAST(UPPER(LTRIM(RTRIM(ISNULL(q.NetUserNameRCC, N'')))) AS NVARCHAR(256)) AS NetUserNameRccUpper,
            ROW_NUMBER() OVER (
                PARTITION BY q.idcommessa
                ORDER BY q.data_commessa DESC, q.COMMESSA
            ) AS rn
        FROM cdg_qryComessaPmRcc q
    )
    SELECT
        a.IdCommessa,
        a.Commessa,
        a.DescrizioneCommessa,
        a.TipologiaCommessa,
        a.TipologiaCommessaUpper,
        a.Stato,
        a.StatoCodice,
        a.MacroTipologia,
        a.Controparte,
        a.BusinessUnit,
        a.Rcc,
        a.Pm,
        a.IdPm,
        a.IdRcc,
        a.NetUserNamePmUpper,
        a.NetUserNameRccUpper
    INTO #Anagrafica
    FROM AnagraficaCommesse a
    WHERE a.rn = 1;

    SELECT
        CAST(ac.idCommessa AS INT) AS IdCommessa,
        CAST(SUM(ISNULL(ac.[Ore Lavorate], 0)) AS DECIMAL(18, 2)) AS OreLavorate,
        CAST(SUM(ISNULL(ac.[Costo Ore Lavorate], 0)) AS DECIMAL(18, 2)) AS CostoPersonale,
        CAST(SUM(ISNULL(ac.[Fatturato], 0)) AS DECIMAL(18, 2)) AS Ricavi,
        CAST(SUM(ISNULL(ac.[Acquisti], 0)) AS DECIMAL(18, 2)) AS Costi,
        CAST(SUM(ISNULL(ac.[Fatturato Ancora Previsto], 0)) AS DECIMAL(18, 2)) AS RicaviFuturi,
        CAST(SUM(ISNULL(ac.[Acquisti Ancora Previsto], 0)) AS DECIMAL(18, 2)) AS CostiFuturi
    INTO #ValoriEconomici
    FROM cdg.CdgAnalisiCommesse ac
    GROUP BY ac.idCommessa;

    -- 01) Commessa chiusa con fatturato/acquisti ancora previsti
    INSERT INTO #Anomalie (TipoAnomalia, DettaglioAnomalia, IdCommessa)
    SELECT
        N'01 - Commessa chiusa con fatturato/acquisti previsti' AS TipoAnomalia,
        CAST(
            N'Data chiusura: '
            + COALESCE(CONVERT(NVARCHAR(10), CONVERT(DATE, c.data_chiu), 103), N'N/D')
            AS NVARCHAR(500)
        ) AS DettaglioAnomalia,
        CAST(ac.idCommessa AS INT) AS IdCommessa
    FROM cdg.CdgAnalisiCommesse ac
    INNER JOIN dbo.commesse c
        ON c.ID = ac.idCommessa
    INNER JOIN dbo.esiti e
        ON e.ID = c.IdEsito
    WHERE e.Descrizione IN (N'NF', N'T')
      AND (
            ABS(ISNULL(ac.[Acquisti Ancora Previsto], 0)) > 0
            OR ABS(ISNULL(ac.[Fatturato Ancora Previsto], 0)) > 0
      )
    GROUP BY
        ac.idCommessa,
        c.data_chiu;

    -- 02) Commessa senza ore lavorate da oltre 6 mesi (escludendo commesse chiuse R/T/NF)
    ;WITH LastWork AS
    (
        SELECT
            m.idCommessa,
            MAX(
                CONVERT(
                    DATE,
                    CONVERT(CHAR(4), CAST(m.[Anno Competenza] AS INT))
                    + RIGHT('0' + CONVERT(VARCHAR(2), CAST(m.[Mese Competenza] AS INT)), 2)
                    + '01',
                    112
                )
            ) AS UltimoMeseConOre
        FROM cdg.CdgAnalisiCommesseMensile m
        WHERE ISNULL(m.[Ore Lavorate], 0) > 0
          AND CAST(m.[Anno Competenza] AS INT) BETWEEN 1900 AND 2999
          AND CAST(m.[Mese Competenza] AS INT) BETWEEN 1 AND 12
        GROUP BY m.idCommessa
    )
    INSERT INTO #Anomalie (TipoAnomalia, DettaglioAnomalia, IdCommessa)
    SELECT
        N'02 - Commessa senza ore da oltre 6 mesi' AS TipoAnomalia,
        CAST(
            N'Ultimo mese con ore: '
            + COALESCE(CONVERT(NVARCHAR(10), lw.UltimoMeseConOre, 103), N'N/D')
            + N' - mesi senza ore: '
            + CAST(DATEDIFF(MONTH, lw.UltimoMeseConOre, @MeseCorrente) AS NVARCHAR(16))
            AS NVARCHAR(500)
        ) AS DettaglioAnomalia,
        CAST(lw.idCommessa AS INT) AS IdCommessa
    FROM LastWork lw
    LEFT JOIN dbo.commesse c
        ON c.ID = lw.idCommessa
    LEFT JOIN dbo.esiti e
        ON e.ID = c.IdEsito
    WHERE lw.UltimoMeseConOre < @Soglia
      AND ISNULL(UPPER(LTRIM(RTRIM(e.Descrizione))), N'') NOT IN (N'R', N'T', N'NF');

    -- 03) Commesse di stato C con oltre 200 ore lavorate
    INSERT INTO #Anomalie (TipoAnomalia, DettaglioAnomalia, IdCommessa)
    SELECT
        N'03 - Commessa Commerciale Operativa' AS TipoAnomalia,
        CAST(
            N'Ore lavorate: '
            + CAST(CAST(SUM(ISNULL(ac.[Ore Lavorate], 0)) AS DECIMAL(18, 2)) AS NVARCHAR(64))
            AS NVARCHAR(500)
        ) AS DettaglioAnomalia,
        CAST(ac.idCommessa AS INT) AS IdCommessa
    FROM cdg.CdgAnalisiCommesse ac
    INNER JOIN #Anagrafica an
        ON an.IdCommessa = ac.idCommessa
    WHERE an.StatoCodice = N'C'
    GROUP BY ac.idCommessa
    HAVING SUM(ISNULL(ac.[Ore Lavorate], 0)) > 200;

    -- 04) Commesse di stato C con fatturato/fatturato futuro
    INSERT INTO #Anomalie (TipoAnomalia, DettaglioAnomalia, IdCommessa)
    SELECT
        N'04 - Commessa Commerciale Con Fatturato' AS TipoAnomalia,
        CAST(
            N'Fatturato: '
            + CAST(CAST(SUM(ISNULL(ac.[Fatturato], 0)) AS DECIMAL(18, 2)) AS NVARCHAR(64))
            + N'; Fatturato futuro: '
            + CAST(CAST(SUM(ISNULL(ac.[Fatturato Ancora Previsto], 0)) AS DECIMAL(18, 2)) AS NVARCHAR(64))
            AS NVARCHAR(500)
        ) AS DettaglioAnomalia,
        CAST(ac.idCommessa AS INT) AS IdCommessa
    FROM cdg.CdgAnalisiCommesse ac
    INNER JOIN #Anagrafica an
        ON an.IdCommessa = ac.idCommessa
    WHERE an.StatoCodice = N'C'
    GROUP BY ac.idCommessa
    HAVING
        ABS(SUM(ISNULL(ac.[Fatturato], 0))) > 0
        OR ABS(SUM(ISNULL(ac.[Fatturato Ancora Previsto], 0))) > 0;

    -- 05) Interaziendali su commesse non "Servizi Interaziendali" (dal 2025)
    INSERT INTO #Anomalie (TipoAnomalia, DettaglioAnomalia, IdCommessa)
    SELECT
        N'05 - Interaziendali su commessa non Servizi Interaziendali' AS TipoAnomalia,
        CAST(
            N'Costi interaziendali: '
            + CAST(CAST(SUM(ISNULL(ac.ImportoAcquistiInteraziendali, 0)) AS DECIMAL(18, 2)) AS NVARCHAR(64))
            + N'; Ricavi interaziendali: '
            + CAST(CAST(SUM(ISNULL(ac.ImportoFatturatoInteraziendale, 0)) AS DECIMAL(18, 2)) AS NVARCHAR(64))
            AS NVARCHAR(500)
        ) AS DettaglioAnomalia,
        CAST(ac.idCommessa AS INT) AS IdCommessa
    FROM cdg.CdgAnalisiCommesse ac
    INNER JOIN #Anagrafica an
        ON an.IdCommessa = ac.idCommessa
    WHERE CAST(ac.[Anno Competenza] AS INT) >= 2025
      AND ISNULL(an.TipologiaCommessaUpper, N'') <> N'SERVIZI INTERAZIENDALI'
    GROUP BY ac.idCommessa
    HAVING
        ABS(SUM(ISNULL(ac.ImportoAcquistiInteraziendali, 0))) > 0
        OR ABS(SUM(ISNULL(ac.ImportoFatturatoInteraziendale, 0))) > 0;

    -- 06) "Servizi Interaziendali" con costi o ricavi (dal 2025)
    INSERT INTO #Anomalie (TipoAnomalia, DettaglioAnomalia, IdCommessa)
    SELECT
        N'06 - Servizi Interaziendali con costi o ricavi' AS TipoAnomalia,
        CAST(
            N'Costi: '
            + CAST(CAST(SUM(ISNULL(ac.[Acquisti], 0)) AS DECIMAL(18, 2)) AS NVARCHAR(64))
            + N'; Ricavi: '
            + CAST(CAST(SUM(ISNULL(ac.[Fatturato], 0)) AS DECIMAL(18, 2)) AS NVARCHAR(64))
            AS NVARCHAR(500)
        ) AS DettaglioAnomalia,
        CAST(ac.idCommessa AS INT) AS IdCommessa
    FROM cdg.CdgAnalisiCommesse ac
    INNER JOIN #Anagrafica an
        ON an.IdCommessa = ac.idCommessa
    WHERE CAST(ac.[Anno Competenza] AS INT) >= 2025
      AND ISNULL(an.TipologiaCommessaUpper, N'') = N'SERVIZI INTERAZIENDALI'
    GROUP BY ac.idCommessa
    HAVING
        ABS(SUM(ISNULL(ac.[Acquisti], 0))) > 0
        OR ABS(SUM(ISNULL(ac.[Fatturato], 0))) > 0;

    -- 07) Commesse senza PM o RCC (escludendo stati T/NF)
    INSERT INTO #Anomalie (TipoAnomalia, DettaglioAnomalia, IdCommessa)
    SELECT
        N'07 - Commessa senza PM o RCC' AS TipoAnomalia,
        CAST(
            N'PM: '
            + CASE
                WHEN NULLIF(LTRIM(RTRIM(ISNULL(an.Pm, N''))), N'') IS NULL THEN N'MANCANTE'
                ELSE LTRIM(RTRIM(ISNULL(an.Pm, N'')))
              END
            + N'; RCC: '
            + CASE
                WHEN NULLIF(LTRIM(RTRIM(ISNULL(an.Rcc, N''))), N'') IS NULL THEN N'MANCANTE'
                ELSE LTRIM(RTRIM(ISNULL(an.Rcc, N'')))
              END
            AS NVARCHAR(500)
        ) AS DettaglioAnomalia,
        CAST(an.IdCommessa AS INT) AS IdCommessa
    FROM #Anagrafica an
    WHERE
        (NULLIF(LTRIM(RTRIM(ISNULL(an.Pm, N''))), N'') IS NULL
         OR NULLIF(LTRIM(RTRIM(ISNULL(an.Rcc, N''))), N'') IS NULL)
        AND ISNULL(an.StatoCodice, N'') NOT IN (N'T', N'NF');

    SELECT
        CAST(a.TipoAnomalia AS NVARCHAR(200)) AS TipoAnomalia,
        CAST(a.DettaglioAnomalia AS NVARCHAR(500)) AS DettaglioAnomalia,
        CAST(a.IdCommessa AS INT) AS IdCommessa,
        CAST(COALESCE(an.Commessa, cm.commessa, N'') AS NVARCHAR(128)) AS Commessa,
        CAST(COALESCE(an.DescrizioneCommessa, cm.descrizione, N'') AS NVARCHAR(512)) AS DescrizioneCommessa,
        CAST(ISNULL(an.TipologiaCommessa, N'') AS NVARCHAR(256)) AS TipologiaCommessa,
        CAST(ISNULL(an.Stato, N'') AS NVARCHAR(128)) AS Stato,
        CAST(ISNULL(an.MacroTipologia, N'') AS NVARCHAR(256)) AS MacroTipologia,
        CAST(ISNULL(an.Controparte, N'') AS NVARCHAR(256)) AS Controparte,
        CAST(ISNULL(an.BusinessUnit, N'') AS NVARCHAR(128)) AS BusinessUnit,
        CAST(ISNULL(an.Rcc, N'') AS NVARCHAR(256)) AS Rcc,
        CAST(ISNULL(an.Pm, N'') AS NVARCHAR(256)) AS Pm,
        CAST(ISNULL(v.OreLavorate, 0) AS DECIMAL(18, 2)) AS OreLavorate,
        CAST(ISNULL(v.CostoPersonale, 0) AS DECIMAL(18, 2)) AS CostoPersonale,
        CAST(ISNULL(v.Ricavi, 0) AS DECIMAL(18, 2)) AS Ricavi,
        CAST(ISNULL(v.Costi, 0) AS DECIMAL(18, 2)) AS Costi,
        CAST(ISNULL(v.RicaviFuturi, 0) AS DECIMAL(18, 2)) AS RicaviFuturi,
        CAST(ISNULL(v.CostiFuturi, 0) AS DECIMAL(18, 2)) AS CostiFuturi,
        CAST(ISNULL(an.IdPm, 0) AS INT) AS IdPm,
        CAST(ISNULL(an.IdRcc, 0) AS INT) AS IdRcc,
        CAST(ISNULL(an.NetUserNamePmUpper, N'') AS NVARCHAR(256)) AS NetUserNamePmUpper,
        CAST(ISNULL(an.NetUserNameRccUpper, N'') AS NVARCHAR(256)) AS NetUserNameRccUpper
    FROM #Anomalie a
    LEFT JOIN #Anagrafica an
        ON an.IdCommessa = a.IdCommessa
    LEFT JOIN dbo.commesse cm
        ON cm.id = a.IdCommessa
    LEFT JOIN #ValoriEconomici v
        ON v.IdCommessa = a.IdCommessa
    ORDER BY
        a.TipoAnomalia,
        COALESCE(an.Commessa, cm.commessa),
        a.IdCommessa;
END
GO

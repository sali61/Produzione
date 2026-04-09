/*
    Stored procedure area dati pagina "Commesse > Andamento Mensile"
    - Modalita dettaglio: righe mensili
    - Modalita aggregata: anni precedenti/seguenti aggregati per anno, anno corrente per mese fino a mese di riferimento
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spAndamentoMensileCommesse', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spAndamentoMensileCommesse AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spAndamentoMensileCommesse
    @idrisorsa INT = NULL,
    @FiltroDaApplicare NVARCHAR(MAX) = NULL,
    @Aggrega BIT = 0,
    @AnnoCorrente INT = NULL,
    @MeseRiferimento INT = NULL,
    @Take INT = 5000
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TakeClamped INT =
        CASE
            WHEN @Take IS NULL OR @Take < 1 THEN 1
            WHEN @Take > 100000 THEN 100000
            ELSE @Take
        END;

    DECLARE @AnnoCorrenteVal INT = ISNULL(NULLIF(@AnnoCorrente, 0), YEAR(GETDATE()));
    DECLARE @MeseRiferimentoVal INT =
        CASE
            WHEN @MeseRiferimento BETWEEN 1 AND 12 THEN @MeseRiferimento
            ELSE NULL
        END;

    CREATE TABLE #AvanzamentoAnno
    (
        idcommessa INT NOT NULL,
        anno_riferimento INT NOT NULL,
        ore_future DECIMAL(18, 2) NOT NULL,
        costo_personale_futuro DECIMAL(18, 2) NOT NULL
    );

    ;WITH AvanzamentoOrdinato AS
    (
        SELECT
            a.idcommessa,
            YEAR(a.data_riferimento) AS anno_riferimento,
            CAST(ISNULL(a.OreFuture, a.ore_restanti) AS DECIMAL(18, 2)) AS ore_future,
            CAST(ISNULL(a.CostoPersonaleFuturo, a.costo_personale_futuro) AS DECIMAL(18, 2)) AS costo_personale_futuro,
            ROW_NUMBER() OVER (
                PARTITION BY a.idcommessa, YEAR(a.data_riferimento)
                ORDER BY a.data_riferimento DESC, a.data_salvataggio DESC, a.id DESC
            ) AS rn
        FROM produzione.avanzamento a
    )
    INSERT INTO #AvanzamentoAnno (idcommessa, anno_riferimento, ore_future, costo_personale_futuro)
    SELECT
        ao.idcommessa,
        ao.anno_riferimento,
        ao.ore_future,
        ao.costo_personale_futuro
    FROM AvanzamentoOrdinato ao
    WHERE ao.rn = 1;

    ;WITH AnagraficaCommessa AS
    (
        SELECT
            q.idcommessa,
            CAST(ISNULL(q.commessa, N'') AS NVARCHAR(128)) AS commessa,
            CAST(ISNULL(q.descrizione, N'') AS NVARCHAR(512)) AS descrizione,
            CAST(ISNULL(q.tipo_commessa, N'') AS NVARCHAR(256)) AS tipo_commessa,
            CAST(ISNULL(q.stato, N'') AS NVARCHAR(128)) AS stato,
            CAST(ISNULL(q.macrotipologia, N'') AS NVARCHAR(256)) AS macrotipologia,
            CAST(
                CASE
                    WHEN UPPER(LTRIM(RTRIM(ISNULL(q.Nomeprodotto, N'')))) IN (N'NON DEFINITO', N'NON DEFINTO')
                        THEN N''
                    ELSE LTRIM(RTRIM(ISNULL(q.Nomeprodotto, N'')))
                END
                AS NVARCHAR(256)
            ) AS Nomeprodotto,
            CAST(ISNULL(q.controparte, N'') AS NVARCHAR(256)) AS controparte,
            CAST(ISNULL(q.idbusinessunit, N'') AS NVARCHAR(128)) AS idbusinessunit,
            CAST(ISNULL(q.RCC, N'') AS NVARCHAR(256)) AS RCC,
            CAST(ISNULL(q.PM, N'') AS NVARCHAR(256)) AS PM,
            CAST(ISNULL(q.produzione, N'') AS NVARCHAR(32)) AS produzione,
            ROW_NUMBER() OVER (
                PARTITION BY q.idcommessa
                ORDER BY q.data_commessa DESC, q.commessa
            ) AS rn
        FROM cdg_qryComessaPmRcc q
    )
    SELECT
        CAST(ISNULL(m.idCommessa, 0) AS INT) AS idcommessa,
        CAST(m.[Anno Competenza] AS INT) AS anno_competenza,
        CAST(m.[Mese Competenza] AS INT) AS mese_competenza,
        CAST(ISNULL(a.commessa, N'') AS NVARCHAR(128)) AS commessa,
        CAST(ISNULL(a.descrizione, N'') AS NVARCHAR(512)) AS descrizione,
        CAST(ISNULL(a.tipo_commessa, N'') AS NVARCHAR(256)) AS tipo_commessa,
        CAST(ISNULL(a.stato, N'') AS NVARCHAR(128)) AS stato,
        CAST(ISNULL(a.macrotipologia, N'') AS NVARCHAR(256)) AS macrotipologia,
        CAST(ISNULL(a.Nomeprodotto, N'') AS NVARCHAR(256)) AS Nomeprodotto,
        CAST(ISNULL(a.controparte, N'') AS NVARCHAR(256)) AS controparte,
        CAST(ISNULL(a.idbusinessunit, N'') AS NVARCHAR(128)) AS idbusinessunit,
        CAST(ISNULL(a.RCC, N'') AS NVARCHAR(256)) AS RCC,
        CAST(ISNULL(a.PM, N'') AS NVARCHAR(256)) AS PM,
        CAST(
            CASE
                WHEN LTRIM(RTRIM(ISNULL(a.produzione, N''))) = N'1' THEN 1
                WHEN UPPER(LTRIM(RTRIM(ISNULL(a.produzione, N'')))) IN (N'SI', N'S', N'1', N'TRUE', N'Y', N'YES') THEN 1
                ELSE 0
            END
            AS DECIMAL(18, 2)
        ) AS produzione,
        CAST(ISNULL(m.[Ore Lavorate], 0) AS DECIMAL(18, 2)) AS ore_lavorate,
        CAST(ISNULL(m.[Costo Ore Lavorate], 0) AS DECIMAL(18, 2)) AS costo_personale,
        CAST(ISNULL(m.[Fatturato], 0) AS DECIMAL(18, 2)) AS ricavi,
        CAST(ISNULL(m.[Acquisti], 0) AS DECIMAL(18, 2)) AS costi,
        CAST(ISNULL(m.[RicaviMaturati], 0) AS DECIMAL(18, 2)) AS ricavi_maturati,
        CAST(ISNULL(av.ore_future, 0) AS DECIMAL(18, 2)) AS ore_future,
        CAST(ISNULL(av.costo_personale_futuro, 0) AS DECIMAL(18, 2)) AS costo_personale_futuro,
        CAST(ISNULL(m.[CostoGeneraleRibaltato], 0) AS DECIMAL(18, 2)) AS CostoGeneraleRibaltato,
        CAST(
            ISNULL(m.[Utile specifico], 0)
            + ISNULL(m.[RicaviMaturati], 0)
            AS DECIMAL(18, 2)
        ) AS utile_specifico
    INTO #Base
    FROM cdg.CdgAnalisiCommesseMensile m
    LEFT JOIN AnagraficaCommessa a
        ON a.idcommessa = m.idCommessa
       AND a.rn = 1
    LEFT JOIN #AvanzamentoAnno av
        ON av.idcommessa = m.idCommessa
       AND av.anno_riferimento = CAST(m.[Anno Competenza] AS INT)
    WHERE CAST(m.[Anno Competenza] AS INT) IS NOT NULL
      AND CAST(m.[Mese Competenza] AS INT) BETWEEN 1 AND 12;

    IF @FiltroDaApplicare IS NOT NULL AND LTRIM(RTRIM(@FiltroDaApplicare)) <> N''
    BEGIN
        DECLARE @FiltroSql NVARCHAR(MAX) =
            N'DELETE b FROM #Base b WHERE NOT (' + @FiltroDaApplicare + N');';
        EXEC sys.sp_executesql @FiltroSql;
    END;

    IF ISNULL(@Aggrega, 0) = 0
    BEGIN
        IF @MeseRiferimentoVal IS NOT NULL
        BEGIN
            DELETE FROM #Base
            WHERE mese_competenza <> @MeseRiferimentoVal;
        END;

        SELECT TOP (@TakeClamped)
            b.anno_competenza,
            b.mese_competenza,
            b.commessa,
            b.descrizione,
            b.tipo_commessa,
            b.stato,
            b.macrotipologia,
            b.Nomeprodotto,
            b.controparte,
            b.idbusinessunit,
            b.RCC,
            b.PM,
            b.produzione,
            b.ore_lavorate,
            b.costo_personale,
            b.ricavi,
            b.costi,
            b.ricavi_maturati,
            b.ore_future,
            b.costo_personale_futuro,
            b.CostoGeneraleRibaltato,
            b.utile_specifico
        FROM #Base b
        ORDER BY
            b.anno_competenza DESC,
            b.mese_competenza DESC,
            b.commessa;

        RETURN;
    END;

    IF @MeseRiferimentoVal IS NULL
    BEGIN
        SELECT @MeseRiferimentoVal = MAX(b.mese_competenza)
        FROM #Base b
        WHERE b.anno_competenza = @AnnoCorrenteVal;

        IF @MeseRiferimentoVal IS NULL OR @MeseRiferimentoVal NOT BETWEEN 1 AND 12
        BEGIN
            SET @MeseRiferimentoVal = 12;
        END;
    END;

    ;WITH AggregatiAnnuali AS
    (
        SELECT
            b.anno_competenza,
            CAST(0 AS INT) AS mese_competenza,
            b.commessa,
            b.descrizione,
            b.tipo_commessa,
            b.stato,
            b.macrotipologia,
            b.Nomeprodotto,
            b.controparte,
            b.idbusinessunit,
            b.RCC,
            b.PM,
            CAST(MAX(b.produzione) AS DECIMAL(18, 2)) AS produzione,
            CAST(SUM(b.ore_lavorate) AS DECIMAL(18, 2)) AS ore_lavorate,
            CAST(SUM(b.costo_personale) AS DECIMAL(18, 2)) AS costo_personale,
            CAST(SUM(b.ricavi) AS DECIMAL(18, 2)) AS ricavi,
            CAST(SUM(b.costi) AS DECIMAL(18, 2)) AS costi,
            CAST(SUM(b.ricavi_maturati) AS DECIMAL(18, 2)) AS ricavi_maturati,
            CAST(MAX(b.ore_future) AS DECIMAL(18, 2)) AS ore_future,
            CAST(MAX(b.costo_personale_futuro) AS DECIMAL(18, 2)) AS costo_personale_futuro,
            CAST(SUM(b.CostoGeneraleRibaltato) AS DECIMAL(18, 2)) AS CostoGeneraleRibaltato,
            CAST(SUM(b.utile_specifico) AS DECIMAL(18, 2)) AS utile_specifico
        FROM #Base b
        WHERE b.anno_competenza <> @AnnoCorrenteVal
        GROUP BY
            b.anno_competenza,
            b.commessa,
            b.descrizione,
            b.tipo_commessa,
            b.stato,
            b.macrotipologia,
            b.Nomeprodotto,
            b.controparte,
            b.idbusinessunit,
            b.RCC,
            b.PM
    ),
    AggregatiAnnoCorrente AS
    (
        SELECT
            b.anno_competenza,
            b.mese_competenza,
            b.commessa,
            b.descrizione,
            b.tipo_commessa,
            b.stato,
            b.macrotipologia,
            b.Nomeprodotto,
            b.controparte,
            b.idbusinessunit,
            b.RCC,
            b.PM,
            CAST(MAX(b.produzione) AS DECIMAL(18, 2)) AS produzione,
            CAST(SUM(b.ore_lavorate) AS DECIMAL(18, 2)) AS ore_lavorate,
            CAST(SUM(b.costo_personale) AS DECIMAL(18, 2)) AS costo_personale,
            CAST(SUM(b.ricavi) AS DECIMAL(18, 2)) AS ricavi,
            CAST(SUM(b.costi) AS DECIMAL(18, 2)) AS costi,
            CAST(SUM(b.ricavi_maturati) AS DECIMAL(18, 2)) AS ricavi_maturati,
            CAST(MAX(b.ore_future) AS DECIMAL(18, 2)) AS ore_future,
            CAST(MAX(b.costo_personale_futuro) AS DECIMAL(18, 2)) AS costo_personale_futuro,
            CAST(SUM(b.CostoGeneraleRibaltato) AS DECIMAL(18, 2)) AS CostoGeneraleRibaltato,
            CAST(SUM(b.utile_specifico) AS DECIMAL(18, 2)) AS utile_specifico
        FROM #Base b
        WHERE b.anno_competenza = @AnnoCorrenteVal
          AND b.mese_competenza <= @MeseRiferimentoVal
        GROUP BY
            b.anno_competenza,
            b.mese_competenza,
            b.commessa,
            b.descrizione,
            b.tipo_commessa,
            b.stato,
            b.macrotipologia,
            b.Nomeprodotto,
            b.controparte,
            b.idbusinessunit,
            b.RCC,
            b.PM
    )
    SELECT TOP (@TakeClamped)
        x.anno_competenza,
        x.mese_competenza,
        x.commessa,
        x.descrizione,
        x.tipo_commessa,
        x.stato,
        x.macrotipologia,
        x.Nomeprodotto,
        x.controparte,
        x.idbusinessunit,
        x.RCC,
        x.PM,
        x.produzione,
        x.ore_lavorate,
        x.costo_personale,
        x.ricavi,
        x.costi,
        x.ricavi_maturati,
        x.ore_future,
        x.costo_personale_futuro,
        x.CostoGeneraleRibaltato,
        x.utile_specifico
    FROM
    (
        SELECT * FROM AggregatiAnnuali
        UNION ALL
        SELECT * FROM AggregatiAnnoCorrente
    ) x
    ORDER BY
        x.anno_competenza DESC,
        x.mese_competenza DESC,
        x.commessa;
END
GO

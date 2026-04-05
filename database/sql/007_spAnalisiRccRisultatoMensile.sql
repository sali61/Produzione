/*
    Stored applicativa comune per Risultato Mensile RCC/BU.
    Espone i valori di CDG.BIXeniaValutazioneProiezioni_Mensile con conversione numerica robusta
    (it-IT/en-US) per eliminare ambiguita' tra punti/virgole.
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spAnalisiRccRisultatoMensile', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spAnalisiRccRisultatoMensile AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spAnalisiRccRisultatoMensile
    @AnnoSnapshot INT,
    @TipoAggregazione NVARCHAR(50) = N'RCC',
    @FiltroAggregazione NVARCHAR(128) = NULL,
    @Rcc NVARCHAR(128) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TipoAggregazioneFiltro NVARCHAR(50) = UPPER(NULLIF(LTRIM(RTRIM(@TipoAggregazione)), N''));
    DECLARE @AggregazioneFiltro NVARCHAR(128) = NULLIF(
        LTRIM(RTRIM(COALESCE(@FiltroAggregazione, @Rcc))),
        N'');

    IF @TipoAggregazioneFiltro NOT IN (N'RCC', N'BUSINESSUNIT', N'BURCC')
    BEGIN
        SET @TipoAggregazioneFiltro = N'RCC';
    END

    IF @TipoAggregazioneFiltro = N'RCC'
    BEGIN
        ;WITH SourceRows AS
        (
            SELECT
                TipoAggregazione = LTRIM(RTRIM(CAST(ISNULL(src.TipoAggregazione, N'RCC') AS NVARCHAR(50)))),
                Aggregazione = LTRIM(RTRIM(CAST(ISNULL(src.Aggregazione, N'') AS NVARCHAR(128)))),
                AnnoSnapshot = CASE WHEN ISNUMERIC(CAST(src.AnnoSnapshot AS NVARCHAR(32))) = 1 THEN CONVERT(INT, src.AnnoSnapshot) ELSE NULL END,
                MeseSnapshot = CASE WHEN ISNUMERIC(CAST(src.MeseSnapshot AS NVARCHAR(32))) = 1 THEN CONVERT(INT, src.MeseSnapshot) ELSE NULL END,
                BudgetRaw = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CAST(src.Budget AS NVARCHAR(128)))), NCHAR(8364), N''), N'%', N''), CHAR(160), N''), N' ', N''), N''),
                TotaleRaw = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CAST(src.totale_risultato_pesato AS NVARCHAR(128)))), NCHAR(8364), N''), N'%', N''), CHAR(160), N''), N' ', N''), N''),
                PercentualeRaw = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CAST(src.percentuale_pesato AS NVARCHAR(128)))), NCHAR(8364), N''), N'%', N''), CHAR(160), N''), N' ', N''), N'')
            FROM CDG.BiValutazioneRccMensile src
            WHERE ISNUMERIC(CAST(src.AnnoSnapshot AS NVARCHAR(32))) = 1
              AND CONVERT(INT, src.AnnoSnapshot) = @AnnoSnapshot
        ),
        Normalized AS
        (
            SELECT
                TipoAggregazione,
                Aggregazione,
                AnnoSnapshot,
                MeseSnapshot,
                BudgetNorm =
                    CASE
                        WHEN BudgetRaw IS NULL THEN NULL
                        WHEN CHARINDEX(',', BudgetRaw) > 0 AND CHARINDEX('.', BudgetRaw) > 0 AND CHARINDEX(',', BudgetRaw) > CHARINDEX('.', BudgetRaw)
                            THEN REPLACE(REPLACE(BudgetRaw, '.', ''), ',', '.')
                        WHEN CHARINDEX(',', BudgetRaw) > 0 AND CHARINDEX('.', BudgetRaw) = 0
                            THEN REPLACE(BudgetRaw, ',', '.')
                        WHEN CHARINDEX('.', BudgetRaw) > 0 AND CHARINDEX(',', BudgetRaw) > 0 AND CHARINDEX('.', BudgetRaw) > CHARINDEX(',', BudgetRaw)
                            THEN REPLACE(BudgetRaw, ',', '')
                        ELSE BudgetRaw
                    END,
                TotaleNorm =
                    CASE
                        WHEN TotaleRaw IS NULL THEN NULL
                        WHEN CHARINDEX(',', TotaleRaw) > 0 AND CHARINDEX('.', TotaleRaw) > 0 AND CHARINDEX(',', TotaleRaw) > CHARINDEX('.', TotaleRaw)
                            THEN REPLACE(REPLACE(TotaleRaw, '.', ''), ',', '.')
                        WHEN CHARINDEX(',', TotaleRaw) > 0 AND CHARINDEX('.', TotaleRaw) = 0
                            THEN REPLACE(TotaleRaw, ',', '.')
                        WHEN CHARINDEX('.', TotaleRaw) > 0 AND CHARINDEX(',', TotaleRaw) > 0 AND CHARINDEX('.', TotaleRaw) > CHARINDEX(',', TotaleRaw)
                            THEN REPLACE(TotaleRaw, ',', '')
                        ELSE TotaleRaw
                    END,
                PercentualeNorm =
                    CASE
                        WHEN PercentualeRaw IS NULL THEN NULL
                        WHEN CHARINDEX(',', PercentualeRaw) > 0 AND CHARINDEX('.', PercentualeRaw) > 0 AND CHARINDEX(',', PercentualeRaw) > CHARINDEX('.', PercentualeRaw)
                            THEN REPLACE(REPLACE(PercentualeRaw, '.', ''), ',', '.')
                        WHEN CHARINDEX(',', PercentualeRaw) > 0 AND CHARINDEX('.', PercentualeRaw) = 0
                            THEN REPLACE(PercentualeRaw, ',', '.')
                        WHEN CHARINDEX('.', PercentualeRaw) > 0 AND CHARINDEX(',', PercentualeRaw) > 0 AND CHARINDEX('.', PercentualeRaw) > CHARINDEX(',', PercentualeRaw)
                            THEN REPLACE(PercentualeRaw, ',', '')
                        ELSE PercentualeRaw
                    END
            FROM SourceRows
        )
        SELECT
            TipoAggregazione,
            Aggregazione,
            AnnoSnapshot,
            MeseSnapshot,
            Budget =
                CASE
                    WHEN BudgetNorm IS NULL THEN 0
                    WHEN ISNUMERIC(BudgetNorm) = 1 THEN CONVERT(DECIMAL(19, 4), BudgetNorm)
                    ELSE 0
                END,
            TotaleRisultatoPesato =
                CASE
                    WHEN TotaleNorm IS NULL THEN 0
                    WHEN ISNUMERIC(TotaleNorm) = 1 THEN CONVERT(DECIMAL(19, 4), TotaleNorm)
                    ELSE 0
                END,
            PercentualePesato =
                CASE
                    WHEN PercentualeNorm IS NULL THEN 0
                    WHEN ISNUMERIC(PercentualeNorm) = 1 THEN CONVERT(DECIMAL(19, 6), PercentualeNorm)
                    ELSE 0
                END
        FROM Normalized
        WHERE (@AggregazioneFiltro IS NULL OR Aggregazione = @AggregazioneFiltro)
        ORDER BY
            AnnoSnapshot,
            MeseSnapshot,
            Aggregazione;

        RETURN;
    END

    ;WITH SourceRows AS
    (
        SELECT
            TipoAggregazione = @TipoAggregazioneFiltro,
            Aggregazione = LTRIM(RTRIM(CAST(ISNULL(src.Aggregazione, N'') AS NVARCHAR(128)))),
            AnnoSnapshot = CASE WHEN ISNUMERIC(CAST(src.AnnoSnapshot AS NVARCHAR(32))) = 1 THEN CONVERT(INT, src.AnnoSnapshot) ELSE NULL END,
            MeseSnapshot = CASE WHEN ISNUMERIC(CAST(src.MeseSnapshot AS NVARCHAR(32))) = 1 THEN CONVERT(INT, src.MeseSnapshot) ELSE NULL END,
            BudgetRaw = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CAST(src.Budget AS NVARCHAR(128)))), NCHAR(8364), N''), N'%', N''), CHAR(160), N''), N' ', N''), N''),
            FatturatoRaw = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CAST(src.totale_fatturato AS NVARCHAR(128)))), NCHAR(8364), N''), N'%', N''), CHAR(160), N''), N' ', N''), N''),
            FatturatoFuturoRaw = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CAST(src.totale_fatturato_futuro AS NVARCHAR(128)))), NCHAR(8364), N''), N'%', N''), CHAR(160), N''), N' ', N''), N''),
            RicavoIpoteticoPesatoRaw = NULLIF(REPLACE(REPLACE(REPLACE(REPLACE(LTRIM(RTRIM(CAST(src.totale_ricavo_ipotetico_pesato AS NVARCHAR(128)))), NCHAR(8364), N''), N'%', N''), CHAR(160), N''), N' ', N''), N'')
        FROM CDG.BIXeniaValutazioneProiezioni_Mensile src
        WHERE ISNUMERIC(CAST(src.AnnoSnapshot AS NVARCHAR(32))) = 1
          AND CONVERT(INT, src.AnnoSnapshot) = @AnnoSnapshot
          AND UPPER(LTRIM(RTRIM(CAST(ISNULL(src.TipoAggregazione, N'') AS NVARCHAR(50))))) = @TipoAggregazioneFiltro
    ),
    Normalized AS
    (
        SELECT
            TipoAggregazione,
            Aggregazione,
            AnnoSnapshot,
            MeseSnapshot,
            BudgetNorm =
                CASE
                    WHEN BudgetRaw IS NULL THEN NULL
                    WHEN CHARINDEX(',', BudgetRaw) > 0 AND CHARINDEX('.', BudgetRaw) > 0 AND CHARINDEX(',', BudgetRaw) > CHARINDEX('.', BudgetRaw)
                        THEN REPLACE(REPLACE(BudgetRaw, '.', ''), ',', '.')
                    WHEN CHARINDEX(',', BudgetRaw) > 0 AND CHARINDEX('.', BudgetRaw) = 0
                        THEN REPLACE(BudgetRaw, ',', '.')
                    WHEN CHARINDEX('.', BudgetRaw) > 0 AND CHARINDEX(',', BudgetRaw) > 0 AND CHARINDEX('.', BudgetRaw) > CHARINDEX(',', BudgetRaw)
                        THEN REPLACE(BudgetRaw, ',', '')
                    ELSE BudgetRaw
                END,
            FatturatoNorm =
                CASE
                    WHEN FatturatoRaw IS NULL THEN NULL
                    WHEN CHARINDEX(',', FatturatoRaw) > 0 AND CHARINDEX('.', FatturatoRaw) > 0 AND CHARINDEX(',', FatturatoRaw) > CHARINDEX('.', FatturatoRaw)
                        THEN REPLACE(REPLACE(FatturatoRaw, '.', ''), ',', '.')
                    WHEN CHARINDEX(',', FatturatoRaw) > 0 AND CHARINDEX('.', FatturatoRaw) = 0
                        THEN REPLACE(FatturatoRaw, ',', '.')
                    WHEN CHARINDEX('.', FatturatoRaw) > 0 AND CHARINDEX(',', FatturatoRaw) > 0 AND CHARINDEX('.', FatturatoRaw) > CHARINDEX(',', FatturatoRaw)
                        THEN REPLACE(FatturatoRaw, ',', '')
                    ELSE FatturatoRaw
                END,
            FatturatoFuturoNorm =
                CASE
                    WHEN FatturatoFuturoRaw IS NULL THEN NULL
                    WHEN CHARINDEX(',', FatturatoFuturoRaw) > 0 AND CHARINDEX('.', FatturatoFuturoRaw) > 0 AND CHARINDEX(',', FatturatoFuturoRaw) > CHARINDEX('.', FatturatoFuturoRaw)
                        THEN REPLACE(REPLACE(FatturatoFuturoRaw, '.', ''), ',', '.')
                    WHEN CHARINDEX(',', FatturatoFuturoRaw) > 0 AND CHARINDEX('.', FatturatoFuturoRaw) = 0
                        THEN REPLACE(FatturatoFuturoRaw, ',', '.')
                    WHEN CHARINDEX('.', FatturatoFuturoRaw) > 0 AND CHARINDEX(',', FatturatoFuturoRaw) > 0 AND CHARINDEX('.', FatturatoFuturoRaw) > CHARINDEX(',', FatturatoFuturoRaw)
                        THEN REPLACE(FatturatoFuturoRaw, ',', '')
                    ELSE FatturatoFuturoRaw
                END,
            RicavoIpoteticoPesatoNorm =
                CASE
                    WHEN RicavoIpoteticoPesatoRaw IS NULL THEN NULL
                    WHEN CHARINDEX(',', RicavoIpoteticoPesatoRaw) > 0 AND CHARINDEX('.', RicavoIpoteticoPesatoRaw) > 0 AND CHARINDEX(',', RicavoIpoteticoPesatoRaw) > CHARINDEX('.', RicavoIpoteticoPesatoRaw)
                        THEN REPLACE(REPLACE(RicavoIpoteticoPesatoRaw, '.', ''), ',', '.')
                    WHEN CHARINDEX(',', RicavoIpoteticoPesatoRaw) > 0 AND CHARINDEX('.', RicavoIpoteticoPesatoRaw) = 0
                        THEN REPLACE(RicavoIpoteticoPesatoRaw, ',', '.')
                    WHEN CHARINDEX('.', RicavoIpoteticoPesatoRaw) > 0 AND CHARINDEX(',', RicavoIpoteticoPesatoRaw) > 0 AND CHARINDEX('.', RicavoIpoteticoPesatoRaw) > CHARINDEX(',', RicavoIpoteticoPesatoRaw)
                        THEN REPLACE(RicavoIpoteticoPesatoRaw, ',', '')
                    ELSE RicavoIpoteticoPesatoRaw
                END
        FROM SourceRows
    ),
    Parsed AS
    (
        SELECT
            TipoAggregazione,
            Aggregazione,
            AnnoSnapshot,
            MeseSnapshot,
            BudgetVal =
                CASE
                    WHEN BudgetNorm IS NULL THEN CONVERT(DECIMAL(19, 4), 0)
                    WHEN ISNUMERIC(BudgetNorm) = 1 THEN CONVERT(DECIMAL(19, 4), BudgetNorm)
                    ELSE CONVERT(DECIMAL(19, 4), 0)
                END,
            FatturatoVal =
                CASE
                    WHEN FatturatoNorm IS NULL THEN CONVERT(DECIMAL(19, 4), 0)
                    WHEN ISNUMERIC(FatturatoNorm) = 1 THEN CONVERT(DECIMAL(19, 4), FatturatoNorm)
                    ELSE CONVERT(DECIMAL(19, 4), 0)
                END,
            FatturatoFuturoVal =
                CASE
                    WHEN FatturatoFuturoNorm IS NULL THEN CONVERT(DECIMAL(19, 4), 0)
                    WHEN ISNUMERIC(FatturatoFuturoNorm) = 1 THEN CONVERT(DECIMAL(19, 4), FatturatoFuturoNorm)
                    ELSE CONVERT(DECIMAL(19, 4), 0)
                END,
            RicavoIpoteticoPesatoVal =
                CASE
                    WHEN RicavoIpoteticoPesatoNorm IS NULL THEN CONVERT(DECIMAL(19, 4), 0)
                    WHEN ISNUMERIC(RicavoIpoteticoPesatoNorm) = 1 THEN CONVERT(DECIMAL(19, 4), RicavoIpoteticoPesatoNorm)
                    ELSE CONVERT(DECIMAL(19, 4), 0)
                END
        FROM Normalized
    )
    SELECT
        TipoAggregazione,
        Aggregazione,
        AnnoSnapshot,
        MeseSnapshot,
        Budget = BudgetVal,
        TotaleRisultatoPesato = FatturatoVal + FatturatoFuturoVal + RicavoIpoteticoPesatoVal,
        PercentualePesato =
            CASE
                WHEN BudgetVal = 0 THEN 0
                ELSE CONVERT(DECIMAL(19, 6), (FatturatoVal + FatturatoFuturoVal + RicavoIpoteticoPesatoVal) / BudgetVal)
            END
    FROM Parsed
    WHERE (@AggregazioneFiltro IS NULL OR Aggregazione = @AggregazioneFiltro)
    ORDER BY
        AnnoSnapshot,
        MeseSnapshot,
        Aggregazione;
END
GO


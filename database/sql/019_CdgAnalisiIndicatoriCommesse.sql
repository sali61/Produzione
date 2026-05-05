/*
    Tabella indicatori KPI commesse e procedura di alimentazione.
    Prima fase: commesse Time Material (tm = 1), stati O/T.

    Fonte regole:
    - cdg_qryComessaPmRcc: anagrafica, stato e tipologia tm
    - cdg.CdgAnalisiCommesse: valori annuali
    - cdg.CdgAnalisiCommesseMensile: valori mensili
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'cdg')
BEGIN
    EXEC ('CREATE SCHEMA cdg');
END
GO

IF OBJECT_ID('cdg.CdgAnalisiIndicatoriCommesse', 'U') IS NULL
BEGIN
    CREATE TABLE cdg.CdgAnalisiIndicatoriCommesse
    (
        Id INT IDENTITY(1, 1) NOT NULL,
        DataRiferimento DATE NOT NULL,
        IdCommessa INT NOT NULL,
        TipologiaCalcolo NVARCHAR(32) NOT NULL
            CONSTRAINT DF_CdgAnalisiIndicatoriCommesse_TipologiaCalcolo DEFAULT (N'TM'),

        OrePrevisteFineMesePrecedente DECIMAL(18, 2) NULL,
        OrePrevisteFineAnno DECIMAL(18, 2) NULL,
        OrePrevisteFineCommessa DECIMAL(18, 2) NULL,

        OreLavorateFineMesePrecedente DECIMAL(18, 2) NULL,
        OreLavorateFineAnno DECIMAL(18, 2) NULL,
        OreLavorateFineCommessa DECIMAL(18, 2) NULL,

        SovrapercentualeFineMesePrecedente DECIMAL(18, 6) NULL,
        SovrapercentualeFineAnno DECIMAL(18, 6) NULL,
        SovrapercentualeFineCommessa DECIMAL(18, 6) NULL,

        RicavoFineMesePrecedente DECIMAL(18, 2) NULL,
        RicavoFineAnno DECIMAL(18, 2) NULL,
        RicavoFineCommessa DECIMAL(18, 2) NULL,

        MaturatoNonFatturatoFineMesePrecedente DECIMAL(18, 2) NULL,

        CostoPersonaleFineMesePrecedente DECIMAL(18, 2) NULL,
        CostoPersonaleFineAnno DECIMAL(18, 2) NULL,
        CostoPersonaleFineCommessa DECIMAL(18, 2) NULL,

        AcquistiFineMesePrecedente DECIMAL(18, 2) NULL,
        AcquistiFineAnno DECIMAL(18, 2) NULL,
        AcquistiFineCommessa DECIMAL(18, 2) NULL,

        UtileFineMesePrecedente DECIMAL(18, 2) NULL,
        UtileFineAnno DECIMAL(18, 2) NULL,
        UtileFineCommessa DECIMAL(18, 2) NULL,

        PercentualeUtileFineMesePrecedente DECIMAL(18, 6) NULL,
        PercentualeUtileFineAnno DECIMAL(18, 6) NULL,
        PercentualeUtileFineCommessa DECIMAL(18, 6) NULL,

        SpcMFineMesePrecedente DECIMAL(18, 6) NULL,
        SpcMFineAnno DECIMAL(18, 6) NULL,
        SpcMFineCommessa DECIMAL(18, 6) NULL,

        DataAlimentazione DATETIME2(0) NOT NULL
            CONSTRAINT DF_CdgAnalisiIndicatoriCommesse_DataAlimentazione DEFAULT (SYSDATETIME()),

        CONSTRAINT PK_CdgAnalisiIndicatoriCommesse PRIMARY KEY CLUSTERED (Id)
    );
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('cdg.CdgAnalisiIndicatoriCommesse')
      AND name = 'UX_CdgAnalisiIndicatoriCommesse_Commessa_Data_Tipo'
)
BEGIN
    DROP INDEX UX_CdgAnalisiIndicatoriCommesse_Commessa_Data_Tipo
        ON cdg.CdgAnalisiIndicatoriCommesse;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('cdg.CdgAnalisiIndicatoriCommesse')
      AND name = 'IX_CdgAnalisiIndicatoriCommesse_DataRiferimento'
)
BEGIN
    DROP INDEX IX_CdgAnalisiIndicatoriCommesse_DataRiferimento
        ON cdg.CdgAnalisiIndicatoriCommesse;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'Commessa') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN Commessa;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'Descrizione') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN Descrizione;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'Stato') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN Stato;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'TipoCommessa') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN TipoCommessa;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'MacroTipologia') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN MacroTipologia;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'BusinessUnit') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN BusinessUnit;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'RCC') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN RCC;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'PM') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN PM;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'Tm') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN Tm;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'DataCommessa') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN DataCommessa;
END
GO

IF COL_LENGTH('cdg.CdgAnalisiIndicatoriCommesse', 'DataChiusura') IS NOT NULL
BEGIN
    ALTER TABLE cdg.CdgAnalisiIndicatoriCommesse DROP COLUMN DataChiusura;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('cdg.CdgAnalisiIndicatoriCommesse')
      AND name = 'UX_CdgAnalisiIndicatoriCommesse_IdCommessa_Data_Tipo'
)
BEGIN
    CREATE UNIQUE INDEX UX_CdgAnalisiIndicatoriCommesse_IdCommessa_Data_Tipo
        ON cdg.CdgAnalisiIndicatoriCommesse (IdCommessa, DataRiferimento, TipologiaCalcolo);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('cdg.CdgAnalisiIndicatoriCommesse')
      AND name = 'IX_CdgAnalisiIndicatoriCommesse_DataRiferimento'
)
BEGIN
    CREATE INDEX IX_CdgAnalisiIndicatoriCommesse_DataRiferimento
        ON cdg.CdgAnalisiIndicatoriCommesse (DataRiferimento)
        INCLUDE (IdCommessa, TipologiaCalcolo);
END
GO

IF OBJECT_ID('cdg.spAlimentaIndicatoriCommesseTm', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE cdg.spAlimentaIndicatoriCommesseTm AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE cdg.spAlimentaIndicatoriCommesseTm
    @DataRiferimento DATE = NULL,
    @IdCommessa INT = NULL,
    @Sostituisci BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    /*
        Se non viene passato un mese esplicito, il riferimento si chiude sul
        mese precedente solo dal giorno 16. Fino al giorno 15 incluso si usa
        il mese ancora precedente, per attendere il completamento della
        fatturazione.
    */
    DECLARE @FineMesePrecedente DATE =
        CASE
            WHEN @DataRiferimento IS NOT NULL THEN EOMONTH(@DataRiferimento)
            WHEN DAY(GETDATE()) <= 15 THEN EOMONTH(GETDATE(), -2)
            ELSE EOMONTH(GETDATE(), -1)
        END;

    DECLARE @AnnoRiferimento INT = YEAR(@FineMesePrecedente);
    DECLARE @MeseRiferimento INT = MONTH(@FineMesePrecedente);
    DECLARE @SogliaDataChiusura DATE = CONVERT(DATE, '20200101', 112);

    ;WITH AnagraficaOrdinata AS
    (
        SELECT
            CAST(q.idcommessa AS INT) AS IdCommessa,
            CAST(UPPER(LTRIM(RTRIM(ISNULL(q.stato, N'')))) AS NVARCHAR(32)) AS Stato,
            CAST(q.DATA_CHIU AS DATE) AS DataChiusura,
            ROW_NUMBER() OVER (
                PARTITION BY q.idcommessa
                ORDER BY q.data_commessa DESC, q.COMMESSA
            ) AS rn
        FROM dbo.cdg_qryComessaPmRcc q
        WHERE ISNULL(q.tm, 0) = 1
          AND UPPER(LTRIM(RTRIM(ISNULL(q.stato, N'')))) IN (N'O', N'T')
          AND q.data_commessa IS NOT NULL
          AND CAST(q.data_commessa AS DATE) <= @FineMesePrecedente
          AND (@IdCommessa IS NULL OR q.idcommessa = @IdCommessa)
    ),
    Anagrafica AS
    (
        SELECT
            a.IdCommessa,
            a.Stato,
            a.DataChiusura
        FROM AnagraficaOrdinata a
        WHERE a.rn = 1
          AND NOT (
                a.Stato = N'T'
            AND a.DataChiusura IS NOT NULL
            AND a.DataChiusura < @SogliaDataChiusura
          )
    ),
    AnnualePrecedente AS
    (
        SELECT
            ac.idCommessa AS IdCommessa,
            SUM(ISNULL(ac.[Fatturato], 0)) AS Ricavo,
            SUM(ISNULL(ac.[Ore Lavorate], 0)) AS OreLavorate,
            SUM(ISNULL(ac.[Costo Ore Lavorate], 0)) AS CostoPersonale,
            SUM(ISNULL(ac.[Acquisti], 0)) AS Acquisti,
            SUM(ISNULL(ac.[Utile specifico], 0)) AS Utile
        FROM cdg.CdgAnalisiCommesse ac
        WHERE CAST(ac.[Anno Competenza] AS INT) < @AnnoRiferimento
        GROUP BY ac.idCommessa
    ),
    MensileAnnoCorrente AS
    (
        SELECT
            m.idCommessa AS IdCommessa,
            SUM(ISNULL(m.[Fatturato], 0)) AS Ricavo,
            SUM(ISNULL(m.[Ore Lavorate], 0)) AS OreLavorate,
            SUM(ISNULL(m.[Costo Ore Lavorate], 0)) AS CostoPersonale,
            SUM(ISNULL(m.[Acquisti], 0)) AS Acquisti,
            SUM(ISNULL(m.[Utile specifico], 0)) AS Utile
        FROM cdg.CdgAnalisiCommesseMensile m
        WHERE CAST(m.[Anno Competenza] AS INT) = @AnnoRiferimento
          AND CAST(m.[Mese Competenza] AS INT) <= @MeseRiferimento
        GROUP BY m.idCommessa
    ),
    MaturatoMesePrecedente AS
    (
        SELECT
            m.idCommessa AS IdCommessa,
            SUM(ISNULL(m.RicaviMaturati, 0)) AS MaturatoNonFatturato
        FROM cdg.CdgAnalisiCommesseMensile m
        WHERE CAST(m.[Anno Competenza] AS INT) = @AnnoRiferimento
          AND CAST(m.[Mese Competenza] AS INT) = @MeseRiferimento
        GROUP BY m.idCommessa
    ),
    FineMese AS
    (
        SELECT
            a.IdCommessa,
            ISNULL(ap.Ricavo, 0) + ISNULL(mc.Ricavo, 0) AS Ricavo,
            ISNULL(ap.OreLavorate, 0) + ISNULL(mc.OreLavorate, 0) AS OreLavorate,
            ISNULL(ap.CostoPersonale, 0) + ISNULL(mc.CostoPersonale, 0) AS CostoPersonale,
            ISNULL(ap.Acquisti, 0) + ISNULL(mc.Acquisti, 0) AS Acquisti,
            ISNULL(ap.Utile, 0) + ISNULL(mc.Utile, 0) AS Utile,
            ISNULL(mmp.MaturatoNonFatturato, 0) AS MaturatoNonFatturato
        FROM Anagrafica a
        LEFT JOIN AnnualePrecedente ap
            ON ap.IdCommessa = a.IdCommessa
        LEFT JOIN MensileAnnoCorrente mc
            ON mc.IdCommessa = a.IdCommessa
        LEFT JOIN MaturatoMesePrecedente mmp
            ON mmp.IdCommessa = a.IdCommessa
    ),
    AnnualeCorrente AS
    (
        SELECT
            ac.idCommessa AS IdCommessa,
            SUM(ISNULL(ac.[Fatturato], 0) + ISNULL(ac.[Fatturato Ancora Previsto], 0)) AS Ricavo,
            SUM(ISNULL(ac.[Acquisti], 0) + ISNULL(ac.[Acquisti Ancora Previsto], 0)) AS Acquisti
        FROM cdg.CdgAnalisiCommesse ac
        WHERE CAST(ac.[Anno Competenza] AS INT) = @AnnoRiferimento
        GROUP BY ac.idCommessa
    ),
    FineAnno AS
    (
        SELECT
            a.IdCommessa,
            ac.Ricavo AS Ricavo,
            ac.Acquisti AS Acquisti,
            CASE
                WHEN ISNULL(fm.Ricavo, 0) = 0 THEN NULL
                ELSE fm.OreLavorate * ac.Ricavo / fm.Ricavo
            END AS OreLavorate,
            CASE
                WHEN ISNULL(fm.Ricavo, 0) = 0 THEN NULL
                ELSE fm.CostoPersonale * ac.Ricavo / fm.Ricavo
            END AS CostoPersonale
        FROM Anagrafica a
        LEFT JOIN FineMese fm
            ON fm.IdCommessa = a.IdCommessa
        LEFT JOIN AnnualeCorrente ac
            ON ac.IdCommessa = a.IdCommessa
    ),
    AnnualeTuttiAnni AS
    (
        SELECT
            ac.idCommessa AS IdCommessa,
            SUM(ISNULL(ac.[Fatturato], 0) + ISNULL(ac.[Fatturato Ancora Previsto], 0)) AS Ricavo,
            SUM(ISNULL(ac.[Acquisti], 0) + ISNULL(ac.[Acquisti Ancora Previsto], 0)) AS Acquisti
        FROM cdg.CdgAnalisiCommesse ac
        GROUP BY ac.idCommessa
    ),
    FineCommessa AS
    (
        SELECT
            a.IdCommessa,
            CASE WHEN a.Stato = N'T' THEN fm.Ricavo ELSE ata.Ricavo END AS Ricavo,
            CASE WHEN a.Stato = N'T' THEN fm.Acquisti ELSE ata.Acquisti END AS Acquisti,
            CASE
                WHEN a.Stato = N'T' THEN fm.OreLavorate
                WHEN ISNULL(fm.Ricavo, 0) = 0 THEN NULL
                ELSE fm.OreLavorate * ata.Ricavo / fm.Ricavo
            END AS OreLavorate,
            CASE
                WHEN a.Stato = N'T' THEN fm.CostoPersonale
                WHEN ISNULL(fm.Ricavo, 0) = 0 THEN NULL
                ELSE fm.CostoPersonale * ata.Ricavo / fm.Ricavo
            END AS CostoPersonale
        FROM Anagrafica a
        LEFT JOIN FineMese fm
            ON fm.IdCommessa = a.IdCommessa
        LEFT JOIN AnnualeTuttiAnni ata
            ON ata.IdCommessa = a.IdCommessa
    ),
    Valori AS
    (
        SELECT
            a.DataRiferimento,
            a.IdCommessa,
            CAST(N'TM' AS NVARCHAR(32)) AS TipologiaCalcolo,

            CAST(fm.OreLavorate AS DECIMAL(18, 2)) AS OrePrevisteFineMesePrecedente,
            CAST(fa.OreLavorate AS DECIMAL(18, 2)) AS OrePrevisteFineAnno,
            CAST(fc.OreLavorate AS DECIMAL(18, 2)) AS OrePrevisteFineCommessa,

            CAST(fm.OreLavorate AS DECIMAL(18, 2)) AS OreLavorateFineMesePrecedente,
            CAST(fa.OreLavorate AS DECIMAL(18, 2)) AS OreLavorateFineAnno,
            CAST(fc.OreLavorate AS DECIMAL(18, 2)) AS OreLavorateFineCommessa,

            CAST(fm.Ricavo AS DECIMAL(18, 2)) AS RicavoFineMesePrecedente,
            CAST(fa.Ricavo AS DECIMAL(18, 2)) AS RicavoFineAnno,
            CAST(fc.Ricavo AS DECIMAL(18, 2)) AS RicavoFineCommessa,

            CAST(fm.MaturatoNonFatturato AS DECIMAL(18, 2)) AS MaturatoNonFatturatoFineMesePrecedente,

            CAST(fm.CostoPersonale AS DECIMAL(18, 2)) AS CostoPersonaleFineMesePrecedente,
            CAST(fa.CostoPersonale AS DECIMAL(18, 2)) AS CostoPersonaleFineAnno,
            CAST(fc.CostoPersonale AS DECIMAL(18, 2)) AS CostoPersonaleFineCommessa,

            CAST(fm.Acquisti AS DECIMAL(18, 2)) AS AcquistiFineMesePrecedente,
            CAST(fa.Acquisti AS DECIMAL(18, 2)) AS AcquistiFineAnno,
            CAST(fc.Acquisti AS DECIMAL(18, 2)) AS AcquistiFineCommessa,

            CAST(fm.Utile AS DECIMAL(18, 2)) AS UtileFineMesePrecedente,
            CAST(fa.Ricavo - ISNULL(fa.CostoPersonale, 0) - ISNULL(fa.Acquisti, 0) AS DECIMAL(18, 2)) AS UtileFineAnno,
            CAST(fc.Ricavo - ISNULL(fc.CostoPersonale, 0) - ISNULL(fc.Acquisti, 0) AS DECIMAL(18, 2)) AS UtileFineCommessa
        FROM
        (
            SELECT
                @FineMesePrecedente AS DataRiferimento,
                a.*
            FROM Anagrafica a
        ) a
        LEFT JOIN FineMese fm
            ON fm.IdCommessa = a.IdCommessa
        LEFT JOIN FineAnno fa
            ON fa.IdCommessa = a.IdCommessa
        LEFT JOIN FineCommessa fc
            ON fc.IdCommessa = a.IdCommessa
    ),
    Indicatori AS
    (
        SELECT
            v.*,
            CAST(CASE WHEN ISNULL(v.OrePrevisteFineMesePrecedente, 0) = 0 THEN NULL ELSE v.OreLavorateFineMesePrecedente / v.OrePrevisteFineMesePrecedente END AS DECIMAL(18, 6)) AS SovrapercentualeFineMesePrecedente,
            CAST(CASE WHEN ISNULL(v.OrePrevisteFineAnno, 0) = 0 THEN NULL ELSE v.OreLavorateFineAnno / v.OrePrevisteFineAnno END AS DECIMAL(18, 6)) AS SovrapercentualeFineAnno,
            CAST(CASE WHEN ISNULL(v.OrePrevisteFineCommessa, 0) = 0 THEN NULL ELSE v.OreLavorateFineCommessa / v.OrePrevisteFineCommessa END AS DECIMAL(18, 6)) AS SovrapercentualeFineCommessa,

            CAST(CASE WHEN ISNULL(v.RicavoFineMesePrecedente, 0) = 0 THEN NULL ELSE 1 - ((ISNULL(v.CostoPersonaleFineMesePrecedente, 0) + ISNULL(v.AcquistiFineMesePrecedente, 0)) / v.RicavoFineMesePrecedente) END AS DECIMAL(18, 6)) AS PercentualeUtileFineMesePrecedente,
            CAST(CASE WHEN ISNULL(v.RicavoFineAnno, 0) = 0 THEN NULL ELSE 1 - ((ISNULL(v.CostoPersonaleFineAnno, 0) + ISNULL(v.AcquistiFineAnno, 0)) / v.RicavoFineAnno) END AS DECIMAL(18, 6)) AS PercentualeUtileFineAnno,
            CAST(CASE WHEN ISNULL(v.RicavoFineCommessa, 0) = 0 THEN NULL ELSE 1 - ((ISNULL(v.CostoPersonaleFineCommessa, 0) + ISNULL(v.AcquistiFineCommessa, 0)) / v.RicavoFineCommessa) END AS DECIMAL(18, 6)) AS PercentualeUtileFineCommessa,

            CAST(CASE WHEN ISNULL(v.OreLavorateFineMesePrecedente, 0) = 0 THEN NULL ELSE 8 * v.RicavoFineMesePrecedente / v.OreLavorateFineMesePrecedente END AS DECIMAL(18, 6)) AS SpcMFineMesePrecedente,
            CAST(CASE WHEN ISNULL(v.OreLavorateFineAnno, 0) = 0 THEN NULL ELSE 8 * v.RicavoFineAnno / v.OreLavorateFineAnno END AS DECIMAL(18, 6)) AS SpcMFineAnno,
            CAST(CASE WHEN ISNULL(v.OreLavorateFineCommessa, 0) = 0 THEN NULL ELSE 8 * v.RicavoFineCommessa / v.OreLavorateFineCommessa END AS DECIMAL(18, 6)) AS SpcMFineCommessa
        FROM Valori v
    )
    SELECT *
    INTO #Indicatori
    FROM Indicatori
    WHERE
        ISNULL(OrePrevisteFineMesePrecedente, 0) <> 0
        OR ISNULL(OrePrevisteFineAnno, 0) <> 0
        OR ISNULL(OrePrevisteFineCommessa, 0) <> 0
        OR ISNULL(OreLavorateFineMesePrecedente, 0) <> 0
        OR ISNULL(OreLavorateFineAnno, 0) <> 0
        OR ISNULL(OreLavorateFineCommessa, 0) <> 0
        OR ISNULL(RicavoFineMesePrecedente, 0) <> 0
        OR ISNULL(RicavoFineAnno, 0) <> 0
        OR ISNULL(RicavoFineCommessa, 0) <> 0
        OR ISNULL(MaturatoNonFatturatoFineMesePrecedente, 0) <> 0
        OR ISNULL(CostoPersonaleFineMesePrecedente, 0) <> 0
        OR ISNULL(CostoPersonaleFineAnno, 0) <> 0
        OR ISNULL(CostoPersonaleFineCommessa, 0) <> 0
        OR ISNULL(AcquistiFineMesePrecedente, 0) <> 0
        OR ISNULL(AcquistiFineAnno, 0) <> 0
        OR ISNULL(AcquistiFineCommessa, 0) <> 0
        OR ISNULL(UtileFineMesePrecedente, 0) <> 0
        OR ISNULL(UtileFineAnno, 0) <> 0
        OR ISNULL(UtileFineCommessa, 0) <> 0
        OR ISNULL(SovrapercentualeFineMesePrecedente, 0) <> 0
        OR ISNULL(SovrapercentualeFineAnno, 0) <> 0
        OR ISNULL(SovrapercentualeFineCommessa, 0) <> 0
        OR ISNULL(PercentualeUtileFineMesePrecedente, 0) <> 0
        OR ISNULL(PercentualeUtileFineAnno, 0) <> 0
        OR ISNULL(PercentualeUtileFineCommessa, 0) <> 0
        OR ISNULL(SpcMFineMesePrecedente, 0) <> 0
        OR ISNULL(SpcMFineAnno, 0) <> 0
        OR ISNULL(SpcMFineCommessa, 0) <> 0;

    DELETE t
    FROM cdg.CdgAnalisiIndicatoriCommesse t
    INNER JOIN dbo.cdg_qryComessaPmRcc q
        ON q.idcommessa = t.IdCommessa
    WHERE t.DataRiferimento = @FineMesePrecedente
      AND t.TipologiaCalcolo = N'TM'
      AND ISNULL(q.tm, 0) = 1
      AND UPPER(LTRIM(RTRIM(ISNULL(q.stato, N'')))) = N'T'
      AND q.DATA_CHIU IS NOT NULL
      AND CAST(q.DATA_CHIU AS DATE) < @SogliaDataChiusura
      AND NOT EXISTS
      (
            SELECT 1
            FROM #Indicatori i
            WHERE i.IdCommessa = t.IdCommessa
              AND i.DataRiferimento = t.DataRiferimento
              AND i.TipologiaCalcolo = t.TipologiaCalcolo
      );

    IF ISNULL(@Sostituisci, 1) = 1
    BEGIN
        TRUNCATE TABLE cdg.CdgAnalisiIndicatoriCommesse;
    END;

    INSERT INTO cdg.CdgAnalisiIndicatoriCommesse
    (
        DataRiferimento,
        IdCommessa,
        TipologiaCalcolo,
        OrePrevisteFineMesePrecedente,
        OrePrevisteFineAnno,
        OrePrevisteFineCommessa,
        OreLavorateFineMesePrecedente,
        OreLavorateFineAnno,
        OreLavorateFineCommessa,
        SovrapercentualeFineMesePrecedente,
        SovrapercentualeFineAnno,
        SovrapercentualeFineCommessa,
        RicavoFineMesePrecedente,
        RicavoFineAnno,
        RicavoFineCommessa,
        MaturatoNonFatturatoFineMesePrecedente,
        CostoPersonaleFineMesePrecedente,
        CostoPersonaleFineAnno,
        CostoPersonaleFineCommessa,
        AcquistiFineMesePrecedente,
        AcquistiFineAnno,
        AcquistiFineCommessa,
        UtileFineMesePrecedente,
        UtileFineAnno,
        UtileFineCommessa,
        PercentualeUtileFineMesePrecedente,
        PercentualeUtileFineAnno,
        PercentualeUtileFineCommessa,
        SpcMFineMesePrecedente,
        SpcMFineAnno,
        SpcMFineCommessa
    )
    SELECT
        i.DataRiferimento,
        i.IdCommessa,
        i.TipologiaCalcolo,
        i.OrePrevisteFineMesePrecedente,
        i.OrePrevisteFineAnno,
        i.OrePrevisteFineCommessa,
        i.OreLavorateFineMesePrecedente,
        i.OreLavorateFineAnno,
        i.OreLavorateFineCommessa,
        i.SovrapercentualeFineMesePrecedente,
        i.SovrapercentualeFineAnno,
        i.SovrapercentualeFineCommessa,
        i.RicavoFineMesePrecedente,
        i.RicavoFineAnno,
        i.RicavoFineCommessa,
        i.MaturatoNonFatturatoFineMesePrecedente,
        i.CostoPersonaleFineMesePrecedente,
        i.CostoPersonaleFineAnno,
        i.CostoPersonaleFineCommessa,
        i.AcquistiFineMesePrecedente,
        i.AcquistiFineAnno,
        i.AcquistiFineCommessa,
        i.UtileFineMesePrecedente,
        i.UtileFineAnno,
        i.UtileFineCommessa,
        i.PercentualeUtileFineMesePrecedente,
        i.PercentualeUtileFineAnno,
        i.PercentualeUtileFineCommessa,
        i.SpcMFineMesePrecedente,
        i.SpcMFineAnno,
        i.SpcMFineCommessa
    FROM #Indicatori i
    WHERE ISNULL(@Sostituisci, 1) = 1
       OR NOT EXISTS
       (
            SELECT 1
            FROM cdg.CdgAnalisiIndicatoriCommesse t
            WHERE t.IdCommessa = i.IdCommessa
              AND t.DataRiferimento = i.DataRiferimento
              AND t.TipologiaCalcolo = i.TipologiaCalcolo
       );

    SELECT
        @@ROWCOUNT AS RigheInserite,
        @FineMesePrecedente AS DataRiferimento,
        N'TM' AS TipologiaCalcolo;
END
GO

IF OBJECT_ID('cdg.spAlimentaIndicatoriCommesseNonTm', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE cdg.spAlimentaIndicatoriCommesseNonTm AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE cdg.spAlimentaIndicatoriCommesseNonTm
    @DataRiferimento DATE = NULL,
    @IdCommessa INT = NULL,
    @Sostituisci BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FineMesePrecedente DATE =
        CASE
            WHEN @DataRiferimento IS NOT NULL THEN EOMONTH(@DataRiferimento)
            WHEN DAY(GETDATE()) <= 15 THEN EOMONTH(GETDATE(), -2)
            ELSE EOMONTH(GETDATE(), -1)
        END;

    DECLARE @AnnoRiferimento INT = YEAR(@FineMesePrecedente);
    DECLARE @MeseRiferimento INT = MONTH(@FineMesePrecedente);
    DECLARE @SogliaDataChiusura DATE = CONVERT(DATE, '20200101', 112);
    DECLARE @InizioAnnoRiferimento DATE = DATEFROMPARTS(@AnnoRiferimento, 1, 1);

    ;WITH AnagraficaOrdinata AS
    (
        SELECT
            CAST(q.idcommessa AS INT) AS IdCommessa,
            CAST(UPPER(LTRIM(RTRIM(ISNULL(q.stato, N'')))) AS NVARCHAR(32)) AS Stato,
            CAST(q.DATA_CHIU AS DATE) AS DataChiusura,
            ROW_NUMBER() OVER (
                PARTITION BY q.idcommessa
                ORDER BY q.data_commessa DESC, q.COMMESSA
            ) AS rn
        FROM dbo.cdg_qryComessaPmRcc q
        WHERE ISNULL(q.tm, 0) = 0
          AND UPPER(LTRIM(RTRIM(ISNULL(q.stato, N'')))) IN (N'O', N'T')
          AND UPPER(LTRIM(RTRIM(ISNULL(q.macrotipologia, N'')))) IN (
                N'INNOVAZIONE, INVESTIMENTI E RICERCA',
                N'PRODUZIONE'
          )
          AND q.data_commessa IS NOT NULL
          AND CAST(q.data_commessa AS DATE) <= @FineMesePrecedente
          AND (@IdCommessa IS NULL OR q.idcommessa = @IdCommessa)
    ),
    Anagrafica AS
    (
        SELECT
            a.IdCommessa,
            a.Stato,
            a.DataChiusura,
            CAST(
                CASE
                    WHEN a.Stato = N'T'
                     AND a.DataChiusura IS NOT NULL
                     AND a.DataChiusura < @InizioAnnoRiferimento
                        THEN 1
                    ELSE 0
                END
                AS BIT
            ) AS SoloFineCommessa
        FROM AnagraficaOrdinata a
        WHERE a.rn = 1
          AND NOT (
                a.Stato = N'T'
            AND a.DataChiusura IS NOT NULL
            AND a.DataChiusura < @SogliaDataChiusura
          )
    ),
    OrePreviste AS
    (
        SELECT
            rpc.idCommessa AS IdCommessa,
            SUM(ISNULL(CAST(rpc.DurataPrevista AS DECIMAL(18, 2)), 0)) AS OrePreviste
        FROM dbo.RequisitiPerCommessa rpc
        GROUP BY rpc.idCommessa
    ),
    AnnualePrecedente AS
    (
        SELECT
            ac.idCommessa AS IdCommessa,
            SUM(ISNULL(ac.[Fatturato], 0)) AS Ricavo,
            SUM(ISNULL(ac.[Ore Lavorate], 0)) AS OreLavorate,
            SUM(ISNULL(ac.[Costo Ore Lavorate], 0)) AS CostoPersonale,
            SUM(ISNULL(ac.[Acquisti], 0)) AS Acquisti,
            SUM(ISNULL(ac.[Utile specifico], 0)) AS Utile
        FROM cdg.CdgAnalisiCommesse ac
        WHERE CAST(ac.[Anno Competenza] AS INT) < @AnnoRiferimento
        GROUP BY ac.idCommessa
    ),
    MensileAnnoCorrente AS
    (
        SELECT
            m.idCommessa AS IdCommessa,
            SUM(ISNULL(m.[Fatturato], 0)) AS Ricavo,
            SUM(ISNULL(m.[Ore Lavorate], 0)) AS OreLavorate,
            SUM(ISNULL(m.[Costo Ore Lavorate], 0)) AS CostoPersonale,
            SUM(ISNULL(m.[Acquisti], 0)) AS Acquisti,
            SUM(ISNULL(m.[Utile specifico], 0)) AS Utile
        FROM cdg.CdgAnalisiCommesseMensile m
        WHERE CAST(m.[Anno Competenza] AS INT) = @AnnoRiferimento
          AND CAST(m.[Mese Competenza] AS INT) <= @MeseRiferimento
        GROUP BY m.idCommessa
    ),
    UltimoMese AS
    (
        SELECT
            m.idCommessa AS IdCommessa,
            SUM(ISNULL(m.RicaviMaturati, 0)) AS MaturatoNonFatturato,
            SUM(ISNULL(m.OreFuture, 0)) AS OreFuture,
            SUM(ISNULL(m.CostoPersonaleFuturo, 0)) AS CostoPersonaleFuturo
        FROM cdg.CdgAnalisiCommesseMensile m
        WHERE CAST(m.[Anno Competenza] AS INT) = @AnnoRiferimento
          AND CAST(m.[Mese Competenza] AS INT) = @MeseRiferimento
        GROUP BY m.idCommessa
    ),
    FineMese AS
    (
        SELECT
            a.IdCommessa,
            ISNULL(op.OrePreviste, 0) - ISNULL(um.OreFuture, 0) AS OrePreviste,
            ISNULL(ap.Ricavo, 0) + ISNULL(mc.Ricavo, 0) AS Ricavo,
            ISNULL(ap.OreLavorate, 0) + ISNULL(mc.OreLavorate, 0) AS OreLavorate,
            ISNULL(ap.CostoPersonale, 0) + ISNULL(mc.CostoPersonale, 0) AS CostoPersonale,
            ISNULL(ap.Acquisti, 0) + ISNULL(mc.Acquisti, 0) AS Acquisti,
            ISNULL(ap.Utile, 0) + ISNULL(mc.Utile, 0) AS Utile,
            ISNULL(um.MaturatoNonFatturato, 0) AS MaturatoNonFatturato
        FROM Anagrafica a
        LEFT JOIN OrePreviste op
            ON op.IdCommessa = a.IdCommessa
        LEFT JOIN AnnualePrecedente ap
            ON ap.IdCommessa = a.IdCommessa
        LEFT JOIN MensileAnnoCorrente mc
            ON mc.IdCommessa = a.IdCommessa
        LEFT JOIN UltimoMese um
            ON um.IdCommessa = a.IdCommessa
    ),
    AnnualeCorrente AS
    (
        SELECT
            ac.idCommessa AS IdCommessa,
            SUM(ISNULL(ac.[Fatturato], 0) + ISNULL(ac.[Fatturato Ancora Previsto], 0)) AS Ricavo,
            SUM(ISNULL(ac.[Acquisti], 0) + ISNULL(ac.[Acquisti Ancora Previsto], 0)) AS Acquisti
        FROM cdg.CdgAnalisiCommesse ac
        WHERE CAST(ac.[Anno Competenza] AS INT) = @AnnoRiferimento
        GROUP BY ac.idCommessa
    ),
    AnnualeTuttiAnni AS
    (
        SELECT
            ac.idCommessa AS IdCommessa,
            SUM(ISNULL(ac.[Fatturato], 0) + ISNULL(ac.[Fatturato Ancora Previsto], 0)) AS Ricavo,
            SUM(ISNULL(ac.[Acquisti], 0) + ISNULL(ac.[Acquisti Ancora Previsto], 0)) AS Acquisti
        FROM cdg.CdgAnalisiCommesse ac
        GROUP BY ac.idCommessa
    ),
    FineCommessa AS
    (
        SELECT
            a.IdCommessa,
            ISNULL(op.OrePreviste, 0) AS OrePreviste,
            ISNULL(fm.OreLavorate, 0) + ISNULL(um.OreFuture, 0) AS OreLavorate,
            ISNULL(ata.Ricavo, 0) AS Ricavo,
            ISNULL(fm.CostoPersonale, 0) + ISNULL(um.CostoPersonaleFuturo, 0) AS CostoPersonale,
            ISNULL(ata.Acquisti, 0) AS Acquisti,
            ISNULL(ata.Ricavo, 0) - (ISNULL(fm.CostoPersonale, 0) + ISNULL(um.CostoPersonaleFuturo, 0)) - ISNULL(ata.Acquisti, 0) AS Utile
        FROM Anagrafica a
        LEFT JOIN OrePreviste op
            ON op.IdCommessa = a.IdCommessa
        LEFT JOIN FineMese fm
            ON fm.IdCommessa = a.IdCommessa
        LEFT JOIN UltimoMese um
            ON um.IdCommessa = a.IdCommessa
        LEFT JOIN AnnualeTuttiAnni ata
            ON ata.IdCommessa = a.IdCommessa
    ),
    Valori AS
    (
        SELECT
            @FineMesePrecedente AS DataRiferimento,
            a.IdCommessa,
            CAST(N'NON_TM' AS NVARCHAR(32)) AS TipologiaCalcolo,

            CAST(CASE WHEN a.SoloFineCommessa = 1 THEN NULL ELSE fm.OrePreviste END AS DECIMAL(18, 2)) AS OrePrevisteFineMesePrecedente,
            CAST(NULL AS DECIMAL(18, 2)) AS OrePrevisteFineAnno,
            CAST(fc.OrePreviste AS DECIMAL(18, 2)) AS OrePrevisteFineCommessa,

            CAST(CASE WHEN a.SoloFineCommessa = 1 THEN NULL ELSE fm.OreLavorate END AS DECIMAL(18, 2)) AS OreLavorateFineMesePrecedente,
            CAST(NULL AS DECIMAL(18, 2)) AS OreLavorateFineAnno,
            CAST(fc.OreLavorate AS DECIMAL(18, 2)) AS OreLavorateFineCommessa,

            CAST(CASE WHEN a.SoloFineCommessa = 1 THEN NULL ELSE fm.Ricavo END AS DECIMAL(18, 2)) AS RicavoFineMesePrecedente,
            CAST(CASE WHEN a.SoloFineCommessa = 1 THEN NULL ELSE ac.Ricavo END AS DECIMAL(18, 2)) AS RicavoFineAnno,
            CAST(fc.Ricavo AS DECIMAL(18, 2)) AS RicavoFineCommessa,

            CAST(CASE WHEN a.SoloFineCommessa = 1 THEN NULL ELSE fm.MaturatoNonFatturato END AS DECIMAL(18, 2)) AS MaturatoNonFatturatoFineMesePrecedente,

            CAST(CASE WHEN a.SoloFineCommessa = 1 THEN NULL ELSE fm.CostoPersonale END AS DECIMAL(18, 2)) AS CostoPersonaleFineMesePrecedente,
            CAST(NULL AS DECIMAL(18, 2)) AS CostoPersonaleFineAnno,
            CAST(fc.CostoPersonale AS DECIMAL(18, 2)) AS CostoPersonaleFineCommessa,

            CAST(CASE WHEN a.SoloFineCommessa = 1 THEN NULL ELSE fm.Acquisti END AS DECIMAL(18, 2)) AS AcquistiFineMesePrecedente,
            CAST(CASE WHEN a.SoloFineCommessa = 1 THEN NULL ELSE ac.Acquisti END AS DECIMAL(18, 2)) AS AcquistiFineAnno,
            CAST(fc.Acquisti AS DECIMAL(18, 2)) AS AcquistiFineCommessa,

            CAST(CASE WHEN a.SoloFineCommessa = 1 THEN NULL ELSE fm.Utile END AS DECIMAL(18, 2)) AS UtileFineMesePrecedente,
            CAST(NULL AS DECIMAL(18, 2)) AS UtileFineAnno,
            CAST(fc.Utile AS DECIMAL(18, 2)) AS UtileFineCommessa
        FROM Anagrafica a
        LEFT JOIN FineMese fm
            ON fm.IdCommessa = a.IdCommessa
        LEFT JOIN AnnualeCorrente ac
            ON ac.IdCommessa = a.IdCommessa
        LEFT JOIN FineCommessa fc
            ON fc.IdCommessa = a.IdCommessa
    ),
    Indicatori AS
    (
        SELECT
            v.*,
            CAST(CASE WHEN ISNULL(v.OrePrevisteFineMesePrecedente, 0) = 0 THEN NULL ELSE v.OreLavorateFineMesePrecedente / v.OrePrevisteFineMesePrecedente END AS DECIMAL(18, 6)) AS SovrapercentualeFineMesePrecedente,
            CAST(NULL AS DECIMAL(18, 6)) AS SovrapercentualeFineAnno,
            CAST(CASE WHEN ISNULL(v.OrePrevisteFineCommessa, 0) = 0 THEN NULL ELSE v.OreLavorateFineCommessa / v.OrePrevisteFineCommessa END AS DECIMAL(18, 6)) AS SovrapercentualeFineCommessa,

            CAST(CASE WHEN ISNULL(v.RicavoFineMesePrecedente, 0) = 0 THEN NULL ELSE 1 - ((ISNULL(v.CostoPersonaleFineMesePrecedente, 0) + ISNULL(v.AcquistiFineMesePrecedente, 0)) / v.RicavoFineMesePrecedente) END AS DECIMAL(18, 6)) AS PercentualeUtileFineMesePrecedente,
            CAST(NULL AS DECIMAL(18, 6)) AS PercentualeUtileFineAnno,
            CAST(CASE WHEN ISNULL(v.RicavoFineCommessa, 0) = 0 THEN NULL ELSE 1 - ((ISNULL(v.CostoPersonaleFineCommessa, 0) + ISNULL(v.AcquistiFineCommessa, 0)) / v.RicavoFineCommessa) END AS DECIMAL(18, 6)) AS PercentualeUtileFineCommessa,

            CAST(CASE WHEN ISNULL(v.OreLavorateFineMesePrecedente, 0) = 0 THEN NULL ELSE 8 * v.RicavoFineMesePrecedente / v.OreLavorateFineMesePrecedente END AS DECIMAL(18, 6)) AS SpcMFineMesePrecedente,
            CAST(NULL AS DECIMAL(18, 6)) AS SpcMFineAnno,
            CAST(CASE WHEN ISNULL(v.OreLavorateFineCommessa, 0) = 0 THEN NULL ELSE 8 * v.RicavoFineCommessa / v.OreLavorateFineCommessa END AS DECIMAL(18, 6)) AS SpcMFineCommessa
        FROM Valori v
    )
    SELECT *
    INTO #IndicatoriNonTm
    FROM Indicatori
    WHERE
        ISNULL(OrePrevisteFineMesePrecedente, 0) <> 0
        OR ISNULL(OrePrevisteFineAnno, 0) <> 0
        OR ISNULL(OrePrevisteFineCommessa, 0) <> 0
        OR ISNULL(OreLavorateFineMesePrecedente, 0) <> 0
        OR ISNULL(OreLavorateFineAnno, 0) <> 0
        OR ISNULL(OreLavorateFineCommessa, 0) <> 0
        OR ISNULL(RicavoFineMesePrecedente, 0) <> 0
        OR ISNULL(RicavoFineAnno, 0) <> 0
        OR ISNULL(RicavoFineCommessa, 0) <> 0
        OR ISNULL(MaturatoNonFatturatoFineMesePrecedente, 0) <> 0
        OR ISNULL(CostoPersonaleFineMesePrecedente, 0) <> 0
        OR ISNULL(CostoPersonaleFineAnno, 0) <> 0
        OR ISNULL(CostoPersonaleFineCommessa, 0) <> 0
        OR ISNULL(AcquistiFineMesePrecedente, 0) <> 0
        OR ISNULL(AcquistiFineAnno, 0) <> 0
        OR ISNULL(AcquistiFineCommessa, 0) <> 0
        OR ISNULL(UtileFineMesePrecedente, 0) <> 0
        OR ISNULL(UtileFineAnno, 0) <> 0
        OR ISNULL(UtileFineCommessa, 0) <> 0
        OR ISNULL(SovrapercentualeFineMesePrecedente, 0) <> 0
        OR ISNULL(SovrapercentualeFineAnno, 0) <> 0
        OR ISNULL(SovrapercentualeFineCommessa, 0) <> 0
        OR ISNULL(PercentualeUtileFineMesePrecedente, 0) <> 0
        OR ISNULL(PercentualeUtileFineAnno, 0) <> 0
        OR ISNULL(PercentualeUtileFineCommessa, 0) <> 0
        OR ISNULL(SpcMFineMesePrecedente, 0) <> 0
        OR ISNULL(SpcMFineAnno, 0) <> 0
        OR ISNULL(SpcMFineCommessa, 0) <> 0;

    IF ISNULL(@Sostituisci, 1) = 1
    BEGIN
        TRUNCATE TABLE cdg.CdgAnalisiIndicatoriCommesse;
    END;

    INSERT INTO cdg.CdgAnalisiIndicatoriCommesse
    (
        DataRiferimento,
        IdCommessa,
        TipologiaCalcolo,
        OrePrevisteFineMesePrecedente,
        OrePrevisteFineAnno,
        OrePrevisteFineCommessa,
        OreLavorateFineMesePrecedente,
        OreLavorateFineAnno,
        OreLavorateFineCommessa,
        SovrapercentualeFineMesePrecedente,
        SovrapercentualeFineAnno,
        SovrapercentualeFineCommessa,
        RicavoFineMesePrecedente,
        RicavoFineAnno,
        RicavoFineCommessa,
        MaturatoNonFatturatoFineMesePrecedente,
        CostoPersonaleFineMesePrecedente,
        CostoPersonaleFineAnno,
        CostoPersonaleFineCommessa,
        AcquistiFineMesePrecedente,
        AcquistiFineAnno,
        AcquistiFineCommessa,
        UtileFineMesePrecedente,
        UtileFineAnno,
        UtileFineCommessa,
        PercentualeUtileFineMesePrecedente,
        PercentualeUtileFineAnno,
        PercentualeUtileFineCommessa,
        SpcMFineMesePrecedente,
        SpcMFineAnno,
        SpcMFineCommessa
    )
    SELECT
        i.DataRiferimento,
        i.IdCommessa,
        i.TipologiaCalcolo,
        i.OrePrevisteFineMesePrecedente,
        i.OrePrevisteFineAnno,
        i.OrePrevisteFineCommessa,
        i.OreLavorateFineMesePrecedente,
        i.OreLavorateFineAnno,
        i.OreLavorateFineCommessa,
        i.SovrapercentualeFineMesePrecedente,
        i.SovrapercentualeFineAnno,
        i.SovrapercentualeFineCommessa,
        i.RicavoFineMesePrecedente,
        i.RicavoFineAnno,
        i.RicavoFineCommessa,
        i.MaturatoNonFatturatoFineMesePrecedente,
        i.CostoPersonaleFineMesePrecedente,
        i.CostoPersonaleFineAnno,
        i.CostoPersonaleFineCommessa,
        i.AcquistiFineMesePrecedente,
        i.AcquistiFineAnno,
        i.AcquistiFineCommessa,
        i.UtileFineMesePrecedente,
        i.UtileFineAnno,
        i.UtileFineCommessa,
        i.PercentualeUtileFineMesePrecedente,
        i.PercentualeUtileFineAnno,
        i.PercentualeUtileFineCommessa,
        i.SpcMFineMesePrecedente,
        i.SpcMFineAnno,
        i.SpcMFineCommessa
    FROM #IndicatoriNonTm i
    WHERE ISNULL(@Sostituisci, 1) = 1
       OR NOT EXISTS
       (
            SELECT 1
            FROM cdg.CdgAnalisiIndicatoriCommesse t
            WHERE t.IdCommessa = i.IdCommessa
              AND t.DataRiferimento = i.DataRiferimento
              AND t.TipologiaCalcolo = i.TipologiaCalcolo
       );

    SELECT
        @@ROWCOUNT AS RigheInserite,
        @FineMesePrecedente AS DataRiferimento,
        N'NON_TM' AS TipologiaCalcolo;
END
GO

IF OBJECT_ID('cdg.spAlimentaIndicatoriCommesse', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE cdg.spAlimentaIndicatoriCommesse AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE cdg.spAlimentaIndicatoriCommesse
    @DataRiferimento DATE = NULL,
    @IdCommessa INT = NULL,
    @Sostituisci BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF ISNULL(@Sostituisci, 1) = 1
    BEGIN
        TRUNCATE TABLE cdg.CdgAnalisiIndicatoriCommesse;
    END;

    DECLARE @Risultati TABLE
    (
        RigheInserite INT NOT NULL,
        DataRiferimento DATE NOT NULL,
        TipologiaCalcolo NVARCHAR(32) NOT NULL
    );

    INSERT INTO @Risultati
    EXEC cdg.spAlimentaIndicatoriCommesseTm
        @DataRiferimento = @DataRiferimento,
        @IdCommessa = @IdCommessa,
        @Sostituisci = 0;

    INSERT INTO @Risultati
    EXEC cdg.spAlimentaIndicatoriCommesseNonTm
        @DataRiferimento = @DataRiferimento,
        @IdCommessa = @IdCommessa,
        @Sostituisci = 0;

    SELECT
        RigheInserite,
        DataRiferimento,
        TipologiaCalcolo
    FROM @Risultati
    ORDER BY TipologiaCalcolo;
END
GO


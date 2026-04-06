/*
    Stored procedure di profilazione ruoli applicativi
    Schema: produzione
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spIndividuaRuoli', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spIndividuaRuoli @IdRisorsa INT AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spIndividuaRuoli
    @IdRisorsa INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Today DATE = CAST(GETDATE() AS DATE);

    ;WITH RuoliAttivi AS
    (
        SELECT DISTINCT
            UPPER(LTRIM(RTRIM(tr.NomeRuolo))) AS NomeRuolo
        FROM dbo.RuoliAziendaliRisorse rar
        INNER JOIN dbo.TipiRuolo tr
            ON tr.ID = rar.IdRuolo
        WHERE rar.IdRisorsa = @IdRisorsa
          AND (rar.dataInizio IS NULL OR CAST(rar.dataInizio AS DATE) <= @Today)
          AND (rar.dataFine IS NULL OR CAST(rar.dataFine AS DATE) >= @Today)
    ),
    LimitiAziendali AS
    (
        SELECT DISTINCT
            s.codice AS CodiceSocieta
        FROM dbo.RisorseSocietaOperativitaRuoliAssoluti rs
        LEFT JOIN dbo.societa s
            ON s.id = rs.idSocieta
        WHERE rs.IdRisorsa = @IdRisorsa
    ),
    ModalitaLimite AS
    (
        SELECT
            CASE
                WHEN EXISTS (SELECT 1 FROM LimitiAziendali WHERE CodiceSocieta IS NULL) THEN 1
                WHEN NOT EXISTS (SELECT 1 FROM LimitiAziendali WHERE CodiceSocieta IS NOT NULL) THEN 1
                ELSE 0
            END AS IsGenerale
    )
    SELECT DISTINCT
        q.Profilo,
        q.CodiceSocieta
    FROM
    (
        SELECT
            N'Supervisore' AS Profilo,
            CASE WHEN ml.IsGenerale = 1 THEN NULL ELSE la.CodiceSocieta END AS CodiceSocieta
        FROM RuoliAttivi ra
        CROSS JOIN ModalitaLimite ml
        LEFT JOIN LimitiAziendali la
            ON ml.IsGenerale = 0
           AND la.CodiceSocieta IS NOT NULL
        WHERE ra.NomeRuolo IN ('CDG', 'PRES')

        UNION ALL

        SELECT
            N'Responsabile Produzione' AS Profilo,
            CASE WHEN ml.IsGenerale = 1 THEN NULL ELSE la.CodiceSocieta END AS CodiceSocieta
        FROM RuoliAttivi ra
        CROSS JOIN ModalitaLimite ml
        LEFT JOIN LimitiAziendali la
            ON ml.IsGenerale = 0
           AND la.CodiceSocieta IS NOT NULL
        WHERE ra.NomeRuolo = 'RP'

        UNION ALL

        SELECT
            N'Responsabile Commerciale' AS Profilo,
            CASE WHEN ml.IsGenerale = 1 THEN NULL ELSE la.CodiceSocieta END AS CodiceSocieta
        FROM RuoliAttivi ra
        CROSS JOIN ModalitaLimite ml
        LEFT JOIN LimitiAziendali la
            ON ml.IsGenerale = 0
           AND la.CodiceSocieta IS NOT NULL
        WHERE ra.NomeRuolo = 'RC'

        UNION ALL

        SELECT
            N'Project Manager' AS Profilo,
            CASE WHEN ml.IsGenerale = 1 THEN NULL ELSE la.CodiceSocieta END AS CodiceSocieta
        FROM RuoliAttivi ra
        CROSS JOIN ModalitaLimite ml
        LEFT JOIN LimitiAziendali la
            ON ml.IsGenerale = 0
           AND la.CodiceSocieta IS NOT NULL
        WHERE ra.NomeRuolo = 'PM'

        UNION ALL

        SELECT
            N'Responsabile Commerciale Commessa' AS Profilo,
            CASE WHEN ml.IsGenerale = 1 THEN NULL ELSE la.CodiceSocieta END AS CodiceSocieta
        FROM RuoliAttivi ra
        CROSS JOIN ModalitaLimite ml
        LEFT JOIN LimitiAziendali la
            ON ml.IsGenerale = 0
           AND la.CodiceSocieta IS NOT NULL
        WHERE ra.NomeRuolo = 'RCC'

        UNION ALL

        SELECT
            N'General Project Manager' AS Profilo,
            CASE WHEN ml.IsGenerale = 1 THEN NULL ELSE la.CodiceSocieta END AS CodiceSocieta
        FROM RuoliAttivi ra
        CROSS JOIN ModalitaLimite ml
        LEFT JOIN LimitiAziendali la
            ON ml.IsGenerale = 0
           AND la.CodiceSocieta IS NOT NULL
        WHERE ra.NomeRuolo = 'GPM'

        UNION ALL

        SELECT
            N'Risorse Umane' AS Profilo,
            CASE WHEN ml.IsGenerale = 1 THEN NULL ELSE la.CodiceSocieta END AS CodiceSocieta
        FROM RuoliAttivi ra
        CROSS JOIN ModalitaLimite ml
        LEFT JOIN LimitiAziendali la
            ON ml.IsGenerale = 0
           AND la.CodiceSocieta IS NOT NULL
        WHERE ra.NomeRuolo = 'HR'
    ) q
    ORDER BY q.Profilo, q.CodiceSocieta;
END
GO

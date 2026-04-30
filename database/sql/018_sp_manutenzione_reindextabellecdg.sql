IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'manutenzione')
BEGIN
    EXEC('CREATE SCHEMA manutenzione AUTHORIZATION dbo;');
END
GO

IF OBJECT_ID('manutenzione.sp_reindextabellecdg','P') IS NOT NULL
    DROP PROCEDURE manutenzione.sp_reindextabellecdg;
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE manutenzione.sp_reindextabellecdg
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET ANSI_NULLS ON;
    SET ANSI_PADDING ON;
    SET ANSI_WARNINGS ON;
    SET ARITHABORT ON;
    SET CONCAT_NULL_YIELDS_NULL ON;
    SET QUOTED_IDENTIFIER ON;
    SET NUMERIC_ROUNDABORT OFF;

    DECLARE @Tabelle TABLE
    (
        Id int IDENTITY(1,1) NOT NULL PRIMARY KEY,
        SchemaName sysname NOT NULL,
        TableName sysname NOT NULL,
        ObjectId int NULL
    );

    INSERT INTO @Tabelle (SchemaName, TableName, ObjectId)
    VALUES
        ('CDG', 'CDG_IncrocioContabilitaIntranet', OBJECT_ID('CDG.CDG_IncrocioContabilitaIntranet')),
        ('CDG', 'CdgAnalisiCommesse', OBJECT_ID('CDG.CdgAnalisiCommesse')),
        ('CDG', 'CdgAnalisiCommesseMensile', OBJECT_ID('CDG.CdgAnalisiCommesseMensile')),
        ('CDG', 'CdgFatturePassive', OBJECT_ID('CDG.CdgFatturePassive')),
        ('CDG', 'CdgFattureAttive', OBJECT_ID('CDG.CdgFattureAttive')),
        ('CDG', 'CdgSintesiAnnualeAttivitaRisorse', OBJECT_ID('CDG.CdgSintesiAnnualeAttivitaRisorse')),
        ('CDG', 'CdgSintesiMensileAttivitaRisorse', OBJECT_ID('CDG.CdgSintesiMensileAttivitaRisorse')),
        ('CDG', 'CdgSintesiAnnualeAttivitaRisorsePerProdotto', OBJECT_ID('CDG.CdgSintesiAnnualeAttivitaRisorsePerProdotto'));

    DECLARE @Report TABLE
    (
        Fase varchar(10) NOT NULL,
        SchemaName sysname NOT NULL,
        TableName sysname NOT NULL,
        IndexName sysname NULL,
        PageCount int NULL,
        FragPct decimal(8,2) NULL,
        StatsDate datetime NULL,
        Azione varchar(30) NULL,
        Messaggio nvarchar(4000) NULL
    );

    INSERT INTO @Report (Fase, SchemaName, TableName, IndexName, PageCount, FragPct, StatsDate, Azione, Messaggio)
    SELECT
        'PRE',
        t.SchemaName,
        t.TableName,
        i.name,
        ips.page_count,
        CAST(ips.avg_fragmentation_in_percent AS decimal(8,2)),
        STATS_DATE(i.object_id, i.index_id),
        NULL,
        NULL
    FROM @Tabelle t
    JOIN sys.indexes i
        ON i.object_id = t.ObjectId
       AND i.index_id > 0
       AND i.is_disabled = 0
       AND i.is_hypothetical = 0
    OUTER APPLY sys.dm_db_index_physical_stats(DB_ID(), t.ObjectId, i.index_id, NULL, 'SAMPLED') ips
    WHERE t.ObjectId IS NOT NULL;

    INSERT INTO @Report (Fase, SchemaName, TableName, Messaggio)
    SELECT 'PRE', SchemaName, TableName, 'Tabella non trovata'
    FROM @Tabelle
    WHERE ObjectId IS NULL;

    DECLARE
        @SchemaName sysname,
        @TableName sysname,
        @ObjectId int,
        @IndexName sysname,
        @IndexId int,
        @PageCount int,
        @FragPct decimal(8,2),
        @Sql nvarchar(max),
        @Azione varchar(30);

    DECLARE index_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT
            t.SchemaName,
            t.TableName,
            t.ObjectId,
            i.name,
            i.index_id,
            ISNULL(ips.page_count, 0) AS page_count,
            ISNULL(CAST(ips.avg_fragmentation_in_percent AS decimal(8,2)), 0) AS frag_pct
        FROM @Tabelle t
        JOIN sys.indexes i
            ON i.object_id = t.ObjectId
           AND i.index_id > 0
           AND i.is_disabled = 0
           AND i.is_hypothetical = 0
        OUTER APPLY sys.dm_db_index_physical_stats(DB_ID(), t.ObjectId, i.index_id, NULL, 'SAMPLED') ips
        WHERE t.ObjectId IS NOT NULL
        ORDER BY t.Id, i.index_id;

    OPEN index_cursor;
    FETCH NEXT FROM index_cursor INTO @SchemaName, @TableName, @ObjectId, @IndexName, @IndexId, @PageCount, @FragPct;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @Azione = NULL;

        IF @PageCount = 0
        BEGIN
            SET @Azione = 'SKIP_EMPTY';
        END
        ELSE IF @FragPct >= 30 OR @PageCount < 100
        BEGIN
            SET @Azione = 'REBUILD';
            SET @Sql = N'ALTER INDEX ' + QUOTENAME(@IndexName)
                + N' ON ' + QUOTENAME(@SchemaName) + N'.' + QUOTENAME(@TableName)
                + N' REBUILD WITH (SORT_IN_TEMPDB = ON, MAXDOP = 4);';
            EXEC sp_executesql @Sql;
        END
        ELSE IF @FragPct >= 5
        BEGIN
            SET @Azione = 'REORGANIZE';
            SET @Sql = N'ALTER INDEX ' + QUOTENAME(@IndexName)
                + N' ON ' + QUOTENAME(@SchemaName) + N'.' + QUOTENAME(@TableName)
                + N' REORGANIZE;';
            EXEC sp_executesql @Sql;
        END
        ELSE
        BEGIN
            SET @Azione = 'SKIP_OK';
        END

        INSERT INTO @Report (Fase, SchemaName, TableName, IndexName, PageCount, FragPct, Azione)
        VALUES ('WORK', @SchemaName, @TableName, @IndexName, @PageCount, @FragPct, @Azione);

        FETCH NEXT FROM index_cursor INTO @SchemaName, @TableName, @ObjectId, @IndexName, @IndexId, @PageCount, @FragPct;
    END

    CLOSE index_cursor;
    DEALLOCATE index_cursor;

    DECLARE table_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT SchemaName, TableName
        FROM @Tabelle
        WHERE ObjectId IS NOT NULL
        ORDER BY Id;

    OPEN table_cursor;
    FETCH NEXT FROM table_cursor INTO @SchemaName, @TableName;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @Sql = N'UPDATE STATISTICS ' + QUOTENAME(@SchemaName) + N'.' + QUOTENAME(@TableName) + N' WITH FULLSCAN;';
        EXEC sp_executesql @Sql;

        INSERT INTO @Report (Fase, SchemaName, TableName, Azione)
        VALUES ('WORK', @SchemaName, @TableName, 'UPDATE_STATISTICS_FULLSCAN');

        FETCH NEXT FROM table_cursor INTO @SchemaName, @TableName;
    END

    CLOSE table_cursor;
    DEALLOCATE table_cursor;

    INSERT INTO @Report (Fase, SchemaName, TableName, IndexName, PageCount, FragPct, StatsDate, Azione, Messaggio)
    SELECT
        'POST',
        t.SchemaName,
        t.TableName,
        i.name,
        ips.page_count,
        CAST(ips.avg_fragmentation_in_percent AS decimal(8,2)),
        STATS_DATE(i.object_id, i.index_id),
        NULL,
        NULL
    FROM @Tabelle t
    JOIN sys.indexes i
        ON i.object_id = t.ObjectId
       AND i.index_id > 0
       AND i.is_disabled = 0
       AND i.is_hypothetical = 0
    OUTER APPLY sys.dm_db_index_physical_stats(DB_ID(), t.ObjectId, i.index_id, NULL, 'SAMPLED') ips
    WHERE t.ObjectId IS NOT NULL;

    SELECT
        Fase,
        SchemaName,
        TableName,
        IndexName,
        PageCount,
        FragPct,
        StatsDate,
        Azione,
        Messaggio
    FROM @Report
    ORDER BY
        CASE Fase WHEN 'PRE' THEN 1 WHEN 'WORK' THEN 2 WHEN 'POST' THEN 3 ELSE 4 END,
        SchemaName,
        TableName,
        IndexName,
        Azione;
END
GO

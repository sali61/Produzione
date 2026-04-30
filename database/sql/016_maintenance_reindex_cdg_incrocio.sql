SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;

PRINT '=== PRE CHECK FRAMMENTAZIONE (CDG.CDG_IncrocioContabilitaIntranet) ===';
SELECT
    OBJECT_SCHEMA_NAME(ips.object_id) AS SchemaName,
    OBJECT_NAME(ips.object_id) AS TableName,
    i.name AS IndexName,
    ips.page_count,
    CAST(ips.avg_fragmentation_in_percent AS DECIMAL(6,2)) AS FragPct
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('CDG.CDG_IncrocioContabilitaIntranet'), NULL, NULL, 'SAMPLED') ips
JOIN sys.indexes i
    ON i.object_id = ips.object_id
   AND i.index_id = ips.index_id
WHERE ips.index_id > 0
ORDER BY FragPct DESC;

PRINT '=== REBUILD INDICI CRITICI ===';
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('CDG.CDG_IncrocioContabilitaIntranet') AND name = 'PK_IncrocioContabilitaIntranet')
BEGIN
    PRINT 'Rebuild PK_IncrocioContabilitaIntranet';
    ALTER INDEX [PK_IncrocioContabilitaIntranet] ON [CDG].[CDG_IncrocioContabilitaIntranet]
    REBUILD WITH (SORT_IN_TEMPDB = ON, MAXDOP = 4);
END;

IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('CDG.CDG_IncrocioContabilitaIntranet') AND name = 'IX_CDG_Incrocio_BudgetProposta_Filtered')
BEGIN
    PRINT 'Rebuild IX_CDG_Incrocio_BudgetProposta_Filtered';
    ALTER INDEX [IX_CDG_Incrocio_BudgetProposta_Filtered] ON [CDG].[CDG_IncrocioContabilitaIntranet]
    REBUILD WITH (SORT_IN_TEMPDB = ON, MAXDOP = 4);
END;

IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('CDG.CDG_IncrocioContabilitaIntranet') AND name = 'IX_CDG_Incrocio_BudgetSituazione_Mese')
BEGIN
    PRINT 'Rebuild IX_CDG_Incrocio_BudgetSituazione_Mese';
    ALTER INDEX [IX_CDG_Incrocio_BudgetSituazione_Mese] ON [CDG].[CDG_IncrocioContabilitaIntranet]
    REBUILD WITH (SORT_IN_TEMPDB = ON, MAXDOP = 4);
END;

PRINT '=== UPDATE STATISTICS FULLSCAN ===';
UPDATE STATISTICS [CDG].[CDG_IncrocioContabilitaIntranet] WITH FULLSCAN;

PRINT '=== POST CHECK FRAMMENTAZIONE (CDG.CDG_IncrocioContabilitaIntranet) ===';
SELECT
    OBJECT_SCHEMA_NAME(ips.object_id) AS SchemaName,
    OBJECT_NAME(ips.object_id) AS TableName,
    i.name AS IndexName,
    ips.page_count,
    CAST(ips.avg_fragmentation_in_percent AS DECIMAL(6,2)) AS FragPct,
    STATS_DATE(i.object_id, i.index_id) AS StatsDate
FROM sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('CDG.CDG_IncrocioContabilitaIntranet'), NULL, NULL, 'SAMPLED') ips
JOIN sys.indexes i
    ON i.object_id = ips.object_id
   AND i.index_id = ips.index_id
WHERE ips.index_id > 0
ORDER BY FragPct DESC;

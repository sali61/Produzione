IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'manutenzionedb')
BEGIN
    EXEC('CREATE SCHEMA manutenzionedb AUTHORIZATION dbo;');
END
GO

IF OBJECT_ID('manutenzionedb.sp_Reindex_CDG_IncrocioContabilitaIntranet','P') IS NOT NULL
    DROP PROCEDURE manutenzionedb.sp_Reindex_CDG_IncrocioContabilitaIntranet;
GO

SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE manutenzionedb.sp_Reindex_CDG_IncrocioContabilitaIntranet
AS
BEGIN
    SET NOCOUNT ON;

    ALTER INDEX [PK_IncrocioContabilitaIntranet]
    ON [CDG].[CDG_IncrocioContabilitaIntranet] REBUILD;

    EXEC sp_executesql N'
        SET ANSI_NULLS ON;
        SET ANSI_PADDING ON;
        SET ANSI_WARNINGS ON;
        SET ARITHABORT ON;
        SET CONCAT_NULL_YIELDS_NULL ON;
        SET QUOTED_IDENTIFIER ON;
        SET NUMERIC_ROUNDABORT OFF;
        ALTER INDEX [IX_CDG_Incrocio_BudgetProposta_Filtered]
        ON [CDG].[CDG_IncrocioContabilitaIntranet] REBUILD;
        ALTER INDEX [IX_CDG_Incrocio_BudgetSituazione_Mese]
        ON [CDG].[CDG_IncrocioContabilitaIntranet] REBUILD;
    ';

    UPDATE STATISTICS [CDG].[CDG_IncrocioContabilitaIntranet] WITH FULLSCAN;
END
GO

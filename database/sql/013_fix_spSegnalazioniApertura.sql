SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/*
  Correzione procedura apertura segnalazioni:
  - riferimento tabella commesse su schema corretto dbo (non produzione)
*/
DECLARE @ProcName SYSNAME = N'produzione.sp_ApriSegnalazioneCommessa';
DECLARE @Definition NVARCHAR(MAX) = OBJECT_DEFINITION(OBJECT_ID(@ProcName));

IF @Definition IS NULL
BEGIN
    RAISERROR(N'Procedura %s non trovata.', 16, 1, @ProcName);
    RETURN;
END;

SET @Definition = REPLACE(@Definition, N'CREATE PROCEDURE', N'ALTER PROCEDURE');
SET @Definition = REPLACE(@Definition, N'produzione.Commesse', N'dbo.commesse');

EXEC sp_executesql @Definition;
GO

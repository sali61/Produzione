/*
    Wrapper su stored CDG per mantenere il perimetro applicativo nello schema produzione.
    Non modifica la stored sorgente CDG.BIXeniaAnalisiCommesse.
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spBixeniaAnalisiCommesse', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spBixeniaAnalisiCommesse AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spBixeniaAnalisiCommesse
    @idrisorsa INT,
    @tiporicerca NVARCHAR(100),
    @FiltroDaApplicare NVARCHAR(MAX) = NULL,
    @CampoAggregazione NVARCHAR(256) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    EXEC [CDG].[BIXeniaAnalisiCommesse]
        @idrisorsa = @idrisorsa,
        @tiporicerca = @tiporicerca,
        @FiltroDaApplicare = @FiltroDaApplicare,
        @CampoAggregazione = @CampoAggregazione;
END
GO


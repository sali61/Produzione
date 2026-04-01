/*
    Wrapper su stored CDG mensile per mantenere il perimetro applicativo nello schema produzione.
    Non modifica la stored sorgente CDG.BIXeniaAnalisiMensileCommesse.
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spBixeniaAnalisiMensileCommesse', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spBixeniaAnalisiMensileCommesse AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spBixeniaAnalisiMensileCommesse
    @idrisorsa INT,
    @tiporicerca NVARCHAR(50),
    @FiltroDaApplicare NVARCHAR(MAX) = NULL,
    @CampoAggregazione NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    EXEC [CDG].[BIXeniaAnalisiMensileCommesse]
        @idrisorsa = @idrisorsa,
        @tiporicerca = @tiporicerca,
        @FiltroDaApplicare = @FiltroDaApplicare,
        @CampoAggregazione = @CampoAggregazione;
END
GO

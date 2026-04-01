/*
    Wrapper su stored CDG per mantenere il perimetro applicativo nello schema produzione.
    Non modifica la stored sorgente CDG.BIXeniaValutazioneProiezioni.
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.spBixeniaValutazioneProiezioni', 'P') IS NULL
BEGIN
    EXEC ('CREATE PROCEDURE produzione.spBixeniaValutazioneProiezioni AS BEGIN SET NOCOUNT ON; END');
END
GO

ALTER PROCEDURE produzione.spBixeniaValutazioneProiezioni
    @idrisorsa INT,
    @tiporicerca NVARCHAR(50),
    @FiltroDaApplicare NVARCHAR(MAX) = NULL,
    @CampoAggregazione NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    EXEC [CDG].[BIXeniaValutazioneProiezioni]
        @idrisorsa = @idrisorsa,
        @tiporicerca = @tiporicerca,
        @FiltroDaApplicare = @FiltroDaApplicare,
        @CampoAggregazione = @CampoAggregazione;
END
GO

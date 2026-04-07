/*
    Estensione tabella produzione.avanzamento:
    - ore_restanti
    - costo_personale_futuro
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'produzione')
BEGIN
    EXEC ('CREATE SCHEMA produzione');
END
GO

IF OBJECT_ID('produzione.avanzamento', 'U') IS NULL
BEGIN
    CREATE TABLE produzione.avanzamento
    (
        id INT IDENTITY(1, 1) NOT NULL,
        idcommessa INT NOT NULL,
        valore_percentuale DECIMAL(9, 4) NOT NULL,
        importo_riferimento DECIMAL(18, 2) NOT NULL,
        ImportoAvanzamento DECIMAL(18, 2) NULL,
        OreFuture DECIMAL(18, 2) NULL,
        ore_restanti DECIMAL(18, 2) NULL,
        CostoPersonaleFuturo DECIMAL(18, 2) NULL,
        costo_personale_futuro DECIMAL(18, 2) NULL,
        data_riferimento DATE NOT NULL,
        data_salvataggio DATETIME2(0) NOT NULL
            CONSTRAINT DF_produzione_avanzamento_data_salvataggio DEFAULT (SYSDATETIME()),
        idautore INT NOT NULL,
        CONSTRAINT PK_produzione_avanzamento PRIMARY KEY CLUSTERED (id)
    );
END
GO

IF COL_LENGTH('produzione.avanzamento', 'ore_restanti') IS NULL
BEGIN
    ALTER TABLE produzione.avanzamento
    ADD ore_restanti DECIMAL(18, 2) NULL;
END
GO

IF COL_LENGTH('produzione.avanzamento', 'ImportoAvanzamento') IS NULL
BEGIN
    ALTER TABLE produzione.avanzamento
    ADD ImportoAvanzamento DECIMAL(18, 2) NULL;
END
GO

IF COL_LENGTH('produzione.avanzamento', 'OreFuture') IS NULL
BEGIN
    ALTER TABLE produzione.avanzamento
    ADD OreFuture DECIMAL(18, 2) NULL;
END
GO

IF COL_LENGTH('produzione.avanzamento', 'costo_personale_futuro') IS NULL
BEGIN
    ALTER TABLE produzione.avanzamento
    ADD costo_personale_futuro DECIMAL(18, 2) NULL;
END
GO

IF COL_LENGTH('produzione.avanzamento', 'CostoPersonaleFuturo') IS NULL
BEGIN
    ALTER TABLE produzione.avanzamento
    ADD CostoPersonaleFuturo DECIMAL(18, 2) NULL;
END
GO

UPDATE produzione.avanzamento
SET
    ImportoAvanzamento = ISNULL(ImportoAvanzamento, importo_riferimento),
    OreFuture = ISNULL(OreFuture, ore_restanti),
    CostoPersonaleFuturo = ISNULL(CostoPersonaleFuturo, costo_personale_futuro),
    importo_riferimento = ISNULL(importo_riferimento, ImportoAvanzamento),
    ore_restanti = ISNULL(ore_restanti, OreFuture),
    costo_personale_futuro = ISNULL(costo_personale_futuro, CostoPersonaleFuturo);
GO

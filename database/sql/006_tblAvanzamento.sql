/*
    Tabella avanzamento manuale per commessa.
    Un solo record per (idcommessa, data_riferimento):
    il salvataggio successivo sulla stessa data aggiorna il record esistente.
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
        data_riferimento DATE NOT NULL,
        data_salvataggio DATETIME2(0) NOT NULL
            CONSTRAINT DF_produzione_avanzamento_data_salvataggio DEFAULT (SYSDATETIME()),
        idautore INT NOT NULL,
        CONSTRAINT PK_produzione_avanzamento PRIMARY KEY CLUSTERED (id)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_produzione_avanzamento_commesse'
      AND parent_object_id = OBJECT_ID('produzione.avanzamento')
)
BEGIN
    ALTER TABLE produzione.avanzamento
    ADD CONSTRAINT FK_produzione_avanzamento_commesse
        FOREIGN KEY (idcommessa) REFERENCES dbo.commesse(id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_produzione_avanzamento_risorse'
      AND parent_object_id = OBJECT_ID('produzione.avanzamento')
)
BEGIN
    ALTER TABLE produzione.avanzamento
    ADD CONSTRAINT FK_produzione_avanzamento_risorse
        FOREIGN KEY (idautore) REFERENCES dbo.Risorse(ID);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('produzione.avanzamento')
      AND name = 'UX_produzione_avanzamento_idcommessa_data'
)
BEGIN
    CREATE UNIQUE INDEX UX_produzione_avanzamento_idcommessa_data
        ON produzione.avanzamento (idcommessa, data_riferimento);
END
GO

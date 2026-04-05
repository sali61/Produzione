/*
    Dizionario voci menu applicazione Produzione.
    Mantiene in sync l'elenco (applicazione/menu/voce) con quanto esposto a UI.
*/

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'cdg')
BEGIN
    EXEC ('CREATE SCHEMA cdg');
END
GO

IF OBJECT_ID('cdg.significatomenu', 'U') IS NULL
BEGIN
    CREATE TABLE cdg.significatomenu
    (
        applicazione NVARCHAR(100) NOT NULL,
        [menu] NVARCHAR(150) NOT NULL,
        voce NVARCHAR(150) NOT NULL,
        descrizione NVARCHAR(2000) NULL,
        CONSTRAINT PK_significatomenu
            PRIMARY KEY CLUSTERED (applicazione, [menu], voce)
    );
END
ELSE IF COL_LENGTH('cdg.significatomenu', 'descrizione') IS NULL
BEGIN
    ALTER TABLE cdg.significatomenu
    ADD descrizione NVARCHAR(2000) NULL;
END
GO

;WITH source_rows AS
(
    SELECT rows.applicazione, rows.[menu], rows.voce, rows.descrizione
    FROM (VALUES
        (N'Produzione', N'Analisi Commesse', N'Commesse', N'Vista principale delle commesse con filtri per anno, tipologia, stato e struttura organizzativa. Permette ricerca, export Excel e accesso al dettaglio.'),
        (N'Produzione', N'Analisi Commesse', N'Prodotti', N'Analisi commesse raggruppata per prodotto con espandi/riduci dei gruppi. Evidenzia i totali per prodotto e mantiene i filtri di contesto.'),
        (N'Produzione', N'Analisi Commesse', N'Andamento Mensile', N'Mostra andamento mensile di ricavi, costi, utile e ore sulla base delle commesse visibili al profilo. Supporta confronto per anno.'),
        (N'Produzione', N'Analisi Commesse', N'Dati Annuali Aggregati', N'Aggrega i dati annuali con logica tipo pivot per dimensioni di business. Utile per analisi ad alto livello su clienti, tipologie e responsabilita.'),
        (N'Produzione', N'Analisi Commesse', N'Utile Mensile RCC', N'Riepiloga per RCC i valori economici consuntivi fino al mese di riferimento. Include totali annuali e filtri per anno, RCC e produzione.'),
        (N'Produzione', N'Analisi Commesse', N'Utile Mensile BU', N'Riepiloga per Business Unit i valori economici consuntivi fino al mese di riferimento. Include totali annuali e filtri per anno, BU e produzione.'),
        (N'Produzione', N'Analisi Proiezioni', N'Proiezione Mensile RCC', N'Confronta il risultato mensile per RCC su budget, risultato pesato e percentuale pesata. Pensata per monitoraggio progressivo nel corso dell anno.'),
        (N'Produzione', N'Analisi Proiezioni', N'Report Annuale RCC', N'Report annuale per RCC con fatturato certo, budget e ricavo ipotetico. Evidenzia margini e percentuali di raggiungimento.'),
        (N'Produzione', N'Analisi Proiezioni', N'Proiezione Mensile BU', N'Confronta il risultato mensile per Business Unit con stessa logica della vista RCC. Utile per controllo di area operativa.'),
        (N'Produzione', N'Analisi Proiezioni', N'Report Annuale BU', N'Report annuale per Business Unit con metriche di fatturato certo e ipotetico. Include indicatori di margine e copertura budget.'),
        (N'Produzione', N'Previsioni', N'Funnel', N'Elenco opportunita e ordini con filtri su anno, tipo e stato documento. Permette visione operativa del portafoglio atteso.'),
        (N'Produzione', N'Previsioni', N'Report Funnel RCC', N'Vista pivot del funnel aggregata per RCC, tipo e percentuale successo. Include totali e confronto su una selezione annuale.'),
        (N'Produzione', N'Previsioni', N'Report Funnel BU', N'Vista pivot del funnel aggregata per Business Unit, con dettaglio per tipo e percentuale successo. Include totali e confronto annuale.'),
        (N'Produzione', N'Processo Offerta', N'Offerte', N'Elenco offerte con dati economici, stato documento ed esito. Supporta filtri multipli su anno e stato per analisi commerciale.'),
        (N'Produzione', N'Processo Offerta', N'Sintesi RCC', N'Sintesi del processo offerta aggregata per RCC. Evidenzia volumi, valori previsti e distribuzione esiti.'),
        (N'Produzione', N'Processo Offerta', N'Sintesi BU', N'Sintesi del processo offerta aggregata per Business Unit. Evidenzia volumi, valori previsti e distribuzione esiti.'),
        (N'Produzione', N'Processo Offerta', N'Percentuale Successo RCC', N'Misura percentuale di successo delle offerte per RCC su anni selezionati. Utile per confronto tra responsabili.'),
        (N'Produzione', N'Processo Offerta', N'Percentuale Successo BU', N'Misura percentuale di successo delle offerte per Business Unit su anni selezionati. Utile per confronto tra aree.'),
        (N'Produzione', N'Processo Offerta', N'Incidenza RCC', N'Calcola peso percentuale del risultato RCC sul totale annuo, con filtri su esito e anno. Supporta analisi di contributo relativo.'),
        (N'Produzione', N'Processo Offerta', N'Incidenza BU', N'Calcola peso percentuale del risultato BU sul totale annuo, con filtri su esito e anno. Supporta analisi di contributo relativo.'),
        (N'Produzione', N'Dati Contabili', N'Vendite', N'Elenco fatture e ricavi con filtri autorizzativi equivalenti alla sintesi commesse. Include provenienza, stato temporale e scaduto.'),
        (N'Produzione', N'Dati Contabili', N'Acquisti', N'Elenco fatture passive con filtri su anno, provenienza e contesto commessa. Include importi complessivi e contabilita di dettaglio.'),
        (N'Produzione', N'Utente', N'Info', N'Mostra informazioni utente corrente, ruoli, profili disponibili e contesto di impersonificazione.'),
        (N'Produzione', N'Utente', N'Info applicazione', N'Mostra il riepilogo menu e la descrizione funzionale delle voci attive nell applicazione.'),
        (N'Produzione', N'Utente', N'Impersonifica', N'Permette al Supervisore di operare nel contesto di un altro utente.'),
        (N'Produzione', N'Utente', N'Termina impersonificazione', N'Chiude il contesto di impersonificazione e ripristina l utente autenticato.'),
        (N'Produzione', N'Utente', N'Logout', N'Termina la sessione applicativa e rimanda al sistema di autenticazione centrale.')
    ) AS rows(applicazione, [menu], voce, descrizione)
)
MERGE cdg.significatomenu AS target
USING source_rows AS source
ON target.applicazione = source.applicazione
   AND target.[menu] = source.[menu]
   AND target.voce = source.voce
WHEN MATCHED
    AND (
        target.descrizione IS NULL
        OR LTRIM(RTRIM(target.descrizione)) = N''
    ) THEN
    UPDATE SET target.descrizione = source.descrizione
WHEN NOT MATCHED BY TARGET THEN
    INSERT (applicazione, [menu], voce, descrizione)
    VALUES (source.applicazione, source.[menu], source.voce, source.descrizione)
WHEN NOT MATCHED BY SOURCE
    AND target.applicazione = N'Produzione' THEN
    DELETE;
GO

# SQL Produzione

Script presenti:

- `000_spBixeniaAnalisiCommesse.sql`:
  crea/aggiorna `produzione.spBixeniaAnalisiCommesse(...)` come wrapper
  applicativo su `CDG.BIXeniaAnalisiCommesse`.
- `001_spBixeniaAnalisiMensileCommesse.sql`:
  crea/aggiorna `produzione.spBixeniaAnalisiMensileCommesse(...)` come wrapper
  applicativo su `CDG.BIXeniaAnalisiMensileCommesse`.
- `001_spIndividuaRuoli.sql`:
  crea/aggiorna `produzione.spIndividuaRuoli(@IdRisorsa)` con mapping ruoli:
  `CDG/PRES`, `RP`, `RC`, `PM`, `RCC`, `GPM`.
- `002_spGeneraFiltri.sql`:
  crea/aggiorna `produzione.spGeneraFiltri(...)` per la pagina
  `Commesse > Sintesi` con valori distinct dei filtri applicati al perimetro
  autorizzativo del profilo corrente.
- `003_spSintesiCommesse.sql`:
  crea/aggiorna `produzione.spSintesiCommesse(...)` per l'area dati
  `Commesse > Sintesi`; usa in sola lettura il wrapper
  `produzione.spBixeniaAnalisiCommesse` e aggrega i valori economici quando
  l'anno non e specificato.
- `004_spBixeniaValutazioneProiezioni.sql`:
  crea/aggiorna `produzione.spBixeniaValutazioneProiezioni(...)` come wrapper
  applicativo su `CDG.BIXeniaValutazioneProiezioni`.
- `005_spDettaglioCommesseFatturato.sql`:
  crea/aggiorna `produzione.spDettaglioCommesseFatturato(...)` per i tab
  `Vendite` e `Acquisti` del dettaglio commessa; espone anche il result-set
  `FatturatoPivot` ordinato per anno/RCC.
- `006_tblAvanzamento.sql`:
  crea la tabella `produzione.avanzamento` per il salvataggio della
  `% raggiunto` per commessa e data di riferimento (fine mese precedente),
  con vincolo di unicita su `(idcommessa, data_riferimento)`.
- `007_spAnalisiRccRisultatoMensile.sql`:
  crea/aggiorna `produzione.spAnalisiRccRisultatoMensile(@AnnoSnapshot, @TipoAggregazione, @FiltroAggregazione, @Rcc)`
  come stored comune per `Proiezione Mensile RCC` e `Proiezione Mensile BU`,
  normalizzando i campi numerici
  con parsing locale (`it-IT`/`en-US`) per evitare problemi punti/virgole.
- `008_spAnalisiRccPivotFatturato.sql`:
  crea/aggiorna `produzione.spAnalisiRccPivotFatturato(@idrisorsa, @Anno, @Rcc)`
  per `Analisi RCC - PivotFatturato`, esponendo valori numerici tipizzati
  (senza conversioni locali lato applicazione).
- `009_tblSignificatoMenu.sql`:
  crea/aggiorna la tabella `cdg.significatomenu`
  (campi `applicazione`, `menu`, `voce`, `descrizione`)
  e la sincronizza in automatico per l'applicazione `Produzione` con tutte le
  voci menu attualmente esposte in UI, valorizzando descrizioni di default
  senza sovrascrivere eventuali descrizioni gia' personalizzate.
- `011_spAndamentoMensileCommesse.sql`:
  crea/aggiorna `produzione.spAndamentoMensileCommesse(...)` per la pagina
  `Commesse > Andamento Mensile`, con modalita dettaglio e aggregata
  (anni storici per anno, anno corrente per mese fino al mese di riferimento).
- `012_spCommesseAnomale.sql`:
  crea/aggiorna `produzione.spCommesseAnomale` con output standard
  (`TipoAnomalia`, `DettaglioAnomalia`, `IdCommessa`) e include, al momento:
  commesse chiuse con importi ancora previsti, commesse senza ore lavorate
  da oltre 6 mesi, commesse commerciali operative (>200 ore), commesse
  commerciali con fatturato/fatturato futuro, controlli interaziendali fuori
  tipologia `Servizi Interaziendali` e controlli su commesse di tipologia
  `Servizi Interaziendali` con costi/ricavi.

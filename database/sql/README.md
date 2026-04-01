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

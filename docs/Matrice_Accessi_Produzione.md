# Matrice Accessi - Produzione

## Ambito
- Applicazione: Produzione
- Fonti: `database/sql/001_spIndividuaRuoli.sql`, backend controller/repository, `docs/verifica_matrice_utenti_20260414_finale.json`.
- Legenda diritti visualizzazione: `T`=totale, `P`=parziale (vincoli commessa/OU), `-`=non abilitato.

## Foglio 1 - Profili e Ruoli
- Elenca i profili applicativi, il ruolo tecnico/codice, e i limiti di perimetro principali.
- Include `Responsabile Qualita (RQ)` con nota su sola lettura e deroghe operative.

## Foglio 2 - Accessi per Pagina
- Per ogni voce applicativa: profili con visualizzazione totale/parziale, non abilitati, limitazioni e profili di modifica.
- Le pagine di dettaglio commessa includono regole puntuali per configurazione, segnalazioni e invio sintesi mail.

## Modello Riutilizzo Altri Progetti
1. Individuare stored procedure profili/limiti aziendali del progetto.
2. Estrarre mapping profili da frontend config e backend authorization.
3. Verificare endpoint per pagina con test matrix (`T/P/-`) e integrare con regole modifica.
4. Compilare i due fogli con stessa struttura (`Profili_Ruoli`, `Accessi_Pagine`).

## Output
- XLSX: `D:\Progetti\github\Produzione\docs\Matrice_Accessi_Produzione.xlsx`
- Questo documento: `D:\Progetti\github\Produzione\docs\Matrice_Accessi_Produzione.md`
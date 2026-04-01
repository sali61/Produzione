# Matrice Porte SSO

Data riferimento: 1 aprile 2026.

## Nuovi progetti

| Applicazione | Frontend locale | Backend locale | Hostname pubblico |
|---|---:|---:|---|
| Auth | 5043 | 7043 | `auth.xeniaprogetti.it` |
| Produzione | 5643 | 7643 | `produzione.xeniaprogetti.it` |

## Applicazioni gia' in bozza architettura

| Applicazione | Backend interno (bozza) | Hostname pubblico |
|---|---:|---|
| Gestione Ferie | 5102 | `ferie.xeniaprogetti.it` |
| Presenze | 5202 | `presenze.xeniaprogetti.it` |
| Finanza | 7443 | `finanza.xeniaprogetti.it` |
| BI | 7285 | `bi.xeniaprogetti.it` |

## Nota operativa

Verso utente finale conviene mantenere solo `HTTPS/443` per ogni hostname, mentre le porte locali/interne restano utili per sviluppo, diagnostica e reverse proxy.

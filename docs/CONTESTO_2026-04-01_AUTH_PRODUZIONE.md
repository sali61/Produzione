# Contesto Operativo 1 Aprile 2026 (Auth + Produzione)

## Scopo
Documentare in modo stabile cosa e' stato costruito il 1 aprile 2026 sui repository `Auth` e `Produzione`, evitando confusione con `GestioneFinanza` o altri workspace.

## Nota su thread e sidebar
Il raggruppamento dei thread nella UI dipende dal workspace di apertura del thread (cwd), non dal nome del task.
Per questo il lavoro "Auth + Produzione" puo' comparire sotto una sezione diversa se la thread e' stata avviata da un altro repository.

## Timeline verificata (timezone Europe/Rome)
1. `2026-04-01 14:20:44 +0200` - `Auth` - commit `07ff0f6`
   - `feat: initial auth scaffold with centralized SSO`
   - Impatto: `90 files changed, 6200 insertions(+)`
2. `2026-04-01 14:21:06 +0200` - `Produzione` - commit `11fa40c`
   - `feat: initial produzione scaffold with SSO, roles and impersonation`
   - Impatto: `76 files changed, 7121 insertions(+)`
3. `2026-04-01 20:18:07 +0200` - `Produzione` - commit `a80b687`
   - `feat: completa commesse sintesi e dettaglio con vendite/acquisti`
   - Impatto: `33 files changed, 4374 insertions(+), 138 deletions(-)`

## Cosa e' stato definito in Auth
- Scaffold completo backend/frontend e script operativi dev/publish.
- Servizio LDAP + emissione JWT centralizzata.
- Endpoint base:
  - `POST /api/auth/login`
  - `POST /api/auth/login-dev`
  - `GET /api/auth/current-user`
  - `GET /api/system/health`
- SSO con redirect `returnUrl` + `client`.
- Matrice porte:
  - Frontend `5043`
  - Backend `7043`

File chiave:
- `README.md`
- `docs/SSO_PORT_MATRIX.md`
- `src/backend/Auth.Api/Controllers/AuthController.cs`

## Cosa e' stato definito in Produzione
- Scaffold completo backend/frontend con validazione locale JWT emessi da Auth.
- Profili/ruoli applicativi e impersonazione applicativa (`X-Act-As-Username`) con controllo server-side.
- Evoluzione area Commesse:
  - endpoint opzioni e filtri sintesi
  - endpoint sintesi con filtri multipli e aggregazione
  - endpoint dettaglio commessa con:
    - anagrafica
    - storico annuale
    - progressivo anno corrente
    - vendite/acquisti
    - pivot fatturato
- Stored procedure introdotte/aggiornate per sintesi e dettaglio.
- Matrice porte:
  - Frontend `5643`
  - Backend `7643`

File chiave:
- `README.md`
- `docs/SSO_PORT_MATRIX.md`
- `src/backend/Produzione.Api/Controllers/CommesseController.cs`
- `src/backend/Produzione.Infrastructure/Repositories/CommesseFilterRepository.cs`
- `src/frontend/Produzione.Web/src/App.tsx`

## Confini (cosa NON fa parte di questo intervento)
- `GestioneFinanza`: nessun commit datato 1 aprile 2026.
- `anac_history`: ha commit il 1 aprile 2026 ma su ambito diverso (procurement/n8n), non correlato al blocco Auth+Produzione.

## Check rapido per ricostruire il contesto
```powershell
# Auth
git -C D:\Progetti\github\Auth log --all --date=iso-local --pretty=format:"%h|%ad|%s" --since="2026-04-01 00:00" --until="2026-04-02 00:00"

# Produzione
git -C D:\Progetti\github\Produzione log --all --date=iso-local --pretty=format:"%h|%ad|%s" --since="2026-04-01 00:00" --until="2026-04-02 23:59"
```

## Stato di riferimento (2 aprile 2026)
- `Auth`: branch `main`, allineato con `origin/main`.
- `Produzione`: branch `main`, allineato con `origin/main`.


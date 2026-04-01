# Produzione

Applicazione `Produzione` con backend/frontend separati e validazione locale dei JWT emessi dal servizio `Auth`.

## Stack

- Backend: ASP.NET Core Web API (.NET 8)
- Frontend: React + Vite + TypeScript
- Autenticazione API: JWT Bearer
- Validazione token: locale in API Produzione (issuer/audience/signing key)

## Porte definitive (sviluppo locale)

- Backend HTTPS: `https://localhost:7643`
- Frontend HTTPS: `https://localhost:5643`

## Hostname target (ambiente pubblicato)

- Pubblico: `https://produzione.xeniaprogetti.it`
- Dev: `https://produzione-dev.xeniaprogetti.it`

## Struttura repository

```text
Produzione.sln
src/
  backend/
    Produzione.Api/
    Produzione.Application/
    Produzione.Domain/
    Produzione.Infrastructure/
  frontend/
    Produzione.Web/
database/
  sql/
scripts/
  dev/
  publish/
```

## Configurazione JWT

File: `src/backend/Produzione.Api/appsettings*.json`

Sezione:

- `Jwt:Issuer` (allineato a `Auth.Api`)
- `Jwt:Audience` (fase iniziale: `xenia-web`)
- `Jwt:SigningKey` (chiave condivisa con Auth in ambiente dev)

## SSO Frontend

Il frontend Produzione, in assenza di sessione valida, reindirizza automaticamente verso `Auth`.

Variabile frontend opzionale:

- `VITE_AUTH_PORTAL_URL` (default locale: `https://localhost:5043`)

## Configurazione database

- `ConnectionStrings:XeniaDB`
- valore previsto:
  `server=SRV-SQL-PROD\SQL2012ENT;database=xenia;user id=sa;password=saP4s$w01$;Encrypt=True;TrustServerCertificate=True`

## Endpoint base

- `GET /api/system/health` (anonimo)
- `GET /api/system/me` (protetto JWT, supporta header opzionale `X-Act-As-Username`)
- `GET /api/profiles/available` (profili utente + OU responsabile, supporta header opzionale `X-Act-As-Username`)
- `GET /api/commesse/options` (filtro commesse per profilo)

## Contesto utente propagato

L'utente autenticato porta nel token almeno lo `username`.
`Produzione` risolve poi da database:

- `idrisorsa`
- `username`
- `ou` (OU primaria, quando disponibile)
- `ou_sigla` (eventuale lista OU)

## Profili applicativi

Ruoli supportati:

- `Supervisore` (`CDG`, `PRES`)
- `Responsabile Produzione` (`RP`)
- `Responsabile Commerciale` (`RC`)
- `Project Manager` (`PM`)
- `Responsabile Commerciale Commessa` (`RCC`)
- `General Project Manager` (`GPM`)
- `Responsabile OU` (derivato da `orga.vw_OU_OrganigrammaAncestor`)

Determinazione profili:

- profili letti da stored procedure `produzione.spIndividuaRuoli(@IdRisorsa)`
- `Responsabile OU` aggiunto se esistono righe da:
  `select sigla from [orga].[vw_OU_OrganigrammaAncestor] where id_responsabile_ou_ancestor=@IdRisorsa`

Regole filtro commesse implementate:

- `Project Manager`: `idpm = idrisorsa` OR `NetUsernamePM = username`
- `Responsabile Commerciale Commessa`: `idRCC = idrisorsa` OR `NetUsernameRCC = username`
- `Responsabile OU`: OU ricavate da `select sigla from [orga].[vw_OU_OrganigrammaAncestor] where id_responsabile_ou_ancestor=@IdRisorsa`
- altri ruoli globali (`Supervisore`, `RP`, `RC`, `GPM`): accesso completo alla query base

Query base commesse: `cdg_qryComessaPmRcc`

## Avvio rapido

```bat
scripts\dev\dev-start.cmd
```

Comandi utili:

```bat
scripts\dev\dev-status.cmd
scripts\dev\dev-logs.cmd
scripts\dev\dev-stop.cmd
```

## Test rapido integrazione con Auth

1. Ottenere un token da `Auth` con `POST /api/auth/login` o `POST /api/auth/login-dev`.
2. Passare il token a `GET /api/system/me` su Produzione (Bearer token).
3. Verificare risposta utente/ruoli.

## Nota ruoli/autorizzazioni

La logica ruoli applicativi di Produzione e' agganciata a `produzione.spIndividuaRuoli` (database `xenia`) e non dipende dai claim ruoli emessi da `Auth`.

## Impersonazione applicativa (solo Produzione)

- L'impersonazione e' applicativa e locale all'app Produzione: non modifica il token emesso da `Auth`.
- L'utente autenticato rimane sempre tracciato come `authenticatedUsername`.
- Il contesto operativo (`effective user`) puo' essere cambiato via header `X-Act-As-Username`.
- L'operazione e' consentita solo se l'utente autenticato ha il profilo `Supervisore`.
- Se il target non esiste/non e' attivo, l'API risponde `404`.

Rischi principali da gestire:

- Audit incompleto se non si registra sempre `authenticatedUsername -> effectiveUsername`.
- Possibile abuso operativo se il controllo `Supervisore` viene bypassato lato frontend.
- Confusione utente se non si mostra chiaramente quando l'impersonazione e' attiva.

Mitigazioni applicate:

- Controllo autorizzativo server-side (non solo UI).
- Metadati di risposta con utente autenticato e utente effettivo.
- UI con stato esplicito di impersonazione e comando di terminazione.

import type {
  AppInfoVoice,
  AppPage,
  DatiAnnualiPivotFieldKey,
  RisorsePivotFieldKey,
} from '../types/appTypes'

export const APP_UI_VERSION = '2.2.0'

export const tokenStorageKey = 'produzione.jwt'
export const redirectGuardKey = 'produzione.sso.redirecting'
export const impersonationStorageKey = 'produzione.sso.actas'
export const impersonationHeaderName = 'X-Act-As-Username'
export const sintesiStateStorageKey = 'produzione.sintesi.state'
export const analisiCommesseAllowedProfiles = ['Supervisore', 'Responsabile Produzione', 'Responsabile Commerciale', 'Project Manager', 'Responsabile Commerciale Commessa', 'General Project Manager', 'Responsabile OU']
export const datiContabiliAllowedProfiles = ['Supervisore', 'Responsabile Produzione', 'Responsabile Commerciale', 'Project Manager', 'Responsabile Commerciale Commessa', 'General Project Manager', 'Responsabile OU']
export const risultatiRisorseAllowedProfiles = ['Supervisore', 'Responsabile Produzione', 'Responsabile Commerciale', 'Responsabile Commerciale Commessa', 'Responsabile OU', 'Risorse Umane']
export const analisiRccAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa']
export const analisiRccPivotRccSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
export const analisiBuAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile OU']
export const analisiBuPivotBuSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
export const analisiBurccAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa', 'Responsabile OU']
export const previsioniFunnelRccAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa']
export const previsioniFunnelRccSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
export const previsioniFunnelBuAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile OU']
export const previsioniFunnelBuSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
export const previsioniFunnelBurccAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa', 'Responsabile OU']
export const previsioniFunnelBurccSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa']
export const previsioniUtileMensileRccAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa', 'Responsabile OU']
export const previsioniUtileMensileRccSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
export const previsioniUtileMensileBuAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa', 'Responsabile OU']
export const previsioniUtileMensileBuSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile OU']
export const analisiPianoFatturazioneAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa']
export const analisiPianoFatturazioneSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
export const analisiDettaglioFatturatoAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa', 'Project Manager', 'Responsabile OU']
export const processoOffertaAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa', 'Responsabile OU']
export const analisiSearchCollapsiblePages = new Set<AppPage>([
  'commesse-andamento-mensile',
  'risorse-risultati',
  'risorse-risultati-pivot',
  'risorse-risultati-mensile',
  'risorse-risultati-mensile-pivot',
  'risorse-ou-risorse',
  'risorse-ou-risorse-pivot',
  'risorse-ou-risorse-mensile',
  'risorse-ou-risorse-mensile-pivot',
  'processo-offerta-offerte',
  'processo-offerta-sintesi-rcc',
  'processo-offerta-sintesi-bu',
  'processo-offerta-percentuale-successo-rcc',
  'processo-offerta-percentuale-successo-bu',
  'processo-offerta-incidenza-rcc',
  'processo-offerta-incidenza-bu',
  'analisi-rcc-pivot-fatturato',
  'analisi-bu-pivot-fatturato',
  'analisi-burcc-risultato-mensile',
  'analisi-burcc-pivot-fatturato',
  'analisi-piano-fatturazione',
  'analisi-albero-proiezioni',
  'analisi-dettaglio-fatturato',
  'previsioni-funnel',
  'previsioni-report-funnel-rcc',
  'previsioni-report-funnel-bu',
  'previsioni-report-funnel-burcc',
  'previsioni-utile-mensile-rcc',
  'previsioni-utile-mensile-bu',
])
export const datiAnnualiPivotFieldOptions: Array<{ key: DatiAnnualiPivotFieldKey; label: string }> = [
  { key: 'anno', label: 'Anno' },
  { key: 'commessa', label: 'Commessa' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'rcc', label: 'RCC' },
  { key: 'pm', label: 'PM' },
  { key: 'macroTipologia', label: 'Macrotipologia' },
  { key: 'controparte', label: 'Controparte' },
  { key: 'tipologiaCommessa', label: 'Tipo Commessa' },
  { key: 'prodotto', label: 'Prodotto' },
]
export const datiAnnualiPivotFieldSet = new Set<DatiAnnualiPivotFieldKey>(
  datiAnnualiPivotFieldOptions.map((option) => option.key),
)
export const risorsePivotFieldOptions: Array<{ key: RisorsePivotFieldKey; label: string }> = [
  { key: 'anno', label: 'Anno' },
  { key: 'mese', label: 'Mese' },
  { key: 'risorsa', label: 'Risorsa' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'ou', label: 'OU' },
  { key: 'rcc', label: 'RCC' },
  { key: 'pm', label: 'PM' },
  { key: 'macroTipologia', label: 'Macrotipologia' },
  { key: 'controparte', label: 'Controparte' },
  { key: 'tipologiaCommessa', label: 'Tipologia Commessa' },
  { key: 'prodotto', label: 'Prodotto' },
  { key: 'commessa', label: 'Commessa' },
  { key: 'descrizioneCommessa', label: 'Descrizione Commessa' },
  { key: 'stato', label: 'Stato' },
]
export const risorsePivotFieldSet = new Set<RisorsePivotFieldKey>(
  risorsePivotFieldOptions.map((option) => option.key),
)


export const appInfoVoicesDefault: AppInfoVoice[] = [
  {
    menu: 'Analisi Commesse',
    voce: 'Commesse',
    sintesi: 'Vista principale delle commesse con filtri per anno, tipologia, stato e struttura organizzativa. Permette ricerca, export Excel e accesso al dettaglio.',
  },
  {
    menu: 'Analisi Commesse',
    voce: 'Prodotti',
    sintesi: 'Analisi commesse raggruppata per prodotto con espandi/riduci dei gruppi. Evidenzia i totali per prodotto e mantiene i filtri di contesto.',
  },
  {
    menu: 'Analisi Commesse',
    voce: 'Andamento Mensile',
    sintesi: 'Mostra andamento mensile di ricavi, costi, utile e ore sulla base delle commesse visibili al profilo. Supporta confronto per anno.',
  },
  {
    menu: 'Analisi Commesse',
    voce: 'Dati Annuali Aggregati',
    sintesi: 'Aggrega i dati annuali con logica tipo pivot per dimensioni di business. Utile per analisi ad alto livello su clienti, tipologie e responsabilita.',
  },
  {
    menu: 'Analisi Commesse',
    voce: 'Commesse Anomale',
    sintesi: 'Evidenzia commesse con anomalie operative o contabili e mostra contesto anagrafico ed economico per agevolare controlli e correzioni.',
  },
  {
    menu: 'Analisi Commesse',
    voce: 'Utile Mensile RCC',
    sintesi: 'Riepiloga per RCC i valori economici consuntivi fino al mese di riferimento. Include totali annuali e filtri per anno, RCC e produzione.',
  },
  {
    menu: 'Analisi Commesse',
    voce: 'Utile Mensile BU',
    sintesi: 'Riepiloga per Business Unit i valori economici consuntivi fino al mese di riferimento. Include totali annuali e filtri per anno, BU e produzione.',
  },
  {
    menu: 'Analisi Risorse',
    voce: 'Valutazione Annuale',
    sintesi: 'Vista analitica annuale per risorsa su commesse visibili al profilo, con filtri estesi e confronto economico per ore o per costo.',
  },
  {
    menu: 'Analisi Risorse',
    voce: 'Pivot Annuale',
    sintesi: 'Pivot dinamica annuale con livelli selezionabili (inclusa Risorsa) e totali per gruppo, utile per analisi aggregate delle performance.',
  },
  {
    menu: 'Analisi Risorse',
    voce: 'Valutazione Mensile',
    sintesi: 'Vista analitica mensile per risorsa con default su anno corrente e precedente, per monitorare progressivo economico e operativo.',
  },
  {
    menu: 'Analisi Risorse',
    voce: 'Pivot Mensile',
    sintesi: 'Pivot dinamica mensile con gli stessi filtri della vista analitica e aggregazioni multilivello fino al totale complessivo.',
  },
  {
    menu: 'Analisi Risorse',
    voce: 'Analisi OU Risorse',
    sintesi: 'Analisi economica risorse su perimetro OU con filtri annuali e regole di visibilita per profilo, inclusa limitazione ROU sulla propria OU.',
  },
  {
    menu: 'Analisi Risorse',
    voce: 'Analisi OU Risorse Pivot',
    sintesi: 'Vista pivot dei risultati OU Risorse con aggregazioni multilivello e totali per gruppo, utile per confronto sintetico tra aree e responsabili.',
  },
  {
    menu: 'Analisi Risorse',
    voce: 'Analisi Mensile OU Risorse',
    sintesi: 'Vista OU Risorse su base mensile con selezione multipla dei mesi di competenza e dettaglio completo per commessa, OU e risorsa.',
  },
  {
    menu: 'Analisi Risorse',
    voce: 'Analisi Mensile OU Risorse Pivot',
    sintesi: 'Pivot mensile OU Risorse con campi aggregabili (incluso mese competenza) e totale complessivo, utile per confronto rapido OU-BU.',
  },
  {
    menu: 'Analisi Proiezioni',
    voce: 'Proiezione Mensile RCC',
    sintesi: 'Confronta il risultato mensile per RCC su budget, risultato pesato e percentuale pesata. Pensata per monitoraggio progressivo nel corso dell anno.',
  },
  {
    menu: 'Analisi Proiezioni',
    voce: 'Report Annuale RCC',
    sintesi: 'Report annuale per RCC con fatturato certo, budget e ricavo ipotetico. Evidenzia margini e percentuali di raggiungimento.',
  },
  {
    menu: 'Analisi Proiezioni',
    voce: 'Proiezione Mensile BU',
    sintesi: 'Confronta il risultato mensile per Business Unit con stessa logica della vista RCC. Utile per controllo di area operativa.',
  },
  {
    menu: 'Analisi Proiezioni',
    voce: 'Report Annuale BU',
    sintesi: 'Report annuale per Business Unit con metriche di fatturato certo e ipotetico. Include indicatori di margine e copertura budget.',
  },
  {
    menu: 'Analisi Proiezioni',
    voce: 'Proiezione Mensile RCC-BU',
    sintesi: 'Proiezione mensile integrata con ripartizione congiunta Business Unit e RCC. Permette di leggere nel dettaglio chi genera il risultato dentro ogni BU.',
  },
  {
    menu: 'Analisi Proiezioni',
    voce: 'Report Annuale RCC-BU',
    sintesi: 'Report annuale integrato RCC-BU con fatturato certo, budget e ricavi ipotetici sulla stessa riga. Utile per confronto incrociato tra area e responsabile.',
  },
  {
    menu: 'Analisi Proiezioni',
    voce: 'Piano Fatturazione',
    sintesi: 'Mostra il piano mensile per RCC in due viste: valori mensili/trimestrali e progressivo di raggiungimento budget per mese. Supporta filtri per anno, mesi snapshot e tipo calcolo.',
  },
  {
    menu: 'Analisi Proiezioni',
    voce: 'Dettaglio Fatturato',
    sintesi: 'Mostra il dettaglio analitico dei movimenti fatturato/futuro/ipotetico con filtri per anno, commessa, provenienza e controparte, nel rispetto dei diritti per ruolo.',
  },
  {
    menu: 'Analisi Proiezioni',
    voce: 'Albero Proiezioni',
    sintesi: 'Rappresenta il dettaglio fatturato in forma gerarchica con aggregazioni progressive (Anno, RCC, BU, Cliente, Commessa) e totali a ogni livello.',
  },
  {
    menu: 'Previsioni',
    voce: 'Funnel',
    sintesi: 'Elenco opportunita e ordini con filtri su anno, tipo e stato documento. Permette visione operativa del portafoglio atteso.',
  },
  {
    menu: 'Previsioni',
    voce: 'Report Funnel RCC',
    sintesi: 'Vista pivot del funnel aggregata per RCC, tipo e percentuale successo. Include totali e confronto su una selezione annuale.',
  },
  {
    menu: 'Previsioni',
    voce: 'Report Funnel BU',
    sintesi: 'Vista pivot del funnel aggregata per Business Unit, con dettaglio per tipo e percentuale successo. Include totali e confronto annuale.',
  },
  {
    menu: 'Previsioni',
    voce: 'Report Funnel BU RCC',
    sintesi: 'Vista pivot del funnel con aggregazione incrociata BU-RCC, con totali per gruppo e dettaglio per tipo e percentuale successo.',
  },
  {
    menu: 'Processo Offerta',
    voce: 'Offerte',
    sintesi: 'Elenco offerte con dati economici, stato documento ed esito. Supporta filtri multipli su anno e stato per analisi commerciale.',
  },
  {
    menu: 'Processo Offerta',
    voce: 'Sintesi RCC',
    sintesi: 'Sintesi del processo offerta aggregata per RCC. Evidenzia volumi, valori previsti e distribuzione esiti.',
  },
  {
    menu: 'Processo Offerta',
    voce: 'Sintesi BU',
    sintesi: 'Sintesi del processo offerta aggregata per Business Unit. Evidenzia volumi, valori previsti e distribuzione esiti.',
  },
  {
    menu: 'Processo Offerta',
    voce: 'Percentuale Successo RCC',
    sintesi: 'Misura percentuale di successo delle offerte per RCC su anni selezionati. Utile per confronto tra responsabili.',
  },
  {
    menu: 'Processo Offerta',
    voce: 'Percentuale Successo BU',
    sintesi: 'Misura percentuale di successo delle offerte per Business Unit su anni selezionati. Utile per confronto tra aree.',
  },
  {
    menu: 'Processo Offerta',
    voce: 'Incidenza RCC',
    sintesi: 'Calcola peso percentuale del risultato RCC sul totale annuo, con filtri su esito e anno. Supporta analisi di contributo relativo.',
  },
  {
    menu: 'Processo Offerta',
    voce: 'Incidenza BU',
    sintesi: 'Calcola peso percentuale del risultato BU sul totale annuo, con filtri su esito e anno. Supporta analisi di contributo relativo.',
  },
  {
    menu: 'Dati Contabili',
    voce: 'Vendite',
    sintesi: 'Elenco fatture e ricavi con filtri autorizzativi equivalenti alla sintesi commesse. Include provenienza, stato temporale e scaduto.',
  },
  {
    menu: 'Dati Contabili',
    voce: 'Acquisti',
    sintesi: 'Elenco fatture passive con filtri su anno, provenienza e contesto commessa. Include importi complessivi e contabilita di dettaglio.',
  },
]



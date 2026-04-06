import { Fragment, type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

type CurrentUser = {
  idRisorsa: number
  username: string
  fullName: string
  ou: string
  ouScopes: string[]
  roles: string[]
  profiles?: string[]
  canImpersonate?: boolean
  isImpersonating?: boolean
  impersonatedUsername?: string | null
  impersonatorUsername?: string | null
  authenticatedIdRisorsa?: number
  authenticatedUsername?: string
  authenticatedRoles?: string[]
  authenticatedOuScopes?: string[]
}

type AvailableProfilesResponse = {
  profiles: string[]
  ouScopes: string[]
  canImpersonate?: boolean
  isImpersonating?: boolean
  authenticatedUsername?: string
  effectiveUsername?: string
}

type SessionProbeResult =
  | { state: 'ok'; user: CurrentUser }
  | { state: 'unauthorized' }
  | { state: 'forbidden'; message: string }
  | { state: 'error'; message: string }

type MenuKey = 'sintesi' | 'risorse' | 'analisi-proiezioni' | 'previsioni' | 'processo-offerta' | 'dati-contabili' | 'user'
type AppPage =
  | 'none'
  | 'commesse-sintesi'
  | 'commesse-andamento-mensile'
  | 'commesse-dati-annuali-aggregati'
  | 'risorse-risultati'
  | 'risorse-risultati-pivot'
  | 'risorse-risultati-mensile'
  | 'risorse-risultati-mensile-pivot'
  | 'risorse-ou-risorse'
  | 'risorse-ou-risorse-pivot'
  | 'risorse-ou'
  | 'prodotti-sintesi'
  | 'analisi-rcc-risultato-mensile'
  | 'analisi-rcc-pivot-fatturato'
  | 'analisi-bu-risultato-mensile'
  | 'analisi-bu-pivot-fatturato'
  | 'analisi-burcc-risultato-mensile'
  | 'analisi-burcc-pivot-fatturato'
  | 'analisi-piano-fatturazione'
  | 'previsioni-funnel'
  | 'previsioni-report-funnel-rcc'
  | 'previsioni-report-funnel-bu'
  | 'previsioni-utile-mensile-rcc'
  | 'previsioni-utile-mensile-bu'
  | 'processo-offerta-offerte'
  | 'processo-offerta-sintesi-rcc'
  | 'processo-offerta-sintesi-bu'
  | 'processo-offerta-percentuale-successo-rcc'
  | 'processo-offerta-percentuale-successo-bu'
  | 'processo-offerta-incidenza-rcc'
  | 'processo-offerta-incidenza-bu'
  | 'dati-contabili-vendita'
  | 'dati-contabili-acquisti'
  | 'commessa-dettaglio'
type SintesiScope = 'commesse' | 'prodotti'

type AppInfoVoice = {
  menu: string
  voce: string
  sintesi: string
}

type AppInfoResponse = {
  profile: string
  applicazione: string
  items: AppInfoVoice[]
}

type AppInfoSaveRequest = {
  menu: string
  voce: string
  sintesi: string
}

type FilterOption = {
  value: string
  label: string
}

type CommesseSintesiFiltersResponse = {
  profile: string
  anno?: number | null
  anni: FilterOption[]
  commesse: FilterOption[]
  tipologieCommessa: FilterOption[]
  stati: FilterOption[]
  macroTipologie: FilterOption[]
  prodotti: FilterOption[]
  businessUnits: FilterOption[]
  rcc: FilterOption[]
  pm: FilterOption[]
}

type CommesseOptionsResponse = {
  profile: string
  count: number
  items: Array<{
    commessa: string
  }>
}

type AnalisiRccMensileValue = {
  mese: number
  valore: number
}

type AnalisiRccRisultatoMensileRow = {
  aggregazione: string
  budget?: number | null
  valoriMensili: AnalisiRccMensileValue[]
}

type AnalisiRccRisultatoMensileGrid = {
  titolo: string
  mesi: number[]
  valoriPercentuali: boolean
  righe: AnalisiRccRisultatoMensileRow[]
}

type AnalisiRccRisultatoMensileResponse = {
  profile: string
  anno: number
  vediTutto: boolean
  rccFiltro?: string | null
  risultatoPesato: AnalisiRccRisultatoMensileGrid
  percentualePesata: AnalisiRccRisultatoMensileGrid
}

type AnalisiRccRisultatoMensileBurccResponse = {
  profile: string
  anno: number
  vediTutto: boolean
  businessUnitFiltro?: string | null
  rccFiltro?: string | null
  businessUnitDisponibili: string[]
  rccDisponibili: string[]
  risultatoPesato: AnalisiRccRisultatoMensileGrid
  percentualePesata: AnalisiRccRisultatoMensileGrid
}

type AnalisiRccPivotFatturatoRow = {
  anno: number
  rcc: string
  fatturatoAnno: number
  fatturatoFuturoAnno: number
  totaleFatturatoCerto: number
  budgetPrevisto: number
  margineColBudget: number
  percentualeCertaRaggiunta: number
  totaleRicavoIpotetico: number
  totaleRicavoIpoteticoPesato: number
  totaleIpotetico: number
  percentualeCompresoRicavoIpotetico: number
}

type AnalisiRccPivotFatturatoTotaleAnno = {
  anno: number
  fatturatoAnno: number
  fatturatoFuturoAnno: number
  totaleFatturatoCerto: number
  budgetPrevisto: number
  margineColBudget: number
  percentualeCertaRaggiunta: number
  totaleRicavoIpotetico: number
  totaleRicavoIpoteticoPesato: number
  totaleIpotetico: number
  percentualeCompresoRicavoIpotetico: number
}

type AnalisiRccPivotFatturatoResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  rccFiltro?: string | null
  rccDisponibili: string[]
  righe: AnalisiRccPivotFatturatoRow[]
  totaliPerAnno: AnalisiRccPivotFatturatoTotaleAnno[]
}

type AnalisiRccPivotBurccRow = {
  anno: number
  businessUnit: string
  rcc: string
  fatturatoAnno: number
  fatturatoFuturoAnno: number
  totaleFatturatoCerto: number
  budgetPrevisto: number
  margineColBudget: number
  percentualeCertaRaggiunta: number
  totaleRicavoIpotetico: number
  totaleRicavoIpoteticoPesato: number
  totaleIpotetico: number
  percentualeCompresoRicavoIpotetico: number
}

type AnalisiRccPivotBurccResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  businessUnitFiltro?: string | null
  rccFiltro?: string | null
  businessUnitDisponibili: string[]
  rccDisponibili: string[]
  righe: AnalisiRccPivotBurccRow[]
  totaliPerAnno: AnalisiRccPivotFatturatoTotaleAnno[]
}

type AnalisiRccUtileMensileRow = {
  anno: number
  aggregazione: string
  totaleRicavi: number
  totaleCosti: number
  totaleCostoPersonale: number
  totaleUtileSpecifico: number
  totaleOreLavorate: number
  totaleCostoGeneraleRibaltato: number
  percentualeMargineSuRicavi: number
  percentualeMarkupSuCosti: number
  percentualeCostIncome: number
}

type AnalisiRccUtileMensileTotaleAnno = {
  anno: number
  totaleRicavi: number
  totaleCosti: number
  totaleCostoPersonale: number
  totaleUtileSpecifico: number
  totaleOreLavorate: number
  totaleCostoGeneraleRibaltato: number
  percentualeMargineSuRicavi: number
  percentualeMarkupSuCosti: number
  percentualeCostIncome: number
}

type AnalisiRccUtileMensileResponse = {
  profile: string
  anni: number[]
  meseRiferimento: number
  vediTutto: boolean
  aggregazioneFiltro?: string | null
  aggregazioniDisponibili: string[]
  produzione?: number | null
  righe: AnalisiRccUtileMensileRow[]
  totaliPerAnno: AnalisiRccUtileMensileTotaleAnno[]
}

type AnalisiRccPianoFatturazioneRow = {
  rcc: string
  isTotale: boolean
  budget: number
  valoriMensili: AnalisiRccMensileValue[]
  totaleTrim1: number
  percentualeTrim1Cumulata: number
  totaleTrim2: number
  percentualeTrim2Cumulata: number
  totaleTrim3: number
  percentualeTrim3Cumulata: number
  totaleTrim4: number
  percentualeTrim4Cumulata: number
  totaleComplessivo: number
  percentualeTotaleBudget: number
}

type AnalisiRccPianoFatturazioneProgressValue = {
  mese: number
  importoProgressivo: number
  percentualeBudgetProgressiva: number
}

type AnalisiRccPianoFatturazioneProgressRow = {
  rcc: string
  isTotale: boolean
  budget: number
  valoriMensili: AnalisiRccPianoFatturazioneProgressValue[]
  importoTotaleProgressivo: number
  percentualeTotaleBudget: number
}

type AnalisiRccPianoFatturazioneResponse = {
  profile: string
  anno: number
  mesiSnapshot: number[]
  mesiRiferimento: number[]
  tipoCalcolo: string
  vediTutto: boolean
  rccFiltro?: string | null
  rccDisponibili: string[]
  righe: AnalisiRccPianoFatturazioneRow[]
}

type ProcessoOffertaDettaglioRow = {
  id: number
  businessUnit: string
  nomeProdotto: string
  codiceSocieta: string
  rcc: string
  idRcc?: number | null
  anno: number
  annoLavoro?: number | null
  commessa: string
  esito: string
  protocollo: string
  data?: string | null
  tipo: string
  oggetto: string
  statoDocumento: string
  percentualeSuccesso: number
  soluzione: string
  macroTipologia: string
  tipoCommessa: string
  controparte: string
  esitoPositivo?: boolean | null
  esitoPositivoTesto: string
  importoPrevedibile: number
  costoPrevedibile: number
  costoPrevisto: boolean
}

type ProcessoOffertaOfferteResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  ambitoFiltro?: string | null
  esitiDisponibili: string[]
  items: ProcessoOffertaDettaglioRow[]
}

type ProcessoOffertaSintesiRow = {
  anno: number
  aggregazione: string
  tipo: string
  esitoPositivoTesto: string
  numero: number
  importoPrevedibile: number
  costoPrevedibile: number
  percentualeRicarico: number
}

type ProcessoOffertaSintesiResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  ambitoFiltro?: string | null
  esitiDisponibili: string[]
  aggregazioniDisponibili: string[]
  righe: ProcessoOffertaSintesiRow[]
}

type ProcessoOffertaSuccessoCategoria = {
  ricavo: number
  costo: number
  margine: number
  ricarico: number
}

type ProcessoOffertaSuccessoSintesiCategoria = {
  numero: number
  importo: number
  percentualeNumero: number
  percentualeImporto: number
}

type ProcessoOffertaSuccessoSintesiRow = {
  anno: number
  aggregazione: string
  negativo: ProcessoOffertaSuccessoSintesiCategoria
  nonDefinito: ProcessoOffertaSuccessoSintesiCategoria
  positivo: ProcessoOffertaSuccessoSintesiCategoria
  totaleNumero: number
  totaleImporto: number
}

type ProcessoOffertaSuccessoReportRow = {
  anno: number
  aggregazione: string
  negativo: ProcessoOffertaSuccessoCategoria
  nonDefinito: ProcessoOffertaSuccessoCategoria
  positivo: ProcessoOffertaSuccessoCategoria
  totale: ProcessoOffertaSuccessoCategoria
}

type ProcessoOffertaSuccessoReportTotaleAnno = {
  anno: number
  negativo: ProcessoOffertaSuccessoCategoria
  nonDefinito: ProcessoOffertaSuccessoCategoria
  positivo: ProcessoOffertaSuccessoCategoria
  totale: ProcessoOffertaSuccessoCategoria
}

type AnalisiRccFunnelRow = {
  businessUnit: string
  nomeProdotto: string
  codiceSocieta: string
  rcc: string
  idRcc?: number | null
  anno: number
  commessa: string
  esito: string
  protocollo: string
  data?: string | null
  tipo: string
  oggetto: string
  statoDocumento: string
  esitoProtocollo: string
  percentualeSuccesso: number
  budgetRicavo: number
  budgetPersonale: number
  budgetCosti: number
  ricavoAtteso: number
  fatturatoEmesso: number
  fatturatoFuturo: number
  futuraAnno: number
  emessaAnno: number
  totaleAnno: number
  infragruppo: boolean
  soluzione: string
  macroTipologia: string
  controparte: string
}

type AnalisiRccFunnelResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  rccFiltro?: string | null
  rccDisponibili: string[]
  tipiDisponibili: string[]
  statiDocumentoDisponibili: string[]
  items: AnalisiRccFunnelRow[]
}

type AnalisiRccPivotFunnelRow = {
  anno: number
  aggregazione: string
  tipo: string
  percentualeSuccesso: number
  numeroProtocolli: number
  totaleBudgetRicavo: number
  totaleBudgetCosti: number
  totaleFatturatoFuturo: number
  totaleEmessaAnno: number
  totaleFuturaAnno: number
  totaleRicaviComplessivi: number
}

type AnalisiRccPivotFunnelTotaleAnno = {
  anno: number
  numeroProtocolli: number
  percentualeSuccesso: number
  totaleBudgetRicavo: number
  totaleBudgetCosti: number
  totaleFatturatoFuturo: number
  totaleEmessaAnno: number
  totaleFuturaAnno: number
  totaleRicaviComplessivi: number
}

type AnalisiRccPivotFunnelResponse = {
  profile: string
  anni: number[]
  vediTutto: boolean
  aggregazioneFiltro?: string | null
  rccFiltro?: string | null
  aggregazioniDisponibili: string[]
  rccDisponibili: string[]
  righe: AnalisiRccPivotFunnelRow[]
  totaliPerAnno: AnalisiRccPivotFunnelTotaleAnno[]
}

type DatiContabiliVenditaRow = {
  annoFattura?: number | null
  dataMovimento?: string | null
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  statoCommessa: string
  macroTipologia: string
  controparteCommessa: string
  businessUnit: string
  rcc: string
  pm: string
  numeroDocumento: string
  descrizioneMovimento: string
  controparteMovimento: string
  provenienza: string
  importo: number
  fatturato: number
  fatturatoFuturo: number
  ricavoIpotetico: number
  isFuture: boolean
  isScaduta: boolean
  statoTemporale: string
}

type DatiContabiliVenditaResponse = {
  profile: string
  count: number
  items: DatiContabiliVenditaRow[]
}

type DatiContabiliAcquistoRow = {
  annoFattura?: number | null
  dataDocumento?: string | null
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  statoCommessa: string
  macroTipologia: string
  controparteCommessa: string
  businessUnit: string
  rcc: string
  pm: string
  codiceSocieta: string
  descrizioneFattura: string
  controparteMovimento: string
  provenienza: string
  importoComplessivo: number
  importoContabilitaDettaglio: number
  isFuture: boolean
  isScaduta: boolean
  statoTemporale: string
}

type DatiContabiliAcquistoResponse = {
  profile: string
  count: number
  items: DatiContabiliAcquistoRow[]
}

type CommesseRisorseFilterOption = {
  idRisorsa: number
  value: string
  label: string
  inForza: boolean
}

type CommesseRisorseFiltersResponse = {
  profile: string
  mensile: boolean
  anni: FilterOption[]
  commesse: FilterOption[]
  tipologieCommessa: FilterOption[]
  stati: FilterOption[]
  macroTipologie: FilterOption[]
  controparti: FilterOption[]
  businessUnits: FilterOption[]
  rcc: FilterOption[]
  pm: FilterOption[]
  risorse: CommesseRisorseFilterOption[]
}

type CommessaRisorseValutazioneRow = {
  annoCompetenza: number
  meseCompetenza?: number | null
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
  controparte: string
  businessUnit: string
  rcc: string
  pm: string
  idRisorsa: number
  nomeRisorsa: string
  risorsaInForza: boolean
  oreTotali: number
  fatturatoInBaseAdOre: number
  fatturatoInBaseACosto: number
  utileInBaseAdOre: number
  utileInBaseACosto: number
  costoSpecificoRisorsa: number
  idOu?: string
  nomeRuolo?: string
  percentualeUtilizzo?: number
  area?: string
  ouProduzione?: boolean
  codiceSocieta?: string
}

type CommesseRisorseValutazioneResponse = {
  profile: string
  mensile: boolean
  count: number
  anni: number[]
  items: CommessaRisorseValutazioneRow[]
}

type RisorseFiltersForm = {
  anni: string[]
  commessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  controparte: string
  businessUnit: string
  rcc: string
  pm: string
  idRisorsa: string
  vistaCosto: boolean
}

type RisorsePivotFieldKey =
  | 'anno'
  | 'mese'
  | 'commessa'
  | 'tipologiaCommessa'
  | 'stato'
  | 'macroTipologia'
  | 'prodotto'
  | 'controparte'
  | 'businessUnit'
  | 'rcc'
  | 'pm'
  | 'risorsa'

type CommesseRisorsePivotMetrics = {
  numeroCommesse: number
  oreTotali: number
  costoSpecificoRisorsa: number
  fatturato: number
  utile: number
}

type CommesseRisorsePivotRow = CommesseRisorsePivotMetrics & {
  key: string
  level: number
  label: string
  kind: 'gruppo' | 'totale'
}

type SintesiMode = 'dettaglio' | 'aggregato'
type SortDirection = 'asc' | 'desc'
type SortColumn =
  | 'anno'
  | 'commessa'
  | 'descrizioneCommessa'
  | 'tipologiaCommessa'
  | 'stato'
  | 'macroTipologia'
  | 'controparte'
  | 'prodotto'
  | 'businessUnit'
  | 'rcc'
  | 'pm'
  | 'oreLavorate'
  | 'costoPersonale'
  | 'ricavi'
  | 'costi'
  | 'utileSpecifico'
  | 'ricaviFuturi'
  | 'costiFuturi'

type SintesiFiltersForm = {
  anni: string[]
  commessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
  businessUnit: string
  rcc: string
  pm: string
  provenienza: string
  soloScadute: boolean
  escludiProdotti: boolean
}

type CommessaSintesiRow = {
  anno?: number | null
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
  controparte: string
  businessUnit: string
  rcc: string
  pm: string
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  utileSpecifico: number
  ricaviFuturi: number
  costiFuturi: number
}

type CommesseSintesiResponse = {
  profile: string
  count: number
  items: CommessaSintesiRow[]
}

type CommessaAndamentoMensileRow = {
  annoCompetenza: number
  meseCompetenza: number
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
  controparte: string
  businessUnit: string
  rcc: string
  pm: string
  produzione: boolean
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  costoGeneraleRibaltato: number
  utileSpecifico: number
}

type CommesseAndamentoMensileResponse = {
  profile: string
  count: number
  items: CommessaAndamentoMensileRow[]
}

type DatiAnnualiPivotFieldKey =
  | 'anno'
  | 'controparte'
  | 'tipologiaCommessa'
  | 'rcc'
  | 'businessUnit'
  | 'pm'
  | 'macroTipologia'
  | 'prodotto'

type CommesseDatiAnnualiPivotMetrics = {
  numeroCommesse: number
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  utileSpecifico: number
  ricaviFuturi: number
  costiFuturi: number
}

type CommesseDatiAnnualiPivotRow = CommesseDatiAnnualiPivotMetrics & {
  key: string
  level: number
  anno?: number | null
  label: string
  kind: 'anno' | 'gruppo' | 'totale'
}

type CommesseDatiAnnualiPivotData = {
  profile: string
  anni: number[]
  items: CommessaSintesiRow[]
}

type CommessaDettaglioAnagrafica = {
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
  controparte: string
  businessUnit: string
  rcc: string
  pm: string
}

type CommessaDettaglioAnnoRow = {
  anno: number
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  utileSpecifico: number
  ricaviFuturi: number
  costiFuturi: number
}

type CommessaDettaglioMeseRow = {
  anno: number
  mese: number
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  utileSpecifico: number
  ricaviFuturi: number
  costiFuturi: number
}

type CommessaRequisitoOreSummaryRow = {
  idRequisito: number
  requisito: string
  orePreviste: number
  oreSpese: number
  oreRestanti: number
  percentualeAvanzamento: number
}

type CommessaRequisitoOreRisorsaRow = {
  idRequisito: number
  requisito: string
  idRisorsa: number
  nomeRisorsa: string
  orePreviste: number
  oreSpese: number
  oreRestanti: number
  percentualeAvanzamento: number
}

type CommessaOrdineRow = {
  protocollo: string
  documentoStato: string
  posizione: string
  idDettaglioOrdine: number
  descrizione: string
  quantita: number
  prezzoUnitario: number
  importoOrdine: number
  quantitaOriginaleOrdinata: number
  quantitaFatture: number
}

type CommessaOffertaRow = {
  protocollo: string
  anno?: number | null
  data?: string | null
  oggetto: string
  documentoStato: string
  ricavoPrevisto: number
  costoPrevisto: number
  costoPrevistoPersonale: number
  orePrevisteOfferta: number
  percentualeSuccesso: number
  ordiniCollegati: string
}

type CommessaAvanzamentoRow = {
  id: number
  idCommessa: number
  percentualeRaggiunto: number
  importoRiferimento: number
  dataRiferimento?: string | null
  dataSalvataggio?: string | null
  idAutore: number
}

type CommesseDettaglioResponse = {
  profile: string
  commessa: string
  currentYear: number
  currentMonth: number
  anagrafica?: CommessaDettaglioAnagrafica | null
  anniStorici: CommessaDettaglioAnnoRow[]
  annoCorrenteProgressivo?: CommessaDettaglioAnnoRow | null
  mesiAnnoCorrente?: CommessaDettaglioMeseRow[]
  vendite: CommessaFatturaMovimentoRow[]
  acquisti: CommessaFatturaMovimentoRow[]
  fatturatoPivot: CommessaFatturatoPivotRow[]
  ordini?: CommessaOrdineRow[]
  offerte?: CommessaOffertaRow[]
  avanzamentoSalvato?: CommessaAvanzamentoRow | null
  avanzamentoStorico?: CommessaAvanzamentoRow[]
  dataConsuntivoAttivita?: string | null
  percentualeRaggiuntoProposta?: number
  requisitiOre?: CommessaRequisitoOreSummaryRow[]
  requisitiOreRisorse?: CommessaRequisitoOreRisorsaRow[]
}

type CommessaFatturaMovimentoRow = {
  dataMovimento?: string | null
  numeroDocumento: string
  descrizione: string
  controparte: string
  provenienza: string
  importo: number
  isFuture: boolean
  statoTemporale: string
}

type CommessaFatturatoPivotRow = {
  anno?: number | null
  rcc: string
  totaleFatturato: string
  totaleFatturatoFuturo: string
  totaleRicavoIpotetico: string
  totaleRicavoIpoteticoPesato: string
  totaleComplessivo: string
  budget: string
  percentualeRaggiungimento: string
}

type ProdottiGroupSummaryRow = {
  prodotto: string
  oreLavorate: number
  costoPersonale: number
  ricavi: number
  costi: number
  utileSpecifico: number
  ricaviFuturi: number
  costiFuturi: number
}

type ProdottoGroup = {
  productKey: string
  summary: ProdottiGroupSummaryRow
  rows: CommessaSintesiRow[]
}

type SintesiTableRow =
  | { kind: 'commessa'; row: CommessaSintesiRow; key: string }
  | {
    kind: 'prodotto-summary'
    row: ProdottiGroupSummaryRow
    key: string
    productKey: string
    isCollapsed: boolean
    commesseCount: number
  }

const tokenStorageKey = 'produzione.jwt'
const redirectGuardKey = 'produzione.sso.redirecting'
const impersonationStorageKey = 'produzione.sso.actas'
const impersonationHeaderName = 'X-Act-As-Username'
const sintesiStateStorageKey = 'produzione.sintesi.state'
const analisiCommesseAllowedProfiles = ['Supervisore', 'Responsabile Produzione', 'Responsabile Commerciale', 'Project Manager', 'Responsabile Commerciale Commessa', 'General Project Manager', 'Responsabile OU']
const datiContabiliAllowedProfiles = ['Supervisore', 'Responsabile Produzione', 'Responsabile Commerciale', 'Project Manager', 'Responsabile Commerciale Commessa', 'General Project Manager', 'Responsabile OU']
const risultatiRisorseAllowedProfiles = ['Supervisore', 'Responsabile Produzione', 'Responsabile Commerciale', 'Responsabile Commerciale Commessa', 'General Project Manager', 'Responsabile OU', 'Risorse Umane']
const analisiRccAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Commerciale Commessa']
const analisiRccPivotRccSelectableProfiles = ['Supervisore', 'Responsabile Commerciale']
const analisiBuAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile OU']
const analisiBuPivotBuSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
const analisiBurccAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa', 'Responsabile OU']
const previsioniFunnelRccAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa']
const previsioniFunnelRccSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
const previsioniFunnelBuAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile OU']
const previsioniFunnelBuSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
const previsioniUtileMensileRccAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa', 'Responsabile OU']
const previsioniUtileMensileRccSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
const previsioniUtileMensileBuAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa', 'Responsabile OU']
const previsioniUtileMensileBuSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile OU']
const analisiPianoFatturazioneAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa']
const analisiPianoFatturazioneSelectableProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione']
const processoOffertaAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Produzione', 'Responsabile Commerciale Commessa', 'Responsabile OU']
const analisiSearchCollapsiblePages = new Set<AppPage>([
  'commesse-andamento-mensile',
  'risorse-risultati',
  'risorse-risultati-pivot',
  'risorse-risultati-mensile',
  'risorse-risultati-mensile-pivot',
  'risorse-ou-risorse',
  'risorse-ou-risorse-pivot',
  'risorse-ou',
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
  'previsioni-funnel',
  'previsioni-report-funnel-rcc',
  'previsioni-report-funnel-bu',
  'previsioni-utile-mensile-rcc',
  'previsioni-utile-mensile-bu',
])
const datiAnnualiPivotFieldOptions: Array<{ key: DatiAnnualiPivotFieldKey; label: string }> = [
  { key: 'anno', label: 'Anno' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'rcc', label: 'RCC' },
  { key: 'pm', label: 'PM' },
  { key: 'macroTipologia', label: 'Macrotipologia' },
  { key: 'controparte', label: 'Controparte' },
  { key: 'tipologiaCommessa', label: 'Tipo Commessa' },
  { key: 'prodotto', label: 'Prodotto' },
]
const datiAnnualiPivotFieldSet = new Set<DatiAnnualiPivotFieldKey>(
  datiAnnualiPivotFieldOptions.map((option) => option.key),
)
const risorsePivotFieldOptions: Array<{ key: RisorsePivotFieldKey; label: string }> = [
  { key: 'anno', label: 'Anno' },
  { key: 'mese', label: 'Mese' },
  { key: 'risorsa', label: 'Risorsa' },
  { key: 'businessUnit', label: 'BU' },
  { key: 'rcc', label: 'RCC' },
  { key: 'pm', label: 'PM' },
  { key: 'macroTipologia', label: 'Macrotipologia' },
  { key: 'controparte', label: 'Controparte' },
  { key: 'tipologiaCommessa', label: 'Tipologia Commessa' },
  { key: 'prodotto', label: 'Prodotto' },
  { key: 'commessa', label: 'Commessa' },
  { key: 'stato', label: 'Stato' },
]
const risorsePivotFieldSet = new Set<RisorsePivotFieldKey>(
  risorsePivotFieldOptions.map((option) => option.key),
)

type SintesiPersistedState = {
  profile: string
  impersonation: string
  activePage: AppPage
  mode: SintesiMode
  commessaSearch: string
  sortColumn: SortColumn
  sortDirection: SortDirection
  filters: SintesiFiltersForm
  rows: CommessaSintesiRow[]
  searched: boolean
}

const emptySintesiFiltersForm: SintesiFiltersForm = {
  anni: [],
  commessa: '',
  tipologiaCommessa: '',
  stato: '',
  macroTipologia: '',
  prodotto: '',
  businessUnit: '',
  rcc: '',
  pm: '',
  provenienza: '',
  soloScadute: false,
  escludiProdotti: false,
}

const emptyFiltersCatalog: CommesseSintesiFiltersResponse = {
  profile: '',
  anno: null,
  anni: [],
  commesse: [],
  tipologieCommessa: [],
  stati: [],
  macroTipologie: [],
  prodotti: [],
  businessUnits: [],
  rcc: [],
  pm: [],
}

const emptyRisorseFiltersForm: RisorseFiltersForm = {
  anni: [],
  commessa: '',
  tipologiaCommessa: '',
  stato: '',
  macroTipologia: '',
  controparte: '',
  businessUnit: '',
  rcc: '',
  pm: '',
  idRisorsa: '',
  vistaCosto: false,
}

const emptyRisorseFiltersCatalog: CommesseRisorseFiltersResponse = {
  profile: '',
  mensile: false,
  anni: [],
  commesse: [],
  tipologieCommessa: [],
  stati: [],
  macroTipologie: [],
  controparti: [],
  businessUnits: [],
  rcc: [],
  pm: [],
  risorse: [],
}

const normalizeDateKey = (value?: string | Date | null) => {
  if (!value) {
    return ''
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return ''
    }

    const year = value.getFullYear()
    const month = (value.getMonth() + 1).toString().padStart(2, '0')
    const day = value.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const literalPrefix = value.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(literalPrefix)) {
    return literalPrefix
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const year = parsed.getFullYear()
  const month = (parsed.getMonth() + 1).toString().padStart(2, '0')
  const day = parsed.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizePercentTo100 = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0
  const scaledValue = Math.abs(safeValue) <= 1 ? safeValue * 100 : safeValue
  return Math.min(100, Math.max(0, scaledValue))
}

const mesiItaliani = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
] as const

const getDefaultReferenceMonth = () => {
  const currentMonth = new Date().getMonth() + 1
  return currentMonth <= 1 ? 12 : currentMonth - 1
}

const parseReferenceMonthStrict = (value?: string | number | null) => {
  const numericValue = typeof value === 'number'
    ? value
    : Number.parseInt((value ?? '').toString().trim(), 10)
  return numericValue >= 1 && numericValue <= 12
    ? numericValue
    : null
}

const parseReferenceMonth = (value?: string | number | null) => {
  return parseReferenceMonthStrict(value) ?? getDefaultReferenceMonth()
}

const formatReferenceMonthLabel = (month: number) => {
  const normalizedMonth = parseReferenceMonth(month)
  return `${normalizedMonth.toString().padStart(2, '0')} - ${mesiItaliani[normalizedMonth - 1]}`
}

const normalizeTextForMatch = (value: string) => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
)

const isProcessoOffertaEsitoPositivo = (value: string) => {
  const normalized = normalizeTextForMatch(value)
  if (!normalized) {
    return false
  }

  return (
    normalized === 'si' ||
    normalized === 'true' ||
    normalized === 'vero' ||
    normalized === '1' ||
    normalized === 'ok' ||
    normalized.startsWith('positiv') ||
    normalized.includes('success') ||
    normalized.includes('vint')
  )
}

type ProcessoOffertaEsitoBucket = 'negativo' | 'non-definito' | 'positivo'

const getProcessoOffertaEsitoBucket = (value: string): ProcessoOffertaEsitoBucket => {
  if (isProcessoOffertaEsitoPositivo(value)) {
    return 'positivo'
  }

  const normalized = normalizeTextForMatch(value)
  if (!normalized) {
    return 'non-definito'
  }

  if (
    normalized === 'no' ||
    normalized === 'false' ||
    normalized === 'falso' ||
    normalized === '0' ||
    normalized.startsWith('negativ') ||
    normalized.includes('pers')
  ) {
    return 'negativo'
  }

  return 'non-definito'
}

const isValidProductValue = (value: string) => {
  const normalized = value.trim()
  if (!normalized) {
    return false
  }

  const upper = normalized.toUpperCase()
  return upper !== 'NON DEFINITO' && upper !== 'NON DEFINTO'
}

const toSafeNumber = (value: unknown) => {
  const numericValue = typeof value === 'number'
    ? value
    : Number.parseFloat((value ?? '').toString())
  return Number.isFinite(numericValue) ? numericValue : 0
}

const normalizeFilterText = (value: string) => (
  value
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
)

const normalizePersonFilterLabel = (value: string) => {
  const normalized = normalizeFilterText(value)
  if (!normalized) {
    return ''
  }

  const tokens = normalized.split(' ')
  if (tokens.length >= 4 && tokens.length % 2 === 0) {
    const half = tokens.length / 2
    const left = tokens.slice(0, half).join(' ')
    const right = tokens.slice(half).join(' ')
    if (left.localeCompare(right, 'it', { sensitivity: 'base' }) === 0) {
      return left
    }
  }

  return normalized
}

const distinctFilterOptionsForUi = (options: FilterOption[]) => {
  const map = new Map<string, FilterOption>()
  options.forEach((option) => {
    const normalizedValue = normalizeFilterText(option.value ?? '')
    const normalizedLabel = normalizeFilterText(option.label ?? option.value ?? '')
    const safeValue = normalizedValue || normalizedLabel
    const safeLabel = normalizedLabel || safeValue
    if (!safeValue) {
      return
    }

    const key = `${safeLabel.toLocaleLowerCase('it-IT')}|${safeValue.toLocaleLowerCase('it-IT')}`
    if (!map.has(key)) {
      map.set(key, {
        value: safeValue,
        label: safeLabel,
      })
    }
  })

  return [...map.values()].sort((left, right) => (
    left.label.localeCompare(right.label, 'it', { sensitivity: 'base' })
  ))
}

const distinctPersonFilterOptionsForUi = (options: FilterOption[]) => {
  const map = new Map<string, FilterOption>()
  options.forEach((option) => {
    const normalizedValue = normalizeFilterText(option.value ?? '')
    const normalizedLabel = normalizePersonFilterLabel(option.label ?? option.value ?? '')
    const safeValue = normalizedValue || normalizedLabel
    const safeLabel = normalizedLabel || safeValue
    if (!safeValue || !safeLabel) {
      return
    }

    const key = safeLabel.toLocaleLowerCase('it-IT')
    if (!map.has(key)) {
      map.set(key, {
        value: safeValue,
        label: safeLabel,
      })
    }
  })

  return [...map.values()].sort((left, right) => (
    left.label.localeCompare(right.label, 'it', { sensitivity: 'base' })
  ))
}

const mergeFilterOptionValues = (
  options: FilterOption[],
  selectedValue: string,
  rowValues: string[] = [],
) => {
  const values = new Set<string>()
  options.forEach((option) => {
    const normalized = normalizeFilterText(option.value)
    if (normalized) {
      values.add(normalized)
    }
  })
  rowValues.forEach((value) => {
    const normalized = normalizeFilterText(value)
    if (normalized) {
      values.add(normalized)
    }
  })
  const selected = normalizeFilterText(selectedValue)
  if (selected) {
    values.add(selected)
  }
  return [...values].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
}

const buildPersonSelectItems = (values: string[]) => {
  const map = new Map<string, { value: string; label: string }>()
  values.forEach((rawValue) => {
    const normalizedValue = normalizeFilterText(rawValue)
    const normalizedLabel = normalizePersonFilterLabel(rawValue)
    const safeValue = normalizedValue || normalizedLabel
    const safeLabel = normalizedLabel || safeValue
    if (!safeValue || !safeLabel) {
      return
    }

    const key = safeLabel.toLocaleLowerCase('it-IT')
    if (!map.has(key)) {
      map.set(key, { value: safeValue, label: safeLabel })
    }
  })

  return [...map.values()].sort((left, right) => (
    left.label.localeCompare(right.label, 'it', { sensitivity: 'base' })
  ))
}

const normalizePivotGroupValue = (value: string) => {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : '(vuoto)'
}

const asDatiAnnualiPivotFieldKeys = (values: string[]) => (
  values.filter((value): value is DatiAnnualiPivotFieldKey => (
    datiAnnualiPivotFieldSet.has(value as DatiAnnualiPivotFieldKey)
  ))
)

const extractDatiAnnualiPivotFieldValue = (row: CommessaSintesiRow, fieldKey: DatiAnnualiPivotFieldKey) => {
  switch (fieldKey) {
    case 'anno':
      return Number.isFinite(row.anno ?? NaN) && (row.anno ?? 0) > 0
        ? (row.anno ?? 0).toString()
        : ''
    case 'controparte':
      return row.controparte
    case 'tipologiaCommessa':
      return row.tipologiaCommessa
    case 'rcc':
      return row.rcc
    case 'businessUnit':
      return row.businessUnit
    case 'pm':
      return row.pm
    case 'macroTipologia':
      return row.macroTipologia
    case 'prodotto':
      return row.prodotto
    default:
      return ''
  }
}

const buildDatiAnnualiPivotMetrics = (rows: CommessaSintesiRow[]): CommesseDatiAnnualiPivotMetrics => {
  const commesse = new Set<string>()
  let oreLavorate = 0
  let costoPersonale = 0
  let ricavi = 0
  let costi = 0
  let utileSpecifico = 0
  let ricaviFuturi = 0
  let costiFuturi = 0

  rows.forEach((row) => {
    const commessa = row.commessa.trim()
    if (commessa) {
      commesse.add(commessa.toUpperCase())
    }
    oreLavorate += row.oreLavorate
    costoPersonale += row.costoPersonale
    ricavi += row.ricavi
    costi += row.costi
    utileSpecifico += row.utileSpecifico
    ricaviFuturi += row.ricaviFuturi
    costiFuturi += row.costiFuturi
  })

  return {
    numeroCommesse: commesse.size,
    oreLavorate,
    costoPersonale,
    ricavi,
    costi,
    utileSpecifico,
    ricaviFuturi,
    costiFuturi,
  }
}

const asRisorsePivotFieldKeys = (values: string[]) => (
  values.filter((value): value is RisorsePivotFieldKey => (
    risorsePivotFieldSet.has(value as RisorsePivotFieldKey)
  ))
)

const normalizeRisorsaLabel = (row: CommessaRisorseValutazioneRow) => {
  const nome = (row.nomeRisorsa ?? '').trim()
  if (!nome) {
    return row.idRisorsa > 0 ? `ID ${row.idRisorsa}` : ''
  }
  return row.risorsaInForza ? nome : `^ ${nome}`
}

const extractRisorsePivotFieldValue = (row: CommessaRisorseValutazioneRow, fieldKey: RisorsePivotFieldKey) => {
  switch (fieldKey) {
    case 'anno':
      return Number.isFinite(row.annoCompetenza) && row.annoCompetenza > 0
        ? row.annoCompetenza.toString()
        : ''
    case 'mese':
      return Number.isFinite(row.meseCompetenza ?? NaN) && (row.meseCompetenza ?? 0) > 0
        ? (row.meseCompetenza ?? 0).toString().padStart(2, '0')
        : ''
    case 'commessa':
      return row.commessa
    case 'tipologiaCommessa':
      return row.tipologiaCommessa
    case 'stato':
      return row.stato
    case 'macroTipologia':
      return row.macroTipologia
    case 'prodotto':
      return row.prodotto
    case 'controparte':
      return row.controparte
    case 'businessUnit':
      return row.businessUnit
    case 'rcc':
      return row.rcc
    case 'pm':
      return row.pm
    case 'risorsa':
      return normalizeRisorsaLabel(row)
    default:
      return ''
  }
}

const buildRisorsePivotMetrics = (
  rows: CommessaRisorseValutazioneRow[],
  vistaCosto: boolean,
): CommesseRisorsePivotMetrics => {
  const commesse = new Set<string>()
  let oreTotali = 0
  let costoSpecificoRisorsa = 0
  let fatturato = 0
  let utile = 0

  rows.forEach((row) => {
    const commessa = row.commessa.trim()
    if (commessa) {
      commesse.add(commessa.toUpperCase())
    }
    oreTotali += row.oreTotali
    costoSpecificoRisorsa += row.costoSpecificoRisorsa
    fatturato += vistaCosto ? row.fatturatoInBaseACosto : row.fatturatoInBaseAdOre
    utile += vistaCosto ? row.utileInBaseACosto : row.utileInBaseAdOre
  })

  return {
    numeroCommesse: commesse.size,
    oreTotali,
    costoSpecificoRisorsa,
    fatturato,
    utile,
  }
}

const normalizePivotFunnelResponse = (raw: unknown): AnalisiRccPivotFunnelResponse => {
  const source = (raw ?? {}) as Partial<AnalisiRccPivotFunnelResponse> & { [key: string]: unknown }
  const righeRaw = Array.isArray(source.righe) ? source.righe : []
  const totaliRaw = Array.isArray(source.totaliPerAnno) ? source.totaliPerAnno : []

  return {
    profile: (source.profile ?? '').toString(),
    anni: (Array.isArray(source.anni) ? source.anni : [])
      .map((value) => Number.parseInt((value ?? '').toString(), 10))
      .filter((value) => Number.isFinite(value) && value > 0),
    vediTutto: Boolean(source.vediTutto),
    aggregazioneFiltro: source.aggregazioneFiltro == null ? null : source.aggregazioneFiltro.toString(),
    rccFiltro: source.rccFiltro == null ? null : source.rccFiltro.toString(),
    aggregazioniDisponibili: (Array.isArray(source.aggregazioniDisponibili) ? source.aggregazioniDisponibili : [])
      .map((value) => (value ?? '').toString())
      .filter((value) => value.trim().length > 0),
    rccDisponibili: (Array.isArray(source.rccDisponibili) ? source.rccDisponibili : [])
      .map((value) => (value ?? '').toString())
      .filter((value) => value.trim().length > 0),
    righe: righeRaw.map((row): AnalisiRccPivotFunnelRow => {
      const item = (row ?? {}) as Partial<AnalisiRccPivotFunnelRow> & { [key: string]: unknown }
      return {
        anno: Number.parseInt((item.anno ?? '').toString(), 10) || 0,
        aggregazione: (item.aggregazione ?? '').toString(),
        tipo: (item.tipo ?? '').toString(),
        percentualeSuccesso: toSafeNumber(item.percentualeSuccesso),
        numeroProtocolli: Math.trunc(toSafeNumber(item.numeroProtocolli)),
        totaleBudgetRicavo: toSafeNumber(item.totaleBudgetRicavo),
        totaleBudgetCosti: toSafeNumber(item.totaleBudgetCosti),
        totaleFatturatoFuturo: toSafeNumber(item.totaleFatturatoFuturo),
        totaleEmessaAnno: toSafeNumber(item.totaleEmessaAnno),
        totaleFuturaAnno: toSafeNumber(item.totaleFuturaAnno),
        totaleRicaviComplessivi: toSafeNumber(item.totaleRicaviComplessivi),
      }
    }),
    totaliPerAnno: totaliRaw.map((row): AnalisiRccPivotFunnelTotaleAnno => {
      const item = (row ?? {}) as Partial<AnalisiRccPivotFunnelTotaleAnno> & { [key: string]: unknown }
      return {
        anno: Number.parseInt((item.anno ?? '').toString(), 10) || 0,
        numeroProtocolli: Math.trunc(toSafeNumber(item.numeroProtocolli)),
        percentualeSuccesso: toSafeNumber(item.percentualeSuccesso),
        totaleBudgetRicavo: toSafeNumber(item.totaleBudgetRicavo),
        totaleBudgetCosti: toSafeNumber(item.totaleBudgetCosti),
        totaleFatturatoFuturo: toSafeNumber(item.totaleFatturatoFuturo),
        totaleEmessaAnno: toSafeNumber(item.totaleEmessaAnno),
        totaleFuturaAnno: toSafeNumber(item.totaleFuturaAnno),
        totaleRicaviComplessivi: toSafeNumber(item.totaleRicaviComplessivi),
      }
    }),
  }
}

const pageToScope = (page: AppPage): SintesiScope => (
  page === 'prodotti-sintesi' ? 'prodotti' : 'commesse'
)

const appInfoVoicesDefault: AppInfoVoice[] = [
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
    voce: 'Analisi OU',
    sintesi: 'Vista OU aggregata per monitorare l andamento economico del perimetro organizzativo con dettaglio coerente alle regole di accesso del profilo.',
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

function App() {
  const [token, setToken] = useState('')
  const [apiHealth, setApiHealth] = useState('n/d')
  const [statusMessage, setStatusMessage] = useState('')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [profiles, setProfiles] = useState<string[]>([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [ouScopes, setOuScopes] = useState<string[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)
  const [isRedirectingToAuth, setIsRedirectingToAuth] = useState(false)
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const [activePage, setActivePage] = useState<AppPage>('none')
  const [lastSintesiPage, setLastSintesiPage] = useState<'commesse-sintesi' | 'commesse-andamento-mensile' | 'commesse-dati-annuali-aggregati' | 'prodotti-sintesi' | 'dati-contabili-vendita' | 'dati-contabili-acquisti'>('commesse-sintesi')
  const [activeImpersonation, setActiveImpersonation] = useState('')
  const [impersonationInput, setImpersonationInput] = useState('')
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [appInfoModalOpen, setAppInfoModalOpen] = useState(false)
  const [appInfoVoices, setAppInfoVoices] = useState<AppInfoVoice[]>(appInfoVoicesDefault)
  const [appInfoDrafts, setAppInfoDrafts] = useState<Record<string, string>>({})
  const [appInfoLoading, setAppInfoLoading] = useState(false)
  const [appInfoSavingKey, setAppInfoSavingKey] = useState('')
  const [appInfoStatus, setAppInfoStatus] = useState('')
  const [impersonationModalOpen, setImpersonationModalOpen] = useState(false)
  const [sintesiMode, setSintesiMode] = useState<SintesiMode>('dettaglio')
  const [commessaSearch, setCommessaSearch] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>('commessa')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [sintesiFiltersForm, setSintesiFiltersForm] = useState<SintesiFiltersForm>(emptySintesiFiltersForm)
  const [sintesiFiltersCatalog, setSintesiFiltersCatalog] = useState<CommesseSintesiFiltersResponse>(emptyFiltersCatalog)
  const [sintesiCommesseOptions, setSintesiCommesseOptions] = useState<FilterOption[]>([])
  const [sintesiRows, setSintesiRows] = useState<CommessaSintesiRow[]>([])
  const [sintesiSearched, setSintesiSearched] = useState(false)
  const [sintesiLoadingFilters, setSintesiLoadingFilters] = useState(false)
  const [sintesiFilterLoadingDetail, setSintesiFilterLoadingDetail] = useState('')
  const [sintesiLoadingData, setSintesiLoadingData] = useState(false)
  const [detailCommessa, setDetailCommessa] = useState('')
  const [detailData, setDetailData] = useState<CommesseDettaglioResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailStatusMessage, setDetailStatusMessage] = useState('')
  const [detailRouteProcessed, setDetailRouteProcessed] = useState(false)
  const [detailPercentRaggiuntoInput, setDetailPercentRaggiuntoInput] = useState('')
  const [selectedRequisitoId, setSelectedRequisitoId] = useState<number | null>(null)
  const [collapsedProductKeys, setCollapsedProductKeys] = useState<string[]>([])
  const [analisiRccAnno, setAnalisiRccAnno] = useState(new Date().getFullYear().toString())
  const [analisiRccLoading, setAnalisiRccLoading] = useState(false)
  const [analisiRccData, setAnalisiRccData] = useState<AnalisiRccRisultatoMensileResponse | null>(null)
  const [analisiRccPivotData, setAnalisiRccPivotData] = useState<AnalisiRccPivotFatturatoResponse | null>(null)
  const [analisiRccPivotAnni, setAnalisiRccPivotAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [analisiRccPivotRcc, setAnalisiRccPivotRcc] = useState('')
  const [analisiBuAnno, setAnalisiBuAnno] = useState(new Date().getFullYear().toString())
  const [analisiBuData, setAnalisiBuData] = useState<AnalisiRccRisultatoMensileResponse | null>(null)
  const [analisiBuPivotData, setAnalisiBuPivotData] = useState<AnalisiRccPivotFatturatoResponse | null>(null)
  const [analisiBuPivotAnni, setAnalisiBuPivotAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [analisiBuPivotBusinessUnit, setAnalisiBuPivotBusinessUnit] = useState('')
  const [analisiBurccAnno, setAnalisiBurccAnno] = useState(new Date().getFullYear().toString())
  const [analisiBurccBusinessUnit, setAnalisiBurccBusinessUnit] = useState('')
  const [analisiBurccRcc, setAnalisiBurccRcc] = useState('')
  const [analisiBurccData, setAnalisiBurccData] = useState<AnalisiRccRisultatoMensileBurccResponse | null>(null)
  const [analisiBurccPivotData, setAnalisiBurccPivotData] = useState<AnalisiRccPivotBurccResponse | null>(null)
  const [analisiBurccPivotAnni, setAnalisiBurccPivotAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [analisiBurccPivotBusinessUnit, setAnalisiBurccPivotBusinessUnit] = useState('')
  const [analisiBurccPivotRcc, setAnalisiBurccPivotRcc] = useState('')
  const [analisiPianoFatturazioneAnno, setAnalisiPianoFatturazioneAnno] = useState(new Date().getFullYear().toString())
  const [analisiPianoFatturazioneMesiSnapshot, setAnalisiPianoFatturazioneMesiSnapshot] = useState<string[]>([])
  const [analisiPianoFatturazioneTipoCalcolo, setAnalisiPianoFatturazioneTipoCalcolo] = useState('complessivo')
  const [analisiPianoFatturazioneRcc, setAnalisiPianoFatturazioneRcc] = useState('')
  const [analisiPianoFatturazioneData, setAnalisiPianoFatturazioneData] = useState<AnalisiRccPianoFatturazioneResponse | null>(null)
  const [commesseAndamentoMensileAnni, setCommesseAndamentoMensileAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [commesseAndamentoMensileMese, setCommesseAndamentoMensileMese] = useState('')
  const [commesseAndamentoMensileTipologia, setCommesseAndamentoMensileTipologia] = useState('')
  const [commesseAndamentoMensileBusinessUnit, setCommesseAndamentoMensileBusinessUnit] = useState('')
  const [commesseAndamentoMensileRcc, setCommesseAndamentoMensileRcc] = useState('')
  const [commesseAndamentoMensilePm, setCommesseAndamentoMensilePm] = useState('')
  const [commesseAndamentoMensileData, setCommesseAndamentoMensileData] = useState<CommesseAndamentoMensileResponse | null>(null)
  const [commesseDatiAnnualiAnni, setCommesseDatiAnnualiAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [commesseDatiAnnualiSelectedFields, setCommesseDatiAnnualiSelectedFields] = useState<DatiAnnualiPivotFieldKey[]>(['anno'])
  const [commesseDatiAnnualiMacroTipologie, setCommesseDatiAnnualiMacroTipologie] = useState<string[]>([])
  const [commesseDatiAnnualiAvailableSelection, setCommesseDatiAnnualiAvailableSelection] = useState<DatiAnnualiPivotFieldKey[]>([])
  const [commesseDatiAnnualiSelectedSelection, setCommesseDatiAnnualiSelectedSelection] = useState<DatiAnnualiPivotFieldKey[]>([])
  const [commesseDatiAnnualiData, setCommesseDatiAnnualiData] = useState<CommesseDatiAnnualiPivotData | null>(null)
  const [commesseDatiAnnualiFiltersCollapsed, setCommesseDatiAnnualiFiltersCollapsed] = useState(false)
  const [risorseFiltersForm, setRisorseFiltersForm] = useState<RisorseFiltersForm>(emptyRisorseFiltersForm)
  const [risorseFiltersCatalog, setRisorseFiltersCatalog] = useState<CommesseRisorseFiltersResponse>(emptyRisorseFiltersCatalog)
  const [risorseRows, setRisorseRows] = useState<CommessaRisorseValutazioneRow[]>([])
  const [risorseSearched, setRisorseSearched] = useState(false)
  const [risorseLoadingFilters, setRisorseLoadingFilters] = useState(false)
  const [risorseCommessaSearch, setRisorseCommessaSearch] = useState('')
  const [risorseRisorsaSearch, setRisorseRisorsaSearch] = useState('')
  const [risorsePivotSelectedFields, setRisorsePivotSelectedFields] = useState<RisorsePivotFieldKey[]>(['anno', 'risorsa'])
  const [risorsePivotAvailableSelection, setRisorsePivotAvailableSelection] = useState<RisorsePivotFieldKey[]>([])
  const [risorsePivotSelectedSelection, setRisorsePivotSelectedSelection] = useState<RisorsePivotFieldKey[]>([])
  const [previsioniUtileMensileRccAnno, setPrevisioniUtileMensileRccAnno] = useState(new Date().getFullYear().toString())
  const [previsioniUtileMensileRccMeseRiferimento, setPrevisioniUtileMensileRccMeseRiferimento] = useState(getDefaultReferenceMonth().toString())
  const [previsioniUtileMensileRcc, setPrevisioniUtileMensileRcc] = useState('')
  const [previsioniUtileMensileRccProduzione, setPrevisioniUtileMensileRccProduzione] = useState('')
  const [previsioniUtileMensileRccData, setPrevisioniUtileMensileRccData] = useState<AnalisiRccUtileMensileResponse | null>(null)
  const [previsioniUtileMensileBuAnno, setPrevisioniUtileMensileBuAnno] = useState(new Date().getFullYear().toString())
  const [previsioniUtileMensileBuMeseRiferimento, setPrevisioniUtileMensileBuMeseRiferimento] = useState(getDefaultReferenceMonth().toString())
  const [previsioniUtileMensileBu, setPrevisioniUtileMensileBu] = useState('')
  const [previsioniUtileMensileBuProduzione, setPrevisioniUtileMensileBuProduzione] = useState('')
  const [previsioniUtileMensileBuData, setPrevisioniUtileMensileBuData] = useState<AnalisiRccUtileMensileResponse | null>(null)
  const [previsioniFunnelAnni, setPrevisioniFunnelAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [previsioniFunnelRcc, setPrevisioniFunnelRcc] = useState('')
  const [previsioniFunnelTipo, setPrevisioniFunnelTipo] = useState('')
  const [previsioniFunnelStatoDocumento, setPrevisioniFunnelStatoDocumento] = useState('')
  const [previsioniFunnelData, setPrevisioniFunnelData] = useState<AnalisiRccFunnelResponse | null>(null)
  const [previsioniReportFunnelRccAnni, setPrevisioniReportFunnelRccAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [previsioniReportFunnelRcc, setPrevisioniReportFunnelRcc] = useState('')
  const [previsioniReportFunnelRccData, setPrevisioniReportFunnelRccData] = useState<AnalisiRccPivotFunnelResponse | null>(null)
  const [previsioniReportFunnelBuAnni, setPrevisioniReportFunnelBuAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [previsioniReportFunnelBu, setPrevisioniReportFunnelBu] = useState('')
  const [previsioniReportFunnelBuRcc, setPrevisioniReportFunnelBuRcc] = useState('')
  const [previsioniReportFunnelBuData, setPrevisioniReportFunnelBuData] = useState<AnalisiRccPivotFunnelResponse | null>(null)
  const [processoOffertaAnni, setProcessoOffertaAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [processoOffertaEsiti, setProcessoOffertaEsiti] = useState<string[]>([])
  const [processoOffertaPercentualeRcc, setProcessoOffertaPercentualeRcc] = useState('')
  const [processoOffertaPercentualeBu, setProcessoOffertaPercentualeBu] = useState('')
  const [processoOffertaOfferteData, setProcessoOffertaOfferteData] = useState<ProcessoOffertaOfferteResponse | null>(null)
  const [processoOffertaSintesiRccData, setProcessoOffertaSintesiRccData] = useState<ProcessoOffertaSintesiResponse | null>(null)
  const [processoOffertaSintesiBuData, setProcessoOffertaSintesiBuData] = useState<ProcessoOffertaSintesiResponse | null>(null)
  const [datiContabiliVenditaRows, setDatiContabiliVenditaRows] = useState<DatiContabiliVenditaRow[]>([])
  const [datiContabiliVenditaLoading, setDatiContabiliVenditaLoading] = useState(false)
  const [datiContabiliVenditaSearched, setDatiContabiliVenditaSearched] = useState(false)
  const [datiContabiliAcquistoRows, setDatiContabiliAcquistoRows] = useState<DatiContabiliAcquistoRow[]>([])
  const [datiContabiliAcquistoLoading, setDatiContabiliAcquistoLoading] = useState(false)
  const [datiContabiliAcquistoSearched, setDatiContabiliAcquistoSearched] = useState(false)
  const [sintesiFiltersCollapsed, setSintesiFiltersCollapsed] = useState(false)
  const [analisiSearchCollapsedByPage, setAnalisiSearchCollapsedByPage] = useState<Record<string, boolean>>({})

  const backendBaseUrl = (import.meta.env.VITE_BACKEND_BASE_URL ?? '').replace(/\/$/, '')
  const authPortalBaseUrl = (import.meta.env.VITE_AUTH_PORTAL_URL ?? 'https://localhost:5043').replace(/\/$/, '')
  const routeRequest = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return {
      page: (params.get('page') ?? '').trim(),
      commessa: (params.get('commessa') ?? '').trim(),
      profile: (params.get('profile') ?? '').trim(),
      actAs: (params.get('actAs') ?? '').trim(),
    }
  }, [])
  const toBackendUrl = (path: string) => `${backendBaseUrl}${path}`
  const isCommesseSintesiPage = activePage === 'commesse-sintesi'
  const isProdottiSintesiPage = activePage === 'prodotti-sintesi'
  const isRisorseRisultatiPage = activePage === 'risorse-risultati'
  const isRisorseRisultatiPivotPage = activePage === 'risorse-risultati-pivot'
  const isRisorseRisultatiMensilePage = activePage === 'risorse-risultati-mensile'
  const isRisorseRisultatiMensilePivotPage = activePage === 'risorse-risultati-mensile-pivot'
  const isRisorseOuRisorsePage = activePage === 'risorse-ou-risorse'
  const isRisorseOuRisorsePivotPage = activePage === 'risorse-ou-risorse-pivot'
  const isRisorseOuPage = activePage === 'risorse-ou'
  const isRisorseOuMode = isRisorseOuRisorsePage || isRisorseOuRisorsePivotPage || isRisorseOuPage
  const isRisorseOuPivotMode = isRisorseOuPage
  const isRisorsePivotPage = (
    isRisorseRisultatiPivotPage
    || isRisorseRisultatiMensilePivotPage
    || isRisorseOuRisorsePivotPage
    || isRisorseOuPage
  )
  const isRisorseMensilePage = isRisorseRisultatiMensilePage || isRisorseRisultatiMensilePivotPage
  const isRisorsePage = (
    isRisorseRisultatiPage
    || isRisorseRisultatiPivotPage
    || isRisorseRisultatiMensilePage
    || isRisorseRisultatiMensilePivotPage
    || isRisorseOuRisorsePage
    || isRisorseOuRisorsePivotPage
    || isRisorseOuPage
  )
  const isDatiContabiliVenditaPage = activePage === 'dati-contabili-vendita'
  const isDatiContabiliAcquistiPage = activePage === 'dati-contabili-acquisti'
  const isDatiContabiliPage = isDatiContabiliVenditaPage || isDatiContabiliAcquistiPage
  const isProcessoOffertaOffertePage = activePage === 'processo-offerta-offerte'
  const isProcessoOffertaSintesiRccPage = activePage === 'processo-offerta-sintesi-rcc'
  const isProcessoOffertaSintesiBuPage = activePage === 'processo-offerta-sintesi-bu'
  const isProcessoOffertaPercentualeSuccessoRccPage = activePage === 'processo-offerta-percentuale-successo-rcc'
  const isProcessoOffertaPercentualeSuccessoBuPage = activePage === 'processo-offerta-percentuale-successo-bu'
  const isProcessoOffertaIncidenzaRccPage = activePage === 'processo-offerta-incidenza-rcc'
  const isProcessoOffertaIncidenzaBuPage = activePage === 'processo-offerta-incidenza-bu'
  const isProcessoOffertaPage = (
    isProcessoOffertaOffertePage ||
    isProcessoOffertaSintesiRccPage ||
    isProcessoOffertaSintesiBuPage ||
    isProcessoOffertaPercentualeSuccessoRccPage ||
    isProcessoOffertaPercentualeSuccessoBuPage ||
    isProcessoOffertaIncidenzaRccPage ||
    isProcessoOffertaIncidenzaBuPage
  )
  const isAnalisiSearchCollapsible = analisiSearchCollapsiblePages.has(activePage)
  const isAnalisiSearchCollapsed = isAnalisiSearchCollapsible && Boolean(analisiSearchCollapsedByPage[activePage])
  const sintesiScope = pageToScope(activePage)
  const sintesiTitle = isDatiContabiliVenditaPage
    ? 'Dati Contabili - Vendite'
    : (isDatiContabiliAcquistiPage
      ? 'Dati Contabili - Acquisti'
      : (isProdottiSintesiPage ? 'Prodotti - Sintesi' : 'Commesse - Sintesi'))
  const currentProfile = selectedProfile || profiles[0] || ''
  const canEditAppInfo = currentProfile.localeCompare('Supervisore', 'it', { sensitivity: 'base' }) === 0
  const canAccessAnalisiCommesseMenu = analisiCommesseAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessRisultatiRisorseMenu = risultatiRisorseAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessDatiContabiliMenu = datiContabiliAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const appInfoByMenu = useMemo(() => {
    const grouped = new Map<string, AppInfoVoice[]>()
    appInfoVoices.forEach((item) => {
      const current = grouped.get(item.menu) ?? []
      current.push(item)
      grouped.set(item.menu, current)
    })
    return Array.from(grouped.entries()).map(([menu, voci]) => ({ menu, voci }))
  }, [appInfoVoices])
  const canAccessAnalisiRccPage = analisiRccAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectAnalisiRccPivotRcc = analisiRccPivotRccSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessAnalisiBuPage = analisiBuAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectAnalisiBuPivotBusinessUnit = analisiBuPivotBuSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessAnalisiBurccPage = analisiBurccAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const isAnalisiBurccRccProfile = currentProfile.localeCompare('Responsabile Commerciale Commessa', 'it', { sensitivity: 'base' }) === 0
  const canSelectAnalisiBurccBusinessUnit = canAccessAnalisiBurccPage
  const canSelectAnalisiBurccRcc = canAccessAnalisiBurccPage && !isAnalisiBurccRccProfile
  const canAccessAnalisiPianoFatturazionePage = analisiPianoFatturazioneAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectAnalisiPianoFatturazioneRcc = analisiPianoFatturazioneSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessPrevisioniFunnelRccPage = previsioniFunnelRccAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectPrevisioniFunnelRcc = previsioniFunnelRccSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessPrevisioniFunnelBuPage = previsioniFunnelBuAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectPrevisioniFunnelBu = previsioniFunnelBuSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessPrevisioniUtileMensileRccPage = previsioniUtileMensileRccAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectPrevisioniUtileMensileRcc = previsioniUtileMensileRccSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessPrevisioniUtileMensileBuPage = previsioniUtileMensileBuAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectPrevisioniUtileMensileBu = previsioniUtileMensileBuSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessAnalisiProiezioniMenu = canAccessAnalisiRccPage || canAccessAnalisiBuPage || canAccessAnalisiBurccPage || canAccessAnalisiPianoFatturazionePage
  const canAccessPrevisioniMenu = canAccessPrevisioniFunnelRccPage ||
    canAccessPrevisioniFunnelBuPage
  const canAccessProcessoOffertaPage = processoOffertaAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const authenticatedRoles = user?.authenticatedRoles ?? user?.roles ?? []
  const canImpersonate = user?.canImpersonate ?? false
  const isImpersonating = user?.isImpersonating ?? false

  const saveToken = (value: string) => {
    const trimmed = value.trim()
    setToken(trimmed)

    if (trimmed) {
      localStorage.setItem(tokenStorageKey, trimmed)
      return
    }

    localStorage.removeItem(tokenStorageKey)
  }

  const clearSession = () => {
    saveToken('')
    setUser(null)
    setProfiles([])
    setSelectedProfile('')
    setOuScopes([])
    setActiveImpersonation('')
    setInfoModalOpen(false)
    setAppInfoModalOpen(false)
    setAppInfoVoices(appInfoVoicesDefault)
    setAppInfoDrafts({})
    setAppInfoLoading(false)
    setAppInfoSavingKey('')
    setAppInfoStatus('')
    setImpersonationModalOpen(false)
    setActivePage('none')
    setLastSintesiPage('commesse-sintesi')
    setSintesiMode('dettaglio')
    setCommessaSearch('')
    setSortColumn('commessa')
    setSortDirection('asc')
    setSintesiFiltersForm(emptySintesiFiltersForm)
    setSintesiFiltersCatalog(emptyFiltersCatalog)
    setSintesiCommesseOptions([])
    setSintesiRows([])
    setSintesiSearched(false)
    setSintesiFilterLoadingDetail('')
    setDetailCommessa('')
    setDetailData(null)
    setDetailSaving(false)
    setDetailStatusMessage('')
    setDetailRouteProcessed(false)
    setDetailPercentRaggiuntoInput('')
    setSelectedRequisitoId(null)
    setCollapsedProductKeys([])
    setAnalisiRccAnno(new Date().getFullYear().toString())
    setAnalisiRccLoading(false)
    setAnalisiRccData(null)
    setAnalisiRccPivotData(null)
    setAnalisiRccPivotAnni([new Date().getFullYear().toString()])
    setAnalisiRccPivotRcc('')
    setAnalisiBuAnno(new Date().getFullYear().toString())
    setAnalisiBuData(null)
    setAnalisiBuPivotData(null)
    setAnalisiBuPivotAnni([new Date().getFullYear().toString()])
    setAnalisiBuPivotBusinessUnit('')
    setAnalisiBurccAnno(new Date().getFullYear().toString())
    setAnalisiBurccBusinessUnit('')
    setAnalisiBurccRcc('')
    setAnalisiBurccData(null)
    setAnalisiBurccPivotData(null)
    setAnalisiBurccPivotAnni([new Date().getFullYear().toString()])
    setAnalisiBurccPivotBusinessUnit('')
    setAnalisiBurccPivotRcc('')
    setAnalisiPianoFatturazioneAnno(new Date().getFullYear().toString())
    setAnalisiPianoFatturazioneMesiSnapshot([])
    setAnalisiPianoFatturazioneTipoCalcolo('complessivo')
    setAnalisiPianoFatturazioneRcc('')
    setAnalisiPianoFatturazioneData(null)
    setCommesseAndamentoMensileAnni([new Date().getFullYear().toString()])
    setCommesseAndamentoMensileMese('')
    setCommesseAndamentoMensileTipologia('')
    setCommesseAndamentoMensileBusinessUnit('')
    setCommesseAndamentoMensileRcc('')
    setCommesseAndamentoMensilePm('')
    setCommesseAndamentoMensileData(null)
    setCommesseDatiAnnualiAnni([new Date().getFullYear().toString()])
    setCommesseDatiAnnualiSelectedFields(['anno'])
    setCommesseDatiAnnualiMacroTipologie([])
    setCommesseDatiAnnualiAvailableSelection([])
    setCommesseDatiAnnualiSelectedSelection([])
    setCommesseDatiAnnualiData(null)
    setCommesseDatiAnnualiFiltersCollapsed(false)
    setRisorseFiltersForm(emptyRisorseFiltersForm)
    setRisorseFiltersCatalog(emptyRisorseFiltersCatalog)
    setRisorseRows([])
    setRisorseSearched(false)
    setRisorseLoadingFilters(false)
    setRisorseCommessaSearch('')
    setRisorseRisorsaSearch('')
    setRisorsePivotSelectedFields(['anno', 'risorsa'])
    setRisorsePivotAvailableSelection([])
    setRisorsePivotSelectedSelection([])
    setPrevisioniUtileMensileRccAnno(new Date().getFullYear().toString())
    setPrevisioniUtileMensileRccMeseRiferimento(getDefaultReferenceMonth().toString())
    setPrevisioniUtileMensileRcc('')
    setPrevisioniUtileMensileRccProduzione('')
    setPrevisioniUtileMensileRccData(null)
    setPrevisioniUtileMensileBuAnno(new Date().getFullYear().toString())
    setPrevisioniUtileMensileBuMeseRiferimento(getDefaultReferenceMonth().toString())
    setPrevisioniUtileMensileBu('')
    setPrevisioniUtileMensileBuProduzione('')
    setPrevisioniUtileMensileBuData(null)
    setPrevisioniFunnelAnni([new Date().getFullYear().toString()])
    setPrevisioniFunnelRcc('')
    setPrevisioniFunnelTipo('')
    setPrevisioniFunnelStatoDocumento('')
    setPrevisioniFunnelData(null)
    setPrevisioniReportFunnelRccAnni([new Date().getFullYear().toString()])
    setPrevisioniReportFunnelRcc('')
    setPrevisioniReportFunnelRccData(null)
    setPrevisioniReportFunnelBuAnni([new Date().getFullYear().toString()])
    setPrevisioniReportFunnelBu('')
    setPrevisioniReportFunnelBuRcc('')
    setPrevisioniReportFunnelBuData(null)
    setProcessoOffertaAnni([new Date().getFullYear().toString()])
    setProcessoOffertaEsiti([])
    setProcessoOffertaPercentualeRcc('')
    setProcessoOffertaPercentualeBu('')
    setProcessoOffertaOfferteData(null)
    setProcessoOffertaSintesiRccData(null)
    setProcessoOffertaSintesiBuData(null)
    setDatiContabiliVenditaRows([])
    setDatiContabiliVenditaLoading(false)
    setDatiContabiliVenditaSearched(false)
    setDatiContabiliAcquistoRows([])
    setDatiContabiliAcquistoLoading(false)
    setDatiContabiliAcquistoSearched(false)
    setSintesiFiltersCollapsed(false)
    setAnalisiSearchCollapsedByPage({})
    sessionStorage.removeItem(impersonationStorageKey)
    sessionStorage.removeItem(sintesiStateStorageKey)
  }

  const buildReturnUrl = () => {
    const currentUrl = new URL(window.location.href)
    const query = new URLSearchParams(currentUrl.search)
    query.delete('token')
    query.delete('expiresAtUtc')

    const queryString = query.toString()
    return queryString
      ? `${currentUrl.origin}${currentUrl.pathname}?${queryString}`
      : `${currentUrl.origin}${currentUrl.pathname}`
  }

  const redirectToCentralAuth = (reason: string) => {
    if (isRedirectingToAuth) {
      return
    }

    if (sessionStorage.getItem(redirectGuardKey) === '1') {
      return
    }

    setIsRedirectingToAuth(true)
    setStatusMessage('Reindirizzamento verso autenticazione centralizzata...')
    sessionStorage.setItem(redirectGuardKey, '1')

    const authUrl = new URL(authPortalBaseUrl)
    authUrl.searchParams.set('returnUrl', buildReturnUrl())
    authUrl.searchParams.set('client', 'produzione')
    authUrl.searchParams.set('reason', reason)
    window.location.replace(authUrl.toString())
  }

  const authHeaders = (jwt = token, impersonationUsername = activeImpersonation) => {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${jwt.trim()}`,
    }

    const normalizedImpersonation = impersonationUsername.trim()
    if (normalizedImpersonation) {
      headers[impersonationHeaderName] = normalizedImpersonation
    }

    return headers
  }

  const readApiMessage = async (response: Response) => {
    try {
      const payload = (await response.json()) as { message?: string; title?: string }
      if (payload.message?.trim()) {
        return payload.message.trim()
      }

      if (payload.title?.trim()) {
        return payload.title.trim()
      }
    } catch {
      return ''
    }

    return ''
  }

  const forceLogoutForAuthorization = (reason: string, message: string) => {
    setStatusMessage(message)
    clearSession()
    sessionStorage.removeItem(redirectGuardKey)
    redirectToCentralAuth(reason)
  }

  const syncImpersonationFromUser = (payload: CurrentUser) => {
    const impersonated = payload.isImpersonating && payload.impersonatedUsername
      ? payload.impersonatedUsername.trim()
      : ''

    if (impersonated) {
      setActiveImpersonation(impersonated)
      setImpersonationInput(impersonated)
      sessionStorage.setItem(impersonationStorageKey, impersonated)
      return
    }

    setActiveImpersonation('')
    sessionStorage.removeItem(impersonationStorageKey)
  }

  const loadHealth = async () => {
    const response = await fetch(toBackendUrl('/api/system/health'))
    setApiHealth(response.ok ? 'OK' : `KO (${response.status})`)
  }

  const loadCurrentUser = async (
    jwt: string,
    impersonationUsername: string,
  ): Promise<SessionProbeResult> => {
    if (!jwt.trim()) {
      return { state: 'unauthorized' }
    }

    const response = await fetch(toBackendUrl('/api/system/me'), {
      headers: authHeaders(jwt, impersonationUsername),
    })

    if (response.status === 401) {
      return { state: 'unauthorized' }
    }

    if (response.status === 403) {
      const message = await readApiMessage(response)
      return {
        state: 'forbidden',
        message: message || 'Utente autenticato ma non abilitato su Produzione.',
      }
    }

    if (!response.ok) {
      const message = await readApiMessage(response)
      return {
        state: 'error',
        message: message || `Errore verifica contesto utente (${response.status}).`,
      }
    }

    const payload = (await response.json()) as CurrentUser
    setUser(payload)
    syncImpersonationFromUser(payload)
    return { state: 'ok', user: payload }
  }

  const loadProfiles = async (jwt: string, impersonationUsername: string) => {
    const response = await fetch(toBackendUrl('/api/profiles/available'), {
      headers: authHeaders(jwt, impersonationUsername),
    })

    if (response.status === 401) {
      clearSession()
      redirectToCentralAuth('stale_token')
      return false
    }

    if (response.status === 403) {
      const message = await readApiMessage(response)
      forceLogoutForAuthorization(
        'no_profile',
        message || 'Utente autenticato ma senza profili disponibili su Produzione. Logout automatico.',
      )
      return false
    }

    if (!response.ok) {
      const message = await readApiMessage(response)
      setStatusMessage(message || `Errore recupero profili (${response.status}).`)
      setProfiles([])
      setSelectedProfile('')
      setOuScopes([])
      return false
    }

    const payload = (await response.json()) as AvailableProfilesResponse
    if (!payload.profiles || payload.profiles.length === 0) {
      forceLogoutForAuthorization(
        'missing_profile',
        'Profilo non individuabile per l utente autenticato. Logout automatico.',
      )
      return false
    }

    setProfiles(payload.profiles)
    setOuScopes(payload.ouScopes)
    setSelectedProfile((current) => {
      if (current && payload.profiles.includes(current)) {
        return current
      }

      return payload.profiles[0] ?? ''
    })

    return true
  }

  const ensureSession = async (
    jwt: string,
    reasonIfInvalid: string,
    impersonationUsername = activeImpersonation,
  ) => {
    if (!jwt.trim()) {
      clearSession()
      redirectToCentralAuth('missing_token')
      return false
    }

    setSessionLoading(true)
    try {
      const userProbe = await loadCurrentUser(jwt, impersonationUsername)
      if (userProbe.state === 'unauthorized') {
        clearSession()
        redirectToCentralAuth(reasonIfInvalid)
        return false
      }

      if (userProbe.state === 'forbidden') {
        forceLogoutForAuthorization(
          'forbidden_profile',
          userProbe.message || 'Profilo non autorizzato. Logout automatico.',
        )
        return false
      }

      if (userProbe.state === 'error') {
        setStatusMessage(userProbe.message)
        return false
      }

      const profilesOk = await loadProfiles(jwt, impersonationUsername)
      if (!profilesOk) {
        return false
      }

      if (userProbe.user.isImpersonating) {
        setStatusMessage(`Sessione valida. Impersonificazione attiva su "${userProbe.user.username}".`)
      } else {
        setStatusMessage('Sessione valida tramite autenticazione centralizzata.')
      }

      return true
    } finally {
      setSessionLoading(false)
    }
  }

  const appInfoVoiceKey = (menu: string, voce: string) => `${menu}|||${voce}`

  const buildAppInfoDrafts = (voices: AppInfoVoice[]) => (
    voices.reduce<Record<string, string>>((acc, item) => {
      acc[appInfoVoiceKey(item.menu, item.voce)] = item.sintesi ?? ''
      return acc
    }, {})
  )

  const mergeAppInfoVoices = (fromDb: AppInfoVoice[]) => {
    const map = new Map<string, AppInfoVoice>()
    appInfoVoicesDefault.forEach((item) => {
      const key = appInfoVoiceKey(item.menu, item.voce)
      map.set(key, item)
    })

    fromDb.forEach((item) => {
      const menu = item.menu?.trim() ?? ''
      const voce = item.voce?.trim() ?? ''
      if (!menu || !voce) {
        return
      }

      const key = appInfoVoiceKey(menu, voce)
      const fallback = map.get(key)
      map.set(key, {
        menu,
        voce,
        sintesi: item.sintesi?.trim() || fallback?.sintesi || '',
      })
    })

    const ordering = new Map<string, number>()
    appInfoVoicesDefault.forEach((item, index) => {
      ordering.set(appInfoVoiceKey(item.menu, item.voce), index)
    })

    return Array.from(map.values()).sort((left, right) => {
      const leftKey = appInfoVoiceKey(left.menu, left.voce)
      const rightKey = appInfoVoiceKey(right.menu, right.voce)
      const leftOrder = ordering.get(leftKey)
      const rightOrder = ordering.get(rightKey)
      if (leftOrder !== undefined && rightOrder !== undefined) {
        return leftOrder - rightOrder
      }
      if (leftOrder !== undefined) {
        return -1
      }
      if (rightOrder !== undefined) {
        return 1
      }

      const menuCompare = left.menu.localeCompare(right.menu, 'it', { sensitivity: 'base' })
      if (menuCompare !== 0) {
        return menuCompare
      }
      return left.voce.localeCompare(right.voce, 'it', { sensitivity: 'base' })
    })
  }

  const loadAppInfoDescriptions = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setAppInfoVoices(appInfoVoicesDefault)
      setAppInfoDrafts(buildAppInfoDrafts(appInfoVoicesDefault))
      setAppInfoStatus('')
      return false
    }

    setAppInfoLoading(true)
    setAppInfoStatus('Caricamento descrizioni menu in corso...')
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)

      const response = await fetch(toBackendUrl(`/api/system/app-info?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return false
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setAppInfoVoices(appInfoVoicesDefault)
        setAppInfoDrafts(buildAppInfoDrafts(appInfoVoicesDefault))
        setAppInfoStatus(message || "Profilo non autorizzato sulla pagina 'Info applicazione'.")
        return false
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAppInfoVoices(appInfoVoicesDefault)
        setAppInfoDrafts(buildAppInfoDrafts(appInfoVoicesDefault))
        setAppInfoStatus(message || `Errore caricamento descrizioni (${response.status}).`)
        return false
      }

      const payload = (await response.json()) as AppInfoResponse
      const merged = mergeAppInfoVoices(Array.isArray(payload.items) ? payload.items : [])
      setAppInfoVoices(merged)
      setAppInfoDrafts(buildAppInfoDrafts(merged))
      setAppInfoStatus(
        canEditAppInfo
          ? 'Puoi modificare e salvare le descrizioni delle voci menu.'
          : 'Descrizioni in sola lettura.',
      )
      return true
    } catch {
      setAppInfoVoices(appInfoVoicesDefault)
      setAppInfoDrafts(buildAppInfoDrafts(appInfoVoicesDefault))
      setAppInfoStatus('Errore inatteso nel caricamento delle descrizioni menu.')
      return false
    } finally {
      setAppInfoLoading(false)
    }
  }

  const saveAppInfoDescription = async (menu: string, voce: string) => {
    if (!canEditAppInfo) {
      return false
    }

    if (!token.trim() || !currentProfile.trim()) {
      setAppInfoStatus('Sessione non disponibile per il salvataggio descrizione.')
      return false
    }

    const key = appInfoVoiceKey(menu, voce)
    const sintesi = (appInfoDrafts[key] ?? '').trim()
    const payload: AppInfoSaveRequest = {
      menu,
      voce,
      sintesi,
    }

    setAppInfoSavingKey(key)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)

      const response = await fetch(toBackendUrl(`/api/system/app-info/description?${params.toString()}`), {
        method: 'POST',
        headers: {
          ...authHeaders(token, activeImpersonation),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return false
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAppInfoStatus(message || `Errore salvataggio descrizione (${response.status}).`)
        return false
      }

      const saved = (await response.json()) as AppInfoVoice
      const savedMenu = saved.menu?.trim() || menu
      const savedVoce = saved.voce?.trim() || voce
      const savedSintesi = saved.sintesi?.trim() ?? sintesi
      const savedKey = appInfoVoiceKey(savedMenu, savedVoce)

      setAppInfoVoices((current) => current.map((item) => (
        appInfoVoiceKey(item.menu, item.voce) === savedKey
          ? { ...item, sintesi: savedSintesi }
          : item
      )))
      setAppInfoDrafts((current) => ({
        ...current,
        [savedKey]: savedSintesi,
      }))
      setAppInfoStatus(`Descrizione aggiornata: ${savedVoce}.`)
      return true
    } catch {
      setAppInfoStatus('Errore inatteso durante il salvataggio descrizione.')
      return false
    } finally {
      setAppInfoSavingKey('')
    }
  }

  const keepIfPresent = (value: string, options: FilterOption[]) => {
    const normalizedValue = normalizeFilterText(value ?? '')
    if (!normalizedValue) {
      return ''
    }

    return options.some((option) => normalizeFilterText(option.value) === normalizedValue)
      ? normalizedValue
      : ''
  }

  const tryReadPersistedSintesiState = (): SintesiPersistedState | null => {
    const raw = sessionStorage.getItem(sintesiStateStorageKey)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as SintesiPersistedState
      if (!parsed || !parsed.profile || !parsed.filters) {
        return null
      }

      return parsed
    } catch {
      return null
    }
  }

  const loadSintesiCommesseOptions = async (
    jwt: string,
    impersonationUsername: string,
    profile: string,
    searchValue: string,
    scope: SintesiScope,
  ) => {
    if (!jwt.trim() || !profile.trim()) {
      setSintesiCommesseOptions([])
      return false
    }

    const params = new URLSearchParams()
    params.set('profile', profile)
    params.set('take', '500')
    const normalizedSearch = searchValue.trim()
    if (normalizedSearch) {
      params.set('search', normalizedSearch)
    }

    const response = await fetch(toBackendUrl(`/api/${scope}/options?${params.toString()}`), {
      headers: authHeaders(jwt, impersonationUsername),
    })

    if (response.status === 401) {
      clearSession()
      redirectToCentralAuth('stale_token')
      return false
    }

    if (response.status === 403) {
      setSintesiCommesseOptions([])
      return false
    }

    if (!response.ok) {
      return false
    }

    const payload = (await response.json()) as CommesseOptionsResponse
    const commesse = payload.items
      .map((item) => item.commessa?.trim() ?? '')
      .filter((value) => value.length > 0)
      .map((value) => ({ value, label: value }))
      .filter((option, index, options) => (
        options.findIndex((candidate) => candidate.value === option.value) === index
      ))

    setSintesiCommesseOptions(commesse)
    return true
  }

  const loadSintesiFilters = async (
    jwt: string,
    impersonationUsername: string,
    profile: string,
    anni: string[],
    scope: SintesiScope,
  ) => {
    if (!jwt.trim() || !profile.trim()) {
      return false
    }

    setSintesiLoadingFilters(true)
    setSintesiFilterLoadingDetail('Recupero opzioni dal backend...')
    setStatusMessage('')
    try {
      const params = new URLSearchParams()
      params.set('profile', profile)
      const normalizedAnni = anni
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
      if (normalizedAnni.length === 1) {
        params.set('anno', normalizedAnni[0])
      }

      const response = await fetch(toBackendUrl(`/api/${scope}/sintesi/filters?${params.toString()}`), {
        headers: authHeaders(jwt, impersonationUsername),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return false
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setSintesiFiltersCatalog(emptyFiltersCatalog)
        setSintesiRows([])
        setSintesiSearched(false)
        setStatusMessage(message || `Profilo non autorizzato per i filtri ${scope}.`)
        return false
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setStatusMessage(message || `Errore caricamento filtri sintesi (${response.status}).`)
        return false
      }

      const payload = (await response.json()) as CommesseSintesiFiltersResponse
      setSintesiFilterLoadingDetail('Applicazione opzioni filtro...')
      setSintesiFiltersCatalog(payload)
      const allowedAnni = new Set(payload.anni.map((option) => option.value))
      setSintesiFiltersForm((current) => ({
        ...current,
        anni: current.anni.filter((value) => allowedAnni.has(value)),
        commessa: keepIfPresent(current.commessa, payload.commesse),
        tipologiaCommessa: keepIfPresent(current.tipologiaCommessa, payload.tipologieCommessa),
        stato: keepIfPresent(current.stato, payload.stati),
        macroTipologia: keepIfPresent(current.macroTipologia, payload.macroTipologie),
        prodotto: keepIfPresent(current.prodotto, payload.prodotti),
        businessUnit: keepIfPresent(current.businessUnit, payload.businessUnits),
        rcc: keepIfPresent(current.rcc, payload.rcc),
        pm: keepIfPresent(current.pm, payload.pm),
      }))
      setStatusMessage('')
      return true
    } finally {
      setSintesiLoadingFilters(false)
      setSintesiFilterLoadingDetail('')
    }
  }

  const executeSintesiSearch = async (scopeOverride?: SintesiScope) => {
    if (!token.trim() || !currentProfile) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    const scope = scopeOverride ?? sintesiScope
    const isAggregated = sintesiMode === 'aggregato'

    setSintesiLoadingData(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      const take = scope === 'prodotti' ? 5000 : 250
      params.set('take', take.toString())
      params.set('aggrega', isAggregated ? 'true' : 'false')

      const selectedAnni = sintesiFiltersForm.anni
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
      for (const year of selectedAnni) {
        params.append('anni', year)
      }

      if (sintesiFiltersForm.commessa) {
        params.set('commessa', sintesiFiltersForm.commessa)
      }

      if (sintesiFiltersForm.tipologiaCommessa) {
        params.set('tipologiaCommessa', sintesiFiltersForm.tipologiaCommessa)
      }

      if (sintesiFiltersForm.stato) {
        params.set('stato', sintesiFiltersForm.stato)
      }

      if (sintesiFiltersForm.macroTipologia) {
        params.set('macroTipologia', sintesiFiltersForm.macroTipologia)
      }

      if (sintesiFiltersForm.prodotto) {
        params.set('prodotto', sintesiFiltersForm.prodotto)
      }

      if (sintesiFiltersForm.businessUnit) {
        params.set('businessUnit', sintesiFiltersForm.businessUnit)
      }

      if (sintesiFiltersForm.rcc) {
        params.set('rcc', sintesiFiltersForm.rcc)
      }

      if (sintesiFiltersForm.pm) {
        params.set('pm', sintesiFiltersForm.pm)
      }
      if (sintesiFiltersForm.provenienza) {
        params.set('provenienza', sintesiFiltersForm.provenienza)
      }
      if (sintesiFiltersForm.soloScadute) {
        params.set('soloScadute', 'true')
      }

      const response = await fetch(toBackendUrl(`/api/${scope}/sintesi?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setSintesiRows([])
        setSintesiSearched(true)
        setStatusMessage(message || `Profilo non autorizzato sulla ricerca ${scope}.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setStatusMessage(message || `Errore caricamento dati sintesi (${response.status}).`)
        setSintesiRows([])
        setSintesiSearched(true)
        return
      }

      const payload = (await response.json()) as CommesseSintesiResponse
      setSintesiRows(payload.items)
      const yearsFromRows = payload.items
        .map((row) => row.anno)
        .filter((value): value is number => typeof value === 'number')
        .map((value) => value.toString())
      if (yearsFromRows.length > 0) {
        setSintesiFiltersCatalog((current) => {
          const merged = new Map<string, FilterOption>()
          for (const option of current.anni) {
            merged.set(option.value, option)
          }
          for (const year of yearsFromRows) {
            if (!merged.has(year)) {
              merged.set(year, { value: year, label: year })
            }
          }

          return {
            ...current,
            anni: [...merged.values()]
              .sort((left, right) => Number(right.value) - Number(left.value)),
          }
        })
      }
      setSintesiSearched(true)
      const modeLabel = isAggregated ? 'aggregata' : 'dettaglio'
      const yearLabel = selectedAnni.length > 0
        ? `, anni ${selectedAnni.join(', ')}`
        : ', tutti gli anni'
      setStatusMessage(`Ricerca completata (${modeLabel}${yearLabel}): ${payload.count} righe.`)
    } finally {
      setSintesiLoadingData(false)
    }
  }

  const executeDatiContabiliVenditaSearch = async () => {
    if (!token.trim() || !currentProfile) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    setDatiContabiliVenditaLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('take', '5000')

      const selectedAnni = sintesiFiltersForm.anni
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value > 0)

      if (selectedAnni.length > 0) {
        selectedAnni.forEach((value) => params.append('anni', value.toString()))
      }

      if (sintesiFiltersForm.commessa) {
        params.set('commessa', sintesiFiltersForm.commessa)
      }
      if (sintesiFiltersForm.tipologiaCommessa) {
        params.set('tipologiaCommessa', sintesiFiltersForm.tipologiaCommessa)
      }
      if (sintesiFiltersForm.stato) {
        params.set('stato', sintesiFiltersForm.stato)
      }
      if (sintesiFiltersForm.macroTipologia) {
        params.set('macroTipologia', sintesiFiltersForm.macroTipologia)
      }
      if (sintesiFiltersForm.prodotto) {
        params.set('prodotto', sintesiFiltersForm.prodotto)
      }
      if (sintesiFiltersForm.businessUnit) {
        params.set('businessUnit', sintesiFiltersForm.businessUnit)
      }
      if (sintesiFiltersForm.rcc) {
        params.set('rcc', sintesiFiltersForm.rcc)
      }
      if (sintesiFiltersForm.pm) {
        params.set('pm', sintesiFiltersForm.pm)
      }
      if (sintesiFiltersForm.provenienza) {
        params.set('provenienza', sintesiFiltersForm.provenienza)
      }
      if (sintesiFiltersForm.soloScadute) {
        params.set('soloScadute', 'true')
      }

      const response = await fetch(toBackendUrl(`/api/dati-contabili/vendite?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setDatiContabiliVenditaRows([])
        setDatiContabiliVenditaSearched(true)
        setStatusMessage(message || 'Profilo non autorizzato sulla ricerca vendite.')
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setDatiContabiliVenditaRows([])
        setDatiContabiliVenditaSearched(true)
        setStatusMessage(message || `Errore ricerca vendite (${response.status}).`)
        return
      }

      const payload = (await response.json()) as DatiContabiliVenditaResponse
      setDatiContabiliVenditaRows(payload.items)
      setDatiContabiliVenditaSearched(true)
      setStatusMessage(`Ricerca vendite completata: ${payload.count} righe.`)
    } finally {
      setDatiContabiliVenditaLoading(false)
    }
  }

  const executeDatiContabiliAcquistiSearch = async () => {
    if (!token.trim() || !currentProfile) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    setDatiContabiliAcquistoLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('take', '5000')

      const selectedAnni = sintesiFiltersForm.anni
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value > 0)

      if (selectedAnni.length > 0) {
        selectedAnni.forEach((value) => params.append('anni', value.toString()))
      }

      if (sintesiFiltersForm.commessa) {
        params.set('commessa', sintesiFiltersForm.commessa)
      }
      if (sintesiFiltersForm.tipologiaCommessa) {
        params.set('tipologiaCommessa', sintesiFiltersForm.tipologiaCommessa)
      }
      if (sintesiFiltersForm.stato) {
        params.set('stato', sintesiFiltersForm.stato)
      }
      if (sintesiFiltersForm.macroTipologia) {
        params.set('macroTipologia', sintesiFiltersForm.macroTipologia)
      }
      if (sintesiFiltersForm.prodotto) {
        params.set('prodotto', sintesiFiltersForm.prodotto)
      }
      if (sintesiFiltersForm.businessUnit) {
        params.set('businessUnit', sintesiFiltersForm.businessUnit)
      }
      if (sintesiFiltersForm.rcc) {
        params.set('rcc', sintesiFiltersForm.rcc)
      }
      if (sintesiFiltersForm.pm) {
        params.set('pm', sintesiFiltersForm.pm)
      }
      if (sintesiFiltersForm.provenienza) {
        params.set('provenienza', sintesiFiltersForm.provenienza)
      }
      if (sintesiFiltersForm.soloScadute) {
        params.set('soloScadute', 'true')
      }

      const response = await fetch(toBackendUrl(`/api/dati-contabili/acquisti?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setDatiContabiliAcquistoRows([])
        setDatiContabiliAcquistoSearched(true)
        setStatusMessage(message || 'Profilo non autorizzato sulla ricerca acquisti.')
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setDatiContabiliAcquistoRows([])
        setDatiContabiliAcquistoSearched(true)
        setStatusMessage(message || `Errore ricerca acquisti (${response.status}).`)
        return
      }

      const payload = (await response.json()) as DatiContabiliAcquistoResponse
      setDatiContabiliAcquistoRows(payload.items)
      setDatiContabiliAcquistoSearched(true)
      setStatusMessage(`Ricerca acquisti completata: ${payload.count} righe.`)
    } finally {
      setDatiContabiliAcquistoLoading(false)
    }
  }

  const loadAnalisiRccRisultatoMensile = async (requestedYear?: string) => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessAnalisiRccPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Proiezione Mensile RCC.`)
      setAnalisiRccData(null)
      return
    }

    const normalizedYear = (requestedYear ?? analisiRccAnno).trim()
    const parsedYear = Number.parseInt(normalizedYear, 10)
    const annoValue = Number.isFinite(parsedYear) && parsedYear > 0
      ? parsedYear
      : new Date().getFullYear()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', annoValue.toString())

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/risultato-mensile?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setAnalisiRccData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Proiezione Mensile RCC.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiRccData(null)
        setStatusMessage(message || `Errore caricamento Proiezione Mensile RCC (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccRisultatoMensileResponse
      setAnalisiRccAnno(payload.anno.toString())
      setAnalisiRccData(payload)
      const righeCount = payload.risultatoPesato?.righe?.length ?? 0
      setStatusMessage(`Proiezione Mensile RCC caricata per anno ${payload.anno}: ${righeCount} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadAnalisiRccPivotFatturato = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessAnalisiRccPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Report Annuale RCC.`)
      setAnalisiRccPivotData(null)
      return
    }

    const selectedYears = [...new Set(
      analisiRccPivotAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)
    const yearsToQuery = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear()]

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      if (canSelectAnalisiRccPivotRcc && analisiRccPivotRcc.trim()) {
        params.set('rcc', analisiRccPivotRcc.trim())
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/pivot-fatturato?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setAnalisiRccPivotData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Report Annuale RCC.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiRccPivotData(null)
        setStatusMessage(message || `Errore caricamento Report Annuale RCC (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccPivotFatturatoResponse
      const payloadYears = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => value.toString())
      setAnalisiRccPivotAnni(payloadYears.length > 0 ? payloadYears : yearsToQuery.map((value) => value.toString()))
      if (canSelectAnalisiRccPivotRcc) {
        const normalizedRccFiltro = (payload.rccFiltro ?? '').trim()
        if (normalizedRccFiltro.length > 0) {
          setAnalisiRccPivotRcc(normalizedRccFiltro)
        } else if (!payload.vediTutto) {
          setAnalisiRccPivotRcc((payload.rccDisponibili?.[0] ?? '').trim())
        } else if (!analisiRccPivotRcc.trim()) {
          setAnalisiRccPivotRcc('')
        }
      }

      setAnalisiRccPivotData(payload)
      const yearsLabel = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((left, right) => left - right)
        .join(', ')
      setStatusMessage(`Report Annuale RCC caricato (anni: ${yearsLabel || yearsToQuery.join(', ')}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadAnalisiBuRisultatoMensile = async (requestedYear?: string) => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessAnalisiBuPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Proiezione Mensile BU.`)
      setAnalisiBuData(null)
      return
    }

    const normalizedYear = (requestedYear ?? analisiBuAnno).trim()
    const parsedYear = Number.parseInt(normalizedYear, 10)
    const annoValue = Number.isFinite(parsedYear) && parsedYear > 0
      ? parsedYear
      : new Date().getFullYear()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', annoValue.toString())

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/risultato-mensile-bu?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setAnalisiBuData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Proiezione Mensile BU.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiBuData(null)
        setStatusMessage(message || `Errore caricamento Proiezione Mensile BU (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccRisultatoMensileResponse
      setAnalisiBuAnno(payload.anno.toString())
      setAnalisiBuData(payload)
      const righeCount = payload.risultatoPesato?.righe?.length ?? 0
      setStatusMessage(`Proiezione Mensile BU caricata per anno ${payload.anno}: ${righeCount} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadAnalisiBuPivotFatturato = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessAnalisiBuPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Report Annuale BU.`)
      setAnalisiBuPivotData(null)
      return
    }

    const selectedYears = [...new Set(
      analisiBuPivotAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)
    const yearsToQuery = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear()]

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      if (canSelectAnalisiBuPivotBusinessUnit && analisiBuPivotBusinessUnit.trim()) {
        params.set('businessUnit', analisiBuPivotBusinessUnit.trim())
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/pivot-fatturato-bu?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setAnalisiBuPivotData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Report Annuale BU.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiBuPivotData(null)
        setStatusMessage(message || `Errore caricamento Report Annuale BU (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccPivotFatturatoResponse
      const payloadYears = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => value.toString())
      setAnalisiBuPivotAnni(payloadYears.length > 0 ? payloadYears : yearsToQuery.map((value) => value.toString()))
      if (canSelectAnalisiBuPivotBusinessUnit) {
        const normalizedBuFiltro = (payload.rccFiltro ?? '').trim()
        if (normalizedBuFiltro.length > 0) {
          setAnalisiBuPivotBusinessUnit(normalizedBuFiltro)
        } else if (!payload.vediTutto) {
          setAnalisiBuPivotBusinessUnit((payload.rccDisponibili?.[0] ?? '').trim())
        } else if (!analisiBuPivotBusinessUnit.trim()) {
          setAnalisiBuPivotBusinessUnit('')
        }
      }

      setAnalisiBuPivotData(payload)
      const yearsLabel = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((left, right) => left - right)
        .join(', ')
      setStatusMessage(`Report Annuale BU caricato (anni: ${yearsLabel || yearsToQuery.join(', ')}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadAnalisiBurccRisultatoMensile = async (requestedYear?: string) => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessAnalisiBurccPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Proiezione Mensile RCC-BU.`)
      setAnalisiBurccData(null)
      return
    }

    const normalizedYear = (requestedYear ?? analisiBurccAnno).trim()
    const parsedYear = Number.parseInt(normalizedYear, 10)
    const annoValue = Number.isFinite(parsedYear) && parsedYear > 0
      ? parsedYear
      : new Date().getFullYear()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', annoValue.toString())
      if (canSelectAnalisiBurccBusinessUnit && analisiBurccBusinessUnit.trim()) {
        params.set('businessUnit', analisiBurccBusinessUnit.trim())
      }
      if (canSelectAnalisiBurccRcc && analisiBurccRcc.trim()) {
        params.set('rcc', analisiBurccRcc.trim())
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/risultato-mensile-burcc?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setAnalisiBurccData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Proiezione Mensile RCC-BU.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiBurccData(null)
        setStatusMessage(message || `Errore caricamento Proiezione Mensile RCC-BU (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccRisultatoMensileBurccResponse
      setAnalisiBurccAnno(payload.anno.toString())
      if (canSelectAnalisiBurccBusinessUnit) {
        const normalizedBuFiltro = (payload.businessUnitFiltro ?? '').trim()
        const availableBu = (payload.businessUnitDisponibili ?? [])
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
        if (normalizedBuFiltro.length > 0 && availableBu.some((value) => value.localeCompare(normalizedBuFiltro, 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiBurccBusinessUnit(normalizedBuFiltro)
        } else if (!payload.vediTutto && availableBu.length === 1) {
          setAnalisiBurccBusinessUnit(availableBu[0])
        } else if (!availableBu.some((value) => value.localeCompare(analisiBurccBusinessUnit.trim(), 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiBurccBusinessUnit('')
        }
      }
      if (canSelectAnalisiBurccRcc) {
        const normalizedRccFiltro = (payload.rccFiltro ?? '').trim()
        const availableRcc = (payload.rccDisponibili ?? [])
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
        if (normalizedRccFiltro.length > 0 && availableRcc.some((value) => value.localeCompare(normalizedRccFiltro, 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiBurccRcc(normalizedRccFiltro)
        } else if (!payload.vediTutto && availableRcc.length === 1) {
          setAnalisiBurccRcc(availableRcc[0])
        } else if (!availableRcc.some((value) => value.localeCompare(analisiBurccRcc.trim(), 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiBurccRcc('')
        }
      }

      setAnalisiBurccData(payload)
      const righeCount = payload.risultatoPesato?.righe?.length ?? 0
      setStatusMessage(`Proiezione Mensile RCC-BU caricata per anno ${payload.anno}: ${righeCount} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadAnalisiBurccPivotFatturato = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessAnalisiBurccPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Report Annuale RCC-BU.`)
      setAnalisiBurccPivotData(null)
      return
    }

    const selectedYears = [...new Set(
      analisiBurccPivotAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)
    const yearsToQuery = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear()]

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      if (canSelectAnalisiBurccBusinessUnit && analisiBurccPivotBusinessUnit.trim()) {
        params.set('businessUnit', analisiBurccPivotBusinessUnit.trim())
      }
      if (canSelectAnalisiBurccRcc && analisiBurccPivotRcc.trim()) {
        params.set('rcc', analisiBurccPivotRcc.trim())
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/pivot-fatturato-burcc?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setAnalisiBurccPivotData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Report Annuale RCC-BU.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiBurccPivotData(null)
        setStatusMessage(message || `Errore caricamento Report Annuale RCC-BU (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccPivotBurccResponse
      const payloadYears = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => value.toString())
      setAnalisiBurccPivotAnni(payloadYears.length > 0 ? payloadYears : yearsToQuery.map((value) => value.toString()))
      if (canSelectAnalisiBurccBusinessUnit) {
        const normalizedBuFiltro = (payload.businessUnitFiltro ?? '').trim()
        const availableBu = (payload.businessUnitDisponibili ?? [])
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
        if (normalizedBuFiltro.length > 0 && availableBu.some((value) => value.localeCompare(normalizedBuFiltro, 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiBurccPivotBusinessUnit(normalizedBuFiltro)
        } else if (!payload.vediTutto && availableBu.length === 1) {
          setAnalisiBurccPivotBusinessUnit(availableBu[0])
        } else if (!availableBu.some((value) => value.localeCompare(analisiBurccPivotBusinessUnit.trim(), 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiBurccPivotBusinessUnit('')
        }
      }
      if (canSelectAnalisiBurccRcc) {
        const normalizedRccFiltro = (payload.rccFiltro ?? '').trim()
        const availableRcc = (payload.rccDisponibili ?? [])
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
        if (normalizedRccFiltro.length > 0 && availableRcc.some((value) => value.localeCompare(normalizedRccFiltro, 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiBurccPivotRcc(normalizedRccFiltro)
        } else if (!payload.vediTutto && availableRcc.length === 1) {
          setAnalisiBurccPivotRcc(availableRcc[0])
        } else if (!availableRcc.some((value) => value.localeCompare(analisiBurccPivotRcc.trim(), 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiBurccPivotRcc('')
        }
      }

      setAnalisiBurccPivotData(payload)
      const yearsLabel = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((left, right) => left - right)
        .join(', ')
      setStatusMessage(`Report Annuale RCC-BU caricato (anni: ${yearsLabel || yearsToQuery.join(', ')}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadAnalisiPianoFatturazione = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessAnalisiPianoFatturazionePage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Piano Fatturazione.`)
      setAnalisiPianoFatturazioneData(null)
      return
    }

    const parsedYear = Number.parseInt(analisiPianoFatturazioneAnno.trim(), 10)
    const annoToQuery = Number.isFinite(parsedYear) && parsedYear > 0
      ? parsedYear
      : new Date().getFullYear()
    const mesiSnapshotToQuery = [...new Set(
      analisiPianoFatturazioneMesiSnapshot
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value >= 1 && value <= 12),
    )].sort((left, right) => left - right)
    const normalizedMesiSnapshot = mesiSnapshotToQuery.length > 0
      ? mesiSnapshotToQuery
      : []
    const normalizedTipoCalcolo = (() => {
      const value = analisiPianoFatturazioneTipoCalcolo.trim().toLowerCase()
      return value === 'fatturato' || value === 'futuro' || value === 'complessivo'
        ? value
        : 'complessivo'
    })()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', annoToQuery.toString())
      normalizedMesiSnapshot.forEach((value) => params.append('mesiSnapshot', value.toString()))
      params.set('tipoCalcolo', normalizedTipoCalcolo)
      if (canSelectAnalisiPianoFatturazioneRcc && analisiPianoFatturazioneRcc.trim()) {
        params.set('rcc', analisiPianoFatturazioneRcc.trim())
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/piano-fatturazione?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setAnalisiPianoFatturazioneData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Piano Fatturazione.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiPianoFatturazioneData(null)
        setStatusMessage(message || `Errore caricamento Piano Fatturazione (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccPianoFatturazioneResponse
      setAnalisiPianoFatturazioneAnno(payload.anno.toString())
      const serverMesiSnapshot = [...new Set(
        (payload.mesiSnapshot ?? [])
          .filter((value) => Number.isFinite(value) && value >= 1 && value <= 12),
      )].sort((left, right) => left - right)
      setAnalisiPianoFatturazioneMesiSnapshot(
        (serverMesiSnapshot.length > 0 ? serverMesiSnapshot : normalizedMesiSnapshot).map((value) => value.toString()),
      )
      const serverTipoCalcolo = (payload.tipoCalcolo ?? '').trim().toLowerCase()
      setAnalisiPianoFatturazioneTipoCalcolo(
        serverTipoCalcolo === 'fatturato' || serverTipoCalcolo === 'futuro' || serverTipoCalcolo === 'complessivo'
          ? serverTipoCalcolo
          : normalizedTipoCalcolo,
      )
      if (canSelectAnalisiPianoFatturazioneRcc) {
        const normalizedRccFiltro = (payload.rccFiltro ?? '').trim()
        const availableRcc = (payload.rccDisponibili ?? [])
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
        if (normalizedRccFiltro.length > 0 && availableRcc.some((value) => value.localeCompare(normalizedRccFiltro, 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiPianoFatturazioneRcc(normalizedRccFiltro)
        } else if (!payload.vediTutto && availableRcc.length === 1) {
          setAnalisiPianoFatturazioneRcc(availableRcc[0])
        } else if (!availableRcc.some((value) => value.localeCompare(analisiPianoFatturazioneRcc.trim(), 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiPianoFatturazioneRcc('')
        }
      }

      setAnalisiPianoFatturazioneData(payload)
      const mesiEffective = (serverMesiSnapshot.length > 0 ? serverMesiSnapshot : normalizedMesiSnapshot)
      const mesiLabel = mesiEffective.length > 0
        ? mesiEffective.map((value) => value.toString().padStart(2, '0')).join(', ')
        : 'tutti'
      setStatusMessage(`Piano Fatturazione caricato (anno: ${payload.anno}, snapshot: ${mesiLabel}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadCommesseAndamentoMensile = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    const selectedYears = [...new Set(
      commesseAndamentoMensileAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)
    const yearsToQuery = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear()]
    const selectedMese = parseReferenceMonthStrict(commesseAndamentoMensileMese)
    const selectedTipologia = commesseAndamentoMensileTipologia.trim()
    const selectedBusinessUnit = commesseAndamentoMensileBusinessUnit.trim()
    const selectedRcc = commesseAndamentoMensileRcc.trim()
    const selectedPm = commesseAndamentoMensilePm.trim()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      if (selectedMese !== null) {
        params.set('mese', selectedMese.toString())
      }
      if (selectedTipologia) {
        params.set('tipologiaCommessa', selectedTipologia)
      }
      if (selectedBusinessUnit) {
        params.set('businessUnit', selectedBusinessUnit)
      }
      if (selectedRcc) {
        params.set('rcc', selectedRcc)
      }
      if (selectedPm) {
        params.set('pm', selectedPm)
      }
      params.set('take', '5000')

      const response = await fetch(toBackendUrl(`/api/commesse/andamento-mensile?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setCommesseAndamentoMensileData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Andamento Mensile.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setCommesseAndamentoMensileData(null)
        setStatusMessage(message || `Errore caricamento Andamento Mensile (${response.status}).`)
        return
      }

      const payload = (await response.json()) as CommesseAndamentoMensileResponse
      setCommesseAndamentoMensileData(payload)
      setCommesseAndamentoMensileAnni(yearsToQuery.map((value) => value.toString()))
      setStatusMessage(`Andamento Mensile caricato: ${payload.count} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadCommesseDatiAnnualiAggregati = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    const selectedYears = [...new Set(
      commesseDatiAnnualiAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)
    const yearsToQuery = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear()]

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      params.set('take', '100000')

      const response = await fetch(toBackendUrl(`/api/commesse/sintesi?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setCommesseDatiAnnualiData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Dati Annuali Aggregati.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setCommesseDatiAnnualiData(null)
        setStatusMessage(message || `Errore caricamento Dati Annuali Aggregati (${response.status}).`)
        return
      }

      const payload = (await response.json()) as CommesseSintesiResponse
      const payloadYears = yearsToQuery
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => value.toString())
      setCommesseDatiAnnualiAnni(payloadYears.length > 0 ? payloadYears : yearsToQuery.map((value) => value.toString()))
      setCommesseDatiAnnualiData({
        profile: payload.profile,
        anni: yearsToQuery,
        items: payload.items ?? [],
      })
      setStatusMessage(`Dati Annuali Aggregati caricati: ${payload.items.length} righe base.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadRisorseFilters = async (
    mensile: boolean,
    requestedAnni: string[] = [],
    analisiOu: boolean = isRisorseOuMode,
    analisiOuPivot: boolean = isRisorseOuPivotMode,
  ) => {
    if (!token.trim() || !currentProfile.trim()) {
      return false
    }

    if (!canAccessRisultatiRisorseMenu) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Risultati Risorse.`)
      setRisorseFiltersCatalog(emptyRisorseFiltersCatalog)
      return false
    }

    const selectedYears = [...new Set(
      requestedAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => right - left)

    setRisorseLoadingFilters(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('mensile', mensile ? 'true' : 'false')
      if (analisiOu) {
        params.set('analisiOu', 'true')
      }
      if (analisiOuPivot) {
        params.set('analisiOuPivot', 'true')
      }
      selectedYears.forEach((value) => params.append('anni', value.toString()))

      const response = await fetch(toBackendUrl(`/api/commesse/risorse/filters?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return false
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setRisorseFiltersCatalog(emptyRisorseFiltersCatalog)
        setRisorseRows([])
        setRisorseSearched(false)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato sui filtri Risultati Risorse.`)
        return false
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setStatusMessage(message || `Errore caricamento filtri Risultati Risorse (${response.status}).`)
        return false
      }

      const payload = (await response.json()) as CommesseRisorseFiltersResponse
      setRisorseFiltersCatalog(payload)
      setRisorseFiltersForm((current) => {
        const allowedAnni = new Set(
          payload.anni
            .map((option) => normalizeFilterText(option.value))
            .filter((value) => value.length > 0),
        )
        const currentYear = new Date().getFullYear().toString()
        const previousYear = (new Date().getFullYear() - 1).toString()
        const requestedAnniNormalized = requestedAnni
          .map((value) => normalizeFilterText(value))
          .filter((value) => value.length > 0 && allowedAnni.has(value))
        let nextAnni = current.anni
          .map((value) => normalizeFilterText(value))
          .filter((value) => value.length > 0 && allowedAnni.has(value))
        if (!mensile && requestedAnniNormalized.length === 0) {
          nextAnni = []
        }
        if (nextAnni.length === 0 && requestedAnniNormalized.length > 0) {
          nextAnni = requestedAnniNormalized
        }
        if (nextAnni.length === 0 && mensile) {
          const defaultMensili = [currentYear, previousYear].filter((value) => allowedAnni.has(value))
          nextAnni = defaultMensili.length > 0
            ? defaultMensili
            : payload.anni
              .map((option) => normalizeFilterText(option.value))
              .filter((value) => value.length > 0)
              .slice(0, 2)
        }

        const risorseValues = new Set(
          payload.risorse
            .map((option) => normalizeFilterText(option.value))
            .filter((value) => value.length > 0),
        )
        const normalizedIdRisorsa = normalizeFilterText(current.idRisorsa)

        return {
          ...current,
          anni: [...new Set(nextAnni)],
          commessa: keepIfPresent(current.commessa, payload.commesse),
          tipologiaCommessa: keepIfPresent(current.tipologiaCommessa, payload.tipologieCommessa),
          stato: keepIfPresent(current.stato, payload.stati),
          macroTipologia: keepIfPresent(current.macroTipologia, payload.macroTipologie),
          controparte: keepIfPresent(current.controparte, payload.controparti),
          businessUnit: keepIfPresent(current.businessUnit, payload.businessUnits),
          rcc: keepIfPresent(current.rcc, payload.rcc),
          pm: keepIfPresent(current.pm, payload.pm),
          idRisorsa: risorseValues.has(normalizedIdRisorsa) ? normalizedIdRisorsa : '',
        }
      })

      setStatusMessage('')
      return true
    } finally {
      setRisorseLoadingFilters(false)
    }
  }

  const loadRisorseValutazione = async (
    mensile: boolean,
    analisiOu: boolean = isRisorseOuMode,
    analisiOuPivot: boolean = isRisorseOuPivotMode,
  ) => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessRisultatiRisorseMenu) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Risultati Risorse.`)
      setRisorseRows([])
      setRisorseSearched(false)
      return
    }

    const selectedYears = [...new Set(
      risorseFiltersForm.anni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('mensile', mensile ? 'true' : 'false')
      if (analisiOu) {
        params.set('analisiOu', 'true')
      }
      if (analisiOuPivot) {
        params.set('analisiOuPivot', 'true')
      }
      params.set('take', '100000')
      selectedYears.forEach((value) => params.append('anni', value.toString()))
      const commessa = risorseFiltersForm.commessa.trim()
      if (commessa) {
        params.set('commessa', commessa)
      }
      const tipologiaCommessa = risorseFiltersForm.tipologiaCommessa.trim()
      if (tipologiaCommessa) {
        params.set('tipologiaCommessa', tipologiaCommessa)
      }
      const stato = risorseFiltersForm.stato.trim()
      if (stato) {
        params.set('stato', stato)
      }
      const macroTipologia = risorseFiltersForm.macroTipologia.trim()
      if (macroTipologia) {
        params.set('macroTipologia', macroTipologia)
      }
      const controparte = risorseFiltersForm.controparte.trim()
      if (controparte) {
        params.set('controparte', controparte)
      }
      const businessUnit = risorseFiltersForm.businessUnit.trim()
      if (businessUnit) {
        params.set('businessUnit', businessUnit)
      }
      const rcc = risorseFiltersForm.rcc.trim()
      if (rcc) {
        params.set('rcc', rcc)
      }
      const pm = risorseFiltersForm.pm.trim()
      if (pm) {
        params.set('pm', pm)
      }
      const idRisorsa = Number.parseInt(risorseFiltersForm.idRisorsa.trim(), 10)
      if (Number.isFinite(idRisorsa) && idRisorsa > 0) {
        params.set('idRisorsa', idRisorsa.toString())
      }

      const response = await fetch(toBackendUrl(`/api/commesse/risorse/valutazione?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setRisorseRows([])
        setRisorseSearched(true)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato alla consultazione Risultati Risorse.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setRisorseRows([])
        setRisorseSearched(true)
        setStatusMessage(message || `Errore caricamento Risultati Risorse (${response.status}).`)
        return
      }

      const payload = (await response.json()) as CommesseRisorseValutazioneResponse
      setRisorseRows(payload.items ?? [])
      setRisorseSearched(true)

      if (mensile && selectedYears.length === 0 && Array.isArray(payload.anni) && payload.anni.length > 0) {
        const payloadYears = payload.anni
          .filter((value) => Number.isFinite(value) && value > 0)
          .sort((left, right) => right - left)
          .slice(0, 2)
          .map((value) => value.toString())
        if (payloadYears.length > 0) {
          setRisorseFiltersForm((current) => ({
            ...current,
            anni: payloadYears,
          }))
        }
      }

      const modalita = mensile ? 'mensile' : 'annuale'
      setStatusMessage(`Risultati Risorse (${modalita}) caricati: ${payload.count} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadPrevisioniUtileMensileRcc = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessPrevisioniUtileMensileRccPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Utile Mensile RCC.`)
      setPrevisioniUtileMensileRccData(null)
      return
    }

    const selectedYear = Number.parseInt(previsioniUtileMensileRccAnno.trim(), 10)
    const yearToQuery = Number.isFinite(selectedYear) && selectedYear > 0
      ? selectedYear
      : new Date().getFullYear()
    const meseRiferimentoToQuery = parseReferenceMonthStrict(previsioniUtileMensileRccMeseRiferimento)
    if (meseRiferimentoToQuery === null) {
      setStatusMessage('Seleziona un mese di riferimento valido (01-12).')
      return
    }

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', yearToQuery.toString())
      params.set('meseRiferimento', meseRiferimentoToQuery.toString())
      if (canSelectPrevisioniUtileMensileRcc && previsioniUtileMensileRcc.trim()) {
        params.set('rcc', previsioniUtileMensileRcc.trim())
      }

      if (previsioniUtileMensileRccProduzione === '0' || previsioniUtileMensileRccProduzione === '1') {
        params.set('produzione', previsioniUtileMensileRccProduzione)
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/utile-mensile-rcc?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
        cache: 'no-store',
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setPrevisioniUtileMensileRccData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Utile Mensile RCC.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setPrevisioniUtileMensileRccData(null)
        setStatusMessage(message || `Errore caricamento Utile Mensile RCC (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccUtileMensileResponse
      setPrevisioniUtileMensileRccAnno(yearToQuery.toString())
      const meseRiferimentoServer = parseReferenceMonth(payload.meseRiferimento)
      setPrevisioniUtileMensileRccMeseRiferimento(meseRiferimentoServer.toString())
      if (canSelectPrevisioniUtileMensileRcc) {
        const normalizedFilter = (payload.aggregazioneFiltro ?? '').trim()
        if (normalizedFilter) {
          setPrevisioniUtileMensileRcc(normalizedFilter)
        } else if (!payload.vediTutto) {
          setPrevisioniUtileMensileRcc((payload.aggregazioniDisponibili?.[0] ?? '').trim())
        } else if (!previsioniUtileMensileRcc.trim()) {
          setPrevisioniUtileMensileRcc('')
        }
      }
      setPrevisioniUtileMensileRccProduzione(
        payload.produzione === 0 || payload.produzione === 1
          ? payload.produzione.toString()
          : previsioniUtileMensileRccProduzione,
      )
      setPrevisioniUtileMensileRccData(payload)
      setStatusMessage(`Utile Mensile RCC caricato (anno: ${yearToQuery}, mese rif.: ${formatReferenceMonthLabel(meseRiferimentoServer)}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadPrevisioniUtileMensileBu = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessPrevisioniUtileMensileBuPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Utile Mensile BU.`)
      setPrevisioniUtileMensileBuData(null)
      return
    }

    const selectedYear = Number.parseInt(previsioniUtileMensileBuAnno.trim(), 10)
    const yearToQuery = Number.isFinite(selectedYear) && selectedYear > 0
      ? selectedYear
      : new Date().getFullYear()
    const meseRiferimentoToQuery = parseReferenceMonthStrict(previsioniUtileMensileBuMeseRiferimento)
    if (meseRiferimentoToQuery === null) {
      setStatusMessage('Seleziona un mese di riferimento valido (01-12).')
      return
    }

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', yearToQuery.toString())
      params.set('meseRiferimento', meseRiferimentoToQuery.toString())
      if (canSelectPrevisioniUtileMensileBu && previsioniUtileMensileBu.trim()) {
        params.set('businessUnit', previsioniUtileMensileBu.trim())
      }

      if (previsioniUtileMensileBuProduzione === '0' || previsioniUtileMensileBuProduzione === '1') {
        params.set('produzione', previsioniUtileMensileBuProduzione)
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/utile-mensile-bu?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
        cache: 'no-store',
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setPrevisioniUtileMensileBuData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Utile Mensile BU.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setPrevisioniUtileMensileBuData(null)
        setStatusMessage(message || `Errore caricamento Utile Mensile BU (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccUtileMensileResponse
      setPrevisioniUtileMensileBuAnno(yearToQuery.toString())
      const meseRiferimentoServer = parseReferenceMonth(payload.meseRiferimento)
      setPrevisioniUtileMensileBuMeseRiferimento(meseRiferimentoServer.toString())
      if (canSelectPrevisioniUtileMensileBu) {
        const normalizedFilter = (payload.aggregazioneFiltro ?? '').trim()
        if (normalizedFilter) {
          setPrevisioniUtileMensileBu(normalizedFilter)
        } else if (!payload.vediTutto) {
          setPrevisioniUtileMensileBu((payload.aggregazioniDisponibili?.[0] ?? '').trim())
        } else if (!previsioniUtileMensileBu.trim()) {
          setPrevisioniUtileMensileBu('')
        }
      }
      setPrevisioniUtileMensileBuProduzione(
        payload.produzione === 0 || payload.produzione === 1
          ? payload.produzione.toString()
          : previsioniUtileMensileBuProduzione,
      )
      setPrevisioniUtileMensileBuData(payload)
      setStatusMessage(`Utile Mensile BU caricato (anno: ${yearToQuery}, mese rif.: ${formatReferenceMonthLabel(meseRiferimentoServer)}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadPrevisioniFunnel = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessPrevisioniFunnelRccPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Funnel.`)
      setPrevisioniFunnelData(null)
      return
    }

    const selectedYears = [...new Set(
      previsioniFunnelAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)
    const yearsToQuery = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear()]

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      if (canSelectPrevisioniFunnelRcc && previsioniFunnelRcc.trim()) {
        params.set('rcc', previsioniFunnelRcc.trim())
      }
      if (previsioniFunnelTipo.trim()) {
        params.set('tipo', previsioniFunnelTipo.trim())
      }
      if (previsioniFunnelStatoDocumento.trim()) {
        params.set('statoDocumento', previsioniFunnelStatoDocumento.trim())
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/funnel?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setPrevisioniFunnelData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Funnel.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setPrevisioniFunnelData(null)
        setStatusMessage(message || `Errore caricamento Funnel (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccFunnelResponse
      const payloadYears = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => value.toString())
      setPrevisioniFunnelAnni(payloadYears.length > 0 ? payloadYears : yearsToQuery.map((value) => value.toString()))
      if (canSelectPrevisioniFunnelRcc) {
        const normalizedRccFiltro = (payload.rccFiltro ?? '').trim()
        if (normalizedRccFiltro.length > 0) {
          setPrevisioniFunnelRcc(normalizedRccFiltro)
        } else if (!payload.vediTutto) {
          setPrevisioniFunnelRcc((payload.rccDisponibili?.[0] ?? '').trim())
        }
      }

      const normalizedTipo = previsioniFunnelTipo.trim()
      if (
        normalizedTipo &&
        !(payload.tipiDisponibili ?? []).some((value) => value.localeCompare(normalizedTipo, 'it', { sensitivity: 'base' }) === 0)
      ) {
        setPrevisioniFunnelTipo('')
      }

      const normalizedStato = previsioniFunnelStatoDocumento.trim()
      if (
        normalizedStato &&
        !(payload.statiDocumentoDisponibili ?? []).some((value) => value.localeCompare(normalizedStato, 'it', { sensitivity: 'base' }) === 0)
      ) {
        setPrevisioniFunnelStatoDocumento('')
      }

      setPrevisioniFunnelData(payload)
      setStatusMessage(`Funnel caricato (anni: ${payload.anni.join(', ') || yearsToQuery.join(', ')}): ${payload.items.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadPrevisioniReportFunnelRcc = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessPrevisioniFunnelRccPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Report Funnel RCC.`)
      setPrevisioniReportFunnelRccData(null)
      return
    }

    const selectedYear = Number.parseInt((previsioniReportFunnelRccAnni[0] ?? '').trim(), 10)
    const yearToQuery = Number.isFinite(selectedYear) && selectedYear > 0
      ? selectedYear
      : new Date().getFullYear()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', yearToQuery.toString())
      if (canSelectPrevisioniFunnelRcc && previsioniReportFunnelRcc.trim()) {
        params.set('rcc', previsioniReportFunnelRcc.trim())
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/pivot-funnel?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setPrevisioniReportFunnelRccData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Report Funnel RCC.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setPrevisioniReportFunnelRccData(null)
        setStatusMessage(message || `Errore caricamento Report Funnel RCC (${response.status}).`)
        return
      }

      const payload = normalizePivotFunnelResponse(await response.json())
      const payloadYear = (payload.anni ?? [])
        .find((value) => Number.isFinite(value) && value > 0) ?? yearToQuery
      setPrevisioniReportFunnelRccAnni([payloadYear.toString()])
      if (canSelectPrevisioniFunnelRcc) {
        const normalizedFilter = (payload.aggregazioneFiltro ?? '').trim()
        if (normalizedFilter.length > 0) {
          setPrevisioniReportFunnelRcc(normalizedFilter)
        } else if (!payload.vediTutto) {
          setPrevisioniReportFunnelRcc((payload.aggregazioniDisponibili?.[0] ?? '').trim())
        } else if (!previsioniReportFunnelRcc.trim()) {
          setPrevisioniReportFunnelRcc('')
        }
      }

      setPrevisioniReportFunnelRccData(payload)
      setStatusMessage(`Report Funnel RCC caricato (anno: ${payloadYear}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadPrevisioniReportFunnelBu = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessPrevisioniFunnelBuPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Report Funnel BU.`)
      setPrevisioniReportFunnelBuData(null)
      return
    }

    const selectedYear = Number.parseInt((previsioniReportFunnelBuAnni[0] ?? '').trim(), 10)
    const yearToQuery = Number.isFinite(selectedYear) && selectedYear > 0
      ? selectedYear
      : new Date().getFullYear()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', yearToQuery.toString())
      if (canSelectPrevisioniFunnelBu && previsioniReportFunnelBu.trim()) {
        params.set('businessUnit', previsioniReportFunnelBu.trim())
      }
      if (previsioniReportFunnelBuRcc.trim()) {
        params.set('rcc', previsioniReportFunnelBuRcc.trim())
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/pivot-funnel-bu?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setPrevisioniReportFunnelBuData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Report Funnel BU.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setPrevisioniReportFunnelBuData(null)
        setStatusMessage(message || `Errore caricamento Report Funnel BU (${response.status}).`)
        return
      }

      const payload = normalizePivotFunnelResponse(await response.json())
      const payloadYear = (payload.anni ?? [])
        .find((value) => Number.isFinite(value) && value > 0) ?? yearToQuery
      setPrevisioniReportFunnelBuAnni([payloadYear.toString()])
      if (canSelectPrevisioniFunnelBu) {
        const normalizedFilter = (payload.aggregazioneFiltro ?? '').trim()
        if (normalizedFilter.length > 0) {
          setPrevisioniReportFunnelBu(normalizedFilter)
        } else if (!payload.vediTutto) {
          setPrevisioniReportFunnelBu((payload.aggregazioniDisponibili?.[0] ?? '').trim())
        } else if (!previsioniReportFunnelBu.trim()) {
          setPrevisioniReportFunnelBu('')
        }
      }

      const normalizedRccFiltro = (payload.rccFiltro ?? '').trim()
      if (normalizedRccFiltro.length > 0) {
        setPrevisioniReportFunnelBuRcc(normalizedRccFiltro)
      } else {
        const currentRccFilter = previsioniReportFunnelBuRcc.trim()
        if (currentRccFilter.length > 0) {
          const hasCurrent = (payload.rccDisponibili ?? []).some((value) => (
            value.localeCompare(currentRccFilter, 'it', { sensitivity: 'base' }) === 0
          ))
          if (!hasCurrent) {
            setPrevisioniReportFunnelBuRcc('')
          }
        }
      }

      setPrevisioniReportFunnelBuData(payload)
      setStatusMessage(`Report Funnel BU caricato (anno: ${payloadYear}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadProcessoOffertaOfferte = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessProcessoOffertaPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Processo Offerta.`)
      setProcessoOffertaOfferteData(null)
      return
    }

    const selectedYears = [...new Set(
      processoOffertaAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)
    const yearsToQuery = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear()]
    const selectedEsiti = (isProcessoOffertaPercentualeSuccessoRccPage || isProcessoOffertaPercentualeSuccessoBuPage)
      ? []
      : [...new Set(
        processoOffertaEsiti
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      )]

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      selectedEsiti.forEach((value) => params.append('esiti', value))

      const response = await fetch(toBackendUrl(`/api/processo-offerta/offerte?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setProcessoOffertaOfferteData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Processo Offerta - Offerte.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setProcessoOffertaOfferteData(null)
        setStatusMessage(message || `Errore caricamento Processo Offerta - Offerte (${response.status}).`)
        return
      }

      const payload = (await response.json()) as ProcessoOffertaOfferteResponse
      const payloadYears = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => value.toString())
      setProcessoOffertaAnni(payloadYears.length > 0 ? payloadYears : yearsToQuery.map((value) => value.toString()))
      const validEsiti = selectedEsiti.filter((esito) => (
        (payload.esitiDisponibili ?? []).some((option) => option.localeCompare(esito, 'it', { sensitivity: 'base' }) === 0)
      ))
      if (validEsiti.length !== selectedEsiti.length) {
        setProcessoOffertaEsiti(validEsiti)
      }
      setProcessoOffertaOfferteData(payload)
      setStatusMessage(`Processo Offerta - Offerte caricato (anni: ${payload.anni.join(', ') || yearsToQuery.join(', ')}): ${payload.items.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadProcessoOffertaSintesiRcc = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessProcessoOffertaPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Processo Offerta.`)
      setProcessoOffertaSintesiRccData(null)
      return
    }

    const selectedYears = [...new Set(
      processoOffertaAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)
    const yearsToQuery = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear()]
    const selectedEsiti = (isProcessoOffertaPercentualeSuccessoRccPage || isProcessoOffertaPercentualeSuccessoBuPage)
      ? []
      : [...new Set(
        processoOffertaEsiti
          .map((value) => value.trim())
          .filter((value) => value.length > 0),
      )]

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      selectedEsiti.forEach((value) => params.append('esiti', value))

      const response = await fetch(toBackendUrl(`/api/processo-offerta/sintesi-rcc?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setProcessoOffertaSintesiRccData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Processo Offerta - Sintesi RCC.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setProcessoOffertaSintesiRccData(null)
        setStatusMessage(message || `Errore caricamento Processo Offerta - Sintesi RCC (${response.status}).`)
        return
      }

      const payload = (await response.json()) as ProcessoOffertaSintesiResponse
      const payloadYears = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => value.toString())
      setProcessoOffertaAnni(payloadYears.length > 0 ? payloadYears : yearsToQuery.map((value) => value.toString()))
      const selectedRcc = processoOffertaPercentualeRcc.trim()
      if (selectedRcc.length > 0) {
        const hasSelectedRcc = (payload.aggregazioniDisponibili ?? []).some((value) => (
          value.localeCompare(selectedRcc, 'it', { sensitivity: 'base' }) === 0
        ))
        if (!hasSelectedRcc) {
          setProcessoOffertaPercentualeRcc('')
        }
      }
      const validEsiti = selectedEsiti.filter((esito) => (
        (payload.esitiDisponibili ?? []).some((option) => option.localeCompare(esito, 'it', { sensitivity: 'base' }) === 0)
      ))
      if (validEsiti.length !== selectedEsiti.length) {
        setProcessoOffertaEsiti(validEsiti)
      }
      setProcessoOffertaSintesiRccData(payload)
      setStatusMessage(`Processo Offerta - Sintesi RCC caricata (anni: ${payload.anni.join(', ') || yearsToQuery.join(', ')}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadProcessoOffertaSintesiBu = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessProcessoOffertaPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Processo Offerta.`)
      setProcessoOffertaSintesiBuData(null)
      return
    }

    const selectedYears = [...new Set(
      processoOffertaAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)
    const yearsToQuery = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear()]
    const selectedEsiti = [...new Set(
      processoOffertaEsiti
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    )]

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      selectedEsiti.forEach((value) => params.append('esiti', value))

      const response = await fetch(toBackendUrl(`/api/processo-offerta/sintesi-bu?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setProcessoOffertaSintesiBuData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Processo Offerta - Sintesi BU.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setProcessoOffertaSintesiBuData(null)
        setStatusMessage(message || `Errore caricamento Processo Offerta - Sintesi BU (${response.status}).`)
        return
      }

      const payload = (await response.json()) as ProcessoOffertaSintesiResponse
      const payloadYears = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => value.toString())
      setProcessoOffertaAnni(payloadYears.length > 0 ? payloadYears : yearsToQuery.map((value) => value.toString()))
      const selectedBu = processoOffertaPercentualeBu.trim()
      if (selectedBu.length > 0) {
        const hasSelectedBu = (payload.aggregazioniDisponibili ?? []).some((value) => (
          value.localeCompare(selectedBu, 'it', { sensitivity: 'base' }) === 0
        ))
        if (!hasSelectedBu) {
          setProcessoOffertaPercentualeBu('')
        }
      }
      const validEsiti = selectedEsiti.filter((esito) => (
        (payload.esitiDisponibili ?? []).some((option) => option.localeCompare(esito, 'it', { sensitivity: 'base' }) === 0)
      ))
      if (validEsiti.length !== selectedEsiti.length) {
        setProcessoOffertaEsiti(validEsiti)
      }
      setProcessoOffertaSintesiBuData(payload)
      setStatusMessage(`Processo Offerta - Sintesi BU caricata (anni: ${payload.anni.join(', ') || yearsToQuery.join(', ')}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadCommessaDetail = async (
    commessa: string,
    jwt = token,
    impersonationUsername = activeImpersonation,
    profile = currentProfile,
  ) => {
    const normalizedCommessa = commessa.trim()
    if (!jwt.trim() || !profile.trim() || !normalizedCommessa) {
      return
    }

    setDetailLoading(true)
    setDetailSaving(false)
    setDetailCommessa(normalizedCommessa)
    setDetailData(null)
    setDetailPercentRaggiuntoInput('')
    setSelectedRequisitoId(null)
    try {
      const params = new URLSearchParams()
      params.set('profile', profile)
      params.set('commessa', normalizedCommessa)

      const response = await fetch(toBackendUrl(`/api/commesse/dettaglio?${params.toString()}`), {
        headers: authHeaders(jwt, impersonationUsername),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setDetailData(null)
        setDetailStatusMessage(message || `Non hai i diritti per vedere la commessa "${normalizedCommessa}".`)
        return
      }

      if (response.status === 404) {
        const message = await readApiMessage(response)
        setDetailData(null)
        setDetailStatusMessage(message || `Commessa "${normalizedCommessa}" non trovata.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setDetailData(null)
        setDetailStatusMessage(message || `Errore caricamento dettaglio commessa (${response.status}).`)
        return
      }

      const payload = (await response.json()) as CommesseDettaglioResponse
      setDetailData(payload)
      const storicoCount = payload.anniStorici.length
      const mesiCorrenteCount = payload.mesiAnnoCorrente?.length ?? 0
      const venditeCount = payload.vendite?.length ?? 0
      const acquistiCount = payload.acquisti?.length ?? 0
      setDetailStatusMessage(
        `Dettaglio commessa "${normalizedCommessa}": ${storicoCount} anni storici, ${mesiCorrenteCount} mesi ${payload.currentYear}, ${venditeCount} vendite, ${acquistiCount} acquisti.`,
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const openCommessaDetail = (commessa: string) => {
    const normalizedCommessa = commessa.trim()
    if (!normalizedCommessa) {
      return
    }

    const url = new URL(window.location.href)
    url.searchParams.delete('token')
    url.searchParams.delete('expiresAtUtc')
    url.searchParams.set('page', 'commessa-dettaglio')
    url.searchParams.set('commessa', normalizedCommessa)

    if (currentProfile) {
      url.searchParams.set('profile', currentProfile)
    }

    if (activeImpersonation.trim()) {
      url.searchParams.set('actAs', activeImpersonation.trim())
    } else {
      url.searchParams.delete('actAs')
    }

    window.history.replaceState({}, document.title, url.toString())
    if (
      activePage === 'commesse-sintesi' ||
      activePage === 'commesse-andamento-mensile' ||
      activePage === 'commesse-dati-annuali-aggregati' ||
      activePage === 'prodotti-sintesi' ||
      activePage === 'dati-contabili-vendita' ||
      activePage === 'dati-contabili-acquisti'
    ) {
      setLastSintesiPage(activePage)
    }
    setActivePage('commessa-dettaglio')
    void loadCommessaDetail(normalizedCommessa)
  }

  const backToSintesi = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('page')
    url.searchParams.delete('commessa')
    window.history.replaceState({}, document.title, url.toString())

    setActivePage(lastSintesiPage)

    if (lastSintesiPage === 'dati-contabili-vendita') {
      if (datiContabiliVenditaRows.length === 0 && !datiContabiliVenditaLoading) {
        void executeDatiContabiliVenditaSearch()
      }
      return
    }

    if (lastSintesiPage === 'dati-contabili-acquisti') {
      if (datiContabiliAcquistoRows.length === 0 && !datiContabiliAcquistoLoading) {
        void executeDatiContabiliAcquistiSearch()
      }
      return
    }

    if (lastSintesiPage === 'commesse-andamento-mensile') {
      if (!commesseAndamentoMensileData && !analisiRccLoading) {
        void loadCommesseAndamentoMensile()
      }
      return
    }

    if (lastSintesiPage === 'commesse-dati-annuali-aggregati') {
      if (!commesseDatiAnnualiData && !analisiRccLoading) {
        void loadCommesseDatiAnnualiAggregati()
      }
      return
    }

    if (sintesiRows.length === 0 && !sintesiLoadingData) {
      void executeSintesiSearch(pageToScope(lastSintesiPage))
    }
  }

  const refreshSintesiFilters = () => {
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni, sintesiScope)
  }

  const resetSintesi = () => {
    setSintesiMode('dettaglio')
    setCommessaSearch('')
    setSortColumn(isProdottiSintesiPage ? 'prodotto' : 'commessa')
    setSortDirection('asc')
    setCollapsedProductKeys([])
    setSintesiFiltersForm(emptySintesiFiltersForm)
    setSintesiRows([])
    setSintesiSearched(false)
    setDatiContabiliVenditaRows([])
    setDatiContabiliVenditaSearched(false)
    setDatiContabiliAcquistoRows([])
    setDatiContabiliAcquistoSearched(false)

    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, [], sintesiScope)
  }

  const refreshRisorseFilters = () => {
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadRisorseFilters(isRisorseMensilePage, risorseFiltersForm.anni)
  }

  const resetRisorseFilters = () => {
    const defaultYears = isRisorseMensilePage
      ? [new Date().getFullYear().toString(), (new Date().getFullYear() - 1).toString()]
      : []

    setRisorseFiltersForm({
      ...emptyRisorseFiltersForm,
      anni: defaultYears,
    })
    setRisorseRows([])
    setRisorseSearched(false)
    setRisorseCommessaSearch('')
    setRisorseRisorsaSearch('')

    if (!token.trim() || !currentProfile) {
      return
    }

    void loadRisorseFilters(isRisorseMensilePage, defaultYears)
  }

  const activateSintesiPage = () => {
    setOpenMenu(null)
    setLastSintesiPage('commesse-sintesi')
    setSortColumn('commessa')
    setSortDirection('asc')
    setCollapsedProductKeys([])
    setActivePage('commesse-sintesi')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni, 'commesse')
  }

  const activateCommesseAndamentoMensilePage = () => {
    setOpenMenu(null)
    setLastSintesiPage('commesse-andamento-mensile')
    setActivePage('commesse-andamento-mensile')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni, 'commesse')
    void loadCommesseAndamentoMensile()
  }

  const activateCommesseDatiAnnualiAggregatiPage = () => {
    setOpenMenu(null)
    setLastSintesiPage('commesse-dati-annuali-aggregati')
    setActivePage('commesse-dati-annuali-aggregati')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, [], 'commesse')
    void loadCommesseDatiAnnualiAggregati()
  }

  const addCommesseDatiAnnualiSelectedFields = () => {
    if (commesseDatiAnnualiAvailableSelection.length === 0) {
      return
    }

    setCommesseDatiAnnualiSelectedFields((current) => {
      const next = [...current]
      commesseDatiAnnualiAvailableSelection.forEach((field) => {
        if (!next.includes(field)) {
          next.push(field)
        }
      })
      return next
    })
    setCommesseDatiAnnualiSelectedSelection(commesseDatiAnnualiAvailableSelection)
    setCommesseDatiAnnualiAvailableSelection([])
  }

  const removeCommesseDatiAnnualiSelectedFields = () => {
    if (commesseDatiAnnualiSelectedSelection.length === 0) {
      return
    }

    setCommesseDatiAnnualiSelectedFields((current) => (
      current.filter((field) => !commesseDatiAnnualiSelectedSelection.includes(field))
    ))
    setCommesseDatiAnnualiAvailableSelection(commesseDatiAnnualiSelectedSelection)
    setCommesseDatiAnnualiSelectedSelection([])
  }

  const moveCommesseDatiAnnualiField = (direction: 'up' | 'down') => {
    if (commesseDatiAnnualiSelectedSelection.length !== 1) {
      return
    }

    const movingField = commesseDatiAnnualiSelectedSelection[0]
    setCommesseDatiAnnualiSelectedFields((current) => {
      const index = current.indexOf(movingField)
      if (index < 0) {
        return current
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  const addRisorsePivotSelectedFields = () => {
    if (risorsePivotAvailableSelection.length === 0) {
      return
    }

    setRisorsePivotSelectedFields((current) => {
      const next = [...current]
      risorsePivotAvailableSelection.forEach((field) => {
        if (!next.includes(field)) {
          next.push(field)
        }
      })
      return next
    })
    setRisorsePivotSelectedSelection(risorsePivotAvailableSelection)
    setRisorsePivotAvailableSelection([])
  }

  const removeRisorsePivotSelectedFields = () => {
    if (risorsePivotSelectedSelection.length === 0) {
      return
    }

    setRisorsePivotSelectedFields((current) => (
      current.filter((field) => !risorsePivotSelectedSelection.includes(field))
    ))
    setRisorsePivotAvailableSelection(risorsePivotSelectedSelection)
    setRisorsePivotSelectedSelection([])
  }

  const moveRisorsePivotField = (direction: 'up' | 'down') => {
    if (risorsePivotSelectedSelection.length !== 1) {
      return
    }

    const movingField = risorsePivotSelectedSelection[0]
    setRisorsePivotSelectedFields((current) => {
      const index = current.indexOf(movingField)
      if (index < 0) {
        return current
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current
      }

      const next = [...current]
      const [item] = next.splice(index, 1)
      next.splice(targetIndex, 0, item)
      return next
    })
  }

  const activateRisorsePage = (page: AppPage, mensile: boolean, analisiOu = false, analisiOuPivot = false) => {
    setOpenMenu(null)
    setActivePage(page)
    if (!token.trim() || !currentProfile) {
      return
    }

    const yearsToRequest = mensile
      ? (
        risorseFiltersForm.anni.length > 0
          ? risorseFiltersForm.anni
          : [new Date().getFullYear().toString(), (new Date().getFullYear() - 1).toString()]
      )
      : []

    void loadRisorseFilters(mensile, yearsToRequest, analisiOu, analisiOuPivot).then((ok) => {
      if (ok) {
        void loadRisorseValutazione(mensile, analisiOu, analisiOuPivot)
      }
    })
  }

  const activateProdottiPage = () => {
    setOpenMenu(null)
    setLastSintesiPage('prodotti-sintesi')
    setSortColumn('prodotto')
    setSortDirection('asc')
    setCollapsedProductKeys([])
    setActivePage('prodotti-sintesi')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni, 'prodotti')
  }

  const activateRisorseRisultatiPage = () => {
    activateRisorsePage('risorse-risultati', false)
  }

  const activateRisorseRisultatiPivotPage = () => {
    activateRisorsePage('risorse-risultati-pivot', false)
  }

  const activateRisorseRisultatiMensilePage = () => {
    activateRisorsePage('risorse-risultati-mensile', true)
  }

  const activateRisorseRisultatiMensilePivotPage = () => {
    activateRisorsePage('risorse-risultati-mensile-pivot', true)
  }

  const activateRisorseOuRisorsePage = () => {
    activateRisorsePage('risorse-ou-risorse', false, true, false)
  }

  const activateRisorseOuRisorsePivotPage = () => {
    activateRisorsePage('risorse-ou-risorse-pivot', false, true, false)
  }

  const activateRisorseOuPage = () => {
    activateRisorsePage('risorse-ou', false, true, true)
  }

  const activateAnalisiRccRisultatoMensilePage = () => {
    setOpenMenu(null)
    setActivePage('analisi-rcc-risultato-mensile')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiRccRisultatoMensile()
  }

  const activateAnalisiRccPivotFatturatoPage = () => {
    setOpenMenu(null)
    setActivePage('analisi-rcc-pivot-fatturato')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiRccPivotFatturato()
  }

  const activateAnalisiBuRisultatoMensilePage = () => {
    setOpenMenu(null)
    setActivePage('analisi-bu-risultato-mensile')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiBuRisultatoMensile()
  }

  const activateAnalisiBuPivotFatturatoPage = () => {
    setOpenMenu(null)
    setActivePage('analisi-bu-pivot-fatturato')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiBuPivotFatturato()
  }

  const activateAnalisiBurccRisultatoMensilePage = () => {
    setOpenMenu(null)
    setActivePage('analisi-burcc-risultato-mensile')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiBurccRisultatoMensile()
  }

  const activateAnalisiBurccPivotFatturatoPage = () => {
    setOpenMenu(null)
    setActivePage('analisi-burcc-pivot-fatturato')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiBurccPivotFatturato()
  }

  const activateAnalisiPianoFatturazionePage = () => {
    setOpenMenu(null)
    setActivePage('analisi-piano-fatturazione')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadAnalisiPianoFatturazione()
  }

  const activatePrevisioniFunnelPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-funnel')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniFunnel()
  }

  const activatePrevisioniReportFunnelRccPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-report-funnel-rcc')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniReportFunnelRcc()
  }

  const activatePrevisioniReportFunnelBuPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-report-funnel-bu')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniReportFunnelBu()
  }

  const activatePrevisioniUtileMensileRccPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-utile-mensile-rcc')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniUtileMensileRcc()
  }

  const activatePrevisioniUtileMensileBuPage = () => {
    setOpenMenu(null)
    setActivePage('previsioni-utile-mensile-bu')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadPrevisioniUtileMensileBu()
  }

  const activateProcessoOffertaOffertePage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-offerte')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaOfferte()
  }

  const activateProcessoOffertaSintesiRccPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-sintesi-rcc')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiRcc()
  }

  const activateProcessoOffertaSintesiBuPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-sintesi-bu')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiBu()
  }

  const activateProcessoOffertaPercentualeSuccessoRccPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-percentuale-successo-rcc')
    setProcessoOffertaEsiti([])
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiRcc()
  }

  const activateProcessoOffertaPercentualeSuccessoBuPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-percentuale-successo-bu')
    setProcessoOffertaEsiti([])
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiBu()
  }

  const activateProcessoOffertaIncidenzaRccPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-incidenza-rcc')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiRcc()
  }

  const activateProcessoOffertaIncidenzaBuPage = () => {
    setOpenMenu(null)
    setActivePage('processo-offerta-incidenza-bu')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadProcessoOffertaSintesiBu()
  }

  const activateDatiContabiliVenditaPage = () => {
    setOpenMenu(null)
    setLastSintesiPage('dati-contabili-vendita')
    setActivePage('dati-contabili-vendita')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni, 'commesse')
  }

  const activateDatiContabiliAcquistiPage = () => {
    setOpenMenu(null)
    setLastSintesiPage('dati-contabili-acquisti')
    setActivePage('dati-contabili-acquisti')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni, 'commesse')
  }

  const handleSintesiSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (activePage === 'dati-contabili-vendita') {
      void executeDatiContabiliVenditaSearch()
      return
    }
    if (activePage === 'dati-contabili-acquisti') {
      void executeDatiContabiliAcquistiSearch()
      return
    }

    void executeSintesiSearch()
  }

  const handleAnalisiSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isRisorsePage) {
      void loadRisorseValutazione(isRisorseMensilePage)
      return
    }

    if (activePage === 'commesse-andamento-mensile') {
      void loadCommesseAndamentoMensile()
      return
    }

    if (activePage === 'commesse-dati-annuali-aggregati') {
      void loadCommesseDatiAnnualiAggregati()
      return
    }

    if (activePage === 'processo-offerta-offerte') {
      void loadProcessoOffertaOfferte()
      return
    }

    if (
      activePage === 'processo-offerta-sintesi-rcc' ||
      activePage === 'processo-offerta-percentuale-successo-rcc' ||
      activePage === 'processo-offerta-incidenza-rcc'
    ) {
      void loadProcessoOffertaSintesiRcc()
      return
    }

    if (
      activePage === 'processo-offerta-sintesi-bu' ||
      activePage === 'processo-offerta-percentuale-successo-bu' ||
      activePage === 'processo-offerta-incidenza-bu'
    ) {
      void loadProcessoOffertaSintesiBu()
      return
    }

    if (activePage === 'previsioni-report-funnel-rcc') {
      void loadPrevisioniReportFunnelRcc()
      return
    }

    if (activePage === 'previsioni-report-funnel-bu') {
      void loadPrevisioniReportFunnelBu()
      return
    }

    if (activePage === 'previsioni-utile-mensile-rcc') {
      void loadPrevisioniUtileMensileRcc()
      return
    }

    if (activePage === 'previsioni-utile-mensile-bu') {
      void loadPrevisioniUtileMensileBu()
      return
    }

    if (activePage === 'previsioni-funnel') {
      void loadPrevisioniFunnel()
      return
    }

    if (activePage === 'analisi-rcc-pivot-fatturato') {
      void loadAnalisiRccPivotFatturato()
      return
    }

    if (activePage === 'analisi-bu-pivot-fatturato') {
      void loadAnalisiBuPivotFatturato()
      return
    }

    if (activePage === 'analisi-burcc-pivot-fatturato') {
      void loadAnalisiBurccPivotFatturato()
      return
    }

    if (activePage === 'analisi-bu-risultato-mensile') {
      void loadAnalisiBuRisultatoMensile()
      return
    }

    if (activePage === 'analisi-burcc-risultato-mensile') {
      void loadAnalisiBurccRisultatoMensile()
      return
    }

    if (activePage === 'analisi-piano-fatturazione') {
      void loadAnalisiPianoFatturazione()
      return
    }

    void loadAnalisiRccRisultatoMensile()
  }

  const applyImpersonation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const requested = impersonationInput.trim()
    if (!requested) {
      setStatusMessage('Inserisci lo username da impersonificare.')
      return
    }

    if (!token.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    setStatusMessage(`Verifica impersonificazione utente "${requested}"...`)
    const ok = await ensureSession(token, 'stale_token', requested)
    if (!ok) {
      return
    }

    setImpersonationModalOpen(false)
    setOpenMenu(null)
  }

  const stopImpersonation = async () => {
    if (!token.trim()) {
      return
    }

    setStatusMessage('Rimozione impersonificazione in corso...')
    const ok = await ensureSession(token, 'stale_token', '')
    if (!ok) {
      return
    }

    setImpersonationInput('')
    setImpersonationModalOpen(false)
    setOpenMenu(null)
    setStatusMessage('Impersonificazione terminata. Contesto personale ripristinato.')
  }

  const handleOpenInfo = () => {
    setOpenMenu(null)
    setAppInfoModalOpen(false)
    setInfoModalOpen(true)
  }

  const handleOpenAppInfo = () => {
    setOpenMenu(null)
    setInfoModalOpen(false)
    setAppInfoModalOpen(true)
    void loadAppInfoDescriptions()
  }

  const handleOpenImpersonation = () => {
    if (!canImpersonate) {
      return
    }

    setImpersonationInput(activeImpersonation || '')
    setOpenMenu(null)
    setImpersonationModalOpen(true)
  }

  const handleLogout = () => {
    setOpenMenu(null)
    setInfoModalOpen(false)
    setAppInfoModalOpen(false)
    setImpersonationModalOpen(false)
    clearSession()
    sessionStorage.removeItem(redirectGuardKey)
    setStatusMessage('Logout locale eseguito.')
    redirectToCentralAuth('logout')
  }

  const toggleMenu = (menu: MenuKey) => {
    setOpenMenu((current) => (current === menu ? null : menu))
  }

  useEffect(() => {
    function handleGlobalClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) {
        setOpenMenu(null)
        return
      }

      if (!event.target.closest('.menu-dropdown')) {
        setOpenMenu(null)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null)
      }
    }

    document.addEventListener('click', handleGlobalClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('click', handleGlobalClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    void loadHealth()

    const savedImpersonation = (sessionStorage.getItem(impersonationStorageKey) ?? '').trim()
    const initialImpersonation = savedImpersonation || routeRequest.actAs
    if (initialImpersonation) {
      setImpersonationInput(initialImpersonation)
    }

    const params = new URLSearchParams(window.location.search)
    const tokenFromAuth = params.get('token')?.trim() ?? ''

    if (tokenFromAuth) {
      sessionStorage.removeItem(redirectGuardKey)
      saveToken(tokenFromAuth)
      params.delete('token')
      params.delete('expiresAtUtc')
      const queryString = params.toString()
      const cleanUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname
      window.history.replaceState({}, document.title, cleanUrl)
      setStatusMessage('Token ricevuto da Auth. Verifica sessione...')
      void ensureSession(tokenFromAuth, 'invalid_token', initialImpersonation)
      return
    }

    const savedToken = (localStorage.getItem(tokenStorageKey) ?? '').trim()
    if (savedToken) {
      sessionStorage.removeItem(redirectGuardKey)
      saveToken(savedToken)
      setStatusMessage('Sessione locale trovata. Verifica in corso...')
      void ensureSession(savedToken, 'stale_token', initialImpersonation)
      return
    }

    redirectToCentralAuth('missing_token')
  }, [routeRequest.actAs])

  useEffect(() => {
    if (!token.trim() || !currentProfile) {
      return
    }

    if (!canAccessAnalisiCommesseMenu) {
      setSintesiRows([])
      setSintesiSearched(false)
      setCommessaSearch('')
      setSortColumn('commessa')
      setSortDirection('asc')
      setSintesiFiltersForm(emptySintesiFiltersForm)
      return
    }

    const persisted = tryReadPersistedSintesiState()
    if (
      persisted &&
      persisted.profile === currentProfile &&
      persisted.impersonation === activeImpersonation
    ) {
      const restoredFilters: SintesiFiltersForm = {
        anni: Array.isArray(persisted.filters.anni) ? persisted.filters.anni : [],
        commessa: persisted.filters.commessa ?? '',
        tipologiaCommessa: persisted.filters.tipologiaCommessa ?? '',
        stato: persisted.filters.stato ?? '',
        macroTipologia: persisted.filters.macroTipologia ?? '',
        prodotto: persisted.filters.prodotto ?? '',
        businessUnit: persisted.filters.businessUnit ?? '',
        rcc: persisted.filters.rcc ?? '',
        pm: persisted.filters.pm ?? '',
        provenienza: persisted.filters.provenienza ?? '',
        soloScadute: Boolean(persisted.filters.soloScadute),
        escludiProdotti: Boolean(persisted.filters.escludiProdotti),
      }

      // Dopo login/session restore l'app deve rimanere sulla home neutra:
      // la pagina Sintesi si apre solo da menu esplicito utente.
      setActivePage('none')
      setSintesiMode(persisted.mode === 'aggregato' ? 'aggregato' : 'dettaglio')
      setCommessaSearch(persisted.commessaSearch ?? '')
      setSortColumn((persisted.sortColumn as SortColumn) ?? 'commessa')
      setSortDirection(persisted.sortDirection === 'desc' ? 'desc' : 'asc')
      setSintesiFiltersForm(restoredFilters)
      setSintesiRows(Array.isArray(persisted.rows) ? persisted.rows : [])
      setSintesiSearched(Boolean(persisted.searched))
      void loadSintesiFilters(token, activeImpersonation, currentProfile, restoredFilters.anni, 'commesse')
      setStatusMessage('Lista commesse ripristinata dalla sessione.')
      return
    }

    setSintesiRows([])
    setSintesiSearched(false)
    setCommessaSearch('')
    setSortColumn('commessa')
    setSortDirection('asc')
    setSintesiFiltersForm(emptySintesiFiltersForm)
    void loadSintesiFilters(token, activeImpersonation, currentProfile, [], 'commesse')
  }, [token, activeImpersonation, currentProfile, canAccessAnalisiCommesseMenu])

  useEffect(() => {
    if (
      !token.trim() ||
      !currentProfile ||
      (activePage !== 'commesse-sintesi' && activePage !== 'prodotti-sintesi' && activePage !== 'dati-contabili-vendita' && activePage !== 'dati-contabili-acquisti') ||
      sintesiLoadingFilters
    ) {
      return
    }

    const debounceHandle = window.setTimeout(() => {
      void loadSintesiCommesseOptions(token, activeImpersonation, currentProfile, commessaSearch, pageToScope(activePage))
    }, 250)

    return () => {
      window.clearTimeout(debounceHandle)
    }
  }, [
    token,
    activeImpersonation,
    currentProfile,
    activePage,
    commessaSearch,
    sintesiLoadingFilters,
  ])

  useEffect(() => {
    if (!token.trim() || !currentProfile || detailRouteProcessed) {
      return
    }

    if (routeRequest.profile) {
      const matchedProfile = profiles.find((profile) => (
        profile.localeCompare(routeRequest.profile, 'it', { sensitivity: 'base' }) === 0
      ))

      if (matchedProfile && matchedProfile !== currentProfile) {
        setSelectedProfile(matchedProfile)
        return
      }
    }

    if (routeRequest.page || routeRequest.commessa) {
      const url = new URL(window.location.href)
      url.searchParams.delete('page')
      url.searchParams.delete('commessa')
      window.history.replaceState({}, document.title, url.toString())
    }

    setDetailRouteProcessed(true)
  }, [
    token,
    currentProfile,
    profiles,
    activeImpersonation,
    routeRequest.page,
    routeRequest.commessa,
    routeRequest.profile,
    detailRouteProcessed,
  ])

  useEffect(() => {
    if (!currentProfile) {
      return
    }

    const isAnalisiCommessePage = (
      activePage === 'commesse-sintesi' ||
      activePage === 'prodotti-sintesi' ||
      activePage === 'commessa-dettaglio' ||
      activePage === 'commesse-andamento-mensile' ||
      activePage === 'commesse-dati-annuali-aggregati'
    )
    if (isAnalisiCommessePage && !canAccessAnalisiCommesseMenu) {
      setActivePage('none')
      return
    }

    const isDatiContabiliAreaPage = activePage === 'dati-contabili-vendita' || activePage === 'dati-contabili-acquisti'
    if (isDatiContabiliAreaPage && !canAccessDatiContabiliMenu) {
      setActivePage('none')
      return
    }

    if (isRisorsePage && !canAccessRisultatiRisorseMenu) {
      setActivePage('none')
    }
  }, [activePage, currentProfile, canAccessAnalisiCommesseMenu, canAccessDatiContabiliMenu, isRisorsePage, canAccessRisultatiRisorseMenu])

  useEffect(() => {
    if (!token.trim() || !currentProfile) {
      return
    }

    if (activePage !== 'commesse-sintesi') {
      return
    }

    const snapshot: SintesiPersistedState = {
      profile: currentProfile,
      impersonation: activeImpersonation,
      activePage,
      mode: sintesiMode,
      commessaSearch,
      sortColumn,
      sortDirection,
      filters: sintesiFiltersForm,
      rows: sintesiRows,
      searched: sintesiSearched,
    }

    sessionStorage.setItem(sintesiStateStorageKey, JSON.stringify(snapshot))
  }, [
    token,
    currentProfile,
    activeImpersonation,
    activePage,
    sintesiMode,
    commessaSearch,
    sortColumn,
    sortDirection,
    sintesiFiltersForm,
    sintesiRows,
    sintesiSearched,
  ])

  const productOrCounterpartFilter: {
    id: string
    label: string
    key: keyof Omit<SintesiFiltersForm, 'anni' | 'commessa' | 'escludiProdotti' | 'provenienza' | 'soloScadute'>
    options: FilterOption[]
  } = {
    id: isProdottiSintesiPage ? 'sintesi-prodotto' : 'sintesi-controparte',
    label: isProdottiSintesiPage ? 'Prodotto' : 'Controparte',
    key: 'prodotto',
    options: distinctFilterOptionsForUi(sintesiFiltersCatalog.prodotti),
  }
  const businessUnitFilter: {
    id: string
    label: string
    key: keyof Omit<SintesiFiltersForm, 'anni' | 'commessa' | 'escludiProdotti' | 'provenienza' | 'soloScadute'>
    options: FilterOption[]
  } = {
    id: 'sintesi-business-unit',
    label: 'Business Unit',
    key: 'businessUnit',
    options: distinctFilterOptionsForUi(sintesiFiltersCatalog.businessUnits),
  }

  const sintesiSelects: Array<{
    id: string
    label: string
    key: keyof Omit<SintesiFiltersForm, 'anni' | 'commessa' | 'escludiProdotti' | 'provenienza' | 'soloScadute'>
    options: FilterOption[]
  }> = [
    { id: 'sintesi-tipologia', label: 'Tipologia Commessa', key: 'tipologiaCommessa', options: distinctFilterOptionsForUi(sintesiFiltersCatalog.tipologieCommessa) },
    { id: 'sintesi-stato', label: 'Stato', key: 'stato', options: distinctFilterOptionsForUi(sintesiFiltersCatalog.stati) },
    { id: 'sintesi-macro', label: 'Macrotipologia', key: 'macroTipologia', options: distinctFilterOptionsForUi(sintesiFiltersCatalog.macroTipologie) },
    ...(isCommesseSintesiPage
      ? [businessUnitFilter, productOrCounterpartFilter]
      : [productOrCounterpartFilter, businessUnitFilter]),
    { id: 'sintesi-rcc', label: 'RCC', key: 'rcc', options: distinctPersonFilterOptionsForUi(sintesiFiltersCatalog.rcc) },
    { id: 'sintesi-pm', label: 'PM', key: 'pm', options: distinctPersonFilterOptionsForUi(sintesiFiltersCatalog.pm) },
  ]
  const sintesiFilterFieldCount = useMemo(() => {
    let count = 2 + sintesiSelects.length // Anni + Ricerca Commessa
    if (isDatiContabiliPage) {
      count += 2 // Provenienza + Solo scadute
    }
    if (!isProdottiSintesiPage && !isDatiContabiliPage) {
      count += 1 // Escludi prodotti
    }
    return count
  }, [sintesiSelects.length, isDatiContabiliPage, isProdottiSintesiPage])
  const isSintesiFiltersCollapsible = sintesiFilterFieldCount > 5

  const isAggregatedMode = sintesiMode === 'aggregato'
  const annoOptions = useMemo(() => (
    [...sintesiFiltersCatalog.anni]
      .sort((left, right) => Number(right.value) - Number(left.value))
  ), [sintesiFiltersCatalog.anni])
  const datiContabiliProvenienzaOptions = useMemo(() => {
    const merged = new Set<string>([
      'Fattura in contabilitÃ ',
      'Fattura Futura',
      'Ricavo Ipotetico',
    ])
    const sourceRows = isDatiContabiliAcquistiPage
      ? datiContabiliAcquistoRows
      : datiContabiliVenditaRows
    sourceRows.forEach((row) => {
      const value = row.provenienza?.trim() ?? ''
      if (value) {
        merged.add(value)
      }
    })

    return [...merged]
      .sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
      .map((value) => ({ value, label: value }))
  }, [datiContabiliAcquistoRows, datiContabiliVenditaRows, isDatiContabiliAcquistiPage])
  const allCommesseOptions = useMemo(() => {
    if (sintesiCommesseOptions.length > 0) {
      return sintesiCommesseOptions
    }

    return sintesiFiltersCatalog.commesse
  }, [sintesiCommesseOptions, sintesiFiltersCatalog.commesse])
  const normalizedCommessaSearch = commessaSearch.trim().toLowerCase()
  const filteredCommesse = useMemo(() => {
    const allOptions = allCommesseOptions
    if (!normalizedCommessaSearch) {
      return allOptions.slice(0, 500)
    }

    return allOptions
      .filter((option) => (
        option.label.toLowerCase().includes(normalizedCommessaSearch) ||
        option.value.toLowerCase().includes(normalizedCommessaSearch)
      ))
      .slice(0, 500)
  }, [allCommesseOptions, normalizedCommessaSearch])

  const commessaOptions = useMemo(() => {
    const selected = allCommesseOptions.find((option) => option.value === sintesiFiltersForm.commessa)
    if (!selected) {
      return filteredCommesse
    }

    if (filteredCommesse.some((option) => option.value === selected.value)) {
      return filteredCommesse
    }

    return [selected, ...filteredCommesse]
  }, [allCommesseOptions, filteredCommesse, sintesiFiltersForm.commessa])
  const selectedAnniLabel = useMemo(() => {
    if (sintesiFiltersForm.anni.length === 0) {
      return 'tutti'
    }

    return [...sintesiFiltersForm.anni]
      .sort((left, right) => Number(right) - Number(left))
      .join('-')
  }, [sintesiFiltersForm.anni])

  const resolveSortValue = (row: CommessaSintesiRow, column: SortColumn) => {
    switch (column) {
      case 'anno':
        return row.anno ?? 0
      case 'commessa':
        return row.commessa
      case 'descrizioneCommessa':
        return row.descrizioneCommessa
      case 'tipologiaCommessa':
        return row.tipologiaCommessa
      case 'stato':
        return row.stato
      case 'macroTipologia':
        return row.macroTipologia
      case 'controparte':
        return row.controparte
      case 'prodotto':
        return row.prodotto
      case 'businessUnit':
        return row.businessUnit
      case 'rcc':
        return row.rcc
      case 'pm':
        return row.pm
      case 'oreLavorate':
        return row.oreLavorate
      case 'costoPersonale':
        return row.costoPersonale
      case 'ricavi':
        return row.ricavi
      case 'costi':
        return row.costi
      case 'utileSpecifico':
        return row.utileSpecifico
      case 'ricaviFuturi':
        return row.ricaviFuturi
      case 'costiFuturi':
        return row.costiFuturi
      default:
        return ''
    }
  }

  const displayRows = useMemo(() => {
    if (isProdottiSintesiPage) {
      return sintesiRows.filter((row) => isValidProductValue(row.prodotto))
    }

    if (!sintesiFiltersForm.escludiProdotti) {
      return sintesiRows
    }

    return sintesiRows.filter((row) => {
      const prodotto = row.prodotto.trim()
      if (!prodotto) {
        return true
      }

      const normalized = prodotto.toUpperCase()
      return normalized === 'NON DEFINITO' || normalized === 'NON DEFINTO'
    })
  }, [isProdottiSintesiPage, sintesiRows, sintesiFiltersForm.escludiProdotti])

  const sortedRows = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1
    return [...displayRows].sort((leftRow, rightRow) => {
      const left = resolveSortValue(leftRow, sortColumn)
      const right = resolveSortValue(rightRow, sortColumn)

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction
      }

      const leftText = String(left ?? '').toLowerCase()
      const rightText = String(right ?? '').toLowerCase()
      return leftText.localeCompare(rightText, 'it', { sensitivity: 'base', numeric: true }) * direction
    })
  }, [displayRows, sortColumn, sortDirection])

  const productOrCounterpartColumn: SortColumn = isProdottiSintesiPage ? 'prodotto' : 'controparte'
  const productOrCounterpartLabel = isProdottiSintesiPage ? 'Prodotto' : 'Controparte'

  const productGroups = useMemo<ProdottoGroup[]>(() => {
    if (!isProdottiSintesiPage) {
      return []
    }

    const groups = new Map<string, ProdottoGroup>()
    for (const row of displayRows) {
      if (!isValidProductValue(row.prodotto)) {
        continue
      }

      const productKey = row.prodotto.trim()
      if (!groups.has(productKey)) {
        groups.set(productKey, {
          productKey,
          summary: {
            prodotto: productKey,
            oreLavorate: 0,
            costoPersonale: 0,
            ricavi: 0,
            costi: 0,
            utileSpecifico: 0,
            ricaviFuturi: 0,
            costiFuturi: 0,
          },
          rows: [],
        })
      }

      const current = groups.get(productKey)!
      current.summary.oreLavorate += row.oreLavorate
      current.summary.costoPersonale += row.costoPersonale
      current.summary.ricavi += row.ricavi
      current.summary.costi += row.costi
      current.summary.utileSpecifico += row.utileSpecifico
      current.summary.ricaviFuturi += row.ricaviFuturi
      current.summary.costiFuturi += row.costiFuturi
      current.rows.push(row)
    }

    const direction = sortDirection === 'asc' ? 1 : -1
    const sortedGroups = [...groups.values()]
      .map((group) => ({
        ...group,
        rows: [...group.rows].sort((left, right) => {
          const commessaCompare = left.commessa.localeCompare(right.commessa, 'it', {
            sensitivity: 'base',
            numeric: true,
          })

          if (commessaCompare !== 0) {
            return commessaCompare
          }

          return (left.anno ?? 0) - (right.anno ?? 0)
        }),
      }))
      .sort((leftGroup, rightGroup) => {
        const resolveGroupSortValue = (group: ProdottoGroup): number | string => {
          switch (sortColumn) {
            case 'oreLavorate':
              return group.summary.oreLavorate
            case 'costoPersonale':
              return group.summary.costoPersonale
            case 'ricavi':
              return group.summary.ricavi
            case 'costi':
              return group.summary.costi
            case 'utileSpecifico':
              return group.summary.utileSpecifico
            case 'ricaviFuturi':
              return group.summary.ricaviFuturi
            case 'costiFuturi':
              return group.summary.costiFuturi
            case 'prodotto':
              return group.summary.prodotto
            default:
              return group.summary.prodotto
          }
        }

        const left = resolveGroupSortValue(leftGroup)
        const right = resolveGroupSortValue(rightGroup)

        if (typeof left === 'number' && typeof right === 'number') {
          return (left - right) * direction
        }

        const leftText = String(left ?? '').toLowerCase()
        const rightText = String(right ?? '').toLowerCase()
        return leftText.localeCompare(rightText, 'it', { sensitivity: 'base', numeric: true }) * direction
      })

    return sortedGroups
  }, [displayRows, isProdottiSintesiPage, sortColumn, sortDirection])

  const productGroupKeys = useMemo(
    () => productGroups.map((group) => group.productKey),
    [productGroups],
  )

  useEffect(() => {
    if (!isProdottiSintesiPage) {
      setCollapsedProductKeys([])
      return
    }

    setCollapsedProductKeys((current) => {
      const allowed = new Set(productGroupKeys)
      const next = current.filter((key) => allowed.has(key))
      return next.length === current.length ? current : next
    })
  }, [isProdottiSintesiPage, productGroupKeys])

  const collapsedProductsSet = useMemo(
    () => new Set(collapsedProductKeys),
    [collapsedProductKeys],
  )

  const hasProductGroups = isProdottiSintesiPage && productGroupKeys.length > 0
  const hasCollapsedProducts = hasProductGroups && collapsedProductKeys.length > 0
  const areAllProductsCollapsed = hasProductGroups && productGroupKeys.every((key) => collapsedProductsSet.has(key))

  const expandAllProducts = () => {
    setCollapsedProductKeys([])
  }

  const collapseAllProducts = () => {
    setCollapsedProductKeys([...productGroupKeys])
  }

  const toggleProductCollapse = (productKey: string) => {
    setCollapsedProductKeys((current) => (
      current.includes(productKey)
        ? current.filter((value) => value !== productKey)
        : [...current, productKey]
    ))
  }

  const sintesiTableRows = useMemo<SintesiTableRow[]>(() => {
    if (!isProdottiSintesiPage) {
      return sortedRows.map((row, index) => ({
        kind: 'commessa',
        row,
        key: `${row.commessa}-${row.businessUnit}-${index}`,
      }))
    }

    const result: SintesiTableRow[] = []
    for (const group of productGroups) {
      const isCollapsed = collapsedProductsSet.has(group.productKey)
      result.push({
        kind: 'prodotto-summary',
        row: group.summary,
        key: `product-summary-${group.productKey}`,
        productKey: group.productKey,
        isCollapsed,
        commesseCount: group.rows.length,
      })

      if (isCollapsed) {
        continue
      }

      for (let index = 0; index < group.rows.length; index += 1) {
        const row = group.rows[index]
        result.push({
          kind: 'commessa',
          row,
          key: `product-row-${group.productKey}-${row.commessa}-${row.businessUnit}-${index}`,
        })
      }
    }

    return result
  }, [collapsedProductsSet, isProdottiSintesiPage, productGroups, sortedRows])

  const totals = useMemo(() => (
    sortedRows.reduce((acc, row) => ({
      oreLavorate: acc.oreLavorate + row.oreLavorate,
      costoPersonale: acc.costoPersonale + row.costoPersonale,
      ricavi: acc.ricavi + row.ricavi,
      costi: acc.costi + row.costi,
      utileSpecifico: acc.utileSpecifico + row.utileSpecifico,
      ricaviFuturi: acc.ricaviFuturi + row.ricaviFuturi,
      costiFuturi: acc.costiFuturi + row.costiFuturi,
    }), {
      oreLavorate: 0,
      costoPersonale: 0,
      ricavi: 0,
      costi: 0,
      utileSpecifico: 0,
      ricaviFuturi: 0,
      costiFuturi: 0,
    })
  ), [sortedRows])

  const analisiRccGrids = useMemo(() => {
    if (!analisiRccData) {
      return []
    }

    return [analisiRccData.risultatoPesato, analisiRccData.percentualePesata]
  }, [analisiRccData])
  const analisiRccPivotRows = analisiRccPivotData?.righe ?? []
  const analisiRccPivotTotaliPerAnno = analisiRccPivotData?.totaliPerAnno ?? []
  const analisiRccPivotAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    analisiRccPivotAnni.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    ;(analisiRccPivotData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }

    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [analisiRccPivotAnni, analisiRccPivotData?.anni, sintesiFiltersCatalog.anni])
  const analisiRccPivotRccOptions = useMemo(() => {
    const options = new Set<string>()
    ;(analisiRccPivotData?.rccDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = analisiRccPivotRcc.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (analisiRccPivotData?.rccFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiRccPivotData?.rccDisponibili, analisiRccPivotData?.rccFiltro, analisiRccPivotRcc])
  const analisiBuGrids = useMemo(() => {
    if (!analisiBuData) {
      return []
    }

    return [analisiBuData.risultatoPesato, analisiBuData.percentualePesata]
  }, [analisiBuData])
  const analisiBuPivotRows = analisiBuPivotData?.righe ?? []
  const analisiBuPivotTotaliPerAnno = analisiBuPivotData?.totaliPerAnno ?? []
  const analisiBuPivotAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    analisiBuPivotAnni.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    ;(analisiBuPivotData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }

    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [analisiBuPivotAnni, analisiBuPivotData?.anni, sintesiFiltersCatalog.anni])
  const analisiBuPivotBusinessUnitOptions = useMemo(() => {
    const options = new Set<string>()
    ;(analisiBuPivotData?.rccDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = analisiBuPivotBusinessUnit.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (analisiBuPivotData?.rccFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiBuPivotData?.rccDisponibili, analisiBuPivotData?.rccFiltro, analisiBuPivotBusinessUnit])
  const analisiBurccGrids = useMemo(() => {
    if (!analisiBurccData) {
      return []
    }

    return [analisiBurccData.risultatoPesato, analisiBurccData.percentualePesata]
  }, [analisiBurccData])
  const analisiBurccBusinessUnitOptions = useMemo(() => {
    const options = new Set<string>()
    ;(analisiBurccData?.businessUnitDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = analisiBurccBusinessUnit.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (analisiBurccData?.businessUnitFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiBurccData?.businessUnitDisponibili, analisiBurccData?.businessUnitFiltro, analisiBurccBusinessUnit])
  const analisiBurccRccOptions = useMemo(() => {
    const options = new Set<string>()
    ;(analisiBurccData?.rccDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = analisiBurccRcc.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (analisiBurccData?.rccFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiBurccData?.rccDisponibili, analisiBurccData?.rccFiltro, analisiBurccRcc])
  const analisiBurccPivotRows = analisiBurccPivotData?.righe ?? []
  const analisiBurccPivotTotaliPerAnno = analisiBurccPivotData?.totaliPerAnno ?? []
  const analisiBurccPivotAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    analisiBurccPivotAnni.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    ;(analisiBurccPivotData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }

    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [analisiBurccPivotAnni, analisiBurccPivotData?.anni, sintesiFiltersCatalog.anni])
  const analisiBurccPivotBusinessUnitOptions = useMemo(() => {
    const options = new Set<string>()
    ;(analisiBurccPivotData?.businessUnitDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = analisiBurccPivotBusinessUnit.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (analisiBurccPivotData?.businessUnitFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiBurccPivotData?.businessUnitDisponibili, analisiBurccPivotData?.businessUnitFiltro, analisiBurccPivotBusinessUnit])
  const analisiBurccPivotRccOptions = useMemo(() => {
    const options = new Set<string>()
    ;(analisiBurccPivotData?.rccDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = analisiBurccPivotRcc.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (analisiBurccPivotData?.rccFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiBurccPivotData?.rccDisponibili, analisiBurccPivotData?.rccFiltro, analisiBurccPivotRcc])
  const analisiPianoFatturazioneRows = useMemo(
    () => [...(analisiPianoFatturazioneData?.righe ?? [])]
      .sort((left, right) => {
        if (left.isTotale !== right.isTotale) {
          return left.isTotale ? 1 : -1
        }
        return left.rcc.localeCompare(right.rcc, 'it', { sensitivity: 'base' })
      }),
    [analisiPianoFatturazioneData?.righe],
  )
  const analisiPianoFatturazioneAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    const selected = analisiPianoFatturazioneAnno.trim()
    if (selected) {
      years.add(selected)
    }
    const serverYear = analisiPianoFatturazioneData?.anno
    if (Number.isFinite(serverYear) && (serverYear ?? 0) > 0) {
      years.add((serverYear ?? 0).toString())
    }
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }
    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [analisiPianoFatturazioneAnno, analisiPianoFatturazioneData?.anno, sintesiFiltersCatalog.anni])
  const analisiPianoFatturazioneMesiSnapshotOptions = useMemo(() => {
    const months = new Set<number>()
    for (let month = 1; month <= 12; month += 1) {
      months.add(month)
    }
    ;(analisiPianoFatturazioneData?.mesiSnapshot ?? []).forEach((value) => {
      if (Number.isFinite(value) && value >= 1 && value <= 12) {
        months.add(value)
      }
    })
    analisiPianoFatturazioneMesiSnapshot.forEach((value) => {
      const parsed = Number.parseInt(value.trim(), 10)
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 12) {
        months.add(parsed)
      }
    })
    return [...months].sort((left, right) => left - right)
  }, [analisiPianoFatturazioneData?.mesiSnapshot, analisiPianoFatturazioneMesiSnapshot])
  const analisiPianoFatturazioneMesiRiferimento = useMemo(() => {
    const months = new Set<number>()
    ;(analisiPianoFatturazioneData?.mesiRiferimento ?? []).forEach((value) => {
      if (Number.isFinite(value) && value >= 1 && value <= 12) {
        months.add(value)
      }
    })
    if (months.size === 0) {
      for (let month = 1; month <= 12; month += 1) {
        months.add(month)
      }
    }
    return [...months].sort((left, right) => left - right)
  }, [analisiPianoFatturazioneData?.mesiRiferimento])
  const analisiPianoFatturazioneRccOptions = useMemo(() => {
    const options = new Set<string>()
    ;(analisiPianoFatturazioneData?.rccDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = analisiPianoFatturazioneRcc.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (analisiPianoFatturazioneData?.rccFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiPianoFatturazioneData?.rccDisponibili, analisiPianoFatturazioneData?.rccFiltro, analisiPianoFatturazioneRcc])
  const analisiPianoFatturazioneProgressRows = useMemo<AnalisiRccPianoFatturazioneProgressRow[]>(() => (
    analisiPianoFatturazioneRows.map((row) => {
      let cumulato = 0
      const valoriMensili = analisiPianoFatturazioneMesiRiferimento.map((mese) => {
        cumulato += row.valoriMensili.find((item) => item.mese === mese)?.valore ?? 0
        return {
          mese,
          importoProgressivo: cumulato,
          percentualeBudgetProgressiva: row.budget === 0 ? 0 : cumulato / row.budget,
        }
      })
      return {
        rcc: row.rcc,
        isTotale: row.isTotale,
        budget: row.budget,
        valoriMensili,
        importoTotaleProgressivo: cumulato,
        percentualeTotaleBudget: row.budget === 0 ? 0 : cumulato / row.budget,
      }
    })
  ), [analisiPianoFatturazioneMesiRiferimento, analisiPianoFatturazioneRows])
  const commesseAndamentoMensileRows = commesseAndamentoMensileData?.items ?? []
  const commesseAndamentoMensileTotals = useMemo(() => (
    commesseAndamentoMensileRows.reduce((acc, row) => ({
      oreLavorate: acc.oreLavorate + row.oreLavorate,
      costoPersonale: acc.costoPersonale + row.costoPersonale,
      ricavi: acc.ricavi + row.ricavi,
      costi: acc.costi + row.costi,
      costoGeneraleRibaltato: acc.costoGeneraleRibaltato + row.costoGeneraleRibaltato,
      utileSpecifico: acc.utileSpecifico + row.utileSpecifico,
    }), {
      oreLavorate: 0,
      costoPersonale: 0,
      ricavi: 0,
      costi: 0,
      costoGeneraleRibaltato: 0,
      utileSpecifico: 0,
    })
  ), [commesseAndamentoMensileRows])
  const commesseAndamentoMensileAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    commesseAndamentoMensileAnni.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    commesseAndamentoMensileRows.forEach((row) => {
      if (Number.isFinite(row.annoCompetenza) && row.annoCompetenza > 0) {
        years.add(row.annoCompetenza.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }

    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [commesseAndamentoMensileAnni, commesseAndamentoMensileRows, sintesiFiltersCatalog.anni])
  const commesseAndamentoMensileMeseOptions = useMemo(() => {
    const months = new Set<number>()
    for (let month = 1; month <= 12; month += 1) {
      months.add(month)
    }
    commesseAndamentoMensileRows.forEach((row) => {
      if (row.meseCompetenza >= 1 && row.meseCompetenza <= 12) {
        months.add(row.meseCompetenza)
      }
    })
    const selected = parseReferenceMonthStrict(commesseAndamentoMensileMese)
    if (selected !== null) {
      months.add(selected)
    }
    return [...months].sort((left, right) => left - right)
  }, [commesseAndamentoMensileMese, commesseAndamentoMensileRows])
  const commesseAndamentoMensileTipologiaOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.tipologieCommessa,
      commesseAndamentoMensileTipologia,
      commesseAndamentoMensileRows.map((row) => row.tipologiaCommessa),
    ),
    [commesseAndamentoMensileRows, commesseAndamentoMensileTipologia, sintesiFiltersCatalog.tipologieCommessa],
  )
  const commesseAndamentoMensileBusinessUnitOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.businessUnits,
      commesseAndamentoMensileBusinessUnit,
      commesseAndamentoMensileRows.map((row) => row.businessUnit),
    ),
    [commesseAndamentoMensileBusinessUnit, commesseAndamentoMensileRows, sintesiFiltersCatalog.businessUnits],
  )
  const commesseAndamentoMensileRccOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.rcc,
      commesseAndamentoMensileRcc,
      commesseAndamentoMensileRows.map((row) => row.rcc),
    ),
    [commesseAndamentoMensileRcc, commesseAndamentoMensileRows, sintesiFiltersCatalog.rcc],
  )
  const commesseAndamentoMensilePmOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.pm,
      commesseAndamentoMensilePm,
      commesseAndamentoMensileRows.map((row) => row.pm),
    ),
    [commesseAndamentoMensilePm, commesseAndamentoMensileRows, sintesiFiltersCatalog.pm],
  )
  const commesseAndamentoMensileRccSelectItems = useMemo(
    () => buildPersonSelectItems(commesseAndamentoMensileRccOptions),
    [commesseAndamentoMensileRccOptions],
  )
  const commesseAndamentoMensilePmSelectItems = useMemo(
    () => buildPersonSelectItems(commesseAndamentoMensilePmOptions),
    [commesseAndamentoMensilePmOptions],
  )
  const commesseDatiAnnualiRows = commesseDatiAnnualiData?.items ?? []
  const commesseDatiAnnualiAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = normalizeFilterText(option.value)
      if (value) {
        years.add(value)
      }
    })
    commesseDatiAnnualiAnni.forEach((value) => {
      const normalized = normalizeFilterText(value)
      if (normalized) {
        years.add(normalized)
      }
    })
    commesseDatiAnnualiRows.forEach((row) => {
      if (Number.isFinite(row.anno ?? 0) && (row.anno ?? 0) > 0) {
        years.add((row.anno ?? 0).toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }

    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [commesseDatiAnnualiAnni, commesseDatiAnnualiRows, sintesiFiltersCatalog.anni])
  const commesseDatiAnnualiMacroTipologiaOptions = useMemo(() => {
    const values = new Set<string>()
    distinctFilterOptionsForUi(sintesiFiltersCatalog.macroTipologie).forEach((option) => {
      const normalized = normalizeFilterText(option.value)
      if (normalized) {
        values.add(normalized)
      }
    })
    commesseDatiAnnualiRows.forEach((row) => {
      const normalized = normalizeFilterText(row.macroTipologia)
      if (normalized) {
        values.add(normalized)
      }
    })
    commesseDatiAnnualiMacroTipologie.forEach((value) => {
      const normalized = normalizeFilterText(value)
      if (normalized) {
        values.add(normalized)
      }
    })
    return [...values]
      .sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
      .map((value) => ({ value, label: value }))
  }, [commesseDatiAnnualiMacroTipologie, commesseDatiAnnualiRows, sintesiFiltersCatalog.macroTipologie])
  const commesseDatiAnnualiSelectedFieldOptions = useMemo(
    () => commesseDatiAnnualiSelectedFields
      .map((key) => datiAnnualiPivotFieldOptions.find((option) => option.key === key))
      .filter((option): option is { key: DatiAnnualiPivotFieldKey; label: string } => Boolean(option)),
    [commesseDatiAnnualiSelectedFields],
  )
  const commesseDatiAnnualiAvailableFieldOptions = useMemo(
    () => datiAnnualiPivotFieldOptions.filter((option) => !commesseDatiAnnualiSelectedFields.includes(option.key)),
    [commesseDatiAnnualiSelectedFields],
  )
  const commesseDatiAnnualiPivotRows = useMemo(() => {
    const selectedMacroSet = new Set(
      commesseDatiAnnualiMacroTipologie
        .map((value) => normalizeFilterText(value).toUpperCase())
        .filter((value) => value.length > 0),
    )

    const validRows = commesseDatiAnnualiRows
      .filter((row): row is CommessaSintesiRow & { anno: number } => Number.isFinite(row.anno ?? NaN) && (row.anno ?? 0) > 0)
      .filter((row) => {
        if (selectedMacroSet.size === 0) {
          return true
        }

        const rowMacro = normalizeFilterText(row.macroTipologia).toUpperCase()
        return selectedMacroSet.has(rowMacro)
      })

    if (validRows.length === 0) {
      return [] as CommesseDatiAnnualiPivotRow[]
    }

    const fieldLabels = new Map(datiAnnualiPivotFieldOptions.map((option) => [option.key, option.label]))
    const pivotRows: CommesseDatiAnnualiPivotRow[] = []

    const buildGroupRows = (
      rowsAtLevel: CommessaSintesiRow[],
      level: number,
      pathKey: string,
    ) => {
      const fieldKey = commesseDatiAnnualiSelectedFields[level]
      if (!fieldKey) {
        return
      }

      const grouped = new Map<string, { value: string; rows: CommessaSintesiRow[] }>()
      rowsAtLevel.forEach((row) => {
        const rawValue = extractDatiAnnualiPivotFieldValue(row, fieldKey)
        const value = normalizePivotGroupValue(rawValue)
        const key = value.toUpperCase()
        const current = grouped.get(key)
        if (current) {
          current.rows.push(row)
        } else {
          grouped.set(key, { value, rows: [row] })
        }
      })

      const sortedGroups = [...grouped.values()].sort((left, right) => {
        if (fieldKey === 'anno') {
          const leftYear = Number.parseInt(left.value, 10)
          const rightYear = Number.parseInt(right.value, 10)
          if (Number.isFinite(leftYear) && Number.isFinite(rightYear)) {
            return leftYear - rightYear
          }
        }

        return left.value.localeCompare(right.value, 'it', { sensitivity: 'base' })
      })

      sortedGroups.forEach((group) => {
        const metrics = buildDatiAnnualiPivotMetrics(group.rows)
        const groupLabel = `${fieldLabels.get(fieldKey) ?? fieldKey}: ${group.value}`
        const groupKey = `${pathKey}|${fieldKey}|${group.value.toUpperCase()}`
        pivotRows.push({
          key: groupKey,
          kind: 'gruppo',
          level,
          anno: fieldKey === 'anno' ? Number.parseInt(group.value, 10) || null : null,
          label: groupLabel,
          ...metrics,
        })

        if (level + 1 < commesseDatiAnnualiSelectedFields.length) {
          buildGroupRows(group.rows, level + 1, groupKey)
        }
      })
    }

    if (commesseDatiAnnualiSelectedFields.length > 0) {
      buildGroupRows(validRows, 0, 'root')
    } else {
      const metrics = buildDatiAnnualiPivotMetrics(validRows)
      pivotRows.push({
        key: 'totale-dati',
        kind: 'gruppo',
        level: 0,
        anno: null,
        label: 'Dati',
        ...metrics,
      })
    }

    const grandTotal = buildDatiAnnualiPivotMetrics(validRows)
    pivotRows.push({
      key: 'totale-complessivo',
      kind: 'totale',
      level: 0,
      anno: null,
      label: 'Totale complessivo',
      ...grandTotal,
    })

    return pivotRows
  }, [commesseDatiAnnualiMacroTipologie, commesseDatiAnnualiRows, commesseDatiAnnualiSelectedFields])
  const risorseRowsSorted = useMemo(() => (
    [...risorseRows].sort((left, right) => {
      if (left.annoCompetenza !== right.annoCompetenza) {
        return right.annoCompetenza - left.annoCompetenza
      }
      const leftMonth = left.meseCompetenza ?? 0
      const rightMonth = right.meseCompetenza ?? 0
      if (leftMonth !== rightMonth) {
        return rightMonth - leftMonth
      }
      const risorsaCompare = normalizeRisorsaLabel(left).localeCompare(normalizeRisorsaLabel(right), 'it', { sensitivity: 'base' })
      if (risorsaCompare !== 0) {
        return risorsaCompare
      }
      return left.commessa.localeCompare(right.commessa, 'it', { sensitivity: 'base' })
    })
  ), [risorseRows])
  const risorseAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    risorseFiltersCatalog.anni.forEach((option) => {
      const value = normalizeFilterText(option.value)
      if (value) {
        years.add(value)
      }
    })
    risorseFiltersForm.anni.forEach((value) => {
      const normalized = normalizeFilterText(value)
      if (normalized) {
        years.add(normalized)
      }
    })
    risorseRowsSorted.forEach((row) => {
      if (Number.isFinite(row.annoCompetenza) && row.annoCompetenza > 0) {
        years.add(row.annoCompetenza.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }
    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [risorseFiltersCatalog.anni, risorseFiltersForm.anni, risorseRowsSorted])
  const risorseCommessaOptions = useMemo(() => {
    const map = new Map<string, FilterOption>()
    const searchTerm = normalizeFilterText(risorseCommessaSearch).toLowerCase()
    risorseFiltersCatalog.commesse.forEach((option) => {
      const value = normalizeFilterText(option.value)
      const label = normalizeFilterText(option.label || option.value)
      if (!value) {
        return
      }
      if (searchTerm && !label.toLowerCase().includes(searchTerm) && !value.toLowerCase().includes(searchTerm)) {
        return
      }
      map.set(value.toUpperCase(), { value, label: label || value })
    })
    risorseRowsSorted.forEach((row) => {
      const value = normalizeFilterText(row.commessa)
      if (!value) {
        return
      }
      const label = normalizeFilterText(`${row.commessa} - ${row.descrizioneCommessa}`)
      if (searchTerm && !label.toLowerCase().includes(searchTerm) && !value.toLowerCase().includes(searchTerm)) {
        return
      }
      if (!map.has(value.toUpperCase())) {
        map.set(value.toUpperCase(), { value, label: label || value })
      }
    })
    return [...map.values()].sort((left, right) => left.label.localeCompare(right.label, 'it', { sensitivity: 'base' }))
  }, [risorseCommessaSearch, risorseFiltersCatalog.commesse, risorseRowsSorted])
  const risorseTipologiaOptions = useMemo(() => (
    distinctFilterOptionsForUi([
      ...risorseFiltersCatalog.tipologieCommessa,
      ...risorseRowsSorted.map((row) => ({ value: row.tipologiaCommessa, label: row.tipologiaCommessa })),
    ])
  ), [risorseFiltersCatalog.tipologieCommessa, risorseRowsSorted])
  const risorseStatoOptions = useMemo(() => (
    distinctFilterOptionsForUi([
      ...risorseFiltersCatalog.stati,
      ...risorseRowsSorted.map((row) => ({ value: row.stato, label: row.stato })),
    ])
  ), [risorseFiltersCatalog.stati, risorseRowsSorted])
  const risorseMacroOptions = useMemo(() => (
    distinctFilterOptionsForUi([
      ...risorseFiltersCatalog.macroTipologie,
      ...risorseRowsSorted.map((row) => ({ value: row.macroTipologia, label: row.macroTipologia })),
    ])
  ), [risorseFiltersCatalog.macroTipologie, risorseRowsSorted])
  const risorseControparteOptions = useMemo(() => (
    distinctFilterOptionsForUi([
      ...risorseFiltersCatalog.controparti,
      ...risorseRowsSorted.map((row) => ({ value: row.controparte, label: row.controparte })),
    ])
  ), [risorseFiltersCatalog.controparti, risorseRowsSorted])
  const risorseBusinessUnitOptions = useMemo(() => (
    distinctFilterOptionsForUi([
      ...risorseFiltersCatalog.businessUnits,
      ...risorseRowsSorted.map((row) => ({ value: row.businessUnit, label: row.businessUnit })),
    ])
  ), [risorseFiltersCatalog.businessUnits, risorseRowsSorted])
  const risorseRccOptions = useMemo(() => (
    distinctPersonFilterOptionsForUi([
      ...risorseFiltersCatalog.rcc,
      ...risorseRowsSorted.map((row) => ({ value: row.rcc, label: row.rcc })),
    ])
  ), [risorseFiltersCatalog.rcc, risorseRowsSorted])
  const risorsePmOptions = useMemo(() => (
    distinctPersonFilterOptionsForUi([
      ...risorseFiltersCatalog.pm,
      ...risorseRowsSorted.map((row) => ({ value: row.pm, label: row.pm })),
    ])
  ), [risorseFiltersCatalog.pm, risorseRowsSorted])
  const risorseRisorsaOptions = useMemo(() => {
    const options = new Map<string, CommesseRisorseFilterOption>()
    risorseFiltersCatalog.risorse.forEach((option) => {
      const normalizedValue = normalizeFilterText(option.value)
      if (!normalizedValue) {
        return
      }
      options.set(normalizedValue, {
        ...option,
        value: normalizedValue,
        label: normalizeFilterText(option.label),
      })
    })
    risorseRowsSorted.forEach((row) => {
      const idRisorsa = row.idRisorsa
      if (!Number.isFinite(idRisorsa) || idRisorsa <= 0) {
        return
      }
      const key = idRisorsa.toString()
      if (!options.has(key)) {
        options.set(key, {
          idRisorsa,
          value: key,
          label: normalizeRisorsaLabel(row),
          inForza: row.risorsaInForza,
        })
      }
    })

    const searchTerm = normalizeFilterText(risorseRisorsaSearch).toLowerCase()
    return [...options.values()]
      .filter((option) => {
        if (!searchTerm) {
          return true
        }
        const label = normalizeFilterText(option.label).toLowerCase()
        const value = normalizeFilterText(option.value).toLowerCase()
        return label.includes(searchTerm) || value.includes(searchTerm)
      })
      .sort((left, right) => {
        if (left.inForza !== right.inForza) {
          return left.inForza ? -1 : 1
        }
        const leftLabel = left.label.replace(/^\^\s*/, '')
        const rightLabel = right.label.replace(/^\^\s*/, '')
        return leftLabel.localeCompare(rightLabel, 'it', { sensitivity: 'base' })
      })
  }, [risorseFiltersCatalog.risorse, risorseRowsSorted, risorseRisorsaSearch])
  const risorseTotals = useMemo(
    () => buildRisorsePivotMetrics(risorseRowsSorted, risorseFiltersForm.vistaCosto),
    [risorseRowsSorted, risorseFiltersForm.vistaCosto],
  )
  const risorsePivotSelectedFieldOptions = useMemo(
    () => risorsePivotSelectedFields
      .map((key) => risorsePivotFieldOptions.find((option) => option.key === key))
      .filter((option): option is { key: RisorsePivotFieldKey; label: string } => Boolean(option)),
    [risorsePivotSelectedFields],
  )
  const risorsePivotAvailableFieldOptions = useMemo(
    () => risorsePivotFieldOptions.filter((option) => !risorsePivotSelectedFields.includes(option.key)),
    [risorsePivotSelectedFields],
  )
  const risorsePivotRows = useMemo(() => {
    if (risorseRowsSorted.length === 0) {
      return [] as CommesseRisorsePivotRow[]
    }

    const fieldLabels = new Map(risorsePivotFieldOptions.map((option) => [option.key, option.label]))
    const pivotRows: CommesseRisorsePivotRow[] = []

    const buildGroupRows = (
      rowsAtLevel: CommessaRisorseValutazioneRow[],
      level: number,
      pathKey: string,
    ) => {
      const fieldKey = risorsePivotSelectedFields[level]
      if (!fieldKey) {
        return
      }

      const grouped = new Map<string, { value: string; rows: CommessaRisorseValutazioneRow[] }>()
      rowsAtLevel.forEach((row) => {
        const rawValue = extractRisorsePivotFieldValue(row, fieldKey)
        const value = normalizePivotGroupValue(rawValue)
        const key = value.toUpperCase()
        const current = grouped.get(key)
        if (current) {
          current.rows.push(row)
        } else {
          grouped.set(key, { value, rows: [row] })
        }
      })

      const sortedGroups = [...grouped.values()].sort((left, right) => {
        if (fieldKey === 'anno' || fieldKey === 'mese') {
          const leftNumber = Number.parseInt(left.value, 10)
          const rightNumber = Number.parseInt(right.value, 10)
          if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
            return leftNumber - rightNumber
          }
        }
        return left.value.localeCompare(right.value, 'it', { sensitivity: 'base' })
      })

      sortedGroups.forEach((group) => {
        const metrics = buildRisorsePivotMetrics(group.rows, risorseFiltersForm.vistaCosto)
        const groupLabel = `${fieldLabels.get(fieldKey) ?? fieldKey}: ${group.value}`
        const groupKey = `${pathKey}|${fieldKey}|${group.value.toUpperCase()}`
        pivotRows.push({
          key: groupKey,
          kind: 'gruppo',
          level,
          label: groupLabel,
          ...metrics,
        })

        if (level + 1 < risorsePivotSelectedFields.length) {
          buildGroupRows(group.rows, level + 1, groupKey)
        }
      })
    }

    if (risorsePivotSelectedFields.length > 0) {
      buildGroupRows(risorseRowsSorted, 0, 'root')
    } else {
      pivotRows.push({
        key: 'dati-risorse',
        kind: 'gruppo',
        level: 0,
        label: 'Dati',
        ...buildRisorsePivotMetrics(risorseRowsSorted, risorseFiltersForm.vistaCosto),
      })
    }

    pivotRows.push({
      key: 'totale-complessivo-risorse',
      kind: 'totale',
      level: 0,
      label: 'Totale complessivo',
      ...buildRisorsePivotMetrics(risorseRowsSorted, risorseFiltersForm.vistaCosto),
    })

    return pivotRows
  }, [risorseRowsSorted, risorsePivotSelectedFields, risorseFiltersForm.vistaCosto])
  const risorseSelects: Array<{
    id: string
    label: string
    key: keyof Omit<RisorseFiltersForm, 'anni' | 'idRisorsa' | 'vistaCosto'>
    options: FilterOption[]
  }> = [
    { id: 'risorse-tipologia', label: 'Tipologia Commessa', key: 'tipologiaCommessa', options: risorseTipologiaOptions },
    { id: 'risorse-stato', label: 'Stato', key: 'stato', options: risorseStatoOptions },
    { id: 'risorse-macro', label: 'Macrotipologia', key: 'macroTipologia', options: risorseMacroOptions },
    { id: 'risorse-controparte', label: 'Controparte', key: 'controparte', options: risorseControparteOptions },
    { id: 'risorse-business-unit', label: 'Business Unit', key: 'businessUnit', options: risorseBusinessUnitOptions },
    { id: 'risorse-rcc', label: 'RCC', key: 'rcc', options: risorseRccOptions },
    { id: 'risorse-pm', label: 'PM', key: 'pm', options: risorsePmOptions },
  ]
  const previsioniUtileMensileRccRows = previsioniUtileMensileRccData?.righe ?? []
  const previsioniUtileMensileRccTotaliPerAnno = previsioniUtileMensileRccData?.totaliPerAnno ?? []
  const previsioniUtileMensileRccAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    const selectedYear = previsioniUtileMensileRccAnno.trim()
    if (selectedYear) {
      years.add(selectedYear)
    }
    ;(previsioniUtileMensileRccData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }

    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [previsioniUtileMensileRccAnno, previsioniUtileMensileRccData?.anni, sintesiFiltersCatalog.anni])
  const previsioniUtileMensileRccOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniUtileMensileRccData?.aggregazioniDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = previsioniUtileMensileRcc.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (previsioniUtileMensileRccData?.aggregazioneFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniUtileMensileRcc, previsioniUtileMensileRccData?.aggregazioniDisponibili, previsioniUtileMensileRccData?.aggregazioneFiltro])
  const previsioniUtileMensileRccMeseRiferimentoValue = parseReferenceMonth(previsioniUtileMensileRccMeseRiferimento)
  const previsioniUtileMensileBuRows = previsioniUtileMensileBuData?.righe ?? []
  const previsioniUtileMensileBuTotaliPerAnno = previsioniUtileMensileBuData?.totaliPerAnno ?? []
  const previsioniUtileMensileBuAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    const selectedYear = previsioniUtileMensileBuAnno.trim()
    if (selectedYear) {
      years.add(selectedYear)
    }
    ;(previsioniUtileMensileBuData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }

    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [previsioniUtileMensileBuAnno, previsioniUtileMensileBuData?.anni, sintesiFiltersCatalog.anni])
  const previsioniUtileMensileBuOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniUtileMensileBuData?.aggregazioniDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = previsioniUtileMensileBu.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (previsioniUtileMensileBuData?.aggregazioneFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniUtileMensileBu, previsioniUtileMensileBuData?.aggregazioniDisponibili, previsioniUtileMensileBuData?.aggregazioneFiltro])
  const previsioniUtileMensileBuMeseRiferimentoValue = parseReferenceMonth(previsioniUtileMensileBuMeseRiferimento)
  const previsioniFunnelRows = previsioniFunnelData?.items ?? []
  const previsioniFunnelTotals = useMemo(() => {
    const totals = previsioniFunnelRows.reduce((acc, row) => ({
      budgetRicavo: acc.budgetRicavo + row.budgetRicavo,
      budgetPersonale: acc.budgetPersonale + row.budgetPersonale,
      budgetCosti: acc.budgetCosti + row.budgetCosti,
      ricavoAtteso: acc.ricavoAtteso + row.ricavoAtteso,
      fatturatoEmesso: acc.fatturatoEmesso + row.fatturatoEmesso,
      fatturatoFuturo: acc.fatturatoFuturo + row.fatturatoFuturo,
      emessaAnno: acc.emessaAnno + row.emessaAnno,
      futuraAnno: acc.futuraAnno + row.futuraAnno,
      totaleAnno: acc.totaleAnno + row.totaleAnno,
      weightedPercentNumerator: acc.weightedPercentNumerator + (row.percentualeSuccesso * row.budgetRicavo),
    }), {
      budgetRicavo: 0,
      budgetPersonale: 0,
      budgetCosti: 0,
      ricavoAtteso: 0,
      fatturatoEmesso: 0,
      fatturatoFuturo: 0,
      emessaAnno: 0,
      futuraAnno: 0,
      totaleAnno: 0,
      weightedPercentNumerator: 0,
    })

    return {
      ...totals,
      percentualeSuccesso: totals.budgetRicavo === 0
        ? 0
        : totals.weightedPercentNumerator / totals.budgetRicavo,
    }
  }, [previsioniFunnelRows])
  const previsioniFunnelAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    previsioniFunnelAnni.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    ;(previsioniFunnelData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }
    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [previsioniFunnelAnni, previsioniFunnelData?.anni, sintesiFiltersCatalog.anni])
  const previsioniFunnelRccOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniFunnelData?.rccDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = previsioniFunnelRcc.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (previsioniFunnelData?.rccFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniFunnelData?.rccDisponibili, previsioniFunnelData?.rccFiltro, previsioniFunnelRcc])
  const previsioniFunnelTipoOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniFunnelData?.tipiDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = previsioniFunnelTipo.trim()
    if (selected) {
      options.add(selected)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniFunnelData?.tipiDisponibili, previsioniFunnelTipo])
  const previsioniFunnelStatoDocumentoOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniFunnelData?.statiDocumentoDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = previsioniFunnelStatoDocumento.trim()
    if (selected) {
      options.add(selected)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniFunnelData?.statiDocumentoDisponibili, previsioniFunnelStatoDocumento])
  const previsioniReportFunnelRccRows = previsioniReportFunnelRccData?.righe ?? []
  const previsioniReportFunnelRccTotaliPerAnno = previsioniReportFunnelRccData?.totaliPerAnno ?? []
  const previsioniReportFunnelRccAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    previsioniReportFunnelRccAnni.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    ;(previsioniReportFunnelRccData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }
    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [previsioniReportFunnelRccAnni, previsioniReportFunnelRccData?.anni, sintesiFiltersCatalog.anni])
  const previsioniReportFunnelRccOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniReportFunnelRccData?.aggregazioniDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = previsioniReportFunnelRcc.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (previsioniReportFunnelRccData?.aggregazioneFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniReportFunnelRccData?.aggregazioniDisponibili, previsioniReportFunnelRccData?.aggregazioneFiltro, previsioniReportFunnelRcc])
  const previsioniReportFunnelRccAnnoSelezionato = previsioniReportFunnelRccAnni[0]?.trim()
    || new Date().getFullYear().toString()
  const previsioniReportFunnelBuRows = previsioniReportFunnelBuData?.righe ?? []
  const previsioniReportFunnelBuTotaliPerAnno = previsioniReportFunnelBuData?.totaliPerAnno ?? []
  const previsioniReportFunnelBuAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    previsioniReportFunnelBuAnni.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    ;(previsioniReportFunnelBuData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }
    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [previsioniReportFunnelBuAnni, previsioniReportFunnelBuData?.anni, sintesiFiltersCatalog.anni])
  const previsioniReportFunnelBuOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniReportFunnelBuData?.aggregazioniDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = previsioniReportFunnelBu.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (previsioniReportFunnelBuData?.aggregazioneFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniReportFunnelBuData?.aggregazioniDisponibili, previsioniReportFunnelBuData?.aggregazioneFiltro, previsioniReportFunnelBu])
  const previsioniReportFunnelBuRccOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniReportFunnelBuData?.rccDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = previsioniReportFunnelBuRcc.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (previsioniReportFunnelBuData?.rccFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniReportFunnelBuData?.rccDisponibili, previsioniReportFunnelBuData?.rccFiltro, previsioniReportFunnelBuRcc])
  const previsioniReportFunnelBuAnnoSelezionato = previsioniReportFunnelBuAnni[0]?.trim()
    || new Date().getFullYear().toString()

  const buildPrevisioniReportFunnelPivotRows = (rows: AnalisiRccPivotFunnelRow[]) => {
    type PercentBucket = {
      percentualeSuccesso: number
      numeroProtocolli: number
      totaleBudgetRicavo: number
      totaleBudgetCosti: number
      totaleFatturatoFuturo: number
      totaleEmessaAnno: number
      totaleFuturaAnno: number
      totaleRicaviComplessivi: number
    }
    type TipoBucket = {
      tipo: string
      numeroProtocolli: number
      totaleBudgetRicavo: number
      totaleBudgetCosti: number
      totaleFatturatoFuturo: number
      totaleEmessaAnno: number
      totaleFuturaAnno: number
      totaleRicaviComplessivi: number
      percentuali: Map<string, PercentBucket>
    }
    type AggregazioneBucket = {
      anno: number
      aggregazione: string
      numeroProtocolli: number
      totaleBudgetRicavo: number
      totaleBudgetCosti: number
      totaleFatturatoFuturo: number
      totaleEmessaAnno: number
      totaleFuturaAnno: number
      totaleRicaviComplessivi: number
      tipi: Map<string, TipoBucket>
    }

    const keyOf = (value: string) => value.trim().toUpperCase()
    const percentKeyOf = (value: number) => (
      Number.isFinite(value) ? value.toFixed(6) : '0.000000'
    )

    const grouped = new Map<string, AggregazioneBucket>()
    rows.forEach((row) => {
      const anno = Number.isFinite(row.anno) ? row.anno : 0
      const aggregazione = row.aggregazione.trim() || '-'
      const tipo = row.tipo.trim() || '-'
      const percentualeSuccesso = Number.isFinite(row.percentualeSuccesso) ? row.percentualeSuccesso : 0
      const numeroProtocolli = Number.isFinite(row.numeroProtocolli) ? row.numeroProtocolli : 0

      const aggregazioneMapKey = `${anno}|${keyOf(aggregazione)}`
      let aggregazioneBucket = grouped.get(aggregazioneMapKey)
      if (!aggregazioneBucket) {
        aggregazioneBucket = {
          anno,
          aggregazione,
          numeroProtocolli: 0,
          totaleBudgetRicavo: 0,
          totaleBudgetCosti: 0,
          totaleFatturatoFuturo: 0,
          totaleEmessaAnno: 0,
          totaleFuturaAnno: 0,
          totaleRicaviComplessivi: 0,
          tipi: new Map<string, TipoBucket>(),
        }
        grouped.set(aggregazioneMapKey, aggregazioneBucket)
      }

      aggregazioneBucket.numeroProtocolli += numeroProtocolli
      aggregazioneBucket.totaleBudgetRicavo += row.totaleBudgetRicavo
      aggregazioneBucket.totaleBudgetCosti += row.totaleBudgetCosti
      aggregazioneBucket.totaleFatturatoFuturo += row.totaleFatturatoFuturo
      aggregazioneBucket.totaleEmessaAnno += row.totaleEmessaAnno
      aggregazioneBucket.totaleFuturaAnno += row.totaleFuturaAnno
      aggregazioneBucket.totaleRicaviComplessivi += row.totaleRicaviComplessivi

      const tipoMapKey = keyOf(tipo)
      let tipoBucket = aggregazioneBucket.tipi.get(tipoMapKey)
      if (!tipoBucket) {
        tipoBucket = {
          tipo,
          numeroProtocolli: 0,
          totaleBudgetRicavo: 0,
          totaleBudgetCosti: 0,
          totaleFatturatoFuturo: 0,
          totaleEmessaAnno: 0,
          totaleFuturaAnno: 0,
          totaleRicaviComplessivi: 0,
          percentuali: new Map<string, PercentBucket>(),
        }
        aggregazioneBucket.tipi.set(tipoMapKey, tipoBucket)
      }

      tipoBucket.numeroProtocolli += numeroProtocolli
      tipoBucket.totaleBudgetRicavo += row.totaleBudgetRicavo
      tipoBucket.totaleBudgetCosti += row.totaleBudgetCosti
      tipoBucket.totaleFatturatoFuturo += row.totaleFatturatoFuturo
      tipoBucket.totaleEmessaAnno += row.totaleEmessaAnno
      tipoBucket.totaleFuturaAnno += row.totaleFuturaAnno
      tipoBucket.totaleRicaviComplessivi += row.totaleRicaviComplessivi

      const percentMapKey = percentKeyOf(percentualeSuccesso)
      let percentBucket = tipoBucket.percentuali.get(percentMapKey)
      if (!percentBucket) {
        percentBucket = {
          percentualeSuccesso,
          numeroProtocolli: 0,
          totaleBudgetRicavo: 0,
          totaleBudgetCosti: 0,
          totaleFatturatoFuturo: 0,
          totaleEmessaAnno: 0,
          totaleFuturaAnno: 0,
          totaleRicaviComplessivi: 0,
        }
        tipoBucket.percentuali.set(percentMapKey, percentBucket)
      }

      percentBucket.numeroProtocolli += numeroProtocolli
      percentBucket.totaleBudgetRicavo += row.totaleBudgetRicavo
      percentBucket.totaleBudgetCosti += row.totaleBudgetCosti
      percentBucket.totaleFatturatoFuturo += row.totaleFatturatoFuturo
      percentBucket.totaleEmessaAnno += row.totaleEmessaAnno
      percentBucket.totaleFuturaAnno += row.totaleFuturaAnno
      percentBucket.totaleRicaviComplessivi += row.totaleRicaviComplessivi
    })

    const formatPercentLabel = (value: number) => {
      if (!Number.isFinite(value)) {
        return '-'
      }
      if (Math.abs(value - Math.round(value)) < 0.0001) {
        return `${Math.round(value)}`
      }
      return value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    const result: Array<{
      key: string
      anno: number
      livello: 0 | 1 | 2
      etichetta: string
      percentualeSuccesso: number
      numeroProtocolli: number
      totaleBudgetRicavo: number
      totaleBudgetCosti: number
      totaleFatturatoFuturo: number
      totaleEmessaAnno: number
      totaleFuturaAnno: number
      totaleRicaviComplessivi: number
    }> = []

    const sortedAggregazioni = [...grouped.values()].sort((left, right) => (
      left.anno - right.anno ||
      left.aggregazione.localeCompare(right.aggregazione, 'it', { sensitivity: 'base' })
    ))
    sortedAggregazioni.forEach((aggregazioneBucket) => {
      result.push({
        key: `agg-${aggregazioneBucket.anno}-${aggregazioneBucket.aggregazione}`,
        anno: aggregazioneBucket.anno,
        livello: 0,
        etichetta: aggregazioneBucket.aggregazione,
        percentualeSuccesso: 0,
        numeroProtocolli: aggregazioneBucket.numeroProtocolli,
        totaleBudgetRicavo: aggregazioneBucket.totaleBudgetRicavo,
        totaleBudgetCosti: aggregazioneBucket.totaleBudgetCosti,
        totaleFatturatoFuturo: aggregazioneBucket.totaleFatturatoFuturo,
        totaleEmessaAnno: aggregazioneBucket.totaleEmessaAnno,
        totaleFuturaAnno: aggregazioneBucket.totaleFuturaAnno,
        totaleRicaviComplessivi: aggregazioneBucket.totaleRicaviComplessivi,
      })

      const sortedTipi = [...aggregazioneBucket.tipi.values()].sort((left, right) => (
        left.tipo.localeCompare(right.tipo, 'it', { sensitivity: 'base' })
      ))
      sortedTipi.forEach((tipoBucket) => {
        result.push({
          key: `tipo-${aggregazioneBucket.anno}-${aggregazioneBucket.aggregazione}-${tipoBucket.tipo}`,
          anno: aggregazioneBucket.anno,
          livello: 1,
          etichetta: tipoBucket.tipo,
          percentualeSuccesso: 0,
          numeroProtocolli: tipoBucket.numeroProtocolli,
          totaleBudgetRicavo: tipoBucket.totaleBudgetRicavo,
          totaleBudgetCosti: tipoBucket.totaleBudgetCosti,
          totaleFatturatoFuturo: tipoBucket.totaleFatturatoFuturo,
          totaleEmessaAnno: tipoBucket.totaleEmessaAnno,
          totaleFuturaAnno: tipoBucket.totaleFuturaAnno,
          totaleRicaviComplessivi: tipoBucket.totaleRicaviComplessivi,
        })

        const sortedPercentuali = [...tipoBucket.percentuali.values()].sort((left, right) => (
          left.percentualeSuccesso - right.percentualeSuccesso
        ))
        sortedPercentuali.forEach((percentBucket) => {
          result.push({
            key: `pct-${aggregazioneBucket.anno}-${aggregazioneBucket.aggregazione}-${tipoBucket.tipo}-${percentBucket.percentualeSuccesso}`,
            anno: aggregazioneBucket.anno,
            livello: 2,
            etichetta: formatPercentLabel(percentBucket.percentualeSuccesso),
            percentualeSuccesso: percentBucket.percentualeSuccesso,
            numeroProtocolli: percentBucket.numeroProtocolli,
            totaleBudgetRicavo: percentBucket.totaleBudgetRicavo,
            totaleBudgetCosti: percentBucket.totaleBudgetCosti,
            totaleFatturatoFuturo: percentBucket.totaleFatturatoFuturo,
            totaleEmessaAnno: percentBucket.totaleEmessaAnno,
            totaleFuturaAnno: percentBucket.totaleFuturaAnno,
            totaleRicaviComplessivi: percentBucket.totaleRicaviComplessivi,
          })
        })
      })
    })

    return result
  }

  const previsioniReportFunnelRccPivotRows = useMemo(
    () => buildPrevisioniReportFunnelPivotRows(previsioniReportFunnelRccRows),
    [previsioniReportFunnelRccRows],
  )

  const previsioniReportFunnelBuPivotRows = useMemo(
    () => buildPrevisioniReportFunnelPivotRows(previsioniReportFunnelBuRows),
    [previsioniReportFunnelBuRows],
  )
  const buildPrevisioniReportFunnelTotaliDettaglioRows = (rows: AnalisiRccPivotFunnelRow[]) => (
    buildPrevisioniReportFunnelPivotRows(
      rows.map((row) => ({
        ...row,
        aggregazione: 'Totale complessivo',
      })),
    )
  )
  const countPrevisioniReportFunnelAggregazioni = (rows: AnalisiRccPivotFunnelRow[]) => (
    new Set(
      rows
        .map((row) => `${row.anno}|${row.aggregazione.trim().toUpperCase()}`)
        .filter((value) => !value.endsWith('|')),
    ).size
  )
  const previsioniReportFunnelRccHasMultipleAggregazioni = countPrevisioniReportFunnelAggregazioni(previsioniReportFunnelRccRows) > 1
  const previsioniReportFunnelBuHasMultipleAggregazioni = countPrevisioniReportFunnelAggregazioni(previsioniReportFunnelBuRows) > 1
  const previsioniReportFunnelRccTotaliDettaglioRows = useMemo(
    () => buildPrevisioniReportFunnelTotaliDettaglioRows(previsioniReportFunnelRccRows),
    [previsioniReportFunnelRccRows],
  )
  const previsioniReportFunnelBuTotaliDettaglioRows = useMemo(
    () => buildPrevisioniReportFunnelTotaliDettaglioRows(previsioniReportFunnelBuRows),
    [previsioniReportFunnelBuRows],
  )
  const processoOffertaOfferteRows = processoOffertaOfferteData?.items ?? []
  const processoOffertaSintesiRccRows = processoOffertaSintesiRccData?.righe ?? []
  const processoOffertaSintesiBuRows = processoOffertaSintesiBuData?.righe ?? []
  const processoOffertaAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    processoOffertaAnni.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    ;(processoOffertaOfferteData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    ;(processoOffertaSintesiRccData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    ;(processoOffertaSintesiBuData?.anni ?? []).forEach((value) => {
      if (Number.isFinite(value) && value > 0) {
        years.add(value.toString())
      }
    })
    if (years.size === 0) {
      const currentYear = new Date().getFullYear()
      years.add(currentYear.toString())
      years.add((currentYear - 1).toString())
    }
    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [
    processoOffertaAnni,
    processoOffertaOfferteData?.anni,
    processoOffertaSintesiRccData?.anni,
    processoOffertaSintesiBuData?.anni,
    sintesiFiltersCatalog.anni,
  ])
  const processoOffertaEsitiOptions = useMemo(() => {
    const options = new Set<string>()
    ;(processoOffertaOfferteData?.esitiDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    ;(processoOffertaSintesiRccData?.esitiDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    ;(processoOffertaSintesiBuData?.esitiDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    processoOffertaEsiti.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [
    processoOffertaEsiti,
    processoOffertaOfferteData?.esitiDisponibili,
    processoOffertaSintesiRccData?.esitiDisponibili,
    processoOffertaSintesiBuData?.esitiDisponibili,
  ])
  const processoOffertaPercentualeRccOptions = useMemo(() => (
    [...new Set((processoOffertaSintesiRccData?.aggregazioniDisponibili ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0))]
      .sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  ), [processoOffertaSintesiRccData?.aggregazioniDisponibili])
  const processoOffertaPercentualeBuOptions = useMemo(() => (
    [...new Set((processoOffertaSintesiBuData?.aggregazioniDisponibili ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0))]
      .sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  ), [processoOffertaSintesiBuData?.aggregazioniDisponibili])
  const processoOffertaPercentualeSelectedAggregazione = isProcessoOffertaPercentualeSuccessoRccPage
    ? processoOffertaPercentualeRcc.trim()
    : processoOffertaPercentualeBu.trim()
  const processoOffertaPercentualeAggregazioneOptions = isProcessoOffertaPercentualeSuccessoRccPage
    ? processoOffertaPercentualeRccOptions
    : processoOffertaPercentualeBuOptions

  const calculateProcessoOffertaRicarico = (ricavo: number, costo: number) => (
    costo === 0 ? 0 : (ricavo - costo) / costo
  )
  const buildSuccessCategory = (ricavo: number, costo: number): ProcessoOffertaSuccessoCategoria => ({
    ricavo,
    costo,
    margine: ricavo - costo,
    ricarico: calculateProcessoOffertaRicarico(ricavo, costo),
  })

  const buildSuccessoSintesiCategoria = (
    numero: number,
    importo: number,
    totaleNumero: number,
    totaleImporto: number,
  ): ProcessoOffertaSuccessoSintesiCategoria => ({
    numero,
    importo,
    percentualeNumero: totaleNumero > 0 ? (numero / totaleNumero) : 0,
    percentualeImporto: totaleImporto !== 0 ? (importo / totaleImporto) : 0,
  })

  const buildProcessoOffertaSuccessoSintesiRows = (
    rows: ProcessoOffertaSintesiRow[],
    selectedAggregazione: string,
  ): ProcessoOffertaSuccessoSintesiRow[] => {
    const normalizedSelectedAggregazione = selectedAggregazione.trim()
    const grouped = new Map<string, {
      anno: number
      aggregazione: string
      negativoNumero: number
      negativoImporto: number
      nonDefinitoNumero: number
      nonDefinitoImporto: number
      positivoNumero: number
      positivoImporto: number
    }>()

    rows.forEach((row) => {
      if (
        normalizedSelectedAggregazione.length > 0 &&
        row.aggregazione.localeCompare(normalizedSelectedAggregazione, 'it', { sensitivity: 'base' }) !== 0
      ) {
        return
      }

      const key = `${row.anno}||${row.aggregazione}`
      const current = grouped.get(key) ?? {
        anno: row.anno,
        aggregazione: row.aggregazione,
        negativoNumero: 0,
        negativoImporto: 0,
        nonDefinitoNumero: 0,
        nonDefinitoImporto: 0,
        positivoNumero: 0,
        positivoImporto: 0,
      }

      const bucket = getProcessoOffertaEsitoBucket(row.esitoPositivoTesto)
      if (bucket === 'positivo') {
        current.positivoNumero += row.numero
        current.positivoImporto += row.importoPrevedibile
      } else if (bucket === 'negativo') {
        current.negativoNumero += row.numero
        current.negativoImporto += row.importoPrevedibile
      } else {
        current.nonDefinitoNumero += row.numero
        current.nonDefinitoImporto += row.importoPrevedibile
      }

      grouped.set(key, current)
    })

    return [...grouped.values()]
      .sort((left, right) => {
        if (left.anno !== right.anno) {
          return left.anno - right.anno
        }
        return left.aggregazione.localeCompare(right.aggregazione, 'it', { sensitivity: 'base' })
      })
      .map((row) => {
        const totaleNumero = row.negativoNumero + row.nonDefinitoNumero + row.positivoNumero
        const totaleImporto = row.negativoImporto + row.nonDefinitoImporto + row.positivoImporto
        return {
          anno: row.anno,
          aggregazione: row.aggregazione,
          negativo: buildSuccessoSintesiCategoria(row.negativoNumero, row.negativoImporto, totaleNumero, totaleImporto),
          nonDefinito: buildSuccessoSintesiCategoria(row.nonDefinitoNumero, row.nonDefinitoImporto, totaleNumero, totaleImporto),
          positivo: buildSuccessoSintesiCategoria(row.positivoNumero, row.positivoImporto, totaleNumero, totaleImporto),
          totaleNumero,
          totaleImporto,
        }
      })
  }

  const buildProcessoOffertaSuccessoSintesiTotale = (
    rows: ProcessoOffertaSuccessoSintesiRow[],
  ): ProcessoOffertaSuccessoSintesiRow => {
    const totals = rows.reduce((acc, row) => ({
      negativoNumero: acc.negativoNumero + row.negativo.numero,
      negativoImporto: acc.negativoImporto + row.negativo.importo,
      nonDefinitoNumero: acc.nonDefinitoNumero + row.nonDefinito.numero,
      nonDefinitoImporto: acc.nonDefinitoImporto + row.nonDefinito.importo,
      positivoNumero: acc.positivoNumero + row.positivo.numero,
      positivoImporto: acc.positivoImporto + row.positivo.importo,
    }), {
      negativoNumero: 0,
      negativoImporto: 0,
      nonDefinitoNumero: 0,
      nonDefinitoImporto: 0,
      positivoNumero: 0,
      positivoImporto: 0,
    })

    const totaleNumero = totals.negativoNumero + totals.nonDefinitoNumero + totals.positivoNumero
    const totaleImporto = totals.negativoImporto + totals.nonDefinitoImporto + totals.positivoImporto

    return {
      anno: 0,
      aggregazione: '',
      negativo: buildSuccessoSintesiCategoria(totals.negativoNumero, totals.negativoImporto, totaleNumero, totaleImporto),
      nonDefinito: buildSuccessoSintesiCategoria(totals.nonDefinitoNumero, totals.nonDefinitoImporto, totaleNumero, totaleImporto),
      positivo: buildSuccessoSintesiCategoria(totals.positivoNumero, totals.positivoImporto, totaleNumero, totaleImporto),
      totaleNumero,
      totaleImporto,
    }
  }

  const buildProcessoOffertaSuccessoRows = (
    rows: ProcessoOffertaSintesiRow[],
    selectedAggregazione: string,
  ): ProcessoOffertaSuccessoReportRow[] => {
    const normalizedSelectedAggregazione = selectedAggregazione.trim()
    const grouped = new Map<string, {
      anno: number
      aggregazione: string
      negativoRicavo: number
      negativoCosto: number
      nonDefinitoRicavo: number
      nonDefinitoCosto: number
      positivoRicavo: number
      positivoCosto: number
    }>()

    rows.forEach((row) => {
      if (
        normalizedSelectedAggregazione.length > 0 &&
        row.aggregazione.localeCompare(normalizedSelectedAggregazione, 'it', { sensitivity: 'base' }) !== 0
      ) {
        return
      }

      const key = `${row.anno}||${row.aggregazione}`
      const current = grouped.get(key) ?? {
        anno: row.anno,
        aggregazione: row.aggregazione,
        negativoRicavo: 0,
        negativoCosto: 0,
        nonDefinitoRicavo: 0,
        nonDefinitoCosto: 0,
        positivoRicavo: 0,
        positivoCosto: 0,
      }

      const bucket = getProcessoOffertaEsitoBucket(row.esitoPositivoTesto)
      if (bucket === 'positivo') {
        current.positivoRicavo += row.importoPrevedibile
        current.positivoCosto += row.costoPrevedibile
      } else if (bucket === 'negativo') {
        current.negativoRicavo += row.importoPrevedibile
        current.negativoCosto += row.costoPrevedibile
      } else {
        current.nonDefinitoRicavo += row.importoPrevedibile
        current.nonDefinitoCosto += row.costoPrevedibile
      }

      grouped.set(key, current)
    })

    return [...grouped.values()]
      .sort((left, right) => {
        if (left.anno !== right.anno) {
          return left.anno - right.anno
        }
        return left.aggregazione.localeCompare(right.aggregazione, 'it', { sensitivity: 'base' })
      })
      .map((row) => {
        const negativo = buildSuccessCategory(row.negativoRicavo, row.negativoCosto)
        const nonDefinito = buildSuccessCategory(row.nonDefinitoRicavo, row.nonDefinitoCosto)
        const positivo = buildSuccessCategory(row.positivoRicavo, row.positivoCosto)
        const totale = buildSuccessCategory(
          negativo.ricavo + nonDefinito.ricavo + positivo.ricavo,
          negativo.costo + nonDefinito.costo + positivo.costo,
        )

        return {
          anno: row.anno,
          aggregazione: row.aggregazione,
          negativo,
          nonDefinito,
          positivo,
          totale,
        }
      })
  }

  const buildProcessoOffertaSuccessoTotaliPerAnno = (
    rows: ProcessoOffertaSuccessoReportRow[],
  ): ProcessoOffertaSuccessoReportTotaleAnno[] => {
    const grouped = new Map<number, {
      anno: number
      negativoRicavo: number
      negativoCosto: number
      nonDefinitoRicavo: number
      nonDefinitoCosto: number
      positivoRicavo: number
      positivoCosto: number
    }>()

    rows.forEach((row) => {
      const current = grouped.get(row.anno) ?? {
        anno: row.anno,
        negativoRicavo: 0,
        negativoCosto: 0,
        nonDefinitoRicavo: 0,
        nonDefinitoCosto: 0,
        positivoRicavo: 0,
        positivoCosto: 0,
      }
      current.negativoRicavo += row.negativo.ricavo
      current.negativoCosto += row.negativo.costo
      current.nonDefinitoRicavo += row.nonDefinito.ricavo
      current.nonDefinitoCosto += row.nonDefinito.costo
      current.positivoRicavo += row.positivo.ricavo
      current.positivoCosto += row.positivo.costo
      grouped.set(row.anno, current)
    })

    return [...grouped.values()]
      .sort((left, right) => left.anno - right.anno)
      .map((row) => {
        const negativo = buildSuccessCategory(row.negativoRicavo, row.negativoCosto)
        const nonDefinito = buildSuccessCategory(row.nonDefinitoRicavo, row.nonDefinitoCosto)
        const positivo = buildSuccessCategory(row.positivoRicavo, row.positivoCosto)
        const totale = buildSuccessCategory(
          negativo.ricavo + nonDefinito.ricavo + positivo.ricavo,
          negativo.costo + nonDefinito.costo + positivo.costo,
        )
        return {
          anno: row.anno,
          negativo,
          nonDefinito,
          positivo,
          totale,
        }
      })
  }

  const buildProcessoOffertaSuccessoTotaleComplessivo = (
    rows: ProcessoOffertaSuccessoReportRow[],
  ): ProcessoOffertaSuccessoCategoria[] => {
    const totals = rows.reduce((acc, row) => ({
      negativoRicavo: acc.negativoRicavo + row.negativo.ricavo,
      negativoCosto: acc.negativoCosto + row.negativo.costo,
      nonDefinitoRicavo: acc.nonDefinitoRicavo + row.nonDefinito.ricavo,
      nonDefinitoCosto: acc.nonDefinitoCosto + row.nonDefinito.costo,
      positivoRicavo: acc.positivoRicavo + row.positivo.ricavo,
      positivoCosto: acc.positivoCosto + row.positivo.costo,
    }), {
      negativoRicavo: 0,
      negativoCosto: 0,
      nonDefinitoRicavo: 0,
      nonDefinitoCosto: 0,
      positivoRicavo: 0,
      positivoCosto: 0,
    })

    const negativo = buildSuccessCategory(totals.negativoRicavo, totals.negativoCosto)
    const nonDefinito = buildSuccessCategory(totals.nonDefinitoRicavo, totals.nonDefinitoCosto)
    const positivo = buildSuccessCategory(totals.positivoRicavo, totals.positivoCosto)
    const totale = buildSuccessCategory(
      negativo.ricavo + nonDefinito.ricavo + positivo.ricavo,
      negativo.costo + nonDefinito.costo + positivo.costo,
    )

    return [negativo, nonDefinito, positivo, totale]
  }

  const processoOffertaSuccessoRccRows = useMemo(
    () => buildProcessoOffertaSuccessoRows(processoOffertaSintesiRccRows, processoOffertaPercentualeRcc),
    [processoOffertaSintesiRccRows, processoOffertaPercentualeRcc],
  )
  const processoOffertaSuccessoBuRows = useMemo(
    () => buildProcessoOffertaSuccessoRows(processoOffertaSintesiBuRows, processoOffertaPercentualeBu),
    [processoOffertaSintesiBuRows, processoOffertaPercentualeBu],
  )
  const processoOffertaSuccessoSintesiRccRows = useMemo(
    () => buildProcessoOffertaSuccessoSintesiRows(processoOffertaSintesiRccRows, processoOffertaPercentualeRcc),
    [processoOffertaSintesiRccRows, processoOffertaPercentualeRcc],
  )
  const processoOffertaSuccessoSintesiBuRows = useMemo(
    () => buildProcessoOffertaSuccessoSintesiRows(processoOffertaSintesiBuRows, processoOffertaPercentualeBu),
    [processoOffertaSintesiBuRows, processoOffertaPercentualeBu],
  )
  const processoOffertaSuccessoSintesiRccTotale = useMemo(
    () => buildProcessoOffertaSuccessoSintesiTotale(processoOffertaSuccessoSintesiRccRows),
    [processoOffertaSuccessoSintesiRccRows],
  )
  const processoOffertaSuccessoSintesiBuTotale = useMemo(
    () => buildProcessoOffertaSuccessoSintesiTotale(processoOffertaSuccessoSintesiBuRows),
    [processoOffertaSuccessoSintesiBuRows],
  )
  const processoOffertaIncidenzaRccRows = useMemo(() => {
    const totalsByYear = new Map<number, number>()
    processoOffertaSintesiRccRows.forEach((row) => {
      totalsByYear.set(row.anno, (totalsByYear.get(row.anno) ?? 0) + row.importoPrevedibile)
    })

    const grouped = new Map<string, { anno: number; aggregazione: string; importoPrevedibile: number; numero: number }>()
    processoOffertaSintesiRccRows.forEach((row) => {
      const key = `${row.anno}||${row.aggregazione}`
      const current = grouped.get(key) ?? {
        anno: row.anno,
        aggregazione: row.aggregazione,
        importoPrevedibile: 0,
        numero: 0,
      }
      current.importoPrevedibile += row.importoPrevedibile
      current.numero += row.numero
      grouped.set(key, current)
    })

    return [...grouped.values()]
      .sort((left, right) => {
        if (left.anno !== right.anno) {
          return left.anno - right.anno
        }
        return left.aggregazione.localeCompare(right.aggregazione, 'it', { sensitivity: 'base' })
      })
      .map((row) => {
        const totaleAnno = totalsByYear.get(row.anno) ?? 0
        return {
          ...row,
          totaleAnno,
          percentualeSuAnno: totaleAnno > 0 ? row.importoPrevedibile / totaleAnno : 0,
        }
      })
  }, [processoOffertaSintesiRccRows])
  const processoOffertaIncidenzaBuRows = useMemo(() => {
    const totalsByYear = new Map<number, number>()
    processoOffertaSintesiBuRows.forEach((row) => {
      totalsByYear.set(row.anno, (totalsByYear.get(row.anno) ?? 0) + row.importoPrevedibile)
    })

    const grouped = new Map<string, { anno: number; aggregazione: string; importoPrevedibile: number; numero: number }>()
    processoOffertaSintesiBuRows.forEach((row) => {
      const key = `${row.anno}||${row.aggregazione}`
      const current = grouped.get(key) ?? {
        anno: row.anno,
        aggregazione: row.aggregazione,
        importoPrevedibile: 0,
        numero: 0,
      }
      current.importoPrevedibile += row.importoPrevedibile
      current.numero += row.numero
      grouped.set(key, current)
    })

    return [...grouped.values()]
      .sort((left, right) => {
        if (left.anno !== right.anno) {
          return left.anno - right.anno
        }
        return left.aggregazione.localeCompare(right.aggregazione, 'it', { sensitivity: 'base' })
      })
      .map((row) => {
        const totaleAnno = totalsByYear.get(row.anno) ?? 0
        return {
          ...row,
          totaleAnno,
          percentualeSuAnno: totaleAnno > 0 ? row.importoPrevedibile / totaleAnno : 0,
        }
      })
  }, [processoOffertaSintesiBuRows])
  const processoOffertaOfferteTotals = useMemo(() => (
    processoOffertaOfferteRows.reduce((acc, row) => ({
      importoPrevedibile: acc.importoPrevedibile + row.importoPrevedibile,
      costoPrevedibile: acc.costoPrevedibile + row.costoPrevedibile,
    }), {
      importoPrevedibile: 0,
      costoPrevedibile: 0,
    })
  ), [processoOffertaOfferteRows])
  const processoOffertaSintesiRccTotals = useMemo(() => (
    processoOffertaSintesiRccRows.reduce((acc, row) => ({
      numero: acc.numero + row.numero,
      importoPrevedibile: acc.importoPrevedibile + row.importoPrevedibile,
      costoPrevedibile: acc.costoPrevedibile + row.costoPrevedibile,
    }), {
      numero: 0,
      importoPrevedibile: 0,
      costoPrevedibile: 0,
    })
  ), [processoOffertaSintesiRccRows])
  const processoOffertaSintesiBuTotals = useMemo(() => (
    processoOffertaSintesiBuRows.reduce((acc, row) => ({
      numero: acc.numero + row.numero,
      importoPrevedibile: acc.importoPrevedibile + row.importoPrevedibile,
      costoPrevedibile: acc.costoPrevedibile + row.costoPrevedibile,
    }), {
      numero: 0,
      importoPrevedibile: 0,
      costoPrevedibile: 0,
    })
  ), [processoOffertaSintesiBuRows])
  const processoOffertaSuccessoRccTotaliPerAnno = useMemo(
    () => buildProcessoOffertaSuccessoTotaliPerAnno(processoOffertaSuccessoRccRows),
    [processoOffertaSuccessoRccRows],
  )
  const processoOffertaSuccessoBuTotaliPerAnno = useMemo(
    () => buildProcessoOffertaSuccessoTotaliPerAnno(processoOffertaSuccessoBuRows),
    [processoOffertaSuccessoBuRows],
  )
  const processoOffertaSuccessoRccTotaleComplessivo = useMemo(
    () => buildProcessoOffertaSuccessoTotaleComplessivo(processoOffertaSuccessoRccRows),
    [processoOffertaSuccessoRccRows],
  )
  const processoOffertaSuccessoBuTotaleComplessivo = useMemo(
    () => buildProcessoOffertaSuccessoTotaleComplessivo(processoOffertaSuccessoBuRows),
    [processoOffertaSuccessoBuRows],
  )
  const processoOffertaIncidenzaRccTotaliPerAnno = useMemo(() => {
    const grouped = new Map<number, {
      anno: number
      numero: number
      importoPrevedibile: number
      totaleAnno: number
    }>()

    processoOffertaIncidenzaRccRows.forEach((row) => {
      const current = grouped.get(row.anno) ?? {
        anno: row.anno,
        numero: 0,
        importoPrevedibile: 0,
        totaleAnno: row.totaleAnno,
      }
      current.numero += row.numero
      current.importoPrevedibile += row.importoPrevedibile
      current.totaleAnno = row.totaleAnno
      grouped.set(row.anno, current)
    })

    return [...grouped.values()]
      .sort((left, right) => left.anno - right.anno)
      .map((row) => ({
        ...row,
        percentualeSuAnno: row.totaleAnno > 0 ? row.importoPrevedibile / row.totaleAnno : 0,
      }))
  }, [processoOffertaIncidenzaRccRows])
  const processoOffertaIncidenzaBuTotaliPerAnno = useMemo(() => {
    const grouped = new Map<number, {
      anno: number
      numero: number
      importoPrevedibile: number
      totaleAnno: number
    }>()

    processoOffertaIncidenzaBuRows.forEach((row) => {
      const current = grouped.get(row.anno) ?? {
        anno: row.anno,
        numero: 0,
        importoPrevedibile: 0,
        totaleAnno: row.totaleAnno,
      }
      current.numero += row.numero
      current.importoPrevedibile += row.importoPrevedibile
      current.totaleAnno = row.totaleAnno
      grouped.set(row.anno, current)
    })

    return [...grouped.values()]
      .sort((left, right) => left.anno - right.anno)
      .map((row) => ({
        ...row,
        percentualeSuAnno: row.totaleAnno > 0 ? row.importoPrevedibile / row.totaleAnno : 0,
      }))
  }, [processoOffertaIncidenzaBuRows])
  const datiContabiliVenditaSortedRows = useMemo(() => (
    [...datiContabiliVenditaRows].sort((left, right) => {
      const leftTime = left.dataMovimento ? new Date(left.dataMovimento).getTime() : Number.MIN_SAFE_INTEGER
      const rightTime = right.dataMovimento ? new Date(right.dataMovimento).getTime() : Number.MIN_SAFE_INTEGER
      if (leftTime !== rightTime) {
        return leftTime - rightTime
      }

      const commessaCompare = left.commessa.localeCompare(right.commessa, 'it', {
        sensitivity: 'base',
        numeric: true,
      })
      if (commessaCompare !== 0) {
        return commessaCompare
      }

      return left.numeroDocumento.localeCompare(right.numeroDocumento, 'it', {
        sensitivity: 'base',
        numeric: true,
      })
    })
  ), [datiContabiliVenditaRows])
  const datiContabiliAcquistoSortedRows = useMemo(() => (
    [...datiContabiliAcquistoRows].sort((left, right) => {
      const leftTime = left.dataDocumento ? new Date(left.dataDocumento).getTime() : Number.MIN_SAFE_INTEGER
      const rightTime = right.dataDocumento ? new Date(right.dataDocumento).getTime() : Number.MIN_SAFE_INTEGER
      if (leftTime !== rightTime) {
        return leftTime - rightTime
      }

      const commessaCompare = left.commessa.localeCompare(right.commessa, 'it', {
        sensitivity: 'base',
        numeric: true,
      })
      if (commessaCompare !== 0) {
        return commessaCompare
      }

      return left.codiceSocieta.localeCompare(right.codiceSocieta, 'it', {
        sensitivity: 'base',
        numeric: true,
      })
    })
  ), [datiContabiliAcquistoRows])

  const toAnalisiRccPercentValue = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0
    const absValue = Math.abs(safeValue)

    // Compatibilita' con dataset misti: alcuni valori arrivano come rapporto (1.05),
    // altri gia' in percentuale (105.00).
    if (absValue <= 3) {
      return safeValue * 100
    }

    if (absValue >= 1000) {
      return safeValue / 100
    }

    return safeValue
  }

  const formatAnalisiRccPercent = (value: number) => (
    `${toAnalisiRccPercentValue(value).toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`
  )

  const isAnalisiRccPercentUnderTarget = (value: number) => (
    toAnalisiRccPercentValue(value) < 100
  )

  const getAnalisiRccValueForMonth = (row: AnalisiRccRisultatoMensileRow, mese: number) => (
    row.valoriMensili.find((item) => item.mese === mese)?.valore ?? 0
  )
  const isQuarterEndMonth = (mese: number) => mese === 3 || mese === 6 || mese === 9 || mese === 12
  const getQuarterFromMonth = (mese: number) => Math.min(4, Math.max(1, Math.ceil(mese / 3)))
  const getAnalisiPianoFatturazioneQuarterTotal = (row: AnalisiRccPianoFatturazioneRow, quarter: number) => {
    if (quarter === 1) {
      return row.totaleTrim1
    }
    if (quarter === 2) {
      return row.totaleTrim2
    }
    if (quarter === 3) {
      return row.totaleTrim3
    }
    return row.totaleTrim4
  }
  const getAnalisiPianoFatturazioneValueForMonth = (row: AnalisiRccPianoFatturazioneRow, mese: number) => (
    row.valoriMensili.find((item) => item.mese === mese)?.valore ?? 0
  )
  const getAnalisiPianoFatturazioneProgressAmountForMonth = (row: AnalisiRccPianoFatturazioneProgressRow, mese: number) => (
    row.valoriMensili.find((item) => item.mese === mese)?.importoProgressivo ?? 0
  )
  const getAnalisiPianoFatturazioneProgressPercentForMonth = (row: AnalisiRccPianoFatturazioneProgressRow, mese: number) => (
    row.valoriMensili.find((item) => item.mese === mese)?.percentualeBudgetProgressiva ?? 0
  )

  const detailAnagrafica = detailData?.anagrafica ?? null
  const detailCurrentYear = detailData?.currentYear ?? 0
  const detailCurrentMonth = detailData?.currentMonth ?? 0
  const detailAggregatoAnnoCorrente = detailData?.annoCorrenteProgressivo ?? null
  const detailStoricoRows = detailData?.anniStorici ?? []
  const detailMesiCorrenteRows = useMemo(
    () => [...(detailData?.mesiAnnoCorrente ?? [])]
      .filter((row) => Number.isFinite(row.mese) && row.mese >= 1 && row.mese <= 12)
      .sort((left, right) => left.mese - right.mese),
    [detailData?.mesiAnnoCorrente],
  )
  const detailVenditeRows = detailData?.vendite ?? []
  const detailAcquistiRows = detailData?.acquisti ?? []
  const detailOrdiniRows = detailData?.ordini ?? []
  const detailOfferteRows = detailData?.offerte ?? []
  const detailAvanzamentoSalvato = detailData?.avanzamentoSalvato ?? null
  const detailAvanzamentoStorico = useMemo(
    () => [...(detailData?.avanzamentoStorico ?? [])].sort((left, right) => {
      const leftTime = left.dataRiferimento ? new Date(left.dataRiferimento).getTime() : Number.MAX_SAFE_INTEGER
      const rightTime = right.dataRiferimento ? new Date(right.dataRiferimento).getTime() : Number.MAX_SAFE_INTEGER
      const safeLeftTime = Number.isFinite(leftTime) ? leftTime : Number.MAX_SAFE_INTEGER
      const safeRightTime = Number.isFinite(rightTime) ? rightTime : Number.MAX_SAFE_INTEGER
      if (safeLeftTime !== safeRightTime) {
        return safeLeftTime - safeRightTime
      }

      return left.id - right.id
    }),
    [detailData?.avanzamentoStorico],
  )
  const detailRequisitiOreRows = detailData?.requisitiOre ?? []
  const detailRequisitiOreRisorseRows = detailData?.requisitiOreRisorse ?? []

  const sortMovimentiByDate = (rows: CommessaFatturaMovimentoRow[]) => (
    [...rows].sort((left, right) => {
      const leftTime = left.dataMovimento ? new Date(left.dataMovimento).getTime() : Number.MIN_SAFE_INTEGER
      const rightTime = right.dataMovimento ? new Date(right.dataMovimento).getTime() : Number.MIN_SAFE_INTEGER
      if (leftTime !== rightTime) {
        return leftTime - rightTime
      }

      return left.numeroDocumento.localeCompare(right.numeroDocumento, 'it', { sensitivity: 'base', numeric: true })
    })
  )

  const detailVenditeSorted = useMemo(
    () => sortMovimentiByDate(detailVenditeRows),
    [detailVenditeRows],
  )

  const detailAcquistiSorted = useMemo(
    () => sortMovimentiByDate(detailAcquistiRows),
    [detailAcquistiRows],
  )

  const detailVenditeTotaleImporto = useMemo(
    () => detailVenditeSorted.reduce((total, row) => total + row.importo, 0),
    [detailVenditeSorted],
  )

  const detailAcquistiTotaleImporto = useMemo(
    () => detailAcquistiSorted.reduce((total, row) => total + row.importo, 0),
    [detailAcquistiSorted],
  )

  const detailOrdiniSorted = useMemo(
    () => [...detailOrdiniRows].sort((left, right) => {
      const protocolloCompare = left.protocollo.localeCompare(right.protocollo, 'it', { sensitivity: 'base', numeric: true })
      if (protocolloCompare !== 0) {
        return protocolloCompare
      }

      const posizioneCompare = left.posizione.localeCompare(right.posizione, 'it', { sensitivity: 'base', numeric: true })
      if (posizioneCompare !== 0) {
        return posizioneCompare
      }

      return left.idDettaglioOrdine - right.idDettaglioOrdine
    }),
    [detailOrdiniRows],
  )

  const detailOfferteSorted = useMemo(
    () => [...detailOfferteRows].sort((left, right) => {
      const yearCompare = (right.anno ?? Number.MIN_SAFE_INTEGER) - (left.anno ?? Number.MIN_SAFE_INTEGER)
      if (yearCompare !== 0) {
        return yearCompare
      }

      const leftTime = left.data ? new Date(left.data).getTime() : Number.MIN_SAFE_INTEGER
      const rightTime = right.data ? new Date(right.data).getTime() : Number.MIN_SAFE_INTEGER
      if (leftTime !== rightTime) {
        return rightTime - leftTime
      }

      return left.protocollo.localeCompare(right.protocollo, 'it', { sensitivity: 'base', numeric: true })
    }),
    [detailOfferteRows],
  )

  const detailOrdiniAggregati = useMemo(() => (
    detailOrdiniSorted.reduce((acc, row) => {
      const importoOrdinato = row.importoOrdine
      const importoFatturato = row.quantitaFatture * row.prezzoUnitario
      return {
        quantita: acc.quantita + row.quantita,
        quantitaOriginale: acc.quantitaOriginale + row.quantitaOriginaleOrdinata,
        quantitaFatturata: acc.quantitaFatturata + row.quantitaFatture,
        importoOrdinato: acc.importoOrdinato + importoOrdinato,
        importoFatturato: acc.importoFatturato + importoFatturato,
      }
    }, {
      quantita: 0,
      quantitaOriginale: 0,
      quantitaFatturata: 0,
      importoOrdinato: 0,
      importoFatturato: 0,
    })
  ), [detailOrdiniSorted])

  const detailOrdiniPercentualeQuantita = (
    detailOrdiniAggregati.quantita <= 0
      ? 0
      : detailOrdiniAggregati.quantitaFatturata / detailOrdiniAggregati.quantita
  )

  const detailRequisitiOreTotals = useMemo(() => (
    detailRequisitiOreRows.reduce((acc, row) => ({
      orePreviste: acc.orePreviste + row.orePreviste,
      oreSpese: acc.oreSpese + row.oreSpese,
      oreRestanti: acc.oreRestanti + row.oreRestanti,
    }), {
      orePreviste: 0,
      oreSpese: 0,
      oreRestanti: 0,
    })
  ), [detailRequisitiOreRows])

  const detailRequisitiOrePercentualeProposta = useMemo(() => {
    const fromApi = detailData?.percentualeRaggiuntoProposta
    if (typeof fromApi === 'number' && Number.isFinite(fromApi)) {
      return Math.min(1, Math.max(0, fromApi))
    }

    if (detailRequisitiOreTotals.orePreviste <= 0) {
      return null
    }

    return Math.min(
      1,
      Math.max(0, detailRequisitiOreTotals.oreSpese / detailRequisitiOreTotals.orePreviste),
    )
  }, [detailData?.percentualeRaggiuntoProposta, detailRequisitiOreTotals])

  const detailRowsForTotals = useMemo(
    () => [...detailStoricoRows, ...detailMesiCorrenteRows],
    [detailStoricoRows, detailMesiCorrenteRows],
  )

  const detailSintesiRows = useMemo(() => {
    const annualRows = detailStoricoRows.map((row) => ({
      key: `storico-${row.anno}`,
      anno: row.anno,
      scenario: '',
      utileSpecifico: row.utileSpecifico,
      oreLavorate: row.oreLavorate,
      costoPersonale: row.costoPersonale,
      ricavi: row.ricavi,
      costi: row.costi,
      isMonthRow: false,
    }))

    const monthlyRows = detailMesiCorrenteRows.map((row) => ({
      key: `mese-${row.anno}-${row.mese}`,
      anno: row.anno,
      scenario: String(row.mese).padStart(2, '0'),
      utileSpecifico: row.utileSpecifico,
      oreLavorate: row.oreLavorate,
      costoPersonale: row.costoPersonale,
      ricavi: row.ricavi,
      costi: row.costi,
      isMonthRow: true,
    }))

    return [...annualRows, ...monthlyRows]
  }, [detailStoricoRows, detailMesiCorrenteRows])

  const detailTotals = useMemo(() => (
    detailRowsForTotals.reduce((acc, row) => ({
      oreLavorate: acc.oreLavorate + row.oreLavorate,
      costoPersonale: acc.costoPersonale + row.costoPersonale,
      ricavi: acc.ricavi + row.ricavi,
      costi: acc.costi + row.costi,
      utileSpecifico: acc.utileSpecifico + row.utileSpecifico,
    }), {
      oreLavorate: 0,
      costoPersonale: 0,
      ricavi: 0,
      costi: 0,
      utileSpecifico: 0,
    })
  ), [detailRowsForTotals])

  const detailConsuntivoMesePrecedenteRows = useMemo(
    () => [
      ...detailStoricoRows,
      ...detailMesiCorrenteRows.filter((row) => row.mese < Math.max(detailCurrentMonth, 1)),
    ],
    [detailStoricoRows, detailMesiCorrenteRows, detailCurrentMonth],
  )

  const detailConsuntivoMesePrecedente = useMemo(() => (
    detailConsuntivoMesePrecedenteRows.reduce((acc, row) => ({
      oreLavorate: acc.oreLavorate + row.oreLavorate,
      costoPersonale: acc.costoPersonale + row.costoPersonale,
      ricavi: acc.ricavi + row.ricavi,
      costi: acc.costi + row.costi,
      utileSpecifico: acc.utileSpecifico + row.utileSpecifico,
    }), {
      oreLavorate: 0,
      costoPersonale: 0,
      ricavi: 0,
      costi: 0,
      utileSpecifico: 0,
    })
  ), [detailConsuntivoMesePrecedenteRows])

  const detailLastDayPreviousMonth = useMemo(() => {
    const fromApi = detailData?.dataConsuntivoAttivita
    if (fromApi) {
      const parsed = new Date(fromApi)
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }

    if (detailCurrentYear <= 0 || detailCurrentMonth <= 0) {
      return null
    }

    return new Date(detailCurrentYear, detailCurrentMonth - 1, 0)
  }, [detailData?.dataConsuntivoAttivita, detailCurrentYear, detailCurrentMonth])

  const detailCurrentRiferimentoKey = useMemo(
    () => normalizeDateKey(detailLastDayPreviousMonth),
    [detailLastDayPreviousMonth],
  )

  const detailCurrentRiferimentoLegacyUtcKey = useMemo(() => {
    if (!detailLastDayPreviousMonth) {
      return ''
    }

    const utcKey = detailLastDayPreviousMonth.toISOString().slice(0, 10)
    return utcKey !== detailCurrentRiferimentoKey ? utcKey : ''
  }, [detailCurrentRiferimentoKey, detailLastDayPreviousMonth])

  const detailAvanzamentoRiferimentoCorrente = useMemo(() => {
    if (!detailCurrentRiferimentoKey) {
      return null
    }

    const baseCandidates = [
      ...(detailAvanzamentoStorico ?? []),
      ...(detailAvanzamentoSalvato ? [detailAvanzamentoSalvato] : []),
    ]

    const exactCandidates = baseCandidates.filter(
      (item) => normalizeDateKey(item.dataRiferimento) === detailCurrentRiferimentoKey,
    )

    const candidates = exactCandidates.length > 0
      ? exactCandidates
      : (
        detailCurrentRiferimentoLegacyUtcKey
          ? baseCandidates.filter(
            (item) => normalizeDateKey(item.dataRiferimento) === detailCurrentRiferimentoLegacyUtcKey,
          )
          : []
      )

    if (candidates.length === 0) {
      return null
    }

    return [...candidates].sort((left, right) => {
      const leftTime = left.dataSalvataggio ? new Date(left.dataSalvataggio).getTime() : Number.MIN_SAFE_INTEGER
      const rightTime = right.dataSalvataggio ? new Date(right.dataSalvataggio).getTime() : Number.MIN_SAFE_INTEGER
      const safeLeftTime = Number.isFinite(leftTime) ? leftTime : Number.MIN_SAFE_INTEGER
      const safeRightTime = Number.isFinite(rightTime) ? rightTime : Number.MIN_SAFE_INTEGER
      if (safeLeftTime !== safeRightTime) {
        return safeRightTime - safeLeftTime
      }

      return right.id - left.id
    })[0] ?? null
  }, [detailAvanzamentoSalvato, detailAvanzamentoStorico, detailCurrentRiferimentoKey, detailCurrentRiferimentoLegacyUtcKey])

  const detailPercentRaggiuntoSalvato = useMemo(() => (
    detailAvanzamentoRiferimentoCorrente
      ? normalizePercentTo100(detailAvanzamentoRiferimentoCorrente.percentualeRaggiunto)
      : null
  ), [detailAvanzamentoRiferimentoCorrente])

  const detailAcquistiPassatiMesePrecedente = useMemo(() => {
    if (!detailLastDayPreviousMonth) {
      return 0
    }

    return detailAcquistiRows.reduce((total, row) => {
      if (!row.dataMovimento) {
        return total
      }

      const dataMovimento = new Date(row.dataMovimento)
      if (Number.isNaN(dataMovimento.getTime()) || dataMovimento > detailLastDayPreviousMonth) {
        return total
      }

      return total + row.importo
    }, 0)
  }, [detailAcquistiRows, detailLastDayPreviousMonth])

  const detailCostiPassatiRiconciliati = useMemo(() => {
    if (Math.abs(detailConsuntivoMesePrecedente.costi) > 0.0001) {
      return detailConsuntivoMesePrecedente.costi
    }

    if (Math.abs(detailAcquistiPassatiMesePrecedente) > 0.0001) {
      return detailAcquistiPassatiMesePrecedente
    }

    return detailConsuntivoMesePrecedente.costi
  }, [detailAcquistiPassatiMesePrecedente, detailConsuntivoMesePrecedente.costi])

  const detailUtileConsuntivatoRiconciliato = (
    detailConsuntivoMesePrecedente.ricavi
    - detailConsuntivoMesePrecedente.costoPersonale
    - detailCostiPassatiRiconciliati
  )

  const detailOreFuture = useMemo(
    () => {
      if (detailRequisitiOreRows.length > 0) {
        return detailRequisitiOreTotals.oreRestanti
      }

      return detailMesiCorrenteRows
        .filter((row) => row.mese >= Math.max(detailCurrentMonth, 1))
        .reduce((total, row) => total + row.oreLavorate, 0)
    },
    [detailRequisitiOreRows.length, detailRequisitiOreTotals.oreRestanti, detailMesiCorrenteRows, detailCurrentMonth],
  )

  const detailRicaviFuturiAggregati = detailAggregatoAnnoCorrente?.ricaviFuturi ?? 0
  const detailCostiFuturiAggregati = detailAggregatoAnnoCorrente?.costiFuturi ?? 0

  const detailPercentRaggiuntoMesePrecedenteAutomatico = useMemo(() => {
    if (detailRequisitiOrePercentualeProposta !== null) {
      return detailRequisitiOrePercentualeProposta
    }

    if (!detailLastDayPreviousMonth || detailCurrentYear <= 0 || detailCurrentMonth <= 0) {
      return 0
    }

    const startOfYear = new Date(detailCurrentYear, 0, 1)
    const endOfYear = new Date(detailCurrentYear, 11, 31)
    const elapsedDays = Math.floor((detailLastDayPreviousMonth.getTime() - startOfYear.getTime()) / 86400000) + 1
    const totalDays = Math.floor((endOfYear.getTime() - startOfYear.getTime()) / 86400000) + 1

    if (totalDays <= 0) {
      return 0
    }

    return Math.min(1, Math.max(0, elapsedDays / totalDays))
  }, [detailRequisitiOrePercentualeProposta, detailLastDayPreviousMonth, detailCurrentYear, detailCurrentMonth])

  const detailPercentRaggiuntoMesePrecedenteManuale = useMemo(() => {
    const normalized = detailPercentRaggiuntoInput.trim().replace(',', '.')
    if (!normalized) {
      return null
    }

    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) {
      return null
    }

    return Math.min(100, Math.max(0, parsed))
  }, [detailPercentRaggiuntoInput])

  const detailPercentRaggiuntoMesePrecedente = detailPercentRaggiuntoMesePrecedenteManuale === null
    ? (
      detailPercentRaggiuntoSalvato === null
        ? detailPercentRaggiuntoMesePrecedenteAutomatico
        : detailPercentRaggiuntoSalvato / 100
    )
    : detailPercentRaggiuntoMesePrecedenteManuale / 100

  const detailFatturatoPassato = detailConsuntivoMesePrecedente.ricavi
  const detailRicavoPrevisto = detailRicaviFuturiAggregati
  const detailRicavoMaturatoAlMesePrecedente = detailRicavoPrevisto * detailPercentRaggiuntoMesePrecedente
  const detailUtileRicalcolatoMesePrecedente = (
    detailFatturatoPassato
    + detailRicavoMaturatoAlMesePrecedente
    - detailConsuntivoMesePrecedente.costoPersonale
    - detailCostiPassatiRiconciliati
  )
  const detailUtileFineProgetto = (
    detailFatturatoPassato
    + detailRicaviFuturiAggregati
    - detailCostiPassatiRiconciliati
    - detailCostiFuturiAggregati
    - detailConsuntivoMesePrecedente.costoPersonale
    - (detailConsuntivoMesePrecedente.costoPersonale * (1 - detailPercentRaggiuntoMesePrecedente))
  )

  const sintesiCountLabel = sintesiLoadingData
    ? 'Caricamento dati...'
    : `${sortedRows.length} righe`
  const datiContabiliVenditaCountLabel = datiContabiliVenditaLoading
    ? 'Caricamento dati...'
    : `${datiContabiliVenditaSortedRows.length} righe`
  const datiContabiliAcquistoCountLabel = datiContabiliAcquistoLoading
    ? 'Caricamento dati...'
    : `${datiContabiliAcquistoSortedRows.length} righe`
  const risorseCountLabel = analisiRccLoading
    ? 'Caricamento dati...'
    : `${isRisorsePivotPage ? risorsePivotRows.length : risorseRowsSorted.length} righe`
  const risorseTitle = isRisorseOuRisorsePage
    ? 'Analisi OU Risorse'
    : (
      isRisorseOuRisorsePivotPage
        ? 'Analisi OU Risorse Pivot'
        : (
          isRisorseOuPage
            ? 'Analisi OU'
            : (
              isRisorseRisultatiPage
    ? 'Risultati Risorse - Valutazione Annuale'
    : (
      isRisorseRisultatiPivotPage
        ? 'Risultati Risorse - Pivot Annuale'
        : (
          isRisorseRisultatiMensilePage
            ? 'Risultati Risorse - Valutazione Mensile'
            : 'Risultati Risorse - Pivot Mensile'
        )
    )
            )
        )
    )
  const risorseFatturatoLabel = risorseFiltersForm.vistaCosto ? 'Fatturato in base a costo' : 'Fatturato in base ad ore'
  const risorseUtileLabel = risorseFiltersForm.vistaCosto ? 'Utile in base a costo' : 'Utile in base ad ore'
  const risorseFormDisabled = risorseLoadingFilters || analisiRccLoading
  const datiContabiliCountLabel = isDatiContabiliVenditaPage
    ? datiContabiliVenditaCountLabel
    : datiContabiliAcquistoCountLabel
  const datiContabiliLoading = isDatiContabiliVenditaPage
    ? datiContabiliVenditaLoading
    : datiContabiliAcquistoLoading
  const sintesiExportRowsCount = isDatiContabiliVenditaPage
    ? datiContabiliVenditaSortedRows.length
    : (
      isDatiContabiliAcquistiPage
        ? datiContabiliAcquistoSortedRows.length
        : (
          isProdottiSintesiPage
            ? sintesiTableRows.length
            : sortedRows.length
        )
    )
  const processoOffertaTitle = isProcessoOffertaOffertePage
    ? 'Processo Offerta - Offerte'
    : (
      isProcessoOffertaSintesiRccPage
        ? 'Processo Offerta - Sintesi RCC'
        : (
          isProcessoOffertaSintesiBuPage
            ? 'Processo Offerta - Sintesi BU'
            : (
              isProcessoOffertaPercentualeSuccessoRccPage
                ? 'Processo Offerta - Percentuale Successo RCC'
                : (
                  isProcessoOffertaPercentualeSuccessoBuPage
                    ? 'Processo Offerta - Percentuale Successo BU'
                    : (
                      isProcessoOffertaIncidenzaRccPage
                        ? 'Processo Offerta - Incidenza RCC'
                        : 'Processo Offerta - Incidenza BU'
                    )
                )
            )
        )
    )
  const processoOffertaIsBuPage = (
    isProcessoOffertaSintesiBuPage ||
    isProcessoOffertaPercentualeSuccessoBuPage ||
    isProcessoOffertaIncidenzaBuPage
  )
  const processoOffertaCurrentData: ProcessoOffertaOfferteResponse | ProcessoOffertaSintesiResponse | null = (
    isProcessoOffertaOffertePage
      ? processoOffertaOfferteData
      : (
        isProcessoOffertaSintesiRccPage || isProcessoOffertaPercentualeSuccessoRccPage || isProcessoOffertaIncidenzaRccPage
          ? processoOffertaSintesiRccData
          : processoOffertaSintesiBuData
      )
  )
  const processoOffertaRowsCount = isProcessoOffertaOffertePage
    ? processoOffertaOfferteRows.length
    : (
      isProcessoOffertaSintesiRccPage
        ? processoOffertaSintesiRccRows.length
        : (
          isProcessoOffertaSintesiBuPage
            ? processoOffertaSintesiBuRows.length
            : (
              isProcessoOffertaPercentualeSuccessoRccPage
                ? processoOffertaSuccessoRccRows.length
                : (
                  isProcessoOffertaPercentualeSuccessoBuPage
                    ? processoOffertaSuccessoBuRows.length
                    : (
                      isProcessoOffertaIncidenzaRccPage
                        ? processoOffertaIncidenzaRccRows.length
                        : processoOffertaIncidenzaBuRows.length
                    )
                )
            )
        )
    )
  const processoOffertaAggregazioneLabel = processoOffertaIsBuPage ? 'Business Unit' : 'RCC'
  const processoOffertaSintesiRows = isProcessoOffertaSintesiRccPage
    ? processoOffertaSintesiRccRows
    : processoOffertaSintesiBuRows
  const processoOffertaSintesiTotals = isProcessoOffertaSintesiRccPage
    ? processoOffertaSintesiRccTotals
    : processoOffertaSintesiBuTotals
  const processoOffertaSintesiRicaricoTotale = processoOffertaSintesiTotals.costoPrevedibile === 0
    ? 0
    : (
      (processoOffertaSintesiTotals.importoPrevedibile - processoOffertaSintesiTotals.costoPrevedibile)
      / processoOffertaSintesiTotals.costoPrevedibile
    )
  const processoOffertaSuccessoRows = isProcessoOffertaPercentualeSuccessoRccPage
    ? processoOffertaSuccessoRccRows
    : processoOffertaSuccessoBuRows
  const processoOffertaSuccessoSintesiRows = isProcessoOffertaPercentualeSuccessoRccPage
    ? processoOffertaSuccessoSintesiRccRows
    : processoOffertaSuccessoSintesiBuRows
  const processoOffertaSuccessoSintesiTotale = isProcessoOffertaPercentualeSuccessoRccPage
    ? processoOffertaSuccessoSintesiRccTotale
    : processoOffertaSuccessoSintesiBuTotale
  const processoOffertaSuccessoTotaliPerAnno = isProcessoOffertaPercentualeSuccessoRccPage
    ? processoOffertaSuccessoRccTotaliPerAnno
    : processoOffertaSuccessoBuTotaliPerAnno
  const processoOffertaSuccessoTotaleComplessivo = isProcessoOffertaPercentualeSuccessoRccPage
    ? processoOffertaSuccessoRccTotaleComplessivo
    : processoOffertaSuccessoBuTotaleComplessivo
  const processoOffertaSuccessoTotaleNegativo = processoOffertaSuccessoTotaleComplessivo[0]
  const processoOffertaSuccessoTotaleNonDefinito = processoOffertaSuccessoTotaleComplessivo[1]
  const processoOffertaSuccessoTotalePositivo = processoOffertaSuccessoTotaleComplessivo[2]
  const processoOffertaSuccessoTotale = processoOffertaSuccessoTotaleComplessivo[3]
  const processoOffertaIncidenzaRows = isProcessoOffertaIncidenzaRccPage
    ? processoOffertaIncidenzaRccRows
    : processoOffertaIncidenzaBuRows
  const processoOffertaIncidenzaTotaliPerAnno = isProcessoOffertaIncidenzaRccPage
    ? processoOffertaIncidenzaRccTotaliPerAnno
    : processoOffertaIncidenzaBuTotaliPerAnno
  const processoOffertaCountLabel = analisiRccLoading
    ? 'Caricamento dati...'
    : `${processoOffertaRowsCount} righe`
  const analisiPageRowsCount = (
    activePage === 'commesse-andamento-mensile'
      ? commesseAndamentoMensileRows.length
      : (
        activePage === 'commesse-dati-annuali-aggregati'
          ? commesseDatiAnnualiPivotRows.length
          : (
            isRisorsePage
              ? (
                isRisorsePivotPage
                  ? risorsePivotRows.length
                  : risorseRowsSorted.length
              )
              : (
            activePage === 'analisi-rcc-risultato-mensile'
              ? (analisiRccData?.risultatoPesato.righe.length ?? 0)
              : (
                activePage === 'analisi-rcc-pivot-fatturato'
                  ? analisiRccPivotRows.length
                  : (
                    activePage === 'analisi-bu-risultato-mensile'
                      ? (analisiBuData?.risultatoPesato.righe.length ?? 0)
                      : (
                        activePage === 'analisi-bu-pivot-fatturato'
                          ? analisiBuPivotRows.length
                          : (
                            activePage === 'analisi-burcc-risultato-mensile'
                              ? (analisiBurccData?.risultatoPesato.righe.length ?? 0)
                              : (
                            activePage === 'analisi-burcc-pivot-fatturato'
                                  ? analisiBurccPivotRows.length
                                  : (
                                    activePage === 'analisi-piano-fatturazione'
                                      ? analisiPianoFatturazioneRows.length
                                      : (
                                    activePage === 'previsioni-funnel'
                                      ? previsioniFunnelRows.length
                                      : (
                                        activePage === 'previsioni-report-funnel-rcc'
                                          ? previsioniReportFunnelRccPivotRows.length
                                          : (
                                            activePage === 'previsioni-report-funnel-bu'
                                              ? previsioniReportFunnelBuPivotRows.length
                                              : (
                                                activePage === 'previsioni-utile-mensile-rcc'
                                                  ? previsioniUtileMensileRccRows.length
                                                  : (
                                                    activePage === 'previsioni-utile-mensile-bu'
                                                      ? previsioniUtileMensileBuRows.length
                                                      : (
                                                        isProcessoOffertaPage
                                                          ? processoOffertaRowsCount
                                                          : 0
                                                      )
                                                  )
                                              )
                                          )
                                      )
                                      )
                                  )
                              )
                          )
                      )
                  )
              )
              )
          )
      )
  )
  const analisiPageCountLabel = analisiRccLoading
    ? 'Caricamento dati...'
    : `${analisiPageRowsCount} righe`
  const canExportAnalisiPage = analisiPageRowsCount > 0
  const statusMessageVisible = useMemo(() => {
    const normalized = statusMessage.trim().toLowerCase()
    if (!normalized) {
      return ''
    }

    const isErrorMessage = normalized.includes('errore')
      || normalized.includes('non autoriz')
      || normalized.includes('non disponibile')
      || normalized.includes('non raggiungibile')
      || normalized.includes('impossibile')
      || normalized.includes('unauthorized')
      || normalized.includes('forbidden')
    return isErrorMessage ? statusMessage : ''
  }, [statusMessage])
  const processoOffertaVisibilityMessage = processoOffertaCurrentData
    ? (
      processoOffertaCurrentData.vediTutto
        ? `visibilita: ${processoOffertaIsBuPage ? 'tutte le BU' : 'tutti gli RCC'}`
        : `visibilita: solo ${processoOffertaCurrentData.ambitoFiltro || (processoOffertaIsBuPage ? 'BU corrente' : 'RCC corrente')}`
    )
    : statusMessageVisible
  const numberFormatter = useMemo(() => (
    new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    })
  ), [])
  const currencyFormatter = useMemo(() => (
    new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true,
    })
  ), [])

  const percentFormatter = useMemo(() => (
    new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true,
    })
  ), [])

  const formatNumber = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0
    const sign = safeValue < 0 ? '-' : ''
    return `${sign}${numberFormatter.format(Math.abs(safeValue))}`
  }

  const formatCurrency = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0
    const sign = safeValue < 0 ? '-' : ''
    return `${sign}${currencyFormatter.format(Math.abs(safeValue))} €`
  }

  const formatDate = (value?: string | null) => {
    if (!value) {
      return ''
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return value
    }

    return parsed.toLocaleDateString('it-IT')
  }

  const formatPercentRatio = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0
    return `${percentFormatter.format(Math.min(1, Math.max(0, safeValue)) * 100)}%`
  }
  const formatPercentRatioUnbounded = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0
    return `${percentFormatter.format(safeValue * 100)}%`
  }

  const formatPercentValue = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0
    const normalizedValue = Math.abs(safeValue) <= 1 ? safeValue * 100 : safeValue
    return `${percentFormatter.format(normalizedValue)}%`
  }

  const handleDetailPercentRaggiuntoInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const compactValue = event.target.value.replace(/\s+/g, '')
    if (!compactValue) {
      setDetailPercentRaggiuntoInput('')
      return
    }

    if (!/^\d{0,3}(?:[.,]\d{0,2})?$/.test(compactValue)) {
      return
    }

    const parsed = Number(compactValue.replace(',', '.'))
    if (Number.isFinite(parsed) && parsed > 100) {
      setDetailPercentRaggiuntoInput('100')
      return
    }

    setDetailPercentRaggiuntoInput(compactValue)
  }

  const handleDetailPercentRaggiuntoInputBlur = () => {
    const normalized = detailPercentRaggiuntoInput.trim().replace(',', '.')
    if (!normalized) {
      return
    }

    const parsed = Number(normalized)
    if (!Number.isFinite(parsed)) {
      return
    }

    const clamped = Math.min(100, Math.max(0, parsed))
    setDetailPercentRaggiuntoInput(percentFormatter.format(clamped))
  }

  const handleSaveDetailPercentRaggiunto = async () => {
    if (!detailData?.commessa) {
      return
    }

    if (!token.trim() || !currentProfile.trim()) {
      setDetailStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!detailLastDayPreviousMonth) {
      setDetailStatusMessage('Data di riferimento non disponibile per il salvataggio avanzamento.')
      return
    }

    const normalized = detailPercentRaggiuntoInput.trim().replace(',', '.')
    const parsed = normalized
      ? Number(normalized)
      : (
        detailPercentRaggiuntoSalvato
        ?? Math.min(100, Math.max(0, detailPercentRaggiuntoMesePrecedenteAutomatico * 100))
      )
    if (!Number.isFinite(parsed)) {
      setDetailStatusMessage('Valore % raggiunto non valido: inserire un numero compreso tra 0 e 100.')
      return
    }

    const clamped = Math.min(100, Math.max(0, parsed))
    setDetailPercentRaggiuntoInput(percentFormatter.format(clamped))

    setDetailSaving(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)

      const response = await fetch(toBackendUrl(`/api/commesse/dettaglio/avanzamento?${params.toString()}`), {
        method: 'POST',
        headers: {
          ...authHeaders(token, activeImpersonation),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commessa: detailData.commessa,
          percentualeRaggiunto: clamped,
          importoRiferimento: detailRicavoPrevisto,
          dataRiferimento: normalizeDateKey(detailLastDayPreviousMonth),
        }),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403 || response.status === 404) {
        const message = await readApiMessage(response)
        setDetailStatusMessage(message || 'Salvataggio avanzamento non autorizzato.')
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setDetailStatusMessage(message || `Errore salvataggio avanzamento (${response.status}).`)
        return
      }

      const payload = (await response.json()) as CommessaAvanzamentoRow
      setDetailData((current) => {
        if (!current) {
          return current
        }

        const payloadDateKey = normalizeDateKey(payload.dataRiferimento)
        const storicoAggiornato = [
          ...(current.avanzamentoStorico ?? []).filter((item) => (
            !payloadDateKey || normalizeDateKey(item.dataRiferimento) !== payloadDateKey
          )),
          payload,
        ].sort((left, right) => {
          const leftTime = left.dataRiferimento ? new Date(left.dataRiferimento).getTime() : Number.MAX_SAFE_INTEGER
          const rightTime = right.dataRiferimento ? new Date(right.dataRiferimento).getTime() : Number.MAX_SAFE_INTEGER
          const safeLeftTime = Number.isFinite(leftTime) ? leftTime : Number.MAX_SAFE_INTEGER
          const safeRightTime = Number.isFinite(rightTime) ? rightTime : Number.MAX_SAFE_INTEGER
          if (safeLeftTime !== safeRightTime) {
            return safeLeftTime - safeRightTime
          }

          return left.id - right.id
        })

        return {
          ...current,
          avanzamentoSalvato: payload,
          avanzamentoStorico: storicoAggiornato,
        }
      })
      setDetailPercentRaggiuntoInput(percentFormatter.format(Math.min(100, Math.max(0, payload.percentualeRaggiunto))))
      setDetailStatusMessage(
        `Avanzamento salvato (id ${payload.id}) su ${detailData.commessa} con riferimento ${formatDate(payload.dataRiferimento)}.`,
      )
    } finally {
      setDetailSaving(false)
    }
  }

  const toggleRequisitoDettaglio = (idRequisito: number) => {
    setSelectedRequisitoId((current) => (current === idRequisito ? null : idRequisito))
  }

  useEffect(() => {
    if (!detailData) {
      return
    }

    if (detailPercentRaggiuntoSalvato !== null) {
      setDetailPercentRaggiuntoInput(percentFormatter.format(detailPercentRaggiuntoSalvato))
      return
    }

    const suggestedPercent = Math.min(
      100,
      Math.max(0, detailPercentRaggiuntoMesePrecedenteAutomatico * 100),
    )
    setDetailPercentRaggiuntoInput(percentFormatter.format(suggestedPercent))
  }, [detailData?.commessa, detailPercentRaggiuntoMesePrecedenteAutomatico, detailPercentRaggiuntoSalvato, percentFormatter])

  const toggleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortColumn(column)
    setSortDirection(column === 'anno' ? 'desc' : 'asc')
  }

  const sortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return '\u2195'
    }

    return sortDirection === 'asc' ? '\u2191' : '\u2193'
  }

  const exportSintesiExcel = () => {
    const hasDataToExport = isDatiContabiliVenditaPage
      ? datiContabiliVenditaSortedRows.length > 0
      : (
        isDatiContabiliAcquistiPage
          ? datiContabiliAcquistoSortedRows.length > 0
          : (
            isProdottiSintesiPage
              ? sintesiTableRows.length > 0
              : sortedRows.length > 0
          )
      )

    if (!hasDataToExport) {
      setStatusMessage('Nessun dato disponibile da esportare in Excel.')
      return
    }

    const workbook = XLSX.utils.book_new()
    let scopeLabel = 'Commesse'
    if (isDatiContabiliVenditaPage) {
      scopeLabel = 'DatiContabiliVendite'
      const rows = datiContabiliVenditaSortedRows.map((row) => ({
        AnnoFattura: row.annoFattura ?? '',
        DataMovimento: row.dataMovimento ? formatDate(row.dataMovimento) : '',
        Commessa: row.commessa,
        DescrizioneCommessa: row.descrizioneCommessa,
        TipologiaCommessa: row.tipologiaCommessa,
        StatoCommessa: row.statoCommessa,
        Macrotipologia: row.macroTipologia,
        ControparteCommessa: row.controparteCommessa,
        BusinessUnit: row.businessUnit,
        RCC: row.rcc,
        PM: row.pm,
        NumeroDocumento: row.numeroDocumento,
        DescrizioneMovimento: row.descrizioneMovimento,
        ControparteMovimento: row.controparteMovimento,
        Provenienza: row.provenienza,
        Importo: row.importo,
        Fatturato: row.fatturato,
        FatturatoFuturo: row.fatturatoFuturo,
        RicavoIpotetico: row.ricavoIpotetico,
        StatoTemporale: row.statoTemporale,
        Scaduta: row.isScaduta ? 'SI' : 'NO',
      }))
      const worksheet = XLSX.utils.json_to_sheet(rows)
      worksheet['!cols'] = [
        { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 20 },
        { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 40 }, { wch: 24 }, { wch: 14 }, { wch: 14 },
        { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
      ]
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendite')
    } else if (isDatiContabiliAcquistiPage) {
      scopeLabel = 'DatiContabiliAcquisti'
      const rows = datiContabiliAcquistoSortedRows.map((row) => ({
        AnnoFattura: row.annoFattura ?? '',
        DataDocumento: row.dataDocumento ? formatDate(row.dataDocumento) : '',
        Commessa: row.commessa,
        DescrizioneCommessa: row.descrizioneCommessa,
        TipologiaCommessa: row.tipologiaCommessa,
        StatoCommessa: row.statoCommessa,
        Macrotipologia: row.macroTipologia,
        ControparteCommessa: row.controparteCommessa,
        BusinessUnit: row.businessUnit,
        RCC: row.rcc,
        PM: row.pm,
        CodiceSocieta: row.codiceSocieta,
        DescrizioneFattura: row.descrizioneFattura,
        ControparteMovimento: row.controparteMovimento,
        Provenienza: row.provenienza,
        ImportoComplessivo: row.importoComplessivo,
        ImportoContabilitaDettaglio: row.importoContabilitaDettaglio,
        StatoTemporale: row.statoTemporale,
        Scaduta: row.isScaduta ? 'SI' : 'NO',
      }))
      const worksheet = XLSX.utils.json_to_sheet(rows)
      worksheet['!cols'] = [
        { wch: 10 }, { wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 20 },
        { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 40 }, { wch: 24 }, { wch: 14 }, { wch: 16 },
        { wch: 18 }, { wch: 14 }, { wch: 10 },
      ]
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Acquisti')
    } else if (isProdottiSintesiPage) {
      scopeLabel = 'Prodotti'
      const rows = sintesiTableRows.map((tableRow) => {
        if (tableRow.kind === 'prodotto-summary') {
          const row = tableRow.row
          return {
            TipoRiga: 'Prodotto',
            Anno: '',
            Commessa: `${tableRow.commesseCount} commesse`,
            Descrizione: '',
            Tipologia: '',
            Stato: '',
            Macrotipologia: '',
            [productOrCounterpartLabel]: row.prodotto,
            BusinessUnit: '',
            RCC: '',
            PM: '',
            OreLavorate: row.oreLavorate,
            CostoPersonale: row.costoPersonale,
            Ricavi: row.ricavi,
            Costi: row.costi,
            UtileSpecifico: row.utileSpecifico,
            RicaviFuturi: row.ricaviFuturi,
            CostiFuturi: row.costiFuturi,
          }
        }

        const row = tableRow.row
        return {
          TipoRiga: 'Commessa',
          Anno: row.anno ?? '',
          Commessa: row.commessa,
          Descrizione: row.descrizioneCommessa,
          Tipologia: row.tipologiaCommessa,
          Stato: row.stato,
          Macrotipologia: row.macroTipologia,
          [productOrCounterpartLabel]: row.prodotto,
          BusinessUnit: row.businessUnit,
          RCC: row.rcc,
          PM: row.pm,
          OreLavorate: row.oreLavorate,
          CostoPersonale: row.costoPersonale,
          Ricavi: row.ricavi,
          Costi: row.costi,
          UtileSpecifico: row.utileSpecifico,
          RicaviFuturi: row.ricaviFuturi,
          CostiFuturi: row.costiFuturi,
        }
      })
      const worksheet = XLSX.utils.json_to_sheet(rows)
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 56 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 18 },
        { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
        { wch: 16 }, { wch: 16 }, { wch: 16 },
      ]
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SintesiProdotti')
    } else {
      scopeLabel = 'Commesse'
      const rows = sortedRows.map((row) => ({
        Anno: row.anno ?? '',
        Commessa: row.commessa,
        Descrizione: row.descrizioneCommessa,
        Tipologia: row.tipologiaCommessa,
        Stato: row.stato,
        Macrotipologia: row.macroTipologia,
        [productOrCounterpartLabel]: row.controparte,
        BusinessUnit: row.businessUnit,
        RCC: row.rcc,
        PM: row.pm,
        OreLavorate: row.oreLavorate,
        CostoPersonale: row.costoPersonale,
        Ricavi: row.ricavi,
        Costi: row.costi,
        UtileSpecifico: row.utileSpecifico,
        RicaviFuturi: row.ricaviFuturi,
        CostiFuturi: row.costiFuturi,
      }))
      const worksheet = XLSX.utils.json_to_sheet(rows)
      worksheet['!cols'] = [
        { wch: 8 }, { wch: 14 }, { wch: 56 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 18 },
        { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
        { wch: 16 }, { wch: 16 }, { wch: 16 },
      ]
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SintesiCommesse')
    }

    const now = new Date()
    const timestamp = [
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
      '_',
      now.getHours().toString().padStart(2, '0'),
      now.getMinutes().toString().padStart(2, '0'),
      now.getSeconds().toString().padStart(2, '0'),
    ].join('')
    const mode = sintesiMode === 'aggregato' ? 'aggregato' : 'dettaglio'
    const anno = selectedAnniLabel
    const filename = `Produzione_${scopeLabel}_Sintesi_${mode}_${anno}_${timestamp}.xlsx`

    XLSX.writeFile(workbook, filename)
    setStatusMessage(`Export Excel completato: ${filename}`)
  }

  const toggleAnalisiSearchCollapsed = () => {
    if (!isAnalisiSearchCollapsible) {
      return
    }

    setAnalisiSearchCollapsedByPage((current) => ({
      ...current,
      [activePage]: !Boolean(current[activePage]),
    }))
  }

  const exportCommesseDatiAnnualiExcel = () => {
    if (commesseDatiAnnualiPivotRows.length === 0) {
      setStatusMessage('Nessun dato disponibile da esportare in Excel.')
      return
    }

    const rows = commesseDatiAnnualiPivotRows.map((row) => ({
      TipoRiga: row.kind === 'totale' ? 'Totale complessivo' : 'Gruppo',
      Livello: row.level,
      Etichetta: row.label,
      NumeroCommesse: row.numeroCommesse,
      OreLavorate: row.oreLavorate,
      CostoPersonale: row.costoPersonale,
      Ricavi: row.ricavi,
      Costi: row.costi,
      UtileSpecifico: row.utileSpecifico,
      RicaviFuturi: row.ricaviFuturi,
      CostiFuturi: row.costiFuturi,
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    worksheet['!cols'] = [
      { wch: 20 }, { wch: 8 }, { wch: 48 }, { wch: 16 }, { wch: 14 },
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DatiAnnualiAggregati')

    const now = new Date()
    const timestamp = [
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
      '_',
      now.getHours().toString().padStart(2, '0'),
      now.getMinutes().toString().padStart(2, '0'),
      now.getSeconds().toString().padStart(2, '0'),
    ].join('')
    const annoLabel = commesseDatiAnnualiAnni.length > 0
      ? [...commesseDatiAnnualiAnni].sort((left, right) => Number(right) - Number(left)).join('-')
      : 'tutti'
    const filename = `Produzione_Commesse_DatiAnnualiAggregati_${annoLabel}_${timestamp}.xlsx`

    XLSX.writeFile(workbook, filename)
    setStatusMessage(`Export Excel completato: ${filename}`)
  }

  const exportAnalisiExcel = () => {
    if (activePage === 'commesse-dati-annuali-aggregati') {
      exportCommesseDatiAnnualiExcel()
      return
    }

    if (!canExportAnalisiPage) {
      setStatusMessage('Nessun dato disponibile da esportare in Excel.')
      return
    }

    const workbook = XLSX.utils.book_new()
    const appendSheet = (rows: Record<string, unknown>[], sheetName: string, cols?: Array<{ wch: number }>) => {
      const safeRows = rows.length > 0 ? rows : [{ Info: 'Nessun dato disponibile' }]
      const worksheet = XLSX.utils.json_to_sheet(safeRows)
      if (cols && cols.length > 0) {
        worksheet['!cols'] = cols
      }
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
    }
    const buildGridRows = (grid: AnalisiRccRisultatoMensileGrid) => (
      grid.righe.map((row) => {
        const output: Record<string, unknown> = {
          Aggregazione: row.aggregazione,
        }
        if (!grid.valoriPercentuali) {
          output.Budget = row.budget ?? null
        }
        grid.mesi.forEach((mese) => {
          output[`M${mese.toString().padStart(2, '0')}`] = getAnalisiRccValueForMonth(row, mese)
        })
        return output
      })
    )

    let filenamePrefix = 'Analisi'
    switch (activePage) {
      case 'commesse-andamento-mensile': {
        appendSheet(
          commesseAndamentoMensileRows.map((row) => ({
            AnnoCompetenza: row.annoCompetenza,
            MeseCompetenza: row.meseCompetenza,
            Commessa: row.commessa,
            Descrizione: row.descrizioneCommessa,
            Tipologia: row.tipologiaCommessa,
            Stato: row.stato,
            Macrotipologia: row.macroTipologia,
            Prodotto: row.prodotto,
            Controparte: row.controparte,
            BusinessUnit: row.businessUnit,
            RCC: row.rcc,
            PM: row.pm,
            Produzione: row.produzione ? 1 : 0,
            OreLavorate: row.oreLavorate,
            CostoPersonale: row.costoPersonale,
            Ricavi: row.ricavi,
            Costi: row.costi,
            CostoGeneraleRibaltato: row.costoGeneraleRibaltato,
            UtileSpecifico: row.utileSpecifico,
          })),
          'AndamentoMensile',
        )
        appendSheet([
          {
            OreLavorate: commesseAndamentoMensileTotals.oreLavorate,
            CostoPersonale: commesseAndamentoMensileTotals.costoPersonale,
            Ricavi: commesseAndamentoMensileTotals.ricavi,
            Costi: commesseAndamentoMensileTotals.costi,
            CostoGeneraleRibaltato: commesseAndamentoMensileTotals.costoGeneraleRibaltato,
            UtileSpecifico: commesseAndamentoMensileTotals.utileSpecifico,
          },
        ], 'Totali')
        filenamePrefix = 'Commesse_AndamentoMensile'
        break
      }
      case 'risorse-risultati':
      case 'risorse-risultati-mensile':
      case 'risorse-ou-risorse':
      case 'risorse-ou': {
        appendSheet(risorseRowsSorted.map((row) => ({
          AnnoCompetenza: row.annoCompetenza,
          MeseCompetenza: row.meseCompetenza ?? null,
          Commessa: row.commessa,
          Descrizione: row.descrizioneCommessa,
          Tipologia: row.tipologiaCommessa,
          Stato: row.stato,
          Macrotipologia: row.macroTipologia,
          Prodotto: row.prodotto,
          Controparte: row.controparte,
          BusinessUnit: row.businessUnit,
          RCC: row.rcc,
          PM: row.pm,
          IdRisorsa: row.idRisorsa,
          NomeRisorsa: normalizeRisorsaLabel(row),
          OreTotali: row.oreTotali,
          CostoSpecificoRisorsa: row.costoSpecificoRisorsa,
          Fatturato: risorseFiltersForm.vistaCosto ? row.fatturatoInBaseACosto : row.fatturatoInBaseAdOre,
          Utile: risorseFiltersForm.vistaCosto ? row.utileInBaseACosto : row.utileInBaseAdOre,
          VistaCalcolo: risorseFiltersForm.vistaCosto ? 'Costo' : 'Ore',
          IdOU: row.idOu ?? '',
          NomeRuolo: row.nomeRuolo ?? '',
          PercentualeUtilizzo: row.percentualeUtilizzo ?? 0,
          Area: row.area ?? '',
          OUProduzione: row.ouProduzione ? 1 : 0,
          CodiceSocieta: row.codiceSocieta ?? '',
        })), (
          activePage === 'risorse-risultati'
            ? 'RisorseAnnuale'
            : (
              activePage === 'risorse-risultati-mensile'
                ? 'RisorseMensile'
                : (
                  activePage === 'risorse-ou-risorse'
                    ? 'AnalisiOURisorse'
                    : 'AnalisiOU'
                )
            )
        ))
        appendSheet([{
          OreTotali: risorseTotals.oreTotali,
          CostoSpecificoRisorsa: risorseTotals.costoSpecificoRisorsa,
          Fatturato: risorseTotals.fatturato,
          Utile: risorseTotals.utile,
          VistaCalcolo: risorseFiltersForm.vistaCosto ? 'Costo' : 'Ore',
        }], 'Totali')
        filenamePrefix = activePage === 'risorse-risultati'
          ? 'Risorse_ValutazioneAnnuale'
          : (
            activePage === 'risorse-risultati-mensile'
              ? 'Risorse_ValutazioneMensile'
              : (
                activePage === 'risorse-ou-risorse'
                  ? 'AnalisiOU_Risorse'
                  : 'AnalisiOU'
              )
          )
        break
      }
      case 'risorse-risultati-pivot':
      case 'risorse-risultati-mensile-pivot':
      case 'risorse-ou-risorse-pivot': {
        appendSheet(risorsePivotRows.map((row) => ({
          TipoRiga: row.kind === 'totale' ? 'Totale complessivo' : 'Gruppo',
          Livello: row.level,
          Etichetta: row.label,
          NumeroCommesse: row.numeroCommesse,
          OreTotali: row.oreTotali,
          CostoSpecificoRisorsa: row.costoSpecificoRisorsa,
          Fatturato: row.fatturato,
          Utile: row.utile,
          VistaCalcolo: risorseFiltersForm.vistaCosto ? 'Costo' : 'Ore',
        })), activePage === 'risorse-risultati-pivot'
          ? 'PivotRisorseAnnuale'
          : (
            activePage === 'risorse-risultati-mensile-pivot'
              ? 'PivotRisorseMensile'
              : 'AnalisiOURisorsePivot'
          ))
        filenamePrefix = activePage === 'risorse-risultati-pivot'
          ? 'Risorse_PivotAnnuale'
          : (
            activePage === 'risorse-risultati-mensile-pivot'
              ? 'Risorse_PivotMensile'
              : 'AnalisiOU_RisorsePivot'
          )
        break
      }
      case 'analisi-rcc-risultato-mensile': {
        analisiRccGrids.forEach((grid, index) => appendSheet(
          buildGridRows(grid),
          index === 0 ? 'RisultatoPesato' : 'PercentualePesata',
        ))
        filenamePrefix = 'AnalisiProiezioni_ProiezioneMensileRCC'
        break
      }
      case 'analisi-bu-risultato-mensile': {
        analisiBuGrids.forEach((grid, index) => appendSheet(
          buildGridRows(grid),
          index === 0 ? 'RisultatoPesato' : 'PercentualePesata',
        ))
        filenamePrefix = 'AnalisiProiezioni_ProiezioneMensileBU'
        break
      }
      case 'analisi-burcc-risultato-mensile': {
        analisiBurccGrids.forEach((grid, index) => appendSheet(
          buildGridRows(grid),
          index === 0 ? 'RisultatoPesato' : 'PercentualePesata',
        ))
        filenamePrefix = 'AnalisiProiezioni_ProiezioneMensileRCCBU'
        break
      }
      case 'analisi-rcc-pivot-fatturato': {
        appendSheet(analisiRccPivotRows.map((row) => ({
          Anno: row.anno,
          RCC: row.rcc,
          FatturatoAnno: row.fatturatoAnno,
          FatturatoFuturoAnno: row.fatturatoFuturoAnno,
          TotaleFatturatoCerto: row.totaleFatturatoCerto,
          BudgetPrevisto: row.budgetPrevisto,
          MargineColBudget: row.margineColBudget,
          PercentualeCertaRaggiunta: row.percentualeCertaRaggiunta,
          RicavoIpotetico: row.totaleRicavoIpotetico,
          RicavoIpoteticoPesato: row.totaleRicavoIpoteticoPesato,
          TotaleIpotetico: row.totaleIpotetico,
          PercentualeCompresoRicavoIpotetico: row.percentualeCompresoRicavoIpotetico,
        })), 'PivotFatturato')
        appendSheet(analisiRccPivotTotaliPerAnno.map((row) => ({
          Anno: row.anno,
          FatturatoAnno: row.fatturatoAnno,
          FatturatoFuturoAnno: row.fatturatoFuturoAnno,
          TotaleFatturatoCerto: row.totaleFatturatoCerto,
          BudgetPrevisto: row.budgetPrevisto,
          MargineColBudget: row.margineColBudget,
          PercentualeCertaRaggiunta: row.percentualeCertaRaggiunta,
          RicavoIpotetico: row.totaleRicavoIpotetico,
          RicavoIpoteticoPesato: row.totaleRicavoIpoteticoPesato,
          TotaleIpotetico: row.totaleIpotetico,
          PercentualeCompresoRicavoIpotetico: row.percentualeCompresoRicavoIpotetico,
        })), 'TotaliPerAnno')
        filenamePrefix = 'AnalisiProiezioni_ReportAnnualeRCC'
        break
      }
      case 'analisi-bu-pivot-fatturato': {
        appendSheet(analisiBuPivotRows.map((row) => ({
          Anno: row.anno,
          BU: row.rcc,
          FatturatoAnno: row.fatturatoAnno,
          FatturatoFuturoAnno: row.fatturatoFuturoAnno,
          TotaleFatturatoCerto: row.totaleFatturatoCerto,
          BudgetPrevisto: row.budgetPrevisto,
          MargineColBudget: row.margineColBudget,
          PercentualeCertaRaggiunta: row.percentualeCertaRaggiunta,
          RicavoIpotetico: row.totaleRicavoIpotetico,
          RicavoIpoteticoPesato: row.totaleRicavoIpoteticoPesato,
          TotaleIpotetico: row.totaleIpotetico,
          PercentualeCompresoRicavoIpotetico: row.percentualeCompresoRicavoIpotetico,
        })), 'PivotFatturato')
        appendSheet(analisiBuPivotTotaliPerAnno.map((row) => ({
          Anno: row.anno,
          FatturatoAnno: row.fatturatoAnno,
          FatturatoFuturoAnno: row.fatturatoFuturoAnno,
          TotaleFatturatoCerto: row.totaleFatturatoCerto,
          BudgetPrevisto: row.budgetPrevisto,
          MargineColBudget: row.margineColBudget,
          PercentualeCertaRaggiunta: row.percentualeCertaRaggiunta,
          RicavoIpotetico: row.totaleRicavoIpotetico,
          RicavoIpoteticoPesato: row.totaleRicavoIpoteticoPesato,
          TotaleIpotetico: row.totaleIpotetico,
          PercentualeCompresoRicavoIpotetico: row.percentualeCompresoRicavoIpotetico,
        })), 'TotaliPerAnno')
        filenamePrefix = 'AnalisiProiezioni_ReportAnnualeBU'
        break
      }
      case 'analisi-burcc-pivot-fatturato': {
        appendSheet(analisiBurccPivotRows.map((row) => ({
          Anno: row.anno,
          BU: row.businessUnit,
          RCC: row.rcc,
          FatturatoAnno: row.fatturatoAnno,
          FatturatoFuturoAnno: row.fatturatoFuturoAnno,
          TotaleFatturatoCerto: row.totaleFatturatoCerto,
          BudgetPrevisto: row.budgetPrevisto,
          MargineColBudget: row.margineColBudget,
          PercentualeCertaRaggiunta: row.percentualeCertaRaggiunta,
          RicavoIpotetico: row.totaleRicavoIpotetico,
          RicavoIpoteticoPesato: row.totaleRicavoIpoteticoPesato,
          TotaleIpotetico: row.totaleIpotetico,
          PercentualeCompresoRicavoIpotetico: row.percentualeCompresoRicavoIpotetico,
        })), 'PivotFatturato')
        appendSheet(analisiBurccPivotTotaliPerAnno.map((row) => ({
          Anno: row.anno,
          FatturatoAnno: row.fatturatoAnno,
          FatturatoFuturoAnno: row.fatturatoFuturoAnno,
          TotaleFatturatoCerto: row.totaleFatturatoCerto,
          BudgetPrevisto: row.budgetPrevisto,
          MargineColBudget: row.margineColBudget,
          PercentualeCertaRaggiunta: row.percentualeCertaRaggiunta,
          RicavoIpotetico: row.totaleRicavoIpotetico,
          RicavoIpoteticoPesato: row.totaleRicavoIpoteticoPesato,
          TotaleIpotetico: row.totaleIpotetico,
          PercentualeCompresoRicavoIpotetico: row.percentualeCompresoRicavoIpotetico,
        })), 'TotaliPerAnno')
        filenamePrefix = 'AnalisiProiezioni_ReportAnnualeRCCBU'
        break
      }
      case 'analisi-piano-fatturazione': {
        appendSheet(analisiPianoFatturazioneRows.map((row) => {
          const output: Record<string, unknown> = {
            RCC: row.rcc,
            Budget: row.budget,
          }
          analisiPianoFatturazioneMesiRiferimento.forEach((mese) => {
            output[`M${mese.toString().padStart(2, '0')}`] = getAnalisiPianoFatturazioneValueForMonth(row, mese)
            if (isQuarterEndMonth(mese)) {
              const quarter = getQuarterFromMonth(mese)
              output[`Trim${quarter}Totale`] = getAnalisiPianoFatturazioneQuarterTotal(row, quarter)
            }
          })
          output.TotaleComplessivo = row.totaleComplessivo
          return output
        }), 'PianoFatturazione')
        appendSheet(analisiPianoFatturazioneProgressRows.map((row) => {
          const output: Record<string, unknown> = {
            RCC: row.rcc,
            Budget: row.budget,
          }
          analisiPianoFatturazioneMesiRiferimento.forEach((mese) => {
            output[`M${mese.toString().padStart(2, '0')}_ImportoProgressivo`] = getAnalisiPianoFatturazioneProgressAmountForMonth(row, mese)
            output[`M${mese.toString().padStart(2, '0')}_PercBudget`] = getAnalisiPianoFatturazioneProgressPercentForMonth(row, mese)
          })
          output.ImportoTotaleProgressivo = row.importoTotaleProgressivo
          output.PercentualeTotaleBudget = row.percentualeTotaleBudget
          return output
        }), 'ProgressivoBudget')
        filenamePrefix = 'AnalisiProiezioni_PianoFatturazione'
        break
      }
      case 'previsioni-funnel': {
        appendSheet(previsioniFunnelRows.map((row) => ({
          Anno: row.anno,
          BusinessUnit: row.businessUnit,
          RCC: row.rcc,
          Commessa: row.commessa,
          Protocollo: row.protocollo,
          Tipo: row.tipo,
          StatoDocumento: row.statoDocumento,
          Data: row.data ? formatDate(row.data) : '',
          Oggetto: row.oggetto,
          BudgetRicavo: row.budgetRicavo,
          BudgetCosti: row.budgetCosti,
          RicavoAtteso: row.ricavoAtteso,
          FatturatoEmesso: row.fatturatoEmesso,
          FatturatoFuturo: row.fatturatoFuturo,
          FuturaAnno: row.futuraAnno,
          EmessaAnno: row.emessaAnno,
          TotaleAnno: row.totaleAnno,
          PercentualeSuccesso: row.percentualeSuccesso,
        })), 'Funnel')
        appendSheet([{
          BudgetRicavo: previsioniFunnelTotals.budgetRicavo,
          BudgetCosti: previsioniFunnelTotals.budgetCosti,
          RicavoAtteso: previsioniFunnelTotals.ricavoAtteso,
          FatturatoEmesso: previsioniFunnelTotals.fatturatoEmesso,
          FatturatoFuturo: previsioniFunnelTotals.fatturatoFuturo,
          FuturaAnno: previsioniFunnelTotals.futuraAnno,
          EmessaAnno: previsioniFunnelTotals.emessaAnno,
          TotaleAnno: previsioniFunnelTotals.totaleAnno,
          PercentualeSuccessoPesata: previsioniFunnelTotals.percentualeSuccesso,
        }], 'Totali')
        filenamePrefix = 'Previsioni_Funnel'
        break
      }
      case 'previsioni-report-funnel-rcc': {
        appendSheet(previsioniReportFunnelRccPivotRows.map((row) => ({
          Anno: row.anno,
          Livello: row.livello,
          Etichetta: row.etichetta,
          PercentualeSuccesso: row.percentualeSuccesso,
          NumeroProtocolli: row.numeroProtocolli,
          BudgetRicavo: row.totaleBudgetRicavo,
          BudgetCosti: row.totaleBudgetCosti,
          FatturatoFuturo: row.totaleFatturatoFuturo,
          FuturaAnno: row.totaleFuturaAnno,
          EmessaAnno: row.totaleEmessaAnno,
          TotaleAnno: row.totaleRicaviComplessivi,
        })), 'ReportFunnel')
        appendSheet(previsioniReportFunnelRccTotaliPerAnno.map((row) => ({
          Anno: row.anno,
          NumeroProtocolli: row.numeroProtocolli,
          PercentualeSuccesso: row.percentualeSuccesso,
          BudgetRicavo: row.totaleBudgetRicavo,
          BudgetCosti: row.totaleBudgetCosti,
          FatturatoFuturo: row.totaleFatturatoFuturo,
          FuturaAnno: row.totaleFuturaAnno,
          EmessaAnno: row.totaleEmessaAnno,
          TotaleAnno: row.totaleRicaviComplessivi,
        })), 'TotaliPerAnno')
        filenamePrefix = 'Previsioni_ReportFunnelRCC'
        break
      }
      case 'previsioni-report-funnel-bu': {
        appendSheet(previsioniReportFunnelBuPivotRows.map((row) => ({
          Anno: row.anno,
          Livello: row.livello,
          Etichetta: row.etichetta,
          PercentualeSuccesso: row.percentualeSuccesso,
          NumeroProtocolli: row.numeroProtocolli,
          BudgetRicavo: row.totaleBudgetRicavo,
          BudgetCosti: row.totaleBudgetCosti,
          FatturatoFuturo: row.totaleFatturatoFuturo,
          FuturaAnno: row.totaleFuturaAnno,
          EmessaAnno: row.totaleEmessaAnno,
          TotaleAnno: row.totaleRicaviComplessivi,
        })), 'ReportFunnel')
        appendSheet(previsioniReportFunnelBuTotaliPerAnno.map((row) => ({
          Anno: row.anno,
          NumeroProtocolli: row.numeroProtocolli,
          PercentualeSuccesso: row.percentualeSuccesso,
          BudgetRicavo: row.totaleBudgetRicavo,
          BudgetCosti: row.totaleBudgetCosti,
          FatturatoFuturo: row.totaleFatturatoFuturo,
          FuturaAnno: row.totaleFuturaAnno,
          EmessaAnno: row.totaleEmessaAnno,
          TotaleAnno: row.totaleRicaviComplessivi,
        })), 'TotaliPerAnno')
        filenamePrefix = 'Previsioni_ReportFunnelBU'
        break
      }
      case 'previsioni-utile-mensile-rcc': {
        appendSheet(previsioniUtileMensileRccRows.map((row) => ({
          Anno: row.anno,
          RCC: row.aggregazione,
          TotaleRicavi: row.totaleRicavi,
          TotaleCosti: row.totaleCosti,
          TotaleCostoPersonale: row.totaleCostoPersonale,
          TotaleUtileSpecifico: row.totaleUtileSpecifico,
          TotaleOreLavorate: row.totaleOreLavorate,
          TotaleCostoGeneraleRibaltato: row.totaleCostoGeneraleRibaltato,
          PercentualeMargineSuRicavi: row.percentualeMargineSuRicavi,
          PercentualeMarkupSuCosti: row.percentualeMarkupSuCosti,
          PercentualeCostIncome: row.percentualeCostIncome,
        })), 'UtileMensile')
        appendSheet(previsioniUtileMensileRccTotaliPerAnno.map((row) => ({
          Anno: row.anno,
          TotaleRicavi: row.totaleRicavi,
          TotaleCosti: row.totaleCosti,
          TotaleCostoPersonale: row.totaleCostoPersonale,
          TotaleUtileSpecifico: row.totaleUtileSpecifico,
          TotaleOreLavorate: row.totaleOreLavorate,
          TotaleCostoGeneraleRibaltato: row.totaleCostoGeneraleRibaltato,
          PercentualeMargineSuRicavi: row.percentualeMargineSuRicavi,
          PercentualeMarkupSuCosti: row.percentualeMarkupSuCosti,
          PercentualeCostIncome: row.percentualeCostIncome,
        })), 'TotaliPerAnno')
        filenamePrefix = 'AnalisiCommesse_UtileMensileRCC'
        break
      }
      case 'previsioni-utile-mensile-bu': {
        appendSheet(previsioniUtileMensileBuRows.map((row) => ({
          Anno: row.anno,
          BU: row.aggregazione,
          TotaleRicavi: row.totaleRicavi,
          TotaleCosti: row.totaleCosti,
          TotaleCostoPersonale: row.totaleCostoPersonale,
          TotaleUtileSpecifico: row.totaleUtileSpecifico,
          TotaleOreLavorate: row.totaleOreLavorate,
          TotaleCostoGeneraleRibaltato: row.totaleCostoGeneraleRibaltato,
          PercentualeMargineSuRicavi: row.percentualeMargineSuRicavi,
          PercentualeMarkupSuCosti: row.percentualeMarkupSuCosti,
          PercentualeCostIncome: row.percentualeCostIncome,
        })), 'UtileMensile')
        appendSheet(previsioniUtileMensileBuTotaliPerAnno.map((row) => ({
          Anno: row.anno,
          TotaleRicavi: row.totaleRicavi,
          TotaleCosti: row.totaleCosti,
          TotaleCostoPersonale: row.totaleCostoPersonale,
          TotaleUtileSpecifico: row.totaleUtileSpecifico,
          TotaleOreLavorate: row.totaleOreLavorate,
          TotaleCostoGeneraleRibaltato: row.totaleCostoGeneraleRibaltato,
          PercentualeMargineSuRicavi: row.percentualeMargineSuRicavi,
          PercentualeMarkupSuCosti: row.percentualeMarkupSuCosti,
          PercentualeCostIncome: row.percentualeCostIncome,
        })), 'TotaliPerAnno')
        filenamePrefix = 'AnalisiCommesse_UtileMensileBU'
        break
      }
      case 'processo-offerta-offerte': {
        appendSheet(processoOffertaOfferteRows.map((row) => ({
          Anno: row.anno,
          Data: row.data ? formatDate(row.data) : '',
          BusinessUnit: row.businessUnit,
          RCC: row.rcc,
          Commessa: row.commessa,
          Protocollo: row.protocollo,
          Tipo: row.tipo,
          StatoDocumento: row.statoDocumento,
          Oggetto: row.oggetto,
          Esito: row.esito,
          PercentualeSuccesso: row.percentualeSuccesso,
          ImportoPrevedibile: row.importoPrevedibile,
          CostoPrevedibile: row.costoPrevedibile,
        })), 'Offerte')
        appendSheet([{
          ImportoPrevedibile: processoOffertaOfferteTotals.importoPrevedibile,
          CostoPrevedibile: processoOffertaOfferteTotals.costoPrevedibile,
        }], 'Totali')
        filenamePrefix = 'ProcessoOfferta_Offerte'
        break
      }
      case 'processo-offerta-sintesi-rcc':
      case 'processo-offerta-sintesi-bu': {
        appendSheet(processoOffertaSintesiRows.map((row) => ({
          Anno: row.anno,
          Aggregazione: row.aggregazione,
          Tipo: row.tipo,
          Esito: row.esitoPositivoTesto,
          Numero: row.numero,
          ImportoPrevedibile: row.importoPrevedibile,
          CostoPrevedibile: row.costoPrevedibile,
          PercentualeRicarico: row.percentualeRicarico,
        })), 'Sintesi')
        appendSheet([{
          Numero: processoOffertaSintesiTotals.numero,
          ImportoPrevedibile: processoOffertaSintesiTotals.importoPrevedibile,
          CostoPrevedibile: processoOffertaSintesiTotals.costoPrevedibile,
          PercentualeRicarico: processoOffertaSintesiRicaricoTotale,
        }], 'Totali')
        filenamePrefix = isProcessoOffertaSintesiRccPage ? 'ProcessoOfferta_SintesiRCC' : 'ProcessoOfferta_SintesiBU'
        break
      }
      case 'processo-offerta-percentuale-successo-rcc':
      case 'processo-offerta-percentuale-successo-bu': {
        appendSheet(processoOffertaSuccessoRows.map((row) => ({
          Anno: row.anno,
          Aggregazione: row.aggregazione,
          RicavoNegativo: row.negativo.ricavo,
          CostoNegativo: row.negativo.costo,
          MargineNegativo: row.negativo.margine,
          RicaricoNegativo: row.negativo.ricarico,
          RicavoNonDefinito: row.nonDefinito.ricavo,
          CostoNonDefinito: row.nonDefinito.costo,
          MargineNonDefinito: row.nonDefinito.margine,
          RicaricoNonDefinito: row.nonDefinito.ricarico,
          RicavoPositivo: row.positivo.ricavo,
          CostoPositivo: row.positivo.costo,
          MarginePositivo: row.positivo.margine,
          RicaricoPositivo: row.positivo.ricarico,
          RicavoTotale: row.totale.ricavo,
          CostoTotale: row.totale.costo,
          MargineTotale: row.totale.margine,
          RicaricoTotale: row.totale.ricarico,
        })), 'PercentualeSuccesso')
        appendSheet(processoOffertaSuccessoTotaliPerAnno.map((row) => ({
          Anno: row.anno,
          RicavoNegativo: row.negativo.ricavo,
          CostoNegativo: row.negativo.costo,
          MargineNegativo: row.negativo.margine,
          RicaricoNegativo: row.negativo.ricarico,
          RicavoNonDefinito: row.nonDefinito.ricavo,
          CostoNonDefinito: row.nonDefinito.costo,
          MargineNonDefinito: row.nonDefinito.margine,
          RicaricoNonDefinito: row.nonDefinito.ricarico,
          RicavoPositivo: row.positivo.ricavo,
          CostoPositivo: row.positivo.costo,
          MarginePositivo: row.positivo.margine,
          RicaricoPositivo: row.positivo.ricarico,
          RicavoTotale: row.totale.ricavo,
          CostoTotale: row.totale.costo,
          MargineTotale: row.totale.margine,
          RicaricoTotale: row.totale.ricarico,
        })), 'TotaliPerAnno')
        appendSheet(processoOffertaSuccessoSintesiRows.map((row) => ({
          Anno: row.anno,
          Aggregazione: row.aggregazione,
          NumeroNegativo: row.negativo.numero,
          ImportoNegativo: row.negativo.importo,
          PercentualeNumeroNegativo: row.negativo.percentualeNumero,
          PercentualeImportoNegativo: row.negativo.percentualeImporto,
          NumeroNonDefinito: row.nonDefinito.numero,
          ImportoNonDefinito: row.nonDefinito.importo,
          PercentualeNumeroNonDefinito: row.nonDefinito.percentualeNumero,
          PercentualeImportoNonDefinito: row.nonDefinito.percentualeImporto,
          NumeroPositivo: row.positivo.numero,
          ImportoPositivo: row.positivo.importo,
          PercentualeNumeroPositivo: row.positivo.percentualeNumero,
          PercentualeImportoPositivo: row.positivo.percentualeImporto,
          NumeroTotale: row.totaleNumero,
          ImportoTotale: row.totaleImporto,
        })), 'SintesiSuccesso')
        filenamePrefix = isProcessoOffertaPercentualeSuccessoRccPage
          ? 'ProcessoOfferta_PercentualeSuccessoRCC'
          : 'ProcessoOfferta_PercentualeSuccessoBU'
        break
      }
      case 'processo-offerta-incidenza-rcc':
      case 'processo-offerta-incidenza-bu': {
        appendSheet(processoOffertaIncidenzaRows.map((row) => ({
          Anno: row.anno,
          Aggregazione: row.aggregazione,
          Numero: row.numero,
          ImportoPrevedibile: row.importoPrevedibile,
          TotaleAnno: row.totaleAnno,
          PercentualeSuAnno: row.percentualeSuAnno,
        })), 'Incidenza')
        appendSheet(processoOffertaIncidenzaTotaliPerAnno.map((row) => ({
          Anno: row.anno,
          Numero: row.numero,
          ImportoPrevedibile: row.importoPrevedibile,
          TotaleAnno: row.totaleAnno,
          PercentualeSuAnno: row.percentualeSuAnno,
        })), 'TotaliPerAnno')
        filenamePrefix = isProcessoOffertaIncidenzaRccPage
          ? 'ProcessoOfferta_IncidenzaRCC'
          : 'ProcessoOfferta_IncidenzaBU'
        break
      }
      default: {
        setStatusMessage('Export non disponibile per la pagina corrente.')
        return
      }
    }

    const now = new Date()
    const timestamp = [
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
      '_',
      now.getHours().toString().padStart(2, '0'),
      now.getMinutes().toString().padStart(2, '0'),
      now.getSeconds().toString().padStart(2, '0'),
    ].join('')
    const filename = `Produzione_${filenamePrefix}_${timestamp}.xlsx`

    XLSX.writeFile(workbook, filename)
    setStatusMessage(`Export Excel completato: ${filename}`)
  }

  const exportDettaglioExcel = () => {
    if (!detailData || !detailCommessa.trim()) {
      setStatusMessage('Nessun dettaglio commessa disponibile da esportare in Excel.')
      return
    }

    const workbook = XLSX.utils.book_new()
    const appendSheet = (rows: Record<string, unknown>[], sheetName: string, cols?: Array<{ wch: number }>) => {
      const safeRows = rows.length > 0 ? rows : [{ Info: 'Nessun dato disponibile' }]
      const worksheet = XLSX.utils.json_to_sheet(safeRows)
      if (cols && cols.length > 0) {
        worksheet['!cols'] = cols
      }
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    }

    if (detailAnagrafica) {
      appendSheet([
        {
          Commessa: detailAnagrafica.commessa,
          Descrizione: detailAnagrafica.descrizioneCommessa,
          Tipologia: detailAnagrafica.tipologiaCommessa,
          Stato: detailAnagrafica.stato,
          Macrotipologia: detailAnagrafica.macroTipologia,
          Prodotto: detailAnagrafica.prodotto,
          Controparte: detailAnagrafica.controparte,
          BusinessUnit: detailAnagrafica.businessUnit,
          RCC: detailAnagrafica.rcc,
          PM: detailAnagrafica.pm,
        },
      ], 'Anagrafica')
    }

    appendSheet(
      detailSintesiRows.map((row) => ({
        Anno: row.anno,
        Scenario: row.scenario,
        Utile: row.utileSpecifico,
        OreLavorate: row.oreLavorate,
        CostoPersonale: row.costoPersonale,
        Ricavi: row.ricavi,
        Costi: row.costi,
      })),
      'ConsuntivoStorico',
    )

    appendSheet(
      detailVenditeSorted.map((row) => ({
        Data: formatDate(row.dataMovimento),
        Importo: row.importo,
        Documento: row.numeroDocumento,
        Descrizione: row.descrizione,
        Provenienza: row.provenienza,
        Temporale: row.statoTemporale,
      })),
      'Vendite',
    )

    appendSheet(
      detailAcquistiSorted.map((row) => ({
        Data: formatDate(row.dataMovimento),
        Importo: row.importo,
        Documento: row.numeroDocumento,
        Descrizione: row.descrizione,
        Controparte: row.controparte,
        Provenienza: row.provenienza,
        Temporale: row.statoTemporale,
      })),
      'Acquisti',
    )

    appendSheet(
      detailRequisitiOreRows.map((row) => ({
        IdRequisito: row.idRequisito,
        Requisito: row.requisito,
        OrePreviste: row.orePreviste,
        OreSpese: row.oreSpese,
        OreRestanti: row.oreRestanti,
        PercentualeAvanzamento: row.percentualeAvanzamento,
      })),
      'RequisitiOre',
    )

    appendSheet(
      detailRequisitiOreRisorseRows.map((row) => ({
        IdRequisito: row.idRequisito,
        Requisito: row.requisito,
        IdRisorsa: row.idRisorsa,
        NomeRisorsa: row.nomeRisorsa,
        OrePreviste: row.orePreviste,
        OreSpese: row.oreSpese,
        OreRestanti: row.oreRestanti,
        PercentualeAvanzamento: row.percentualeAvanzamento,
      })),
      'RequisitiRisorse',
    )

    const now = new Date()
    const timestamp = [
      now.getFullYear().toString(),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getDate().toString().padStart(2, '0'),
      '_',
      now.getHours().toString().padStart(2, '0'),
      now.getMinutes().toString().padStart(2, '0'),
      now.getSeconds().toString().padStart(2, '0'),
    ].join('')
    const filename = `Produzione_Dettaglio_${detailCommessa.trim()}_${timestamp}.xlsx`

    XLSX.writeFile(workbook, filename)
    setStatusMessage(`Export Excel completato: ${filename}`)
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand-area">
          <div className="brand">Produzione</div>
          <p className="brand-subtitle">SSO centralizzato con Auth</p>
        </div>

        <nav className="menu main-nav" aria-label="Menu applicativo">
          {canAccessAnalisiCommesseMenu && (
            <div className={`menu-dropdown ${openMenu === 'sintesi' ? 'is-open' : ''}`}>
              <button
                type="button"
                className="menu-trigger"
                onClick={() => toggleMenu('sintesi')}
                aria-expanded={openMenu === 'sintesi'}
              >
                Analisi Commesse
              </button>
              <div className="menu-dropdown-panel">
                <button type="button" className="menu-action" onClick={activateSintesiPage}>
                  Commesse
                </button>
                <button type="button" className="menu-action" onClick={activateProdottiPage}>
                  Prodotti
                </button>
                <button type="button" className="menu-action" onClick={activateCommesseAndamentoMensilePage}>
                  Andamento Mensile
                </button>
                <button type="button" className="menu-action" onClick={activateCommesseDatiAnnualiAggregatiPage}>
                  Dati Annuali Aggregati
                </button>
                {canAccessPrevisioniUtileMensileRccPage && (
                  <button type="button" className="menu-action" onClick={activatePrevisioniUtileMensileRccPage}>
                    Utile Mensile RCC
                  </button>
                )}
                {canAccessPrevisioniUtileMensileBuPage && (
                  <button type="button" className="menu-action" onClick={activatePrevisioniUtileMensileBuPage}>
                    Utile Mensile BU
                  </button>
                )}
              </div>
            </div>
          )}
          {canAccessRisultatiRisorseMenu && (
            <div className={`menu-dropdown ${openMenu === 'risorse' ? 'is-open' : ''}`}>
              <button
                type="button"
                className="menu-trigger"
                onClick={() => toggleMenu('risorse')}
                aria-expanded={openMenu === 'risorse'}
              >
                Analisi Risorse
              </button>
              <div className="menu-dropdown-panel">
                <button type="button" className="menu-action" onClick={activateRisorseRisultatiPage}>
                  Valutazione Annuale
                </button>
                <button type="button" className="menu-action" onClick={activateRisorseRisultatiPivotPage}>
                  Pivot Annuale
                </button>
                <button type="button" className="menu-action" onClick={activateRisorseRisultatiMensilePage}>
                  Valutazione Mensile
                </button>
                <button type="button" className="menu-action" onClick={activateRisorseRisultatiMensilePivotPage}>
                  Pivot Mensile
                </button>
                <button type="button" className="menu-action" onClick={activateRisorseOuRisorsePage}>
                  Analisi OU Risorse
                </button>
                <button type="button" className="menu-action" onClick={activateRisorseOuRisorsePivotPage}>
                  Analisi OU Risorse Pivot
                </button>
                <button type="button" className="menu-action" onClick={activateRisorseOuPage}>
                  Analisi OU
                </button>
              </div>
            </div>
          )}
          {canAccessAnalisiProiezioniMenu && (
            <div className={`menu-dropdown ${openMenu === 'analisi-proiezioni' ? 'is-open' : ''}`}>
              <button
                type="button"
                className="menu-trigger"
                onClick={() => toggleMenu('analisi-proiezioni')}
                aria-expanded={openMenu === 'analisi-proiezioni'}
              >
                Analisi Proiezioni
              </button>
              <div className="menu-dropdown-panel">
                {canAccessAnalisiRccPage && (
                  <>
                    <button type="button" className="menu-action" onClick={activateAnalisiRccRisultatoMensilePage}>
                      Proiezione Mensile RCC
                    </button>
                    <button type="button" className="menu-action" onClick={activateAnalisiRccPivotFatturatoPage}>
                      Report Annuale RCC
                    </button>
                  </>
                )}
                {canAccessAnalisiBuPage && (
                  <>
                    <button type="button" className="menu-action" onClick={activateAnalisiBuRisultatoMensilePage}>
                      Proiezione Mensile BU
                    </button>
                    <button type="button" className="menu-action" onClick={activateAnalisiBuPivotFatturatoPage}>
                      Report Annuale BU
                    </button>
                  </>
                )}
                {canAccessAnalisiBurccPage && (
                  <>
                    <button type="button" className="menu-action" onClick={activateAnalisiBurccRisultatoMensilePage}>
                      Proiezione Mensile RCC-BU
                    </button>
                    <button type="button" className="menu-action" onClick={activateAnalisiBurccPivotFatturatoPage}>
                      Report Annuale RCC-BU
                    </button>
                  </>
                )}
                {canAccessAnalisiPianoFatturazionePage && (
                  <button type="button" className="menu-action" onClick={activateAnalisiPianoFatturazionePage}>
                    Piano Fatturazione
                  </button>
                )}
              </div>
            </div>
          )}
          {canAccessPrevisioniMenu && (
            <div className={`menu-dropdown ${openMenu === 'previsioni' ? 'is-open' : ''}`}>
              <button
                type="button"
                className="menu-trigger"
                onClick={() => toggleMenu('previsioni')}
                aria-expanded={openMenu === 'previsioni'}
              >
                Previsioni
              </button>
              <div className="menu-dropdown-panel">
                {canAccessPrevisioniFunnelRccPage && (
                  <>
                    <button type="button" className="menu-action" onClick={activatePrevisioniFunnelPage}>
                      Funnel
                    </button>
                    <button type="button" className="menu-action" onClick={activatePrevisioniReportFunnelRccPage}>
                      Report Funnel RCC
                    </button>
                  </>
                )}
                {canAccessPrevisioniFunnelBuPage && (
                  <button type="button" className="menu-action" onClick={activatePrevisioniReportFunnelBuPage}>
                    Report Funnel BU
                  </button>
                )}
              </div>
            </div>
          )}
          {canAccessProcessoOffertaPage && (
            <div className={`menu-dropdown ${openMenu === 'processo-offerta' ? 'is-open' : ''}`}>
              <button
                type="button"
                className="menu-trigger"
                onClick={() => toggleMenu('processo-offerta')}
                aria-expanded={openMenu === 'processo-offerta'}
              >
                Processo Offerta
              </button>
              <div className="menu-dropdown-panel">
                <button type="button" className="menu-action" onClick={activateProcessoOffertaOffertePage}>
                  Offerte
                </button>
                <button type="button" className="menu-action" onClick={activateProcessoOffertaSintesiRccPage}>
                  Sintesi RCC
                </button>
                <button type="button" className="menu-action" onClick={activateProcessoOffertaSintesiBuPage}>
                  Sintesi BU
                </button>
                <button type="button" className="menu-action" onClick={activateProcessoOffertaPercentualeSuccessoRccPage}>
                  Percentuale Successo RCC
                </button>
                <button type="button" className="menu-action" onClick={activateProcessoOffertaPercentualeSuccessoBuPage}>
                  Percentuale Successo BU
                </button>
                <button type="button" className="menu-action" onClick={activateProcessoOffertaIncidenzaRccPage}>
                  Incidenza RCC
                </button>
                <button type="button" className="menu-action" onClick={activateProcessoOffertaIncidenzaBuPage}>
                  Incidenza BU
                </button>
              </div>
            </div>
          )}
          {canAccessDatiContabiliMenu && (
            <div className={`menu-dropdown ${openMenu === 'dati-contabili' ? 'is-open' : ''}`}>
              <button
                type="button"
                className="menu-trigger"
                onClick={() => toggleMenu('dati-contabili')}
                aria-expanded={openMenu === 'dati-contabili'}
              >
                Dati Contabili
              </button>
              <div className="menu-dropdown-panel">
                <button type="button" className="menu-action" onClick={activateDatiContabiliVenditaPage}>
                  Vendite
                </button>
                <button type="button" className="menu-action" onClick={activateDatiContabiliAcquistiPage}>
                  Acquisti
                </button>
              </div>
            </div>
          )}
        </nav>

        <div className="top-actions">
          {profiles.length > 0 && (
            <label className="context-switcher" htmlFor="context-switcher-profile">
              <span>Profilo</span>
              <select
                id="context-switcher-profile"
                value={currentProfile}
                onChange={(event) => {
                  setSelectedProfile(event.target.value)
                }}
              >
                {profiles.map((profile) => (
                  <option key={profile} value={profile}>
                    {profile}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className={`status-badge ${apiHealth === 'OK' ? 'ok' : 'ko'}`}>
            API: {apiHealth}
          </div>

          {user && (
            <div className={`menu-dropdown menu-dropdown-right ${openMenu === 'user' ? 'is-open' : ''}`}>
              <button
                type="button"
                className="menu-trigger user-menu-trigger"
                onClick={() => toggleMenu('user')}
                aria-expanded={openMenu === 'user'}
              >
                <strong>{user.authenticatedUsername || user.username}</strong>
                <span>{isImpersonating ? 'impersona' : 'login'}</span>
              </button>
              <div className="menu-dropdown-panel">
                <button type="button" className="menu-action" onClick={handleOpenInfo}>
                  Info
                </button>
                <button type="button" className="menu-action" onClick={handleOpenAppInfo}>
                  Info applicazione
                </button>
                {canImpersonate && (
                  <button type="button" className="menu-action" onClick={handleOpenImpersonation}>
                    Impersonifica
                  </button>
                )}
                {isImpersonating && (
                  <button
                    type="button"
                    className="menu-action"
                    onClick={() => void stopImpersonation()}
                    disabled={sessionLoading}
                  >
                    {sessionLoading ? 'Attendi...' : 'Termina impersonificazione'}
                  </button>
                )}
                <button type="button" className="menu-action" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className={`content ${activePage === 'none' ? 'content-empty' : ''}`}>
        {activePage === 'none' && (
          <span className="sr-only" aria-live="polite">{statusMessageVisible}</span>
        )}

        {(activePage === 'commesse-sintesi' || activePage === 'prodotti-sintesi' || activePage === 'dati-contabili-vendita' || activePage === 'dati-contabili-acquisti') && (
          <section className="panel sintesi-page">
            <header className="panel-header">
              <h2>{sintesiTitle}</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            <section className="panel sintesi-filter-panel">
              <form
                className={`sintesi-form ${sintesiLoadingFilters ? 'is-filter-loading' : ''}`}
                onSubmit={handleSintesiSubmit}
                aria-busy={sintesiLoadingFilters}
              >
                {(!isSintesiFiltersCollapsible || !sintesiFiltersCollapsed) && (
                <div className="sintesi-filters-grid">
                  <div className="sintesi-field sintesi-field-anni">
                    <div className="sintesi-field-header-row">
                      <label htmlFor="sintesi-anni">{isDatiContabiliPage ? 'Anni Fattura' : 'Anni'}</label>
                      {!isDatiContabiliPage && (
                        <label htmlFor="sintesi-aggrega" className="checkbox-label checkbox-label-inline">
                          <input
                            id="sintesi-aggrega"
                            type="checkbox"
                            checked={isAggregatedMode}
                            onChange={(event) => setSintesiMode(event.target.checked ? 'aggregato' : 'dettaglio')}
                          />
                          Aggrega
                        </label>
                      )}
                    </div>
                    <select
                      id="sintesi-anni"
                      multiple
                      size={2}
                      value={sintesiFiltersForm.anni}
                      disabled={sintesiLoadingFilters}
                      onChange={(event) => setSintesiFiltersForm((current) => ({
                        ...current,
                        anni: Array.from(event.target.selectedOptions).map((option) => option.value),
                      }))}
                    >
                      {annoOptions.map((option) => (
                        <option key={`sintesi-anno-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sintesi-field">
                    <label htmlFor="sintesi-commessa-search">Ricerca Commessa</label>
                    <div className="commessa-inline-controls">
                      <input
                        id="sintesi-commessa-search"
                        value={commessaSearch}
                        onChange={(event) => setCommessaSearch(event.target.value)}
                        placeholder="Cerca..."
                        disabled={sintesiLoadingFilters}
                      />
                      <select
                        id="sintesi-commessa"
                        value={sintesiFiltersForm.commessa}
                        disabled={sintesiLoadingFilters}
                        onChange={(event) => setSintesiFiltersForm((current) => ({
                          ...current,
                          commessa: event.target.value,
                        }))}
                      >
                        <option value="">Tutte</option>
                        {commessaOptions.map((option) => (
                          <option key={`sintesi-commessa-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {sintesiSelects.map((selectField) => (
                    <div
                      key={selectField.id}
                      className={[
                        'sintesi-field',
                        selectField.id === 'sintesi-stato' ? 'sintesi-field-stato' : '',
                        selectField.id === 'sintesi-business-unit' ? 'sintesi-field-business-unit' : '',
                        selectField.id === 'sintesi-controparte' ? 'sintesi-field-controparte' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <label htmlFor={selectField.id}>{selectField.label}</label>
                      <select
                        id={selectField.id}
                        value={sintesiFiltersForm[selectField.key]}
                        disabled={sintesiLoadingFilters}
                        onChange={(event) => setSintesiFiltersForm((current) => ({
                          ...current,
                          [selectField.key]: event.target.value,
                        }))}
                      >
                        <option value="">Tutti</option>
                        {selectField.options.map((option) => (
                          <option key={`${selectField.id}-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}

                  {isDatiContabiliPage && (
                    <div className="sintesi-field">
                      <label htmlFor="sintesi-provenienza">Provenienza</label>
                      <select
                        id="sintesi-provenienza"
                        value={sintesiFiltersForm.provenienza}
                        disabled={sintesiLoadingFilters}
                        onChange={(event) => setSintesiFiltersForm((current) => ({
                          ...current,
                          provenienza: event.target.value,
                        }))}
                      >
                        <option value="">Tutte</option>
                        {datiContabiliProvenienzaOptions.map((option) => (
                          <option key={`sintesi-provenienza-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {isDatiContabiliPage && (
                    <div className="sintesi-field sintesi-field-checkbox">
                      <label htmlFor="sintesi-solo-scadute" className="checkbox-label checkbox-label-inline">
                        <input
                          id="sintesi-solo-scadute"
                          type="checkbox"
                          checked={sintesiFiltersForm.soloScadute}
                          onChange={(event) => setSintesiFiltersForm((current) => ({
                            ...current,
                            soloScadute: event.target.checked,
                          }))}
                        />
                        Solo scadute
                      </label>
                    </div>
                  )}

                  {!isProdottiSintesiPage && !isDatiContabiliPage && (
                    <div className="sintesi-field sintesi-field-checkbox sintesi-field-escludi-prodotti">
                      <label htmlFor="sintesi-escludi-prodotti" className="checkbox-label checkbox-label-inline">
                        <input
                          id="sintesi-escludi-prodotti"
                          type="checkbox"
                          checked={sintesiFiltersForm.escludiProdotti}
                          onChange={(event) => setSintesiFiltersForm((current) => ({
                            ...current,
                            escludiProdotti: event.target.checked,
                          }))}
                        />
                        Escludi prodotti
                      </label>
                    </div>
                  )}
                </div>
                )}

                <div className="inline-actions">
                  <button
                    type="submit"
                    disabled={(isDatiContabiliPage ? datiContabiliLoading : sintesiLoadingData) || sintesiLoadingFilters || sessionLoading}
                  >
                    {(isDatiContabiliPage ? datiContabiliLoading : sintesiLoadingData) ? 'Ricerca in corso...' : 'Cerca'}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={refreshSintesiFilters}
                    disabled={sintesiLoadingFilters || sessionLoading}
                  >
                    {sintesiLoadingFilters ? 'Aggiorno...' : 'Aggiorna Filtri'}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={resetSintesi}
                    disabled={(isDatiContabiliPage ? datiContabiliLoading : sintesiLoadingData) || sintesiLoadingFilters || sessionLoading}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={exportSintesiExcel}
                    disabled={(isDatiContabiliPage ? datiContabiliLoading : sintesiLoadingData) || sintesiExportRowsCount === 0}
                  >
                    Export Excel
                  </button>
                  {isProdottiSintesiPage && !isDatiContabiliPage && (
                    <>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={expandAllProducts}
                        disabled={sintesiLoadingData || !hasCollapsedProducts}
                      >
                        Espandi tutto
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={collapseAllProducts}
                        disabled={sintesiLoadingData || !hasProductGroups || areAllProductsCollapsed}
                      >
                        Riduci tutto
                      </button>
                    </>
                  )}
                  {isSintesiFiltersCollapsible && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setSintesiFiltersCollapsed((current) => !current)}
                    >
                      {sintesiFiltersCollapsed ? 'Mostra filtri' : 'Nascondi filtri'}
                    </button>
                  )}
                  <span className="sintesi-inline-message" role="status" aria-live="polite" aria-atomic="true">
                    {sintesiLoadingFilters
                      ? `Aggiornamento filtri in corso. ${sintesiFilterLoadingDetail || 'Attendere...'}`
                      : statusMessageVisible}
                  </span>
                  <span className="status-badge neutral sintesi-inline-count-badge">
                    {isDatiContabiliPage ? datiContabiliCountLabel : sintesiCountLabel}
                  </span>
                </div>
              </form>
            </section>

            <section className="panel sintesi-data-panel">
              {isDatiContabiliVenditaPage ? (
                <>
                  {!datiContabiliVenditaSearched && (
                    <p className="empty-state">
                      Nessun dato visualizzato. Imposta i filtri e premi Cerca.
                    </p>
                  )}

                  {datiContabiliVenditaSearched && datiContabiliVenditaSortedRows.length === 0 && (
                    <p className="empty-state">
                      Nessuna vendita trovata con i filtri correnti.
                    </p>
                  )}

                  {datiContabiliVenditaSortedRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main sintesi-results-wrap">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno Fattura</th>
                            <th>Data</th>
                            <th>Commessa</th>
                            <th>Descrizione Commessa</th>
                            <th>Tipologia</th>
                            <th>Stato</th>
                            <th>Macrotipologia</th>
                            <th>Controparte</th>
                            <th>Business Unit</th>
                            <th>RCC</th>
                            <th>PM</th>
                            <th>Numero</th>
                            <th>Descrizione Movimento</th>
                            <th>Controparte Movimento</th>
                            <th>Provenienza</th>
                            <th>Temporale</th>
                            <th>Scaduta</th>
                            <th className="num">Fatturato</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Ricavo Ipotetico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datiContabiliVenditaSortedRows.map((row, index) => (
                            <tr key={`vendita-${row.commessa}-${row.numeroDocumento}-${index}`}>
                              <td>{row.annoFattura ?? ''}</td>
                              <td>{formatDate(row.dataMovimento)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="inline-link-button"
                                  onClick={() => openCommessaDetail(row.commessa)}
                                  title={`Apri dettaglio commessa ${row.commessa}`}
                                >
                                  {row.commessa}
                                </button>
                              </td>
                              <td>{row.descrizioneCommessa}</td>
                              <td>{row.tipologiaCommessa}</td>
                              <td>{row.statoCommessa}</td>
                              <td>{row.macroTipologia}</td>
                              <td>{row.controparteCommessa}</td>
                              <td>{row.businessUnit}</td>
                              <td>{row.rcc}</td>
                              <td>{row.pm}</td>
                              <td>{row.numeroDocumento}</td>
                              <td>{row.descrizioneMovimento}</td>
                              <td>{row.controparteMovimento}</td>
                              <td>{row.provenienza}</td>
                              <td>{row.statoTemporale}</td>
                              <td>
                                <span className={`status-badge ${row.isScaduta ? 'ko' : 'neutral'}`}>
                                  {row.isScaduta ? 'Si' : 'No'}
                                </span>
                              </td>
                              <td className={`num ${row.fatturato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturato)}</td>
                              <td className={`num ${row.fatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturo)}</td>
                              <td className={`num ${row.ricavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavoIpotetico)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : isDatiContabiliAcquistiPage ? (
                <>
                  {!datiContabiliAcquistoSearched && (
                    <p className="empty-state">
                      Nessun dato visualizzato. Imposta i filtri e premi Cerca.
                    </p>
                  )}

                  {datiContabiliAcquistoSearched && datiContabiliAcquistoSortedRows.length === 0 && (
                    <p className="empty-state">
                      Nessun acquisto trovato con i filtri correnti.
                    </p>
                  )}

                  {datiContabiliAcquistoSortedRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main sintesi-results-wrap">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno Fattura</th>
                            <th>Data Documento</th>
                            <th>Commessa</th>
                            <th>Descrizione Commessa</th>
                            <th>Tipologia</th>
                            <th>Stato</th>
                            <th>Macrotipologia</th>
                            <th>Controparte</th>
                            <th>Business Unit</th>
                            <th>RCC</th>
                            <th>PM</th>
                            <th>Codice SocietÃ </th>
                            <th>Descrizione Fattura</th>
                            <th>Controparte Movimento</th>
                            <th>Provenienza</th>
                            <th>Temporale</th>
                            <th>Scaduta</th>
                            <th className="num">Importo Complessivo</th>
                            <th className="num">Importo ContabilitÃ </th>
                          </tr>
                        </thead>
                        <tbody>
                          {datiContabiliAcquistoSortedRows.map((row, index) => (
                            <tr key={`acquisto-${row.commessa}-${row.codiceSocieta}-${index}`}>
                              <td>{row.annoFattura ?? ''}</td>
                              <td>{formatDate(row.dataDocumento)}</td>
                              <td>
                                <button
                                  type="button"
                                  className="inline-link-button"
                                  onClick={() => openCommessaDetail(row.commessa)}
                                  title={`Apri dettaglio commessa ${row.commessa}`}
                                >
                                  {row.commessa}
                                </button>
                              </td>
                              <td>{row.descrizioneCommessa}</td>
                              <td>{row.tipologiaCommessa}</td>
                              <td>{row.statoCommessa}</td>
                              <td>{row.macroTipologia}</td>
                              <td>{row.controparteCommessa}</td>
                              <td>{row.businessUnit}</td>
                              <td>{row.rcc}</td>
                              <td>{row.pm}</td>
                              <td>{row.codiceSocieta}</td>
                              <td>{row.descrizioneFattura}</td>
                              <td>{row.controparteMovimento}</td>
                              <td>{row.provenienza}</td>
                              <td>{row.statoTemporale}</td>
                              <td>
                                <span className={`status-badge ${row.isScaduta ? 'ko' : 'neutral'}`}>
                                  {row.isScaduta ? 'Si' : 'No'}
                                </span>
                              </td>
                              <td className={`num ${row.importoComplessivo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoComplessivo)}</td>
                              <td className={`num ${row.importoContabilitaDettaglio < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoContabilitaDettaglio)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
              {!sintesiSearched && (
                <p className="empty-state">
                  Nessun dato visualizzato. Imposta i filtri e premi Cerca.
                </p>
              )}

              {sintesiSearched && sortedRows.length === 0 && (
                <p className="empty-state">
                  Nessun dato trovato con i filtri correnti.
                </p>
              )}

              {sortedRows.length > 0 && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main sintesi-results-wrap">
                  <table className="bonifici-table">
                    <thead>
                      <tr>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('anno')}>
                            Anno <span className="sort-indicator">{sortIndicator('anno')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('commessa')}>
                            Commessa <span className="sort-indicator">{sortIndicator('commessa')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('descrizioneCommessa')}>
                            Descrizione <span className="sort-indicator">{sortIndicator('descrizioneCommessa')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('tipologiaCommessa')}>
                            Tipologia <span className="sort-indicator">{sortIndicator('tipologiaCommessa')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('stato')}>
                            Stato <span className="sort-indicator">{sortIndicator('stato')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('macroTipologia')}>
                            Macrotipologia <span className="sort-indicator">{sortIndicator('macroTipologia')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort(productOrCounterpartColumn)}>
                            {productOrCounterpartLabel} <span className="sort-indicator">{sortIndicator(productOrCounterpartColumn)}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('businessUnit')}>
                            Business Unit <span className="sort-indicator">{sortIndicator('businessUnit')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('rcc')}>
                            RCC <span className="sort-indicator">{sortIndicator('rcc')}</span>
                          </button>
                        </th>
                        <th>
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('pm')}>
                            PM <span className="sort-indicator">{sortIndicator('pm')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('oreLavorate')}>
                            Ore Lavorate <span className="sort-indicator">{sortIndicator('oreLavorate')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('costoPersonale')}>
                            Costo Personale <span className="sort-indicator">{sortIndicator('costoPersonale')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('ricavi')}>
                            Ricavi <span className="sort-indicator">{sortIndicator('ricavi')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('costi')}>
                            Costi <span className="sort-indicator">{sortIndicator('costi')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('utileSpecifico')}>
                            Utile Specifico <span className="sort-indicator">{sortIndicator('utileSpecifico')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('ricaviFuturi')}>
                            Ricavi Futuri <span className="sort-indicator">{sortIndicator('ricaviFuturi')}</span>
                          </button>
                        </th>
                        <th className="num">
                          <button type="button" className="sort-header-btn sort-header-btn-num" onClick={() => toggleSort('costiFuturi')}>
                            Costi Futuri <span className="sort-indicator">{sortIndicator('costiFuturi')}</span>
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sintesiTableRows.map((tableRow) => {
                        if (tableRow.kind === 'prodotto-summary') {
                          const row = tableRow.row
                          return (
                            <tr
                              key={tableRow.key}
                              className={`table-group-summary-row ${tableRow.isCollapsed ? 'is-collapsed' : ''}`}
                            >
                              <td colSpan={10} className="table-group-summary-label">
                                <div className="table-group-summary-label-content">
                                  <button
                                    type="button"
                                    className="group-toggle-button"
                                    onClick={() => toggleProductCollapse(tableRow.productKey)}
                                    aria-expanded={!tableRow.isCollapsed}
                                    title={tableRow.isCollapsed ? `Espandi prodotto ${row.prodotto}` : `Riduci prodotto ${row.prodotto}`}
                                  >
                                    {tableRow.isCollapsed ? '+' : '-'}
                                  </button>
                                  <span>Prodotto: {row.prodotto}</span>
                                  <span className="table-group-summary-count">({tableRow.commesseCount} commesse)</span>
                                </div>
                              </td>
                              <td className="num">{formatNumber(row.oreLavorate)}</td>
                              <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                              <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                              <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                              <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.utileSpecifico)}</td>
                              <td className={`num ${row.ricaviFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricaviFuturi)}</td>
                              <td className={`num ${row.costiFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costiFuturi)}</td>
                            </tr>
                          )
                        }

                        const row = tableRow.row
                        return (
                          <tr key={tableRow.key}>
                            <td>{row.anno ?? ''}</td>
                            <td>
                              <button
                                type="button"
                                className="inline-link-button"
                                onClick={() => openCommessaDetail(row.commessa)}
                                title={`Apri dettaglio commessa ${row.commessa}`}
                              >
                                {row.commessa}
                              </button>
                            </td>
                            <td>{row.descrizioneCommessa}</td>
                            <td>{row.tipologiaCommessa}</td>
                            <td>{row.stato}</td>
                            <td>{row.macroTipologia}</td>
                            <td>{isProdottiSintesiPage ? row.prodotto : row.controparte}</td>
                            <td>{row.businessUnit}</td>
                            <td>{row.rcc}</td>
                            <td>{row.pm}</td>
                            <td className="num">{formatNumber(row.oreLavorate)}</td>
                            <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                            <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                            <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                            <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                              {formatNumber(row.utileSpecifico)}
                            </td>
                            <td className={`num ${row.ricaviFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricaviFuturi)}</td>
                            <td className={`num ${row.costiFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costiFuturi)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="table-totals-row">
                        <td colSpan={10} className="table-totals-label">Totale</td>
                        <td className="num">{formatNumber(totals.oreLavorate)}</td>
                        <td className={`num ${totals.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.costoPersonale)}</td>
                        <td className={`num ${totals.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.ricavi)}</td>
                        <td className={`num ${totals.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.costi)}</td>
                        <td className={`num ${totals.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                          {formatNumber(totals.utileSpecifico)}
                        </td>
                        <td className={`num ${totals.ricaviFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.ricaviFuturi)}</td>
                        <td className={`num ${totals.costiFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(totals.costiFuturi)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
                </>
              )}
            </section>
          </section>
        )}

        {activePage === 'commesse-andamento-mensile' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Commesse - Andamento Mensile</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            <section className="panel sintesi-filter-panel">
              <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                <label className="analisi-rcc-year-field" htmlFor="commesse-andamento-mensile-anni">
                  <span>Anni</span>
                  <select
                    id="commesse-andamento-mensile-anni"
                    multiple
                    size={4}
                    value={commesseAndamentoMensileAnni}
                    onChange={(event) => setCommesseAndamentoMensileAnni(
                      Array.from(event.target.selectedOptions).map((option) => option.value),
                    )}
                  >
                    {commesseAndamentoMensileAnnoOptions.map((year) => (
                      <option key={`commesse-andamento-anno-${year}`} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="analisi-rcc-year-field" htmlFor="commesse-andamento-mensile-mese">
                  <span>Mese</span>
                  <select
                    id="commesse-andamento-mensile-mese"
                    value={commesseAndamentoMensileMese}
                    onChange={(event) => setCommesseAndamentoMensileMese(event.target.value)}
                  >
                    <option value="">Tutti</option>
                    {commesseAndamentoMensileMeseOptions.map((month) => (
                      <option key={`commesse-andamento-mese-${month}`} value={month.toString()}>
                        {formatReferenceMonthLabel(month)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="analisi-rcc-year-field" htmlFor="commesse-andamento-mensile-tipologia">
                  <span>Tipologia Commessa</span>
                  <select
                    id="commesse-andamento-mensile-tipologia"
                    value={commesseAndamentoMensileTipologia}
                    onChange={(event) => setCommesseAndamentoMensileTipologia(event.target.value)}
                  >
                    <option value="">Tutte</option>
                    {commesseAndamentoMensileTipologiaOptions.map((value) => (
                      <option key={`commesse-andamento-tipologia-${value}`} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="analisi-rcc-year-field" htmlFor="commesse-andamento-mensile-bu">
                  <span>Business Unit</span>
                  <select
                    id="commesse-andamento-mensile-bu"
                    value={commesseAndamentoMensileBusinessUnit}
                    onChange={(event) => setCommesseAndamentoMensileBusinessUnit(event.target.value)}
                  >
                    <option value="">Tutte</option>
                    {commesseAndamentoMensileBusinessUnitOptions.map((value) => (
                      <option key={`commesse-andamento-bu-${value}`} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="analisi-rcc-year-field" htmlFor="commesse-andamento-mensile-rcc">
                  <span>RCC</span>
                  <select
                    id="commesse-andamento-mensile-rcc"
                    value={commesseAndamentoMensileRcc}
                    onChange={(event) => setCommesseAndamentoMensileRcc(event.target.value)}
                  >
                    <option value="">Tutti</option>
                    {commesseAndamentoMensileRccSelectItems.map((option) => (
                      <option key={`commesse-andamento-rcc-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="analisi-rcc-year-field" htmlFor="commesse-andamento-mensile-pm">
                  <span>PM</span>
                  <select
                    id="commesse-andamento-mensile-pm"
                    value={commesseAndamentoMensilePm}
                    onChange={(event) => setCommesseAndamentoMensilePm(event.target.value)}
                  >
                    <option value="">Tutti</option>
                    {commesseAndamentoMensilePmSelectItems.map((option) => (
                      <option key={`commesse-andamento-pm-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="inline-actions analisi-inline-actions">
                  <button type="submit" disabled={analisiRccLoading}>
                    {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={exportAnalisiExcel}
                    disabled={analisiRccLoading || !canExportAnalisiPage}
                  >
                    Export Excel
                  </button>
                  {isAnalisiSearchCollapsible && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={toggleAnalisiSearchCollapsed}
                    >
                      {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                    </button>
                  )}
                  <span className="status-badge neutral sintesi-inline-count-badge">
                    {analisiPageCountLabel}
                  </span>
                </div>
              </form>
              <div className="sintesi-toolbar-row">
                <p className="sintesi-toolbar-message">
                  {commesseAndamentoMensileData
                    ? `Andamento mensile caricato (${commesseAndamentoMensileAnni.join(', ') || '-'}).`
                    : statusMessageVisible}
                </p>
                <span className="status-badge neutral">
                  {commesseAndamentoMensileRows.length} righe
                </span>
              </div>
            </section>

            <section className="panel analisi-rcc-grid-card">
              <header className="panel-header">
                <h3>AnalisiCommesseMensili</h3>
              </header>

              {commesseAndamentoMensileRows.length === 0 && !analisiRccLoading && (
                <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
              )}

              {commesseAndamentoMensileRows.length > 0 && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
                  <table className="bonifici-table">
                    <thead>
                      <tr>
                        <th>Anno</th>
                        <th>Mese</th>
                        <th>Commessa</th>
                        <th>Descrizione</th>
                        <th>Tipologia</th>
                        <th>Stato</th>
                        <th>Macrotipologia</th>
                        <th>Prodotto</th>
                        <th>Controparte</th>
                        <th>BU</th>
                        <th>RCC</th>
                        <th>PM</th>
                        <th>Produzione</th>
                        <th className="num">Ore Lavorate</th>
                        <th className="num">Costo Personale</th>
                        <th className="num">Ricavi</th>
                        <th className="num">Costi</th>
                        <th className="num">Costo Generale Ribaltato</th>
                        <th className="num">Utile Specifico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commesseAndamentoMensileRows.map((row, index) => (
                        <tr key={`commesse-andamento-row-${row.annoCompetenza}-${row.meseCompetenza}-${row.commessa}-${index}`}>
                          <td>{row.annoCompetenza}</td>
                          <td>{row.meseCompetenza.toString().padStart(2, '0')}</td>
                          <td>
                            {row.commessa.trim()
                              ? (
                                <button
                                  type="button"
                                  className="inline-link-button"
                                  onClick={() => openCommessaDetail(row.commessa)}
                                  title={`Apri dettaglio commessa ${row.commessa}`}
                                >
                                  {row.commessa}
                                </button>
                              )
                              : ''}
                          </td>
                          <td>{row.descrizioneCommessa}</td>
                          <td>{row.tipologiaCommessa}</td>
                          <td>{row.stato}</td>
                          <td>{row.macroTipologia}</td>
                          <td>{row.prodotto}</td>
                          <td>{row.controparte}</td>
                          <td>{row.businessUnit}</td>
                          <td>{row.rcc}</td>
                          <td>{row.pm}</td>
                          <td>{row.produzione ? 'Si' : 'No'}</td>
                          <td className="num">{formatNumber(row.oreLavorate)}</td>
                          <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                          <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                          <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                          <td className={`num ${row.costoGeneraleRibaltato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoGeneraleRibaltato)}</td>
                          <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.utileSpecifico)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-totals-row">
                        <td colSpan={13} className="table-totals-label">Totale</td>
                        <td className="num">{formatNumber(commesseAndamentoMensileTotals.oreLavorate)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.costoPersonale)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.ricavi)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.costi)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.costoGeneraleRibaltato < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.costoGeneraleRibaltato)}</td>
                        <td className={`num ${commesseAndamentoMensileTotals.utileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(commesseAndamentoMensileTotals.utileSpecifico)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          </section>
        )}

        {activePage === 'commesse-dati-annuali-aggregati' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Commesse - Dati Annuali Aggregati</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            <section className="panel sintesi-filter-panel">
              <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                {!commesseDatiAnnualiFiltersCollapsed && (
                  <>
                    <label className="analisi-rcc-year-field" htmlFor="commesse-dati-annuali-anni">
                      <span>Anni</span>
                      <select
                        id="commesse-dati-annuali-anni"
                        multiple
                        size={4}
                        value={commesseDatiAnnualiAnni}
                        onChange={(event) => setCommesseDatiAnnualiAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {commesseDatiAnnualiAnnoOptions.map((year) => (
                          <option key={`commesse-dati-annuali-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="commesse-dati-annuali-macrotipologia">
                      <span>Macrotipologia</span>
                      <select
                        id="commesse-dati-annuali-macrotipologia"
                        multiple
                        size={4}
                        value={commesseDatiAnnualiMacroTipologie}
                        onChange={(event) => setCommesseDatiAnnualiMacroTipologie(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {commesseDatiAnnualiMacroTipologiaOptions.map((option) => (
                          <option key={`commesse-dati-annuali-macro-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <div className="inline-actions">
                  <button type="submit" disabled={analisiRccLoading}>
                    {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={exportCommesseDatiAnnualiExcel}
                    disabled={analisiRccLoading || commesseDatiAnnualiPivotRows.length === 0}
                  >
                    Export Excel
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setCommesseDatiAnnualiFiltersCollapsed((current) => !current)}
                  >
                    {commesseDatiAnnualiFiltersCollapsed ? 'Mostra filtri e aggregazione' : 'Nascondi filtri e aggregazione'}
                  </button>
                  <span className="status-badge neutral sintesi-inline-count-badge">
                    {commesseDatiAnnualiPivotRows.length} righe
                  </span>
                </div>
              </form>
              <div className="sintesi-toolbar-row">
                <p className="sintesi-toolbar-message">
                  {commesseDatiAnnualiData
                    ? `Dati annuali caricati (anni: ${commesseDatiAnnualiData.anni.join(', ') || '-'}). Livelli selezionati: ${commesseDatiAnnualiSelectedFieldOptions.map((item) => item.label).join(' > ') || 'solo anno'}.`
                    : statusMessageVisible}
                </p>
              </div>
            </section>

            {!commesseDatiAnnualiFiltersCollapsed && (
            <section className="panel analisi-rcc-grid-card dati-annuali-pivot-config-panel">
              <header className="panel-header">
                <h3>Configurazione Pivot</h3>
              </header>
              <div className="dati-annuali-pivot-config-grid">
                <label className="analisi-rcc-year-field dati-annuali-pivot-listbox-field" htmlFor="commesse-dati-annuali-fields-available">
                  <span>Campi disponibili</span>
                  <select
                    id="commesse-dati-annuali-fields-available"
                    multiple
                    size={8}
                    value={commesseDatiAnnualiAvailableSelection}
                    onChange={(event) => setCommesseDatiAnnualiAvailableSelection(
                      asDatiAnnualiPivotFieldKeys(Array.from(event.target.selectedOptions).map((option) => option.value)),
                    )}
                  >
                    {commesseDatiAnnualiAvailableFieldOptions.map((option) => (
                      <option key={`commesse-dati-annuali-available-${option.key}`} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="dati-annuali-pivot-config-actions">
                  <button
                    type="button"
                    onClick={addCommesseDatiAnnualiSelectedFields}
                    disabled={commesseDatiAnnualiAvailableSelection.length === 0}
                  >
                    Aggiungi
                  </button>
                  <button
                    type="button"
                    onClick={removeCommesseDatiAnnualiSelectedFields}
                    disabled={commesseDatiAnnualiSelectedSelection.length === 0}
                  >
                    Rimuovi
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCommesseDatiAnnualiField('up')}
                    disabled={commesseDatiAnnualiSelectedSelection.length !== 1}
                  >
                    Su
                  </button>
                  <button
                    type="button"
                    onClick={() => moveCommesseDatiAnnualiField('down')}
                    disabled={commesseDatiAnnualiSelectedSelection.length !== 1}
                  >
                    Giu
                  </button>
                </div>
                <label className="analisi-rcc-year-field dati-annuali-pivot-listbox-field" htmlFor="commesse-dati-annuali-fields-selected">
                  <span>Livelli aggregazione (ordine pivot)</span>
                  <select
                    id="commesse-dati-annuali-fields-selected"
                    multiple
                    size={8}
                    value={commesseDatiAnnualiSelectedSelection}
                    onChange={(event) => setCommesseDatiAnnualiSelectedSelection(
                      asDatiAnnualiPivotFieldKeys(Array.from(event.target.selectedOptions).map((option) => option.value)),
                    )}
                  >
                    {commesseDatiAnnualiSelectedFieldOptions.map((option) => (
                      <option key={`commesse-dati-annuali-selected-${option.key}`} value={option.key}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
            )}

            <section className="panel analisi-rcc-grid-card">
              <header className="panel-header">
                <h3>Dati Annuali Aggregati (Pivot)</h3>
              </header>

              {commesseDatiAnnualiPivotRows.length === 0 && !analisiRccLoading && (
                <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
              )}

              {commesseDatiAnnualiPivotRows.length > 0 && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
                  <table className="bonifici-table">
                    <thead>
                      <tr>
                        <th>Etichette di riga</th>
                        <th className="num">Numero Commesse</th>
                        <th className="num">Ore Lavorate</th>
                        <th className="num">Costo Personale</th>
                        <th className="num">Ricavi</th>
                        <th className="num">Costi</th>
                        <th className="num">Utile Specifico</th>
                        <th className="num">Ricavi Futuri</th>
                        <th className="num">Costi Futuri</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commesseDatiAnnualiPivotRows.map((row) => (
                        <tr
                          key={row.key}
                          className={row.kind === 'totale' ? 'table-totals-row' : 'table-group-summary-row'}
                        >
                          <td className="table-group-summary-label">
                            <span className={`dati-annuali-pivot-label level-${Math.min(row.level, 6)}`}>
                              {row.label}
                            </span>
                          </td>
                          <td className="num">{row.numeroCommesse.toLocaleString('it-IT')}</td>
                          <td className="num">{formatNumber(row.oreLavorate)}</td>
                          <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                          <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                          <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                          <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.utileSpecifico)}</td>
                          <td className={`num ${row.ricaviFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricaviFuturi)}</td>
                          <td className={`num ${row.costiFuturi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costiFuturi)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
        )}

        {isRisorsePage && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>{risorseTitle}</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessRisultatiRisorseMenu && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a Risultati Risorse.
              </p>
            )}

            {canAccessRisultatiRisorseMenu && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    {!isAnalisiSearchCollapsed && (
                      <>
                        <label className="analisi-rcc-year-field" htmlFor="risorse-anni">
                          <span>{isRisorseMensilePage ? 'Anni competenza (corrente + precedente)' : 'Anni competenza'}</span>
                          <select
                            id="risorse-anni"
                            multiple
                            size={4}
                            value={risorseFiltersForm.anni}
                            disabled={risorseFormDisabled}
                            onChange={(event) => setRisorseFiltersForm((current) => ({
                              ...current,
                              anni: Array.from(event.target.selectedOptions).map((option) => option.value),
                            }))}
                          >
                            {risorseAnnoOptions.map((year) => (
                              <option key={`risorse-anno-${year}`} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="analisi-rcc-year-field" htmlFor="risorse-commessa-search">
                          <span>Ricerca Commessa</span>
                          <div className="commessa-inline-controls">
                            <input
                              id="risorse-commessa-search"
                              value={risorseCommessaSearch}
                              disabled={risorseFormDisabled}
                              onChange={(event) => setRisorseCommessaSearch(event.target.value)}
                              placeholder="Cerca commessa..."
                            />
                            <select
                              id="risorse-commessa"
                              value={risorseFiltersForm.commessa}
                              disabled={risorseFormDisabled}
                              onChange={(event) => setRisorseFiltersForm((current) => ({
                                ...current,
                                commessa: event.target.value,
                              }))}
                            >
                              <option value="">Tutte</option>
                              {risorseCommessaOptions.map((option) => (
                                <option key={`risorse-commessa-${option.value}`} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>

                        {risorseSelects.map((selectField) => (
                          <label
                            key={selectField.id}
                            className="analisi-rcc-year-field"
                            htmlFor={selectField.id}
                          >
                            <span>{selectField.label}</span>
                            <select
                              id={selectField.id}
                              value={risorseFiltersForm[selectField.key]}
                              disabled={risorseFormDisabled}
                              onChange={(event) => setRisorseFiltersForm((current) => ({
                                ...current,
                                [selectField.key]: event.target.value,
                              }))}
                            >
                              <option value="">Tutti</option>
                              {selectField.options.map((option) => (
                                <option key={`${selectField.id}-${option.value}`} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}

                        <label className="analisi-rcc-year-field" htmlFor="risorse-risorsa-search">
                          <span>Filtro Risorsa</span>
                          <input
                            id="risorse-risorsa-search"
                            value={risorseRisorsaSearch}
                            disabled={risorseFormDisabled}
                            onChange={(event) => setRisorseRisorsaSearch(event.target.value)}
                            placeholder="Cerca risorsa..."
                          />
                        </label>

                        <label className="analisi-rcc-year-field" htmlFor="risorse-id-risorsa">
                          <span>Risorsa</span>
                          <select
                            id="risorse-id-risorsa"
                            value={risorseFiltersForm.idRisorsa}
                            disabled={risorseFormDisabled}
                            onChange={(event) => setRisorseFiltersForm((current) => ({
                              ...current,
                              idRisorsa: event.target.value,
                            }))}
                          >
                            <option value="">Tutte</option>
                            {risorseRisorsaOptions.map((option) => (
                              <option key={`risorse-anagrafica-${option.value}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="checkbox-label" htmlFor="risorse-vista-costo">
                          <input
                            id="risorse-vista-costo"
                            type="checkbox"
                            checked={risorseFiltersForm.vistaCosto}
                            disabled={risorseFormDisabled}
                            onChange={(event) => setRisorseFiltersForm((current) => ({
                              ...current,
                              vistaCosto: event.target.checked,
                            }))}
                          />
                          Visualizza valori su costo
                        </label>
                      </>
                    )}

                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={risorseFormDisabled}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={refreshRisorseFilters}
                        disabled={risorseFormDisabled}
                      >
                        Aggiorna Filtri
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={resetRisorseFilters}
                        disabled={risorseFormDisabled}
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={risorseFormDisabled || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {risorseCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {risorseSearched
                        ? `Ricerca completata (${isRisorseMensilePage ? 'mensile' : 'annuale'}, ${risorseFiltersForm.vistaCosto ? 'base costo' : 'base ore'}).`
                        : statusMessageVisible}
                    </p>
                  </div>
                </section>

                {isRisorsePivotPage && !isAnalisiSearchCollapsed && (
                  <section className="panel analisi-rcc-grid-card dati-annuali-pivot-config-panel">
                    <header className="panel-header">
                      <h3>Configurazione Pivot Risorse</h3>
                    </header>
                    <div className="dati-annuali-pivot-config-grid">
                      <label className="analisi-rcc-year-field dati-annuali-pivot-listbox-field" htmlFor="risorse-pivot-fields-available">
                        <span>Campi disponibili</span>
                        <select
                          id="risorse-pivot-fields-available"
                          multiple
                          size={8}
                          value={risorsePivotAvailableSelection}
                          onChange={(event) => setRisorsePivotAvailableSelection(
                            asRisorsePivotFieldKeys(Array.from(event.target.selectedOptions).map((option) => option.value)),
                          )}
                        >
                          {risorsePivotAvailableFieldOptions.map((option) => (
                            <option key={`risorse-pivot-available-${option.key}`} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="dati-annuali-pivot-config-actions">
                        <button
                          type="button"
                          onClick={addRisorsePivotSelectedFields}
                          disabled={risorsePivotAvailableSelection.length === 0}
                        >
                          Aggiungi
                        </button>
                        <button
                          type="button"
                          onClick={removeRisorsePivotSelectedFields}
                          disabled={risorsePivotSelectedSelection.length === 0}
                        >
                          Rimuovi
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRisorsePivotField('up')}
                          disabled={risorsePivotSelectedSelection.length !== 1}
                        >
                          Su
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRisorsePivotField('down')}
                          disabled={risorsePivotSelectedSelection.length !== 1}
                        >
                          Giu
                        </button>
                      </div>
                      <label className="analisi-rcc-year-field dati-annuali-pivot-listbox-field" htmlFor="risorse-pivot-fields-selected">
                        <span>Livelli aggregazione (ordine pivot)</span>
                        <select
                          id="risorse-pivot-fields-selected"
                          multiple
                          size={8}
                          value={risorsePivotSelectedSelection}
                          onChange={(event) => setRisorsePivotSelectedSelection(
                            asRisorsePivotFieldKeys(Array.from(event.target.selectedOptions).map((option) => option.value)),
                          )}
                        >
                          {risorsePivotSelectedFieldOptions.map((option) => (
                            <option key={`risorse-pivot-selected-${option.key}`} value={option.key}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </section>
                )}

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>{isRisorsePivotPage ? 'Risultati Risorse (Pivot)' : 'Risultati Risorse'}</h3>
                  </header>

                  {!risorseSearched && !analisiRccLoading && (
                    <p className="empty-state">Imposta i filtri e premi Cerca.</p>
                  )}

                  {risorseSearched && !analisiRccLoading && (isRisorsePivotPage ? risorsePivotRows.length : risorseRowsSorted.length) === 0 && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {isRisorsePivotPage && risorsePivotRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Etichette di riga</th>
                            <th className="num">Numero Commesse</th>
                            <th className="num">Ore Totali</th>
                            <th className="num">Costo Specifico Risorsa</th>
                            <th className="num">{risorseFatturatoLabel}</th>
                            <th className="num">{risorseUtileLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {risorsePivotRows.map((row) => (
                            <tr key={row.key} className={row.kind === 'totale' ? 'table-totals-row' : 'table-group-summary-row'}>
                              <td className="table-group-summary-label">
                                <span className={`dati-annuali-pivot-label level-${Math.min(row.level, 6)}`}>
                                  {row.label}
                                </span>
                              </td>
                              <td className="num">{row.numeroCommesse.toLocaleString('it-IT')}</td>
                              <td className="num">{formatNumber(row.oreTotali)}</td>
                              <td className={`num ${row.costoSpecificoRisorsa < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoSpecificoRisorsa)}</td>
                              <td className={`num ${row.fatturato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturato)}</td>
                              <td className={`num ${row.utile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.utile)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!isRisorsePivotPage && risorseRowsSorted.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            {isRisorseMensilePage && <th>Mese</th>}
                            <th>Commessa</th>
                            <th>Descrizione</th>
                            <th>Tipologia</th>
                            <th>Stato</th>
                            <th>Macrotipologia</th>
                            <th>Controparte</th>
                            <th>Business Unit</th>
                            <th>RCC</th>
                            <th>PM</th>
                            <th>Risorsa</th>
                            <th className="num">Ore Totali</th>
                            <th className="num">Costo Specifico Risorsa</th>
                            <th className="num">{risorseFatturatoLabel}</th>
                            <th className="num">{risorseUtileLabel}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {risorseRowsSorted.map((row, index) => (
                            <tr key={`risorse-row-${row.annoCompetenza}-${row.meseCompetenza ?? 0}-${row.commessa}-${row.idRisorsa}-${index}`}>
                              <td>{row.annoCompetenza}</td>
                              {isRisorseMensilePage && <td>{row.meseCompetenza ? row.meseCompetenza.toString().padStart(2, '0') : ''}</td>}
                              <td>
                                <button
                                  type="button"
                                  className="inline-link-button"
                                  onClick={() => openCommessaDetail(row.commessa)}
                                  title={`Apri dettaglio commessa ${row.commessa}`}
                                >
                                  {row.commessa}
                                </button>
                              </td>
                              <td>{row.descrizioneCommessa}</td>
                              <td>{row.tipologiaCommessa}</td>
                              <td>{row.stato}</td>
                              <td>{row.macroTipologia}</td>
                              <td>{row.controparte}</td>
                              <td>{row.businessUnit}</td>
                              <td>{row.rcc}</td>
                              <td>{row.pm}</td>
                              <td>{normalizeRisorsaLabel(row)}</td>
                              <td className="num">{formatNumber(row.oreTotali)}</td>
                              <td className={`num ${row.costoSpecificoRisorsa < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoSpecificoRisorsa)}</td>
                              <td className={`num ${(risorseFiltersForm.vistaCosto ? row.fatturatoInBaseACosto : row.fatturatoInBaseAdOre) < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(risorseFiltersForm.vistaCosto ? row.fatturatoInBaseACosto : row.fatturatoInBaseAdOre)}
                              </td>
                              <td className={`num ${(risorseFiltersForm.vistaCosto ? row.utileInBaseACosto : row.utileInBaseAdOre) < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(risorseFiltersForm.vistaCosto ? row.utileInBaseACosto : row.utileInBaseAdOre)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="table-totals-row">
                            <td colSpan={isRisorseMensilePage ? 12 : 11} className="table-totals-label">Totale</td>
                            <td className="num">{formatNumber(risorseTotals.oreTotali)}</td>
                            <td className={`num ${risorseTotals.costoSpecificoRisorsa < 0 ? 'num-negative' : ''}`}>{formatNumber(risorseTotals.costoSpecificoRisorsa)}</td>
                            <td className={`num ${risorseTotals.fatturato < 0 ? 'num-negative' : ''}`}>{formatNumber(risorseTotals.fatturato)}</td>
                            <td className={`num ${risorseTotals.utile < 0 ? 'num-negative' : ''}`}>{formatNumber(risorseTotals.utile)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {isProcessoOffertaPage && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>{processoOffertaTitle}</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessProcessoOffertaPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a Processo Offerta.
              </p>
            )}

            {canAccessProcessoOffertaPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="processo-offerta-anni">
                      <span>Anni</span>
                      <select
                        id="processo-offerta-anni"
                        multiple
                        size={4}
                        value={processoOffertaAnni}
                        onChange={(event) => setProcessoOffertaAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {processoOffertaAnnoOptions.map((year) => (
                          <option key={`processo-offerta-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {(isProcessoOffertaPercentualeSuccessoRccPage || isProcessoOffertaPercentualeSuccessoBuPage)
                      ? (
                        <label className="analisi-rcc-year-field" htmlFor="processo-offerta-percentuale-aggregazione">
                          <span>{processoOffertaAggregazioneLabel}</span>
                          <select
                            id="processo-offerta-percentuale-aggregazione"
                            value={processoOffertaPercentualeSelectedAggregazione}
                            onChange={(event) => {
                              const nextValue = event.target.value
                              if (isProcessoOffertaPercentualeSuccessoRccPage) {
                                setProcessoOffertaPercentualeRcc(nextValue)
                              } else {
                                setProcessoOffertaPercentualeBu(nextValue)
                              }
                            }}
                          >
                            <option value="">Tutti</option>
                            {processoOffertaPercentualeAggregazioneOptions.map((value) => (
                              <option key={`processo-offerta-aggregazione-${value}`} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                      )
                      : (
                        <label className="analisi-rcc-year-field" htmlFor="processo-offerta-esiti">
                          <span>Esito</span>
                          <select
                            id="processo-offerta-esiti"
                            multiple
                            size={Math.max(3, Math.min(6, processoOffertaEsitiOptions.length || 3))}
                            value={processoOffertaEsiti}
                            onChange={(event) => setProcessoOffertaEsiti(
                              Array.from(event.target.selectedOptions).map((option) => option.value),
                            )}
                          >
                            {processoOffertaEsitiOptions.map((value) => (
                              <option key={`processo-offerta-esito-${value}`} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {processoOffertaCurrentData
                        ? `Anni ${processoOffertaCurrentData.anni.join(', ') || '-'}, ${processoOffertaVisibilityMessage}.`
                        : processoOffertaVisibilityMessage}
                    </p>
                    <span className="status-badge neutral">{processoOffertaCountLabel}</span>
                  </div>
                </section>

                {isProcessoOffertaOffertePage && (
                  <section className="panel analisi-rcc-grid-card">
                    <header className="panel-header">
                      <h3>Offerte</h3>
                    </header>
                    {processoOffertaOfferteRows.length === 0 && !analisiRccLoading && (
                      <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                    )}
                    {processoOffertaOfferteRows.length > 0 && (
                      <div className="bonifici-table-wrap bonifici-table-wrap-main">
                        <table className="bonifici-table">
                          <thead>
                            <tr>
                              <th>Anno</th>
                              <th>Data</th>
                              <th>Business Unit</th>
                              <th>RCC</th>
                              <th>Commessa</th>
                              <th>Protocollo</th>
                              <th>Tipo</th>
                              <th>Stato Documento</th>
                              <th>Esito</th>
                              <th>Esito Positivo</th>
                              <th>Oggetto</th>
                              <th>Controparte</th>
                              <th className="num">% Successo</th>
                              <th className="num">Importo Prevedibile</th>
                              <th className="num">Costo Prevedibile</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processoOffertaOfferteRows.map((row) => (
                              <tr key={`processo-offerta-offerta-${row.id}`}>
                                <td>{row.anno}</td>
                                <td>{formatDate(row.data)}</td>
                                <td>{row.businessUnit}</td>
                                <td>{row.rcc}</td>
                                <td>
                                  {row.commessa.trim()
                                    ? (
                                      <button
                                        type="button"
                                        className="inline-link-button"
                                        onClick={() => openCommessaDetail(row.commessa)}
                                        title={`Apri dettaglio commessa ${row.commessa}`}
                                      >
                                        {row.commessa}
                                      </button>
                                    )
                                    : ''}
                                </td>
                                <td>{row.protocollo}</td>
                                <td>{row.tipo}</td>
                                <td>{row.statoDocumento}</td>
                                <td>{row.esito}</td>
                                <td>{row.esitoPositivoTesto}</td>
                                <td>{row.oggetto}</td>
                                <td>{row.controparte}</td>
                                <td className="num">{formatPercentValue(row.percentualeSuccesso)}</td>
                                <td className={`num ${row.importoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoPrevedibile)}</td>
                                <td className={`num ${row.costoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPrevedibile)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="table-totals-row">
                              <td colSpan={13} className="table-totals-label">Totale</td>
                              <td className={`num ${processoOffertaOfferteTotals.importoPrevedibile < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(processoOffertaOfferteTotals.importoPrevedibile)}
                              </td>
                              <td className={`num ${processoOffertaOfferteTotals.costoPrevedibile < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(processoOffertaOfferteTotals.costoPrevedibile)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </section>
                )}

                {(isProcessoOffertaSintesiRccPage || isProcessoOffertaSintesiBuPage) && (
                  <section className="panel analisi-rcc-grid-card">
                    <header className="panel-header">
                      <h3>{processoOffertaAggregazioneLabel === 'RCC' ? 'Sintesi RCC' : 'Sintesi BU'}</h3>
                    </header>
                    {processoOffertaSintesiRows.length === 0 && !analisiRccLoading && (
                      <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                    )}
                    {processoOffertaSintesiRows.length > 0 && (
                      <div className="bonifici-table-wrap bonifici-table-wrap-main">
                        <table className="bonifici-table">
                          <thead>
                            <tr>
                              <th>Anno</th>
                              <th>{processoOffertaAggregazioneLabel}</th>
                              <th>Tipo</th>
                              <th>Esito Positivo</th>
                              <th className="num">Numero</th>
                              <th className="num">Importo Prevedibile</th>
                              <th className="num">Costo Prevedibile</th>
                              <th className="num">% Ricarico</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processoOffertaSintesiRows.map((row, index) => (
                              <tr key={`processo-offerta-sintesi-${row.anno}-${row.aggregazione}-${row.tipo}-${row.esitoPositivoTesto}-${index}`}>
                                <td>{row.anno}</td>
                                <td>{row.aggregazione}</td>
                                <td>{row.tipo}</td>
                                <td>{row.esitoPositivoTesto}</td>
                                <td className="num">{row.numero.toLocaleString('it-IT')}</td>
                                <td className={`num ${row.importoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoPrevedibile)}</td>
                                <td className={`num ${row.costoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPrevedibile)}</td>
                                <td className="num">{formatPercentValue(row.percentualeRicarico)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="table-totals-row">
                              <td colSpan={4} className="table-totals-label">Totale</td>
                              <td className="num">{processoOffertaSintesiTotals.numero.toLocaleString('it-IT')}</td>
                              <td className={`num ${processoOffertaSintesiTotals.importoPrevedibile < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(processoOffertaSintesiTotals.importoPrevedibile)}
                              </td>
                              <td className={`num ${processoOffertaSintesiTotals.costoPrevedibile < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(processoOffertaSintesiTotals.costoPrevedibile)}
                              </td>
                              <td className="num">{formatPercentValue(processoOffertaSintesiRicaricoTotale)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </section>
                )}

                {(isProcessoOffertaPercentualeSuccessoRccPage || isProcessoOffertaPercentualeSuccessoBuPage) && (
                  <>
                    <section className="panel analisi-rcc-grid-card">
                      <header className="panel-header">
                        <h3>{processoOffertaAggregazioneLabel === 'RCC' ? 'Percentuale Successo RCC' : 'Percentuale Successo BU'}</h3>
                      </header>
                      {processoOffertaSuccessoRows.length === 0 && !analisiRccLoading && (
                        <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                      )}
                    {processoOffertaSuccessoRows.length > 0 && (
                      <div className="bonifici-table-wrap bonifici-table-wrap-main">
                        <table className="bonifici-table">
                          <thead>
                            <tr>
                              <th rowSpan={2}>Anno</th>
                              <th rowSpan={2}>{processoOffertaAggregazioneLabel}</th>
                              <th colSpan={4}>Negativo</th>
                              <th colSpan={4}>Non definito</th>
                              <th colSpan={4}>Positivo</th>
                              <th colSpan={4}>Totale</th>
                            </tr>
                            <tr>
                              <th className="num">Ricavo in Offerta</th>
                              <th className="num">Costo in Offerta</th>
                              <th className="num">Margine Operativo</th>
                              <th className="num">Ricarico %</th>
                              <th className="num">Ricavo in Offerta</th>
                              <th className="num">Costo in Offerta</th>
                              <th className="num">Margine Operativo</th>
                              <th className="num">Ricarico %</th>
                              <th className="num">Ricavo in Offerta</th>
                              <th className="num">Costo in Offerta</th>
                              <th className="num">Margine Operativo</th>
                              <th className="num">Ricarico %</th>
                              <th className="num">Ricavo in Offerta</th>
                              <th className="num">Costo in Offerta</th>
                              <th className="num">Margine Operativo</th>
                              <th className="num">Ricarico % totale</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processoOffertaSuccessoRows.map((row) => (
                              <tr key={`processo-offerta-successo-${row.anno}-${row.aggregazione}`}>
                                <td>{row.anno}</td>
                                <td>{row.aggregazione}</td>
                                <td className={`num ${row.negativo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.ricavo)}</td>
                                <td className={`num ${row.negativo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.costo)}</td>
                                <td className={`num ${row.negativo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.margine)}</td>
                                <td className="num">{formatPercentValue(row.negativo.ricarico)}</td>
                                <td className={`num ${row.nonDefinito.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.ricavo)}</td>
                                <td className={`num ${row.nonDefinito.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.costo)}</td>
                                <td className={`num ${row.nonDefinito.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.margine)}</td>
                                <td className="num">{formatPercentValue(row.nonDefinito.ricarico)}</td>
                                <td className={`num ${row.positivo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.ricavo)}</td>
                                <td className={`num ${row.positivo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.costo)}</td>
                                <td className={`num ${row.positivo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.margine)}</td>
                                <td className="num">{formatPercentValue(row.positivo.ricarico)}</td>
                                <td className={`num ${row.totale.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.ricavo)}</td>
                                <td className={`num ${row.totale.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.costo)}</td>
                                <td className={`num ${row.totale.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.margine)}</td>
                                <td className="num">{formatPercentValue(row.totale.ricarico)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="table-totals-row">
                              <td colSpan={2} className="table-totals-label">Totale complessivo</td>
                              <td className={`num ${processoOffertaSuccessoTotaleNegativo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNegativo.ricavo)}</td>
                              <td className={`num ${processoOffertaSuccessoTotaleNegativo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNegativo.costo)}</td>
                              <td className={`num ${processoOffertaSuccessoTotaleNegativo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNegativo.margine)}</td>
                              <td className="num">{formatPercentValue(processoOffertaSuccessoTotaleNegativo.ricarico)}</td>
                              <td className={`num ${processoOffertaSuccessoTotaleNonDefinito.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNonDefinito.ricavo)}</td>
                              <td className={`num ${processoOffertaSuccessoTotaleNonDefinito.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNonDefinito.costo)}</td>
                              <td className={`num ${processoOffertaSuccessoTotaleNonDefinito.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotaleNonDefinito.margine)}</td>
                              <td className="num">{formatPercentValue(processoOffertaSuccessoTotaleNonDefinito.ricarico)}</td>
                              <td className={`num ${processoOffertaSuccessoTotalePositivo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotalePositivo.ricavo)}</td>
                              <td className={`num ${processoOffertaSuccessoTotalePositivo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotalePositivo.costo)}</td>
                              <td className={`num ${processoOffertaSuccessoTotalePositivo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotalePositivo.margine)}</td>
                              <td className="num">{formatPercentValue(processoOffertaSuccessoTotalePositivo.ricarico)}</td>
                              <td className={`num ${processoOffertaSuccessoTotale.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotale.ricavo)}</td>
                              <td className={`num ${processoOffertaSuccessoTotale.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotale.costo)}</td>
                              <td className={`num ${processoOffertaSuccessoTotale.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoTotale.margine)}</td>
                              <td className="num">{formatPercentValue(processoOffertaSuccessoTotale.ricarico)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </section>

                  <section className="panel analisi-rcc-grid-card">
                    <header className="panel-header">
                      <h3>Sintesi successo ({processoOffertaAggregazioneLabel})</h3>
                    </header>
                    {processoOffertaSuccessoSintesiRows.length === 0 && !analisiRccLoading && (
                      <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                    )}
                    {processoOffertaSuccessoSintesiRows.length > 0 && (
                      <div className="bonifici-table-wrap bonifici-table-wrap-main">
                        <table className="bonifici-table">
                          <thead>
                            <tr>
                              <th rowSpan={2}>Anno</th>
                              <th rowSpan={2}>{processoOffertaAggregazioneLabel}</th>
                              <th colSpan={4}>Negativo</th>
                              <th colSpan={4}>Non definito</th>
                              <th colSpan={4}>Positivo</th>
                              <th colSpan={2}>Totale</th>
                            </tr>
                            <tr>
                              <th className="num">N Offerte</th>
                              <th className="num">Importo</th>
                              <th className="num">% Numero</th>
                              <th className="num">% Importo</th>
                              <th className="num">N Offerte</th>
                              <th className="num">Importo</th>
                              <th className="num">% Numero</th>
                              <th className="num">% Importo</th>
                              <th className="num">N Offerte</th>
                              <th className="num">Importo</th>
                              <th className="num">% Numero</th>
                              <th className="num">% Importo</th>
                              <th className="num">N Offerte</th>
                              <th className="num">Importo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {processoOffertaSuccessoSintesiRows.map((row) => (
                              <tr key={`processo-offerta-successo-sintesi-${row.anno}-${row.aggregazione}`}>
                                <td>{row.anno}</td>
                                <td>{row.aggregazione}</td>
                                <td className="num">{row.negativo.numero.toLocaleString('it-IT')}</td>
                                <td className={`num ${row.negativo.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.importo)}</td>
                                <td className="num">{formatPercentRatio(row.negativo.percentualeNumero)}</td>
                                <td className="num">{formatPercentRatio(row.negativo.percentualeImporto)}</td>
                                <td className="num">{row.nonDefinito.numero.toLocaleString('it-IT')}</td>
                                <td className={`num ${row.nonDefinito.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.importo)}</td>
                                <td className="num">{formatPercentRatio(row.nonDefinito.percentualeNumero)}</td>
                                <td className="num">{formatPercentRatio(row.nonDefinito.percentualeImporto)}</td>
                                <td className="num">{row.positivo.numero.toLocaleString('it-IT')}</td>
                                <td className={`num ${row.positivo.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.importo)}</td>
                                <td className="num">{formatPercentRatio(row.positivo.percentualeNumero)}</td>
                                <td className="num">{formatPercentRatio(row.positivo.percentualeImporto)}</td>
                                <td className="num">{row.totaleNumero.toLocaleString('it-IT')}</td>
                                <td className={`num ${row.totaleImporto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleImporto)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="table-totals-row">
                              <td colSpan={2} className="table-totals-label">Totale complessivo</td>
                              <td className="num">{processoOffertaSuccessoSintesiTotale.negativo.numero.toLocaleString('it-IT')}</td>
                              <td className={`num ${processoOffertaSuccessoSintesiTotale.negativo.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoSintesiTotale.negativo.importo)}</td>
                              <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.negativo.percentualeNumero)}</td>
                              <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.negativo.percentualeImporto)}</td>
                              <td className="num">{processoOffertaSuccessoSintesiTotale.nonDefinito.numero.toLocaleString('it-IT')}</td>
                              <td className={`num ${processoOffertaSuccessoSintesiTotale.nonDefinito.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoSintesiTotale.nonDefinito.importo)}</td>
                              <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.nonDefinito.percentualeNumero)}</td>
                              <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.nonDefinito.percentualeImporto)}</td>
                              <td className="num">{processoOffertaSuccessoSintesiTotale.positivo.numero.toLocaleString('it-IT')}</td>
                              <td className={`num ${processoOffertaSuccessoSintesiTotale.positivo.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoSintesiTotale.positivo.importo)}</td>
                              <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.positivo.percentualeNumero)}</td>
                              <td className="num">{formatPercentRatio(processoOffertaSuccessoSintesiTotale.positivo.percentualeImporto)}</td>
                              <td className="num">{processoOffertaSuccessoSintesiTotale.totaleNumero.toLocaleString('it-IT')}</td>
                              <td className={`num ${processoOffertaSuccessoSintesiTotale.totaleImporto < 0 ? 'num-negative' : ''}`}>{formatNumber(processoOffertaSuccessoSintesiTotale.totaleImporto)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </section>

                    <section className="panel analisi-rcc-grid-card">
                      <header className="panel-header">
                        <h3>Totali per anno</h3>
                      </header>
                      {processoOffertaSuccessoTotaliPerAnno.length === 0 && !analisiRccLoading && (
                        <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                      )}
                      {processoOffertaSuccessoTotaliPerAnno.length > 0 && (
                        <div className="bonifici-table-wrap bonifici-table-wrap-main">
                          <table className="bonifici-table">
                            <thead>
                              <tr>
                                <th rowSpan={2}>Anno</th>
                                <th colSpan={4}>Negativo</th>
                                <th colSpan={4}>Non definito</th>
                                <th colSpan={4}>Positivo</th>
                                <th colSpan={4}>Totale</th>
                              </tr>
                              <tr>
                                <th className="num">Ricavo in Offerta</th>
                                <th className="num">Costo in Offerta</th>
                                <th className="num">Margine Operativo</th>
                                <th className="num">Ricarico %</th>
                                <th className="num">Ricavo in Offerta</th>
                                <th className="num">Costo in Offerta</th>
                                <th className="num">Margine Operativo</th>
                                <th className="num">Ricarico %</th>
                                <th className="num">Ricavo in Offerta</th>
                                <th className="num">Costo in Offerta</th>
                                <th className="num">Margine Operativo</th>
                                <th className="num">Ricarico %</th>
                                <th className="num">Ricavo in Offerta</th>
                                <th className="num">Costo in Offerta</th>
                                <th className="num">Margine Operativo</th>
                                <th className="num">Ricarico % totale</th>
                              </tr>
                            </thead>
                            <tbody>
                              {processoOffertaSuccessoTotaliPerAnno.map((row) => (
                                <tr key={`processo-offerta-successo-totale-${row.anno}`} className="table-totals-row">
                                  <td>{row.anno}</td>
                                  <td className={`num ${row.negativo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.ricavo)}</td>
                                  <td className={`num ${row.negativo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.costo)}</td>
                                  <td className={`num ${row.negativo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.negativo.margine)}</td>
                                  <td className="num">{formatPercentValue(row.negativo.ricarico)}</td>
                                  <td className={`num ${row.nonDefinito.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.ricavo)}</td>
                                  <td className={`num ${row.nonDefinito.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.costo)}</td>
                                  <td className={`num ${row.nonDefinito.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.nonDefinito.margine)}</td>
                                  <td className="num">{formatPercentValue(row.nonDefinito.ricarico)}</td>
                                  <td className={`num ${row.positivo.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.ricavo)}</td>
                                  <td className={`num ${row.positivo.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.costo)}</td>
                                  <td className={`num ${row.positivo.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.positivo.margine)}</td>
                                  <td className="num">{formatPercentValue(row.positivo.ricarico)}</td>
                                  <td className={`num ${row.totale.ricavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.ricavo)}</td>
                                  <td className={`num ${row.totale.costo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.costo)}</td>
                                  <td className={`num ${row.totale.margine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totale.margine)}</td>
                                  <td className="num">{formatPercentValue(row.totale.ricarico)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </>
                )}

                {(isProcessoOffertaIncidenzaRccPage || isProcessoOffertaIncidenzaBuPage) && (
                  <>
                    <section className="panel analisi-rcc-grid-card">
                      <header className="panel-header">
                        <h3>{processoOffertaAggregazioneLabel === 'RCC' ? 'Incidenza RCC su totale anno' : 'Incidenza BU su totale anno'}</h3>
                      </header>
                      {processoOffertaIncidenzaRows.length === 0 && !analisiRccLoading && (
                        <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                      )}
                      {processoOffertaIncidenzaRows.length > 0 && (
                        <div className="bonifici-table-wrap bonifici-table-wrap-main">
                          <table className="bonifici-table">
                            <thead>
                              <tr>
                                <th>Anno</th>
                                <th>{processoOffertaAggregazioneLabel}</th>
                                <th className="num">Numero</th>
                                <th className="num">Importo Prevedibile</th>
                                <th className="num">Totale anno</th>
                                <th className="num">% su totale anno</th>
                              </tr>
                            </thead>
                            <tbody>
                              {processoOffertaIncidenzaRows.map((row) => (
                                <tr key={`processo-offerta-incidenza-${row.anno}-${row.aggregazione}`}>
                                  <td>{row.anno}</td>
                                  <td>{row.aggregazione}</td>
                                  <td className="num">{row.numero.toLocaleString('it-IT')}</td>
                                  <td className={`num ${row.importoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoPrevedibile)}</td>
                                  <td className={`num ${row.totaleAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleAnno)}</td>
                                  <td className="num">{formatPercentRatio(row.percentualeSuAnno)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    <section className="panel analisi-rcc-grid-card">
                      <header className="panel-header">
                        <h3>Totali per anno</h3>
                      </header>
                      {processoOffertaIncidenzaTotaliPerAnno.length === 0 && !analisiRccLoading && (
                        <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                      )}
                      {processoOffertaIncidenzaTotaliPerAnno.length > 0 && (
                        <div className="bonifici-table-wrap bonifici-table-wrap-main">
                          <table className="bonifici-table">
                            <thead>
                              <tr>
                                <th>Anno</th>
                                <th className="num">Numero</th>
                                <th className="num">Importo Prevedibile</th>
                                <th className="num">Totale anno</th>
                                <th className="num">% su totale anno</th>
                              </tr>
                            </thead>
                            <tbody>
                              {processoOffertaIncidenzaTotaliPerAnno.map((row) => (
                                <tr key={`processo-offerta-incidenza-totale-${row.anno}`} className="table-totals-row">
                                  <td>{row.anno}</td>
                                  <td className="num">{row.numero.toLocaleString('it-IT')}</td>
                                  <td className={`num ${row.importoPrevedibile < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoPrevedibile)}</td>
                                  <td className={`num ${row.totaleAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleAnno)}</td>
                                  <td className="num">{formatPercentRatio(row.percentualeSuAnno)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </>
            )}
          </section>
        )}

        {activePage === 'analisi-rcc-risultato-mensile' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Proiezione Mensile RCC</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiRccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiRccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-rcc-anno">
                      <span>Anno Snapshot</span>
                      <input
                        id="analisi-rcc-anno"
                        type="number"
                        min={2000}
                        max={2100}
                        step={1}
                        value={analisiRccAnno}
                        onChange={(event) => setAnalisiRccAnno(event.target.value)}
                      />
                    </label>
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {analisiRccData
                        ? `Anno ${analisiRccData.anno}. Visibilita: ${analisiRccData.vediTutto ? 'tutti gli RCC' : `solo ${analisiRccData.rccFiltro || 'RCC corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {analisiRccData ? `${analisiRccData.risultatoPesato.righe.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="analisi-rcc-grids">
                  {analisiRccData && analisiRccGrids.length > 0 && analisiRccGrids.map((grid) => (
                    <section key={grid.titolo} className="panel analisi-rcc-grid-card">
                      <header className="panel-header">
                        <h3>{grid.titolo}</h3>
                      </header>
                      {grid.righe.length === 0 && !analisiRccLoading && (
                        <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                      )}
                      {grid.righe.length > 0 && (
                        <div className="bonifici-table-wrap bonifici-table-wrap-main analisi-rcc-table-wrap">
                          <table className="bonifici-table analisi-rcc-table">
                            <thead>
                              <tr>
                                <th>Aggregazione</th>
                                {!grid.valoriPercentuali && <th className="num">Budget</th>}
                                {grid.mesi.map((mese) => (
                                  <th key={`${grid.titolo}-mese-${mese}`} className="num">{mese.toString().padStart(2, '0')}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {grid.righe.map((row) => {
                                const isTotalRow = row.aggregazione.localeCompare('Totale complessivo', 'it', { sensitivity: 'base' }) === 0
                                const budgetValue = Number(row.budget ?? 0)
                                return (
                                  <tr key={`${grid.titolo}-${row.aggregazione}`} className={isTotalRow ? 'table-totals-row' : ''}>
                                    <td>{row.aggregazione}</td>
                                    {!grid.valoriPercentuali && (
                                      <td className={`num ${Number(row.budget ?? 0) < 0 ? 'num-negative' : ''}`}>
                                        {row.budget === null || row.budget === undefined
                                          ? ''
                                          : formatCurrency(row.budget)}
                                      </td>
                                    )}
                                    {grid.mesi.map((mese) => {
                                      const value = getAnalisiRccValueForMonth(row, mese)
                                      const isUnderBudget = !grid.valoriPercentuali &&
                                        !isTotalRow &&
                                        row.budget !== null &&
                                        row.budget !== undefined &&
                                        value < budgetValue
                                      return (
                                        <td
                                          key={`${grid.titolo}-${row.aggregazione}-${mese}`}
                                          className={`num ${grid.valoriPercentuali
                                            ? (isAnalisiRccPercentUnderTarget(value) ? 'num-under-target' : '')
                                            : (isUnderBudget ? 'num-under-target' : (value < 0 ? 'num-negative' : ''))}`}
                                        >
                                          {grid.valoriPercentuali ? formatAnalisiRccPercent(value) : formatCurrency(value)}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  ))}
                  {!analisiRccLoading && (!analisiRccData || analisiRccGrids.every((grid) => grid.righe.length === 0)) && (
                    <section className="panel">
                      <p className="empty-state">Nessun dato disponibile. Imposta l'anno e premi Aggiorna.</p>
                    </section>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'analisi-rcc-pivot-fatturato' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Report Annuale RCC</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiRccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiRccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-rcc-pivot-anni">
                      <span>Anni confronto</span>
                      <select
                        id="analisi-rcc-pivot-anni"
                        multiple
                        size={4}
                        value={analisiRccPivotAnni}
                        onChange={(event) => setAnalisiRccPivotAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {analisiRccPivotAnnoOptions.map((year) => (
                          <option key={`analisi-rcc-pivot-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canSelectAnalisiRccPivotRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-rcc-pivot-rcc">
                        <span>RCC</span>
                        <select
                          id="analisi-rcc-pivot-rcc"
                          value={analisiRccPivotRcc}
                          onChange={(event) => setAnalisiRccPivotRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {analisiRccPivotRccOptions.map((value) => (
                            <option key={`analisi-rcc-pivot-rcc-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {analisiRccPivotData
                        ? `Anni ${analisiRccPivotData.anni.join(', ') || '-'}. Visibilita: ${analisiRccPivotData.vediTutto ? 'tutti gli RCC' : `solo ${analisiRccPivotData.rccFiltro || 'RCC corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {analisiRccPivotData ? `${analisiRccPivotRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Report Annuale RCC</h3>
                  </header>

                  {analisiRccPivotRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {analisiRccPivotRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>RCC</th>
                            <th className="num">Fatturato anno</th>
                            <th className="num">Fatturato futuro anno</th>
                            <th className="num">Totale fatturato certo</th>
                            <th className="num">Budget Previsto</th>
                            <th className="num">Margine col budget</th>
                            <th className="num">% Certa Raggiunta</th>
                            <th className="num">Ricavo ipotetico</th>
                            <th className="num">Ricavo ipotetico pesato</th>
                            <th className="num">Totale ipotetico</th>
                            <th className="num">% Compreso ricavo ipotetico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiRccPivotRows.map((row) => {
                            const isTotalRow = row.rcc.localeCompare('Totale complessivo', 'it', { sensitivity: 'base' }) === 0
                            return (
                              <tr key={`analisi-rcc-pivot-${row.anno}-${row.rcc}`} className={isTotalRow ? 'table-totals-row' : ''}>
                                <td>{row.anno}</td>
                                <td>{row.rcc}</td>
                                <td className={`num ${row.fatturatoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoAnno)}</td>
                                <td className={`num ${row.fatturatoFuturoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturoAnno)}</td>
                                <td className={`num ${row.totaleFatturatoCerto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoCerto)}</td>
                                <td className={`num ${row.budgetPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPrevisto)}</td>
                                <td className={`num ${row.margineColBudget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.margineColBudget)}</td>
                                <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCertaRaggiunta) ? 'num-under-target' : ''}`}>
                                  {formatAnalisiRccPercent(row.percentualeCertaRaggiunta)}
                                </td>
                                <td className={`num ${row.totaleRicavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpotetico)}</td>
                                <td className={`num ${row.totaleRicavoIpoteticoPesato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpoteticoPesato)}</td>
                                <td className={`num ${row.totaleIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleIpotetico)}</td>
                                <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCompresoRicavoIpotetico) ? 'num-under-target' : ''}`}>
                                  {formatAnalisiRccPercent(row.percentualeCompresoRicavoIpotetico)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Totali per anno</h3>
                  </header>
                  {analisiRccPivotTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {analisiRccPivotTotaliPerAnno.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th className="num">Fatturato anno</th>
                            <th className="num">Fatturato futuro anno</th>
                            <th className="num">Totale fatturato certo</th>
                            <th className="num">Budget Previsto</th>
                            <th className="num">Margine col budget</th>
                            <th className="num">% Certa Raggiunta</th>
                            <th className="num">Ricavo ipotetico</th>
                            <th className="num">Ricavo ipotetico pesato</th>
                            <th className="num">Totale ipotetico</th>
                            <th className="num">% Compreso ricavo ipotetico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiRccPivotTotaliPerAnno.map((row) => (
                            <tr key={`analisi-rcc-pivot-totale-${row.anno}`} className="table-totals-row">
                              <td>{row.anno}</td>
                              <td className={`num ${row.fatturatoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoAnno)}</td>
                              <td className={`num ${row.fatturatoFuturoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturoAnno)}</td>
                              <td className={`num ${row.totaleFatturatoCerto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoCerto)}</td>
                              <td className={`num ${row.budgetPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPrevisto)}</td>
                              <td className={`num ${row.margineColBudget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.margineColBudget)}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCertaRaggiunta) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeCertaRaggiunta)}
                              </td>
                              <td className={`num ${row.totaleRicavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpotetico)}</td>
                              <td className={`num ${row.totaleRicavoIpoteticoPesato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpoteticoPesato)}</td>
                              <td className={`num ${row.totaleIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleIpotetico)}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCompresoRicavoIpotetico) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeCompresoRicavoIpotetico)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'analisi-bu-risultato-mensile' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Proiezione Mensile BU</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiBuPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiBuPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-bu-anno">
                      <span>Anno Snapshot</span>
                      <input
                        id="analisi-bu-anno"
                        type="number"
                        min={2000}
                        max={2100}
                        step={1}
                        value={analisiBuAnno}
                        onChange={(event) => setAnalisiBuAnno(event.target.value)}
                      />
                    </label>
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {analisiBuData
                        ? `Anno ${analisiBuData.anno}. Visibilita: ${analisiBuData.vediTutto ? 'tutte le BU' : `solo ${analisiBuData.rccFiltro || 'BU corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {analisiBuData ? `${analisiBuData.risultatoPesato.righe.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="analisi-rcc-grids">
                  {analisiBuData && analisiBuGrids.length > 0 && analisiBuGrids.map((grid) => (
                    <section key={`bu-${grid.titolo}`} className="panel analisi-rcc-grid-card">
                      <header className="panel-header">
                        <h3>{grid.titolo}</h3>
                      </header>
                      {grid.righe.length === 0 && !analisiRccLoading && (
                        <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                      )}
                      {grid.righe.length > 0 && (
                        <div className="bonifici-table-wrap bonifici-table-wrap-main analisi-rcc-table-wrap">
                          <table className="bonifici-table analisi-rcc-table">
                            <thead>
                              <tr>
                                <th>Aggregazione</th>
                                {!grid.valoriPercentuali && <th className="num">Budget</th>}
                                {grid.mesi.map((mese) => (
                                  <th key={`bu-${grid.titolo}-mese-${mese}`} className="num">{mese.toString().padStart(2, '0')}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {grid.righe.map((row) => {
                                const isTotalRow = row.aggregazione.localeCompare('Totale complessivo', 'it', { sensitivity: 'base' }) === 0
                                const budgetValue = Number(row.budget ?? 0)
                                return (
                                  <tr key={`bu-${grid.titolo}-${row.aggregazione}`} className={isTotalRow ? 'table-totals-row' : ''}>
                                    <td>{row.aggregazione}</td>
                                    {!grid.valoriPercentuali && (
                                      <td className={`num ${Number(row.budget ?? 0) < 0 ? 'num-negative' : ''}`}>
                                        {row.budget === null || row.budget === undefined
                                          ? ''
                                          : formatCurrency(row.budget)}
                                      </td>
                                    )}
                                    {grid.mesi.map((mese) => {
                                      const value = getAnalisiRccValueForMonth(row, mese)
                                      const isUnderBudget = !grid.valoriPercentuali &&
                                        !isTotalRow &&
                                        row.budget !== null &&
                                        row.budget !== undefined &&
                                        value < budgetValue
                                      return (
                                        <td
                                          key={`bu-${grid.titolo}-${row.aggregazione}-${mese}`}
                                          className={`num ${grid.valoriPercentuali
                                            ? (isAnalisiRccPercentUnderTarget(value) ? 'num-under-target' : '')
                                            : (isUnderBudget ? 'num-under-target' : (value < 0 ? 'num-negative' : ''))}`}
                                        >
                                          {grid.valoriPercentuali ? formatAnalisiRccPercent(value) : formatCurrency(value)}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  ))}
                  {!analisiRccLoading && (!analisiBuData || analisiBuGrids.every((grid) => grid.righe.length === 0)) && (
                    <section className="panel">
                      <p className="empty-state">Nessun dato disponibile. Imposta l'anno e premi Aggiorna.</p>
                    </section>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'analisi-bu-pivot-fatturato' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Report Annuale BU</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiBuPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiBuPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-bu-pivot-anni">
                      <span>Anni confronto</span>
                      <select
                        id="analisi-bu-pivot-anni"
                        multiple
                        size={4}
                        value={analisiBuPivotAnni}
                        onChange={(event) => setAnalisiBuPivotAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {analisiBuPivotAnnoOptions.map((year) => (
                          <option key={`analisi-bu-pivot-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canSelectAnalisiBuPivotBusinessUnit && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-bu-pivot-bu">
                        <span>BU</span>
                        <select
                          id="analisi-bu-pivot-bu"
                          value={analisiBuPivotBusinessUnit}
                          onChange={(event) => setAnalisiBuPivotBusinessUnit(event.target.value)}
                        >
                          <option value="">Tutte</option>
                          {analisiBuPivotBusinessUnitOptions.map((value) => (
                            <option key={`analisi-bu-pivot-bu-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {analisiBuPivotData
                        ? `Anni ${analisiBuPivotData.anni.join(', ') || '-'}. Visibilita: ${analisiBuPivotData.vediTutto ? 'tutte le BU' : `solo ${analisiBuPivotData.rccFiltro || 'BU corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {analisiBuPivotData ? `${analisiBuPivotRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Report Annuale BU</h3>
                  </header>

                  {analisiBuPivotRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {analisiBuPivotRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>BU</th>
                            <th className="num">Fatturato anno</th>
                            <th className="num">Fatturato futuro anno</th>
                            <th className="num">Totale fatturato certo</th>
                            <th className="num">Budget Previsto</th>
                            <th className="num">Margine col budget</th>
                            <th className="num">% Certa Raggiunta</th>
                            <th className="num">Ricavo ipotetico</th>
                            <th className="num">Ricavo ipotetico pesato</th>
                            <th className="num">Totale ipotetico</th>
                            <th className="num">% Compreso ricavo ipotetico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiBuPivotRows.map((row) => {
                            const isTotalRow = row.rcc.localeCompare('Totale complessivo', 'it', { sensitivity: 'base' }) === 0
                            return (
                              <tr key={`analisi-bu-pivot-${row.anno}-${row.rcc}`} className={isTotalRow ? 'table-totals-row' : ''}>
                                <td>{row.anno}</td>
                                <td>{row.rcc}</td>
                                <td className={`num ${row.fatturatoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoAnno)}</td>
                                <td className={`num ${row.fatturatoFuturoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturoAnno)}</td>
                                <td className={`num ${row.totaleFatturatoCerto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoCerto)}</td>
                                <td className={`num ${row.budgetPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPrevisto)}</td>
                                <td className={`num ${row.margineColBudget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.margineColBudget)}</td>
                                <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCertaRaggiunta) ? 'num-under-target' : ''}`}>
                                  {formatAnalisiRccPercent(row.percentualeCertaRaggiunta)}
                                </td>
                                <td className={`num ${row.totaleRicavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpotetico)}</td>
                                <td className={`num ${row.totaleRicavoIpoteticoPesato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpoteticoPesato)}</td>
                                <td className={`num ${row.totaleIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleIpotetico)}</td>
                                <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCompresoRicavoIpotetico) ? 'num-under-target' : ''}`}>
                                  {formatAnalisiRccPercent(row.percentualeCompresoRicavoIpotetico)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Totali per anno</h3>
                  </header>
                  {analisiBuPivotTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {analisiBuPivotTotaliPerAnno.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th className="num">Fatturato anno</th>
                            <th className="num">Fatturato futuro anno</th>
                            <th className="num">Totale fatturato certo</th>
                            <th className="num">Budget Previsto</th>
                            <th className="num">Margine col budget</th>
                            <th className="num">% Certa Raggiunta</th>
                            <th className="num">Ricavo ipotetico</th>
                            <th className="num">Ricavo ipotetico pesato</th>
                            <th className="num">Totale ipotetico</th>
                            <th className="num">% Compreso ricavo ipotetico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiBuPivotTotaliPerAnno.map((row) => (
                            <tr key={`analisi-bu-pivot-totale-${row.anno}`} className="table-totals-row">
                              <td>{row.anno}</td>
                              <td className={`num ${row.fatturatoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoAnno)}</td>
                              <td className={`num ${row.fatturatoFuturoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturoAnno)}</td>
                              <td className={`num ${row.totaleFatturatoCerto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoCerto)}</td>
                              <td className={`num ${row.budgetPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPrevisto)}</td>
                              <td className={`num ${row.margineColBudget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.margineColBudget)}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCertaRaggiunta) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeCertaRaggiunta)}
                              </td>
                              <td className={`num ${row.totaleRicavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpotetico)}</td>
                              <td className={`num ${row.totaleRicavoIpoteticoPesato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpoteticoPesato)}</td>
                              <td className={`num ${row.totaleIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleIpotetico)}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCompresoRicavoIpotetico) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeCompresoRicavoIpotetico)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'analisi-burcc-risultato-mensile' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Proiezione Mensile RCC-BU</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiBurccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiBurccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-anno">
                      <span>Anno Snapshot</span>
                      <input
                        id="analisi-burcc-anno"
                        type="number"
                        min={2000}
                        max={2100}
                        step={1}
                        value={analisiBurccAnno}
                        onChange={(event) => setAnalisiBurccAnno(event.target.value)}
                      />
                    </label>
                    {canSelectAnalisiBurccBusinessUnit && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-bu">
                        <span>BU</span>
                        <select
                          id="analisi-burcc-bu"
                          value={analisiBurccBusinessUnit}
                          onChange={(event) => setAnalisiBurccBusinessUnit(event.target.value)}
                        >
                          <option value="">Tutte</option>
                          {analisiBurccBusinessUnitOptions.map((value) => (
                            <option key={`analisi-burcc-bu-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {canSelectAnalisiBurccRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-rcc">
                        <span>RCC</span>
                        <select
                          id="analisi-burcc-rcc"
                          value={analisiBurccRcc}
                          onChange={(event) => setAnalisiBurccRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {analisiBurccRccOptions.map((value) => (
                            <option key={`analisi-burcc-rcc-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {analisiBurccData
                        ? `Anno ${analisiBurccData.anno}. Visibilita: ${analisiBurccData.vediTutto
                          ? 'tutte le combinazioni BU/RCC'
                          : `filtrata su ${analisiBurccData.businessUnitFiltro || 'BU consentite'}${analisiBurccData.rccFiltro ? ` / ${analisiBurccData.rccFiltro}` : ''}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {analisiBurccData ? `${analisiBurccData.risultatoPesato.righe.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="analisi-rcc-grids">
                  {analisiBurccData && analisiBurccGrids.length > 0 && analisiBurccGrids.map((grid) => (
                    <section key={`burcc-${grid.titolo}`} className="panel analisi-rcc-grid-card">
                      <header className="panel-header">
                        <h3>{grid.titolo}</h3>
                      </header>
                      {grid.righe.length === 0 && !analisiRccLoading && (
                        <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                      )}
                      {grid.righe.length > 0 && (
                        <div className="bonifici-table-wrap bonifici-table-wrap-main analisi-rcc-table-wrap">
                          <table className="bonifici-table analisi-rcc-table">
                            <thead>
                              <tr>
                                <th>Aggregazione</th>
                                {!grid.valoriPercentuali && <th className="num">Budget</th>}
                                {grid.mesi.map((mese) => (
                                  <th key={`burcc-${grid.titolo}-mese-${mese}`} className="num">{mese.toString().padStart(2, '0')}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {grid.righe.map((row) => {
                                const isTotalRow = row.aggregazione.localeCompare('Totale complessivo', 'it', { sensitivity: 'base' }) === 0
                                const budgetValue = Number(row.budget ?? 0)
                                return (
                                  <tr key={`burcc-${grid.titolo}-${row.aggregazione}`} className={isTotalRow ? 'table-totals-row' : ''}>
                                    <td>{row.aggregazione}</td>
                                    {!grid.valoriPercentuali && (
                                      <td className={`num ${Number(row.budget ?? 0) < 0 ? 'num-negative' : ''}`}>
                                        {row.budget === null || row.budget === undefined
                                          ? ''
                                          : formatCurrency(row.budget)}
                                      </td>
                                    )}
                                    {grid.mesi.map((mese) => {
                                      const value = getAnalisiRccValueForMonth(row, mese)
                                      const isUnderBudget = !grid.valoriPercentuali &&
                                        !isTotalRow &&
                                        row.budget !== null &&
                                        row.budget !== undefined &&
                                        value < budgetValue
                                      return (
                                        <td
                                          key={`burcc-${grid.titolo}-${row.aggregazione}-${mese}`}
                                          className={`num ${grid.valoriPercentuali
                                            ? (isAnalisiRccPercentUnderTarget(value) ? 'num-under-target' : '')
                                            : (isUnderBudget ? 'num-under-target' : (value < 0 ? 'num-negative' : ''))}`}
                                        >
                                          {grid.valoriPercentuali ? formatAnalisiRccPercent(value) : formatCurrency(value)}
                                        </td>
                                      )
                                    })}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  ))}
                  {!analisiRccLoading && (!analisiBurccData || analisiBurccGrids.every((grid) => grid.righe.length === 0)) && (
                    <section className="panel">
                      <p className="empty-state">Nessun dato disponibile. Imposta l'anno e premi Aggiorna.</p>
                    </section>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'analisi-burcc-pivot-fatturato' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Report Annuale RCC-BU</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiBurccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiBurccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-pivot-anni">
                      <span>Anni confronto</span>
                      <select
                        id="analisi-burcc-pivot-anni"
                        multiple
                        size={4}
                        value={analisiBurccPivotAnni}
                        onChange={(event) => setAnalisiBurccPivotAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {analisiBurccPivotAnnoOptions.map((year) => (
                          <option key={`analisi-burcc-pivot-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canSelectAnalisiBurccBusinessUnit && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-pivot-bu">
                        <span>BU</span>
                        <select
                          id="analisi-burcc-pivot-bu"
                          value={analisiBurccPivotBusinessUnit}
                          onChange={(event) => setAnalisiBurccPivotBusinessUnit(event.target.value)}
                        >
                          <option value="">Tutte</option>
                          {analisiBurccPivotBusinessUnitOptions.map((value) => (
                            <option key={`analisi-burcc-pivot-bu-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {canSelectAnalisiBurccRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-burcc-pivot-rcc">
                        <span>RCC</span>
                        <select
                          id="analisi-burcc-pivot-rcc"
                          value={analisiBurccPivotRcc}
                          onChange={(event) => setAnalisiBurccPivotRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {analisiBurccPivotRccOptions.map((value) => (
                            <option key={`analisi-burcc-pivot-rcc-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {analisiBurccPivotData
                        ? `Anni ${analisiBurccPivotData.anni.join(', ') || '-'}. Visibilita: ${analisiBurccPivotData.vediTutto
                          ? 'tutte le combinazioni BU/RCC'
                          : `filtrata su ${analisiBurccPivotData.businessUnitFiltro || 'BU consentite'}${analisiBurccPivotData.rccFiltro ? ` / ${analisiBurccPivotData.rccFiltro}` : ''}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {analisiBurccPivotData ? `${analisiBurccPivotRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Report Annuale RCC-BU</h3>
                  </header>

                  {analisiBurccPivotRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {analisiBurccPivotRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>BU</th>
                            <th>RCC</th>
                            <th className="num">Fatturato anno</th>
                            <th className="num">Fatturato futuro anno</th>
                            <th className="num">Totale fatturato certo</th>
                            <th className="num">Budget Previsto</th>
                            <th className="num">Margine col budget</th>
                            <th className="num">% Certa Raggiunta</th>
                            <th className="num">Ricavo ipotetico</th>
                            <th className="num">Ricavo ipotetico pesato</th>
                            <th className="num">Totale ipotetico</th>
                            <th className="num">% Compreso ricavo ipotetico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiBurccPivotRows.map((row) => (
                            <tr key={`analisi-burcc-pivot-${row.anno}-${row.businessUnit}-${row.rcc}`}>
                              <td>{row.anno}</td>
                              <td>{row.businessUnit}</td>
                              <td>{row.rcc}</td>
                              <td className={`num ${row.fatturatoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoAnno)}</td>
                              <td className={`num ${row.fatturatoFuturoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturoAnno)}</td>
                              <td className={`num ${row.totaleFatturatoCerto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoCerto)}</td>
                              <td className={`num ${row.budgetPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPrevisto)}</td>
                              <td className={`num ${row.margineColBudget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.margineColBudget)}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCertaRaggiunta) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeCertaRaggiunta)}
                              </td>
                              <td className={`num ${row.totaleRicavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpotetico)}</td>
                              <td className={`num ${row.totaleRicavoIpoteticoPesato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpoteticoPesato)}</td>
                              <td className={`num ${row.totaleIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleIpotetico)}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCompresoRicavoIpotetico) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeCompresoRicavoIpotetico)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Totali per anno</h3>
                  </header>
                  {analisiBurccPivotTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {analisiBurccPivotTotaliPerAnno.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th className="num">Fatturato anno</th>
                            <th className="num">Fatturato futuro anno</th>
                            <th className="num">Totale fatturato certo</th>
                            <th className="num">Budget Previsto</th>
                            <th className="num">Margine col budget</th>
                            <th className="num">% Certa Raggiunta</th>
                            <th className="num">Ricavo ipotetico</th>
                            <th className="num">Ricavo ipotetico pesato</th>
                            <th className="num">Totale ipotetico</th>
                            <th className="num">% Compreso ricavo ipotetico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiBurccPivotTotaliPerAnno.map((row) => (
                            <tr key={`analisi-burcc-pivot-totale-${row.anno}`} className="table-totals-row">
                              <td>{row.anno}</td>
                              <td className={`num ${row.fatturatoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoAnno)}</td>
                              <td className={`num ${row.fatturatoFuturoAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturoAnno)}</td>
                              <td className={`num ${row.totaleFatturatoCerto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoCerto)}</td>
                              <td className={`num ${row.budgetPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPrevisto)}</td>
                              <td className={`num ${row.margineColBudget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.margineColBudget)}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCertaRaggiunta) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeCertaRaggiunta)}
                              </td>
                              <td className={`num ${row.totaleRicavoIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpotetico)}</td>
                              <td className={`num ${row.totaleRicavoIpoteticoPesato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavoIpoteticoPesato)}</td>
                              <td className={`num ${row.totaleIpotetico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleIpotetico)}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeCompresoRicavoIpotetico) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeCompresoRicavoIpotetico)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'analisi-piano-fatturazione' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Proiezioni - Piano Fatturazione</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessAnalisiPianoFatturazionePage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessAnalisiPianoFatturazionePage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-piano-fatturazione-anno">
                      <span>Anno</span>
                      <select
                        id="analisi-piano-fatturazione-anno"
                        value={analisiPianoFatturazioneAnno}
                        onChange={(event) => setAnalisiPianoFatturazioneAnno(event.target.value)}
                      >
                        {analisiPianoFatturazioneAnnoOptions.map((year) => (
                          <option key={`analisi-piano-fatturazione-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-piano-fatturazione-mesi-snapshot">
                      <span>Mesi snapshot</span>
                      <select
                        id="analisi-piano-fatturazione-mesi-snapshot"
                        multiple
                        size={4}
                        value={analisiPianoFatturazioneMesiSnapshot}
                        onChange={(event) => setAnalisiPianoFatturazioneMesiSnapshot(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {analisiPianoFatturazioneMesiSnapshotOptions.map((month) => (
                          <option key={`analisi-piano-fatturazione-snapshot-${month}`} value={month.toString()}>
                            {formatReferenceMonthLabel(month)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="analisi-piano-fatturazione-tipo-calcolo">
                      <span>Tipo calcolo</span>
                      <select
                        id="analisi-piano-fatturazione-tipo-calcolo"
                        value={analisiPianoFatturazioneTipoCalcolo}
                        onChange={(event) => setAnalisiPianoFatturazioneTipoCalcolo(event.target.value)}
                      >
                        <option value="complessivo">Complessivo</option>
                        <option value="fatturato">Fatturato</option>
                        <option value="futuro">Futuro</option>
                      </select>
                    </label>
                    {canSelectAnalisiPianoFatturazioneRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="analisi-piano-fatturazione-rcc">
                        <span>RCC</span>
                        <select
                          id="analisi-piano-fatturazione-rcc"
                          value={analisiPianoFatturazioneRcc}
                          onChange={(event) => setAnalisiPianoFatturazioneRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {analisiPianoFatturazioneRccOptions.map((value) => (
                            <option key={`analisi-piano-fatturazione-rcc-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {analisiPianoFatturazioneData
                        ? `Anno ${analisiPianoFatturazioneData.anno}. Snapshot: ${(analisiPianoFatturazioneData.mesiSnapshot ?? []).map((value) => value.toString().padStart(2, '0')).join(', ') || 'tutti'}. Tipo: ${analisiPianoFatturazioneData.tipoCalcolo}. Visibilita: ${analisiPianoFatturazioneData.vediTutto ? 'tutti gli RCC' : `solo ${analisiPianoFatturazioneData.rccFiltro || 'RCC corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {analisiPianoFatturazioneData ? `${analisiPianoFatturazioneRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Piano Fatturazione - Valori</h3>
                  </header>
                  {analisiPianoFatturazioneRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}
                  {analisiPianoFatturazioneRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>RCC</th>
                            <th className="num">Budget</th>
                            {analisiPianoFatturazioneMesiRiferimento.map((mese) => (
                              <Fragment key={`analisi-piano-fatturazione-mese-head-${mese}`}>
                                <th className="num">
                                  {formatReferenceMonthLabel(mese).slice(5)}
                                </th>
                                {isQuarterEndMonth(mese) && (
                                  <th className="num piano-quarter-total-col">
                                    Trim{getQuarterFromMonth(mese)} Totale
                                  </th>
                                )}
                              </Fragment>
                            ))}
                            <th className="num">Totale complessivo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiPianoFatturazioneRows.map((row) => (
                            <tr key={`analisi-piano-fatturazione-row-${row.rcc}`} className={row.isTotale ? 'table-totals-row' : ''}>
                              <td>{row.rcc}</td>
                              <td className={`num ${row.budget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budget)}</td>
                              {analisiPianoFatturazioneMesiRiferimento.map((mese) => {
                                const value = getAnalisiPianoFatturazioneValueForMonth(row, mese)
                                const quarter = getQuarterFromMonth(mese)
                                const quarterTotal = getAnalisiPianoFatturazioneQuarterTotal(row, quarter)
                                return (
                                  <Fragment key={`analisi-piano-fatturazione-value-wrap-${row.rcc}-${mese}`}>
                                    <td className={`num ${value < 0 ? 'num-negative' : ''}`}>
                                      {formatNumber(value)}
                                    </td>
                                    {isQuarterEndMonth(mese) && (
                                      <td className={`num piano-quarter-total-col ${quarterTotal < 0 ? 'num-negative' : ''}`}>
                                        {formatNumber(quarterTotal)}
                                      </td>
                                    )}
                                  </Fragment>
                                )
                              })}
                              <td className={`num ${row.totaleComplessivo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleComplessivo)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Piano Fatturazione - Progressivo % Budget</h3>
                  </header>
                  {analisiPianoFatturazioneProgressRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}
                  {analisiPianoFatturazioneProgressRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>RCC</th>
                            <th className="num">Budget</th>
                            {analisiPianoFatturazioneMesiRiferimento.map((mese) => (
                              <th key={`analisi-piano-fatturazione-progress-mese-${mese}`} className="num">
                                {formatReferenceMonthLabel(mese).slice(5)}
                              </th>
                            ))}
                            <th className="num">Importo totale prog.</th>
                            <th className="num">% Totale su Budget</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analisiPianoFatturazioneProgressRows.map((row) => (
                            <tr key={`analisi-piano-fatturazione-progress-row-${row.rcc}`} className={row.isTotale ? 'table-totals-row' : ''}>
                              <td>{row.rcc}</td>
                              <td className={`num ${row.budget < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budget)}</td>
                              {analisiPianoFatturazioneMesiRiferimento.map((mese) => {
                                const importo = getAnalisiPianoFatturazioneProgressAmountForMonth(row, mese)
                                const percentuale = getAnalisiPianoFatturazioneProgressPercentForMonth(row, mese)
                                return (
                                  <td key={`analisi-piano-fatturazione-progress-value-${row.rcc}-${mese}`} className="num">
                                    <div className={`piano-progress-amount ${importo < 0 ? 'num-negative' : ''}`}>{formatNumber(importo)}</div>
                                    <div className={`piano-progress-percent ${percentuale < 0 ? 'num-negative' : ''}`}>{formatPercentRatioUnbounded(percentuale)}</div>
                                  </td>
                                )
                              })}
                              <td className={`num ${row.importoTotaleProgressivo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoTotaleProgressivo)}</td>
                              <td className={`num ${row.percentualeTotaleBudget < 0 ? 'num-negative' : ''}`}>{formatPercentRatioUnbounded(row.percentualeTotaleBudget)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'previsioni-funnel' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Previsioni - Funnel</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessPrevisioniFunnelRccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessPrevisioniFunnelRccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-funnel-anni">
                      <span>Anni confronto</span>
                      <select
                        id="previsioni-funnel-anni"
                        multiple
                        size={4}
                        value={previsioniFunnelAnni}
                        onChange={(event) => setPrevisioniFunnelAnni(
                          Array.from(event.target.selectedOptions).map((option) => option.value),
                        )}
                      >
                        {previsioniFunnelAnnoOptions.map((year) => (
                          <option key={`previsioni-funnel-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canSelectPrevisioniFunnelRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="previsioni-funnel-rcc">
                        <span>RCC</span>
                        <select
                          id="previsioni-funnel-rcc"
                          value={previsioniFunnelRcc}
                          onChange={(event) => setPrevisioniFunnelRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {previsioniFunnelRccOptions.map((value) => (
                            <option key={`previsioni-funnel-rcc-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-funnel-tipo">
                      <span>Tipo</span>
                      <select
                        id="previsioni-funnel-tipo"
                        value={previsioniFunnelTipo}
                        onChange={(event) => setPrevisioniFunnelTipo(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {previsioniFunnelTipoOptions.map((value) => (
                          <option key={`previsioni-funnel-tipo-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-funnel-stato-documento">
                      <span>Stato documento</span>
                      <select
                        id="previsioni-funnel-stato-documento"
                        value={previsioniFunnelStatoDocumento}
                        onChange={(event) => setPrevisioniFunnelStatoDocumento(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {previsioniFunnelStatoDocumentoOptions.map((value) => (
                          <option key={`previsioni-funnel-stato-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {previsioniFunnelData
                        ? `Anni ${previsioniFunnelData.anni.join(', ') || '-'}. Visibilita: ${previsioniFunnelData.vediTutto ? 'tutti gli RCC' : `solo ${previsioniFunnelData.rccFiltro || 'RCC corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {previsioniFunnelData ? `${previsioniFunnelRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Funnel</h3>
                  </header>

                  {previsioniFunnelRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {previsioniFunnelRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>RCC</th>
                            <th>BU</th>
                            <th>Tipo</th>
                            <th>Stato Documento</th>
                            <th>Commessa</th>
                            <th>Protocollo</th>
                            <th>Data</th>
                            <th>Oggetto</th>
                            <th className="num">% Successo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Personale</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Ricavo atteso</th>
                            <th className="num">Fatturato emesso</th>
                            <th className="num">Fatturato futuro</th>
                            <th className="num">Totale anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniFunnelRows.map((row, index) => (
                            <tr key={`previsioni-funnel-${row.anno}-${row.rcc}-${row.protocollo}-${index}`}>
                              <td>{row.anno}</td>
                              <td>{row.rcc}</td>
                              <td>{row.businessUnit}</td>
                              <td>{row.tipo}</td>
                              <td>{row.statoDocumento}</td>
                              <td>{row.commessa}</td>
                              <td>{row.protocollo}</td>
                              <td>{formatDate(row.data)}</td>
                              <td>{row.oggetto}</td>
                              <td className={`num ${isAnalisiRccPercentUnderTarget(row.percentualeSuccesso) ? 'num-under-target' : ''}`}>
                                {formatAnalisiRccPercent(row.percentualeSuccesso)}
                              </td>
                              <td className={`num ${row.budgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetRicavo)}</td>
                              <td className={`num ${row.budgetPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetPersonale)}</td>
                              <td className={`num ${row.budgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.budgetCosti)}</td>
                              <td className={`num ${row.ricavoAtteso < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavoAtteso)}</td>
                              <td className={`num ${row.fatturatoEmesso < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoEmesso)}</td>
                              <td className={`num ${row.fatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.fatturatoFuturo)}</td>
                              <td className={`num ${row.totaleAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleAnno)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="table-totals-row">
                            <td colSpan={9} className="table-totals-label">Totale</td>
                            <td className={`num ${isAnalisiRccPercentUnderTarget(previsioniFunnelTotals.percentualeSuccesso) ? 'num-under-target' : ''}`}>
                              {formatAnalisiRccPercent(previsioniFunnelTotals.percentualeSuccesso)}
                            </td>
                            <td className={`num ${previsioniFunnelTotals.budgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.budgetRicavo)}</td>
                            <td className={`num ${previsioniFunnelTotals.budgetPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.budgetPersonale)}</td>
                            <td className={`num ${previsioniFunnelTotals.budgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.budgetCosti)}</td>
                            <td className={`num ${previsioniFunnelTotals.ricavoAtteso < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.ricavoAtteso)}</td>
                            <td className={`num ${previsioniFunnelTotals.fatturatoEmesso < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.fatturatoEmesso)}</td>
                            <td className={`num ${previsioniFunnelTotals.fatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.fatturatoFuturo)}</td>
                            <td className={`num ${previsioniFunnelTotals.totaleAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(previsioniFunnelTotals.totaleAnno)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'previsioni-report-funnel-rcc' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Previsioni - Report Funnel RCC</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessPrevisioniFunnelRccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessPrevisioniFunnelRccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-rcc-anno">
                      <span>Anno</span>
                      <select
                        id="previsioni-report-funnel-rcc-anno"
                        value={previsioniReportFunnelRccAnnoSelezionato}
                        onChange={(event) => setPrevisioniReportFunnelRccAnni([event.target.value])}
                      >
                        {previsioniReportFunnelRccAnnoOptions.map((year) => (
                          <option key={`previsioni-report-funnel-rcc-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canSelectPrevisioniFunnelRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-rcc-rcc">
                        <span>RCC</span>
                        <select
                          id="previsioni-report-funnel-rcc-rcc"
                          value={previsioniReportFunnelRcc}
                          onChange={(event) => setPrevisioniReportFunnelRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {previsioniReportFunnelRccOptions.map((value) => (
                            <option key={`previsioni-report-funnel-rcc-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {previsioniReportFunnelRccData
                        ? `Anno ${previsioniReportFunnelRccAnnoSelezionato}. Visibilita: ${previsioniReportFunnelRccData.vediTutto ? 'tutti gli RCC' : `solo ${previsioniReportFunnelRccData.aggregazioneFiltro || 'RCC corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {previsioniReportFunnelRccData ? `${previsioniReportFunnelRccPivotRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Report Funnel RCC</h3>
                  </header>

                  {previsioniReportFunnelRccPivotRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {previsioniReportFunnelRccPivotRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>Etichette di riga</th>
                            <th className="num">Conteggio protocollo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Futura Anno</th>
                            <th className="num">Emessa Anno</th>
                            <th className="num">Totale Anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniReportFunnelRccPivotRows.map((row) => (
                            <tr key={row.key} className={`funnel-pivot-row level-${row.livello}`}>
                              <td>{row.anno}</td>
                              <td>
                                <span className={`funnel-pivot-label level-${row.livello}`}>{row.etichetta}</span>
                              </td>
                              <td className="num">{row.numeroProtocolli.toLocaleString('it-IT')}</td>
                              <td className={`num ${row.totaleBudgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetRicavo)}</td>
                              <td className={`num ${row.totaleBudgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetCosti)}</td>
                              <td className={`num ${row.totaleFatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoFuturo)}</td>
                              <td className={`num ${row.totaleFuturaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFuturaAnno)}</td>
                              <td className={`num ${row.totaleEmessaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleEmessaAnno)}</td>
                              <td className={`num ${row.totaleRicaviComplessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicaviComplessivi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>{previsioniReportFunnelRccHasMultipleAggregazioni ? 'Totali per anno (ripartiti per tipo/% successo)' : 'Totali per anno'}</h3>
                  </header>
                  {previsioniReportFunnelRccTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {previsioniReportFunnelRccHasMultipleAggregazioni && previsioniReportFunnelRccTotaliDettaglioRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>Etichette di riga</th>
                            <th className="num">Conteggio protocollo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Futura Anno</th>
                            <th className="num">Emessa Anno</th>
                            <th className="num">Totale Anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniReportFunnelRccTotaliDettaglioRows.map((row) => (
                            <tr key={`previsioni-report-funnel-rcc-totale-dettaglio-${row.key}`} className={`funnel-pivot-row level-${row.livello} table-totals-row`}>
                              <td>{row.anno}</td>
                              <td>
                                <span className={`funnel-pivot-label level-${row.livello}`}>{row.etichetta}</span>
                              </td>
                              <td className="num">{row.numeroProtocolli.toLocaleString('it-IT')}</td>
                              <td className={`num ${row.totaleBudgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetRicavo)}</td>
                              <td className={`num ${row.totaleBudgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetCosti)}</td>
                              <td className={`num ${row.totaleFatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoFuturo)}</td>
                              <td className={`num ${row.totaleFuturaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFuturaAnno)}</td>
                              <td className={`num ${row.totaleEmessaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleEmessaAnno)}</td>
                              <td className={`num ${row.totaleRicaviComplessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicaviComplessivi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!previsioniReportFunnelRccHasMultipleAggregazioni && previsioniReportFunnelRccTotaliPerAnno.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th className="num">Conteggio protocollo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Futura Anno</th>
                            <th className="num">Emessa Anno</th>
                            <th className="num">Totale Anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniReportFunnelRccTotaliPerAnno.map((row) => (
                            <tr key={`previsioni-report-funnel-rcc-totale-${row.anno}`} className="table-totals-row">
                              <td>{row.anno}</td>
                              <td className="num">{row.numeroProtocolli.toLocaleString('it-IT')}</td>
                              <td className={`num ${row.totaleBudgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetRicavo)}</td>
                              <td className={`num ${row.totaleBudgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetCosti)}</td>
                              <td className={`num ${row.totaleFatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoFuturo)}</td>
                              <td className={`num ${row.totaleFuturaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFuturaAnno)}</td>
                              <td className={`num ${row.totaleEmessaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleEmessaAnno)}</td>
                              <td className={`num ${row.totaleRicaviComplessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicaviComplessivi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'previsioni-report-funnel-bu' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Previsioni - Report Funnel BU</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessPrevisioniFunnelBuPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa analisi.
              </p>
            )}

            {canAccessPrevisioniFunnelBuPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-bu-anno">
                      <span>Anno</span>
                      <select
                        id="previsioni-report-funnel-bu-anno"
                        value={previsioniReportFunnelBuAnnoSelezionato}
                        onChange={(event) => setPrevisioniReportFunnelBuAnni([event.target.value])}
                      >
                        {previsioniReportFunnelBuAnnoOptions.map((year) => (
                          <option key={`previsioni-report-funnel-bu-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    {canSelectPrevisioniFunnelBu && (
                      <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-bu-bu">
                        <span>BU</span>
                        <select
                          id="previsioni-report-funnel-bu-bu"
                          value={previsioniReportFunnelBu}
                          onChange={(event) => setPrevisioniReportFunnelBu(event.target.value)}
                        >
                          <option value="">Tutte</option>
                          {previsioniReportFunnelBuOptions.map((value) => (
                            <option key={`previsioni-report-funnel-bu-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-report-funnel-bu-rcc">
                      <span>RCC</span>
                      <select
                        id="previsioni-report-funnel-bu-rcc"
                        value={previsioniReportFunnelBuRcc}
                        onChange={(event) => setPrevisioniReportFunnelBuRcc(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        {previsioniReportFunnelBuRccOptions.map((value) => (
                          <option key={`previsioni-report-funnel-bu-rcc-${value}`} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {previsioniReportFunnelBuData
                        ? `Anno ${previsioniReportFunnelBuAnnoSelezionato}. Visibilita: ${previsioniReportFunnelBuData.vediTutto ? 'tutte le BU' : `solo ${previsioniReportFunnelBuData.aggregazioneFiltro || 'BU corrente'}`}.`
                        : statusMessageVisible}
                    </p>
                    <span className="status-badge neutral">
                      {previsioniReportFunnelBuData ? `${previsioniReportFunnelBuPivotRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Report Funnel BU</h3>
                  </header>

                  {previsioniReportFunnelBuPivotRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}

                  {previsioniReportFunnelBuPivotRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>Etichette di riga</th>
                            <th className="num">Conteggio protocollo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Futura Anno</th>
                            <th className="num">Emessa Anno</th>
                            <th className="num">Totale Anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniReportFunnelBuPivotRows.map((row) => (
                            <tr key={row.key} className={`funnel-pivot-row level-${row.livello}`}>
                              <td>{row.anno}</td>
                              <td>
                                <span className={`funnel-pivot-label level-${row.livello}`}>{row.etichetta}</span>
                              </td>
                              <td className="num">{row.numeroProtocolli.toLocaleString('it-IT')}</td>
                              <td className={`num ${row.totaleBudgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetRicavo)}</td>
                              <td className={`num ${row.totaleBudgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetCosti)}</td>
                              <td className={`num ${row.totaleFatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoFuturo)}</td>
                              <td className={`num ${row.totaleFuturaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFuturaAnno)}</td>
                              <td className={`num ${row.totaleEmessaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleEmessaAnno)}</td>
                              <td className={`num ${row.totaleRicaviComplessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicaviComplessivi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>{previsioniReportFunnelBuHasMultipleAggregazioni ? 'Totali per anno (ripartiti per tipo/% successo)' : 'Totali per anno'}</h3>
                  </header>
                  {previsioniReportFunnelBuTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {previsioniReportFunnelBuHasMultipleAggregazioni && previsioniReportFunnelBuTotaliDettaglioRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>Etichette di riga</th>
                            <th className="num">Conteggio protocollo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Futura Anno</th>
                            <th className="num">Emessa Anno</th>
                            <th className="num">Totale Anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniReportFunnelBuTotaliDettaglioRows.map((row) => (
                            <tr key={`previsioni-report-funnel-bu-totale-dettaglio-${row.key}`} className={`funnel-pivot-row level-${row.livello} table-totals-row`}>
                              <td>{row.anno}</td>
                              <td>
                                <span className={`funnel-pivot-label level-${row.livello}`}>{row.etichetta}</span>
                              </td>
                              <td className="num">{row.numeroProtocolli.toLocaleString('it-IT')}</td>
                              <td className={`num ${row.totaleBudgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetRicavo)}</td>
                              <td className={`num ${row.totaleBudgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetCosti)}</td>
                              <td className={`num ${row.totaleFatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoFuturo)}</td>
                              <td className={`num ${row.totaleFuturaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFuturaAnno)}</td>
                              <td className={`num ${row.totaleEmessaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleEmessaAnno)}</td>
                              <td className={`num ${row.totaleRicaviComplessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicaviComplessivi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {!previsioniReportFunnelBuHasMultipleAggregazioni && previsioniReportFunnelBuTotaliPerAnno.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th className="num">Conteggio protocollo</th>
                            <th className="num">Budget Ricavo</th>
                            <th className="num">Budget Costi</th>
                            <th className="num">Fatturato Futuro</th>
                            <th className="num">Futura Anno</th>
                            <th className="num">Emessa Anno</th>
                            <th className="num">Totale Anno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniReportFunnelBuTotaliPerAnno.map((row) => (
                            <tr key={`previsioni-report-funnel-bu-totale-${row.anno}`} className="table-totals-row">
                              <td>{row.anno}</td>
                              <td className="num">{row.numeroProtocolli.toLocaleString('it-IT')}</td>
                              <td className={`num ${row.totaleBudgetRicavo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetRicavo)}</td>
                              <td className={`num ${row.totaleBudgetCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleBudgetCosti)}</td>
                              <td className={`num ${row.totaleFatturatoFuturo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFatturatoFuturo)}</td>
                              <td className={`num ${row.totaleFuturaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleFuturaAnno)}</td>
                              <td className={`num ${row.totaleEmessaAnno < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleEmessaAnno)}</td>
                              <td className={`num ${row.totaleRicaviComplessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicaviComplessivi)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'previsioni-utile-mensile-rcc' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Commesse - Utile Mensile RCC</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessPrevisioniUtileMensileRccPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa pagina.
              </p>
            )}

            {canAccessPrevisioniUtileMensileRccPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-rcc-anno">
                      <span>Anno</span>
                      <select
                        id="previsioni-utile-rcc-anno"
                        value={previsioniUtileMensileRccAnno}
                        onChange={(event) => setPrevisioniUtileMensileRccAnno(event.target.value)}
                      >
                        {previsioniUtileMensileRccAnnoOptions.map((year) => (
                          <option key={`previsioni-utile-rcc-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-rcc-mese-riferimento">
                      <span>Mese riferimento</span>
                      <select
                        id="previsioni-utile-rcc-mese-riferimento"
                        value={previsioniUtileMensileRccMeseRiferimento}
                        onChange={(event) => setPrevisioniUtileMensileRccMeseRiferimento(event.target.value)}
                      >
                        {mesiItaliani.map((mese, index) => {
                          const monthValue = (index + 1).toString()
                          return (
                            <option key={`previsioni-utile-rcc-mese-${monthValue}`} value={monthValue}>
                              {`${monthValue.padStart(2, '0')} - ${mese}`}
                            </option>
                          )
                        })}
                      </select>
                    </label>
                    {canSelectPrevisioniUtileMensileRcc && (
                      <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-rcc-rcc">
                        <span>RCC</span>
                        <select
                          id="previsioni-utile-rcc-rcc"
                          value={previsioniUtileMensileRcc}
                          onChange={(event) => setPrevisioniUtileMensileRcc(event.target.value)}
                        >
                          <option value="">Tutti</option>
                          {previsioniUtileMensileRccOptions.map((value) => (
                            <option key={`previsioni-utile-rcc-rcc-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-rcc-produzione">
                      <span>Produzione</span>
                      <select
                        id="previsioni-utile-rcc-produzione"
                        value={previsioniUtileMensileRccProduzione}
                        onChange={(event) => setPrevisioniUtileMensileRccProduzione(event.target.value)}
                      >
                        <option value="">Tutti</option>
                        <option value="1">1</option>
                        <option value="0">0</option>
                      </select>
                    </label>
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {previsioniUtileMensileRccData
                        ? `Anno ${previsioniUtileMensileRccAnno}. Visibilita: ${previsioniUtileMensileRccData.vediTutto ? 'tutti gli RCC' : `solo ${previsioniUtileMensileRccData.aggregazioneFiltro || 'RCC corrente'}`}. Mese riferimento: ${formatReferenceMonthLabel(previsioniUtileMensileRccMeseRiferimentoValue)}.`
                        : statusMessageVisible}
                    </p>
                    <div className="sintesi-toolbar-badges">
                      <span className="status-badge neutral">
                        Mese rif.: {formatReferenceMonthLabel(previsioniUtileMensileRccMeseRiferimentoValue)}
                      </span>
                      <span className="status-badge neutral">
                        {previsioniUtileMensileRccData ? `${previsioniUtileMensileRccRows.length} righe` : '0 righe'}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Utile Mensile RCC</h3>
                  </header>
                  {previsioniUtileMensileRccRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}
                  {previsioniUtileMensileRccRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>RCC</th>
                            <th className="num">Totale Ricavi</th>
                            <th className="num">Totale Costi</th>
                            <th className="num">Totale Costo Personale</th>
                            <th className="num">Totale Utile Specifico</th>
                            <th className="num">Totale Ore Lavorate</th>
                            <th className="num">Totale Costo Generale Ribaltato</th>
                            <th className="num">% Margine su Ricavi</th>
                            <th className="num">% Markup su Costi</th>
                            <th className="num">% Cost Income</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniUtileMensileRccRows.map((row) => (
                            <tr key={`previsioni-utile-rcc-${row.anno}-${row.aggregazione}`}>
                              <td>{row.anno}</td>
                              <td>{row.aggregazione}</td>
                              <td className={`num ${row.totaleRicavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavi)}</td>
                              <td className={`num ${row.totaleCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCosti)}</td>
                              <td className={`num ${row.totaleCostoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoPersonale)}</td>
                              <td className={`num ${row.totaleUtileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleUtileSpecifico)}</td>
                              <td className="num">{formatNumber(row.totaleOreLavorate)}</td>
                              <td className={`num ${row.totaleCostoGeneraleRibaltato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoGeneraleRibaltato)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMargineSuRicavi)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMarkupSuCosti)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeCostIncome)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Totali per anno</h3>
                  </header>
                  {previsioniUtileMensileRccTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {previsioniUtileMensileRccTotaliPerAnno.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th className="num">Totale Ricavi</th>
                            <th className="num">Totale Costi</th>
                            <th className="num">Totale Costo Personale</th>
                            <th className="num">Totale Utile Specifico</th>
                            <th className="num">Totale Ore Lavorate</th>
                            <th className="num">Totale Costo Generale Ribaltato</th>
                            <th className="num">% Margine su Ricavi</th>
                            <th className="num">% Markup su Costi</th>
                            <th className="num">% Cost Income</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniUtileMensileRccTotaliPerAnno.map((row) => (
                            <tr key={`previsioni-utile-rcc-totale-${row.anno}`} className="table-totals-row">
                              <td>{row.anno}</td>
                              <td className={`num ${row.totaleRicavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavi)}</td>
                              <td className={`num ${row.totaleCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCosti)}</td>
                              <td className={`num ${row.totaleCostoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoPersonale)}</td>
                              <td className={`num ${row.totaleUtileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleUtileSpecifico)}</td>
                              <td className="num">{formatNumber(row.totaleOreLavorate)}</td>
                              <td className={`num ${row.totaleCostoGeneraleRibaltato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoGeneraleRibaltato)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMargineSuRicavi)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMarkupSuCosti)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeCostIncome)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'previsioni-utile-mensile-bu' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi Commesse - Utile Mensile BU</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>

            {!canAccessPrevisioniUtileMensileBuPage && (
              <p className="empty-state">
                Il profilo corrente non e' abilitato a questa pagina.
              </p>
            )}

            {canAccessPrevisioniUtileMensileBuPage && (
              <>
                <section className="panel sintesi-filter-panel">
                  <form className={`analisi-rcc-toolbar ${isAnalisiSearchCollapsed ? 'is-collapsed' : ''}`} onSubmit={handleAnalisiSubmit}>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-bu-anno">
                      <span>Anno</span>
                      <select
                        id="previsioni-utile-bu-anno"
                        value={previsioniUtileMensileBuAnno}
                        onChange={(event) => setPrevisioniUtileMensileBuAnno(event.target.value)}
                      >
                        {previsioniUtileMensileBuAnnoOptions.map((year) => (
                          <option key={`previsioni-utile-bu-anno-${year}`} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-bu-mese-riferimento">
                      <span>Mese riferimento</span>
                      <select
                        id="previsioni-utile-bu-mese-riferimento"
                        value={previsioniUtileMensileBuMeseRiferimento}
                        onChange={(event) => setPrevisioniUtileMensileBuMeseRiferimento(event.target.value)}
                      >
                        {mesiItaliani.map((mese, index) => {
                          const monthValue = (index + 1).toString()
                          return (
                            <option key={`previsioni-utile-bu-mese-${monthValue}`} value={monthValue}>
                              {`${monthValue.padStart(2, '0')} - ${mese}`}
                            </option>
                          )
                        })}
                      </select>
                    </label>
                    {canSelectPrevisioniUtileMensileBu && (
                      <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-bu-bu">
                        <span>BU</span>
                        <select
                          id="previsioni-utile-bu-bu"
                          value={previsioniUtileMensileBu}
                          onChange={(event) => setPrevisioniUtileMensileBu(event.target.value)}
                        >
                          <option value="">Tutte</option>
                          {previsioniUtileMensileBuOptions.map((value) => (
                            <option key={`previsioni-utile-bu-bu-${value}`} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="analisi-rcc-year-field" htmlFor="previsioni-utile-bu-produzione">
                      <span>Produzione</span>
                      <select
                        id="previsioni-utile-bu-produzione"
                        value={previsioniUtileMensileBuProduzione}
                        onChange={(event) => setPrevisioniUtileMensileBuProduzione(event.target.value)}
                      >
                        <option value="">Tutte</option>
                        <option value="1">1</option>
                        <option value="0">0</option>
                      </select>
                    </label>
                    <div className="inline-actions analisi-inline-actions">
                      <button type="submit" disabled={analisiRccLoading}>
                        {analisiRccLoading ? 'Caricamento...' : 'Cerca'}
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={exportAnalisiExcel}
                        disabled={analisiRccLoading || !canExportAnalisiPage}
                      >
                        Export Excel
                      </button>
                      {isAnalisiSearchCollapsible && (
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={toggleAnalisiSearchCollapsed}
                        >
                          {isAnalisiSearchCollapsed ? 'Mostra ricerca' : 'Nascondi ricerca'}
                        </button>
                      )}
                      <span className="status-badge neutral sintesi-inline-count-badge">
                        {analisiPageCountLabel}
                      </span>
                    </div>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {previsioniUtileMensileBuData
                        ? `Anno ${previsioniUtileMensileBuAnno}. Visibilita: ${previsioniUtileMensileBuData.vediTutto ? 'tutte le BU' : `solo ${previsioniUtileMensileBuData.aggregazioneFiltro || 'BU corrente'}`}. Mese riferimento: ${formatReferenceMonthLabel(previsioniUtileMensileBuMeseRiferimentoValue)}.`
                        : statusMessageVisible}
                    </p>
                    <div className="sintesi-toolbar-badges">
                      <span className="status-badge neutral">
                        Mese rif.: {formatReferenceMonthLabel(previsioniUtileMensileBuMeseRiferimentoValue)}
                      </span>
                      <span className="status-badge neutral">
                        {previsioniUtileMensileBuData ? `${previsioniUtileMensileBuRows.length} righe` : '0 righe'}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Utile Mensile BU</h3>
                  </header>
                  {previsioniUtileMensileBuRows.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun dato disponibile per i criteri correnti.</p>
                  )}
                  {previsioniUtileMensileBuRows.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th>BU</th>
                            <th className="num">Totale Ricavi</th>
                            <th className="num">Totale Costi</th>
                            <th className="num">Totale Costo Personale</th>
                            <th className="num">Totale Utile Specifico</th>
                            <th className="num">Totale Ore Lavorate</th>
                            <th className="num">Totale Costo Generale Ribaltato</th>
                            <th className="num">% Margine su Ricavi</th>
                            <th className="num">% Markup su Costi</th>
                            <th className="num">% Cost Income</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniUtileMensileBuRows.map((row) => (
                            <tr key={`previsioni-utile-bu-${row.anno}-${row.aggregazione}`}>
                              <td>{row.anno}</td>
                              <td>{row.aggregazione}</td>
                              <td className={`num ${row.totaleRicavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavi)}</td>
                              <td className={`num ${row.totaleCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCosti)}</td>
                              <td className={`num ${row.totaleCostoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoPersonale)}</td>
                              <td className={`num ${row.totaleUtileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleUtileSpecifico)}</td>
                              <td className="num">{formatNumber(row.totaleOreLavorate)}</td>
                              <td className={`num ${row.totaleCostoGeneraleRibaltato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoGeneraleRibaltato)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMargineSuRicavi)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMarkupSuCosti)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeCostIncome)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>Totali per anno</h3>
                  </header>
                  {previsioniUtileMensileBuTotaliPerAnno.length === 0 && !analisiRccLoading && (
                    <p className="empty-state">Nessun totale disponibile per i criteri correnti.</p>
                  )}
                  {previsioniUtileMensileBuTotaliPerAnno.length > 0 && (
                    <div className="bonifici-table-wrap bonifici-table-wrap-main">
                      <table className="bonifici-table">
                        <thead>
                          <tr>
                            <th>Anno</th>
                            <th className="num">Totale Ricavi</th>
                            <th className="num">Totale Costi</th>
                            <th className="num">Totale Costo Personale</th>
                            <th className="num">Totale Utile Specifico</th>
                            <th className="num">Totale Ore Lavorate</th>
                            <th className="num">Totale Costo Generale Ribaltato</th>
                            <th className="num">% Margine su Ricavi</th>
                            <th className="num">% Markup su Costi</th>
                            <th className="num">% Cost Income</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previsioniUtileMensileBuTotaliPerAnno.map((row) => (
                            <tr key={`previsioni-utile-bu-totale-${row.anno}`} className="table-totals-row">
                              <td>{row.anno}</td>
                              <td className={`num ${row.totaleRicavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleRicavi)}</td>
                              <td className={`num ${row.totaleCosti < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCosti)}</td>
                              <td className={`num ${row.totaleCostoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoPersonale)}</td>
                              <td className={`num ${row.totaleUtileSpecifico < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleUtileSpecifico)}</td>
                              <td className="num">{formatNumber(row.totaleOreLavorate)}</td>
                              <td className={`num ${row.totaleCostoGeneraleRibaltato < 0 ? 'num-negative' : ''}`}>{formatNumber(row.totaleCostoGeneraleRibaltato)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMargineSuRicavi)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeMarkupSuCosti)}</td>
                              <td className="num">{formatAnalisiRccPercent(row.percentualeCostIncome)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        )}

        {activePage === 'commessa-dettaglio' && (
          <section className="panel sintesi-page detail-page">
            <span className="sr-only" aria-live="polite">
              {`Dettaglio commessa ${detailCommessa ? `"${detailCommessa}"` : ''}. ${
                detailStatusMessage || 'Dettaglio commessa in caricamento.'
              }`}
            </span>

            <section className="detail-top-zone">
              <section className="panel detail-anagrafica-panel">
                <header className="panel-header">
                  <h3>Anagrafica Commessa</h3>
                  <div className="detail-header-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={exportDettaglioExcel}
                      disabled={detailLoading || !detailData}
                    >
                      Export Excel
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={backToSintesi}
                    >
                      Torna a Sintesi
                    </button>
                  </div>
                </header>

              {!detailAnagrafica && !detailLoading && (
                <p className="empty-state">Nessun dato anagrafico disponibile per la commessa selezionata.</p>
              )}

              {detailAnagrafica && (
                <div className="bonifici-table-wrap">
                  <table className="bonifici-table detail-anagrafica-table">
                    <thead>
                      <tr>
                        <th>Commessa</th>
                        <th>Descrizione</th>
                        <th>Tipologia</th>
                        <th>Stato</th>
                        <th>Macrotipologia</th>
                        <th>Prodotto</th>
                        <th>Controparte</th>
                        <th>Business Unit</th>
                        <th>RCC</th>
                        <th>PM</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{detailAnagrafica.commessa}</td>
                        <td>{detailAnagrafica.descrizioneCommessa}</td>
                        <td>{detailAnagrafica.tipologiaCommessa}</td>
                        <td>{detailAnagrafica.stato}</td>
                        <td>{detailAnagrafica.macroTipologia}</td>
                        <td>{detailAnagrafica.prodotto}</td>
                        <td>{detailAnagrafica.controparte}</td>
                        <td>{detailAnagrafica.businessUnit}</td>
                        <td>{detailAnagrafica.rcc}</td>
                        <td>{detailAnagrafica.pm}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel detail-summary-strip-panel">
              <div className="bonifici-table-wrap detail-kpi-table-wrap" role="status" aria-live="polite">
                <table className="bonifici-table detail-kpi-table">
                  <thead>
                    <tr>
                      <th className="detail-kpi-group-head" colSpan={5}>
                        Consuntivato {detailLastDayPreviousMonth ? `${detailLastDayPreviousMonth.toLocaleDateString('it-IT')} (anni precedenti inclusi)` : 'mese precedente'}
                      </th>
                      <th className="detail-kpi-group-head" colSpan={3}>
                        {detailCurrentYear > 0 ? `Futuro ${detailCurrentYear}` : 'Futuro'}
                      </th>
                      <th className="detail-kpi-group-head" colSpan={5}>
                        Proiezione {detailLastDayPreviousMonth ? detailLastDayPreviousMonth.toLocaleDateString('it-IT') : 'mese precedente'}
                      </th>
                      <th className="detail-kpi-group-head detail-kpi-action-col" colSpan={1}>
                        Azione
                      </th>
                    </tr>
                    <tr>
                      <th className="num">Ore lavorate</th>
                      <th className="num">Costo personale</th>
                      <th className="num">Ricavi passati</th>
                      <th className="num">Costi passati</th>
                      <th className="num">Utile consuntivato</th>
                      <th className="num">Ricavi futuri</th>
                      <th className="num">Costi futuri</th>
                      <th className="num">Ore future</th>
                      <th className="num">
                        <span className="detail-tooltip-label" title="Ricavo futuro da elaborare.">
                          Ricavo previsto
                        </span>
                      </th>
                      <th className="detail-kpi-percent-col">
                        <span className="detail-tooltip-label" title="% di sviluppo realizzata.">
                          % raggiunto
                        </span>
                      </th>
                      <th className="num">
                        <span className="detail-tooltip-label" title="Ricavo futuro attualizzato ad oggi secondo la percentuale della lavorazione realizzata.">
                          Ricavo maturato
                        </span>
                      </th>
                      <th className="num">
                        <span className="detail-tooltip-label" title="Ricavo storico + Ricavo maturato - Costo storico - Costo del personale.">
                          Utile ricalcolato
                        </span>
                      </th>
                      <th className="num">
                        <span className="detail-tooltip-label" title="Ricavo storico + Ricavo futuro - Costo storico - Costo futuro - Costo del personale storico - Costo del personale storico * (1 - % avanzamento).">
                          Utile fine progetto
                        </span>
                      </th>
                      <th className="detail-kpi-action-col">Salva</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={`num ${detailConsuntivoMesePrecedente.oreLavorate < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailConsuntivoMesePrecedente.oreLavorate)}
                      </td>
                      <td className={`num ${detailConsuntivoMesePrecedente.costoPersonale < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailConsuntivoMesePrecedente.costoPersonale)}
                      </td>
                      <td className={`num ${detailConsuntivoMesePrecedente.ricavi < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailConsuntivoMesePrecedente.ricavi)}
                      </td>
                      <td className={`num ${detailCostiPassatiRiconciliati < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailCostiPassatiRiconciliati)}
                      </td>
                      <td className={`num ${detailUtileConsuntivatoRiconciliato < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailUtileConsuntivatoRiconciliato)}
                      </td>
                      <td className={`num ${detailRicaviFuturiAggregati < 0 ? 'num-negative' : ''}`}>{formatNumber(detailRicaviFuturiAggregati)}</td>
                      <td className={`num ${detailCostiFuturiAggregati < 0 ? 'num-negative' : ''}`}>{formatNumber(detailCostiFuturiAggregati)}</td>
                      <td className={`num ${detailOreFuture < 0 ? 'num-negative' : ''}`}>{formatNumber(detailOreFuture)}</td>
                      <td className={`num ${detailRicavoPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(detailRicavoPrevisto)}</td>
                      <td className="detail-kpi-percent-cell">
                        <label className="detail-kpi-percent-input-wrap">
                          <input
                            className="detail-kpi-percent-input"
                            type="text"
                            inputMode="decimal"
                            value={detailPercentRaggiuntoInput}
                            onChange={handleDetailPercentRaggiuntoInputChange}
                            onBlur={handleDetailPercentRaggiuntoInputBlur}
                            aria-label="% raggiunto progetto"
                          />
                          <span className="detail-kpi-percent-suffix">%</span>
                        </label>
                      </td>
                      <td className={`num ${detailRicavoMaturatoAlMesePrecedente < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailRicavoMaturatoAlMesePrecedente)}
                      </td>
                      <td className={`num ${detailUtileRicalcolatoMesePrecedente < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailUtileRicalcolatoMesePrecedente)}
                      </td>
                      <td className={`num ${detailUtileFineProgetto < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailUtileFineProgetto)}
                      </td>
                      <td className="detail-kpi-action-cell">
                        <button
                          type="button"
                          onClick={handleSaveDetailPercentRaggiunto}
                          disabled={detailLoading || detailSaving || !detailData?.commessa}
                        >
                          {detailSaving ? 'Salvataggio...' : 'Salva'}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            </section>

            <section className="detail-main-zone">
            <section className="detail-grid-panels">
              <section className="panel detail-card detail-card-consuntivo">
                <header className="panel-header">
                  <h3>Consuntivo storico</h3>
                </header>
                <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                  {(detailSintesiRows.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessun dato numerico disponibile per la commessa selezionata.</p>
                  )}

                  {detailSintesiRows.length > 0 && (
                    <table className="bonifici-table detail-numeri-table">
                      <thead>
                        <tr>
                          <th>Anno</th>
                          <th>Scenario</th>
                          <th className="num">Utile</th>
                          <th className="num">Ore Lavorate</th>
                          <th className="num">Costo Personale</th>
                          <th className="num">Ricavi</th>
                          <th className="num">Costi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailSintesiRows.map((row) => (
                          <tr key={row.key} className={row.isMonthRow ? 'detail-progressivo-row' : ''}>
                            <td>{row.anno}</td>
                            <td>{row.scenario}</td>
                            <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                              {formatNumber(row.utileSpecifico)}
                            </td>
                            <td className="num">{formatNumber(row.oreLavorate)}</td>
                            <td className={`num ${row.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPersonale)}</td>
                            <td className={`num ${row.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavi)}</td>
                            <td className={`num ${row.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costi)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-totals-row">
                          <td colSpan={2} className="table-totals-label">Totale</td>
                          <td className={`num ${detailTotals.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                            {formatNumber(detailTotals.utileSpecifico)}
                          </td>
                          <td className="num">{formatNumber(detailTotals.oreLavorate)}</td>
                          <td className={`num ${detailTotals.costoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(detailTotals.costoPersonale)}</td>
                          <td className={`num ${detailTotals.ricavi < 0 ? 'num-negative' : ''}`}>{formatNumber(detailTotals.ricavi)}</td>
                          <td className={`num ${detailTotals.costi < 0 ? 'num-negative' : ''}`}>{formatNumber(detailTotals.costi)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>

              <section className="panel detail-card detail-card-vendite">
                <header className="panel-header">
                  <h3>Vendite ordinate per data</h3>
                </header>
                <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                  {(detailVenditeSorted.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessuna vendita disponibile per la commessa selezionata.</p>
                  )}

                  {detailVenditeSorted.length > 0 && (
                    <table className="bonifici-table detail-movimenti-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th className="num">Importo</th>
                          <th>Documento</th>
                          <th>Descrizione</th>
                          <th>Provenienza</th>
                          <th>Temporale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailVenditeSorted.map((row, index) => (
                          <tr key={`vendita-${row.numeroDocumento}-${row.dataMovimento ?? 'na'}-${index}`} className={row.isFuture ? 'detail-mov-row-future' : 'detail-mov-row-past'}>
                            <td>{formatDate(row.dataMovimento)}</td>
                            <td className={`num ${row.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importo)}</td>
                            <td>{row.numeroDocumento}</td>
                            <td>{row.descrizione}</td>
                            <td>{row.provenienza}</td>
                            <td>
                              <span className={`detail-time-badge ${row.isFuture ? 'future' : 'past'}`}>
                                {row.statoTemporale || (row.isFuture ? 'Futuro' : 'Passato')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-totals-row">
                          <td className="table-totals-label">Totale</td>
                          <td className={`num ${detailVenditeTotaleImporto < 0 ? 'num-negative' : ''}`}>{formatNumber(detailVenditeTotaleImporto)}</td>
                          <td colSpan={4} />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>

              <section className="panel detail-card detail-card-acquisti">
                <header className="panel-header">
                  <h3>Acquisti ordinati per data</h3>
                </header>
                <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                  {(detailAcquistiSorted.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessun acquisto disponibile per la commessa selezionata.</p>
                  )}

                  {detailAcquistiSorted.length > 0 && (
                    <table className="bonifici-table detail-movimenti-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th className="num">Importo</th>
                          <th>Documento</th>
                          <th>Descrizione</th>
                          <th>Controparte</th>
                          <th>Provenienza</th>
                          <th>Temporale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailAcquistiSorted.map((row, index) => (
                          <tr key={`acquisto-${row.numeroDocumento}-${row.dataMovimento ?? 'na'}-${index}`} className={row.isFuture ? 'detail-mov-row-future' : 'detail-mov-row-past'}>
                            <td>{formatDate(row.dataMovimento)}</td>
                            <td className={`num ${row.importo < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importo)}</td>
                            <td>{row.numeroDocumento}</td>
                            <td>{row.descrizione}</td>
                            <td>{row.controparte}</td>
                            <td>{row.provenienza}</td>
                            <td>
                              <span className={`detail-time-badge ${row.isFuture ? 'future' : 'past'}`}>
                                {row.statoTemporale || (row.isFuture ? 'Futuro' : 'Passato')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-totals-row">
                          <td className="table-totals-label">Totale</td>
                          <td className={`num ${detailAcquistiTotaleImporto < 0 ? 'num-negative' : ''}`}>{formatNumber(detailAcquistiTotaleImporto)}</td>
                          <td colSpan={5} />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>

              <section className="panel detail-card detail-card-ordini">
                <header className="panel-header">
                  <h3>Ordini</h3>
                </header>
                <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                  {(detailOrdiniSorted.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessun ordine disponibile per la commessa selezionata.</p>
                  )}

                  {detailOrdiniSorted.length > 0 && (
                    <table className="bonifici-table detail-ordini-table">
                      <thead>
                        <tr>
                          <th>Protocollo</th>
                          <th>Stato</th>
                          <th>Posizione</th>
                          <th>Descrizione</th>
                          <th className="num">QuantitÃ </th>
                          <th className="num">Prezzo Unit.</th>
                          <th className="num">Importo Ordine</th>
                          <th className="num">QtÃ  originale</th>
                          <th className="num">QtÃ  fatture</th>
                          <th className="num">% raggiung.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOrdiniSorted.map((row) => {
                          const percentualeRiga = row.quantita <= 0 ? 0 : row.quantitaFatture / row.quantita
                          return (
                            <tr key={`ordine-${row.idDettaglioOrdine}`}>
                              <td>{row.protocollo}</td>
                              <td>{row.documentoStato}</td>
                              <td>{row.posizione}</td>
                              <td>{row.descrizione}</td>
                              <td className="num">{formatNumber(row.quantita)}</td>
                              <td className="num">{formatNumber(row.prezzoUnitario)}</td>
                              <td className={`num ${row.importoOrdine < 0 ? 'num-negative' : ''}`}>{formatNumber(row.importoOrdine)}</td>
                              <td className="num">{formatNumber(row.quantitaOriginaleOrdinata)}</td>
                              <td className="num">{formatNumber(row.quantitaFatture)}</td>
                              <td className="num">{formatPercentRatio(percentualeRiga)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="table-totals-row">
                          <td colSpan={6} className="table-totals-label">Totale</td>
                          <td className={`num ${detailOrdiniAggregati.importoOrdinato < 0 ? 'num-negative' : ''}`}>
                            {formatNumber(detailOrdiniAggregati.importoOrdinato)}
                          </td>
                          <td className="num">{formatNumber(detailOrdiniAggregati.quantitaOriginale)}</td>
                          <td className="num">{formatNumber(detailOrdiniAggregati.quantitaFatturata)}</td>
                          <td className="num">{formatPercentRatio(detailOrdiniPercentualeQuantita)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>

              <section className="panel detail-card detail-card-offerte">
                <header className="panel-header">
                  <h3>Offerte</h3>
                </header>
                <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                  {(detailOfferteSorted.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessuna offerta disponibile per la commessa selezionata.</p>
                  )}

                  {detailOfferteSorted.length > 0 && (
                    <table className="bonifici-table detail-offerte-table">
                      <thead>
                        <tr>
                          <th>Anno</th>
                          <th>Data</th>
                          <th>Protocollo</th>
                          <th>Oggetto</th>
                          <th>Stato</th>
                          <th className="num">Ricavo Previsto</th>
                          <th className="num">Costo Previsto</th>
                          <th className="num">Costo Prev. Personale</th>
                          <th className="num">Ore prev. offerta</th>
                          <th className="num">% Successo</th>
                          <th>Ordini collegati</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOfferteSorted.map((row, index) => (
                          <tr key={`offerta-${row.protocollo}-${index}`}>
                            <td>{row.anno ?? ''}</td>
                            <td>{formatDate(row.data)}</td>
                            <td>{row.protocollo}</td>
                            <td>{row.oggetto}</td>
                            <td>{row.documentoStato}</td>
                            <td className={`num ${row.ricavoPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.ricavoPrevisto)}</td>
                            <td className={`num ${row.costoPrevisto < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPrevisto)}</td>
                            <td className={`num ${row.costoPrevistoPersonale < 0 ? 'num-negative' : ''}`}>{formatNumber(row.costoPrevistoPersonale)}</td>
                            <td className={`num ${row.orePrevisteOfferta < 0 ? 'num-negative' : ''}`}>{formatNumber(row.orePrevisteOfferta)}</td>
                            <td className="num">{formatPercentValue(row.percentualeSuccesso)}</td>
                            <td>{row.ordiniCollegati}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              <section className="panel detail-card detail-card-percent">
                <header className="panel-header">
                  <h3>% raggiungimento</h3>
                </header>
                <div className="detail-card-body detail-raggiungimento-body">
                  <div className="detail-avanzamento-box">
                    <p className="detail-kpi-caption">
                      Dati salvati in produzione.avanzamento (stessa data riferimento = sovrascrittura).
                    </p>

                    {detailAvanzamentoStorico.length === 0 && (
                      <p className="empty-state">Nessun avanzamento salvato disponibile per la commessa selezionata.</p>
                    )}

                    {detailAvanzamentoStorico.length > 0 && (
                      <table className="bonifici-table detail-avanzamento-table detail-avanzamento-grid-table">
                        <thead>
                          <tr>
                            <th>Data riferimento</th>
                            <th className="num">% raggiunto</th>
                            <th className="num">Importo riferimento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailAvanzamentoStorico.map((row) => (
                            <tr key={`avanzamento-${row.id}`}>
                              <td>{formatDate(row.dataRiferimento)}</td>
                              <td className="num">{formatPercentValue(row.percentualeRaggiunto)}</td>
                              <td className={`num ${row.importoRiferimento < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(row.importoRiferimento)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </section>

              <section className="panel detail-card detail-card-requisiti">
                <header className="panel-header">
                  <h3>Ore requisiti commessa</h3>
                </header>
                <div className="detail-card-body">
                  <p className="detail-kpi-caption">
                    Speso attivitÃƒÂ  fino al {detailLastDayPreviousMonth ? detailLastDayPreviousMonth.toLocaleDateString('it-IT') : '-'}.
                  </p>

                  {detailRequisitiOreRows.length === 0 && (
                    <p className="empty-state">
                      Nessun requisito con ore previste/spese disponibile per la commessa selezionata.
                    </p>
                  )}

                  {detailRequisitiOreRows.length > 0 && (
                    <>
                      <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                        <table className="bonifici-table detail-requisiti-table">
                          <thead>
                            <tr>
                              <th>Requisito</th>
                              <th className="num">Ore Previste</th>
                              <th className="num">Ore Spese</th>
                              <th className="num">Ore Restanti</th>
                              <th className="num">% Avanzamento</th>
                              <th>Dettaglio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailRequisitiOreRows.map((row) => {
                              const isExpanded = selectedRequisitoId === row.idRequisito
                              const risorseRows = isExpanded
                                ? detailRequisitiOreRisorseRows.filter((item) => item.idRequisito === row.idRequisito)
                                : []
                              const risorseTotals = risorseRows.reduce((acc, item) => ({
                                orePreviste: acc.orePreviste + item.orePreviste,
                                oreSpese: acc.oreSpese + item.oreSpese,
                                oreRestanti: acc.oreRestanti + item.oreRestanti,
                              }), {
                                orePreviste: 0,
                                oreSpese: 0,
                                oreRestanti: 0,
                              })

                              return (
                                <Fragment key={`requisito-${row.idRequisito}`}>
                                  <tr>
                                    <td>{row.requisito || `Requisito ${row.idRequisito}`}</td>
                                    <td className="num">{formatNumber(row.orePreviste)}</td>
                                    <td className="num">{formatNumber(row.oreSpese)}</td>
                                    <td className={`num ${row.oreRestanti < 0 ? 'num-negative' : ''}`}>
                                      {formatNumber(row.oreRestanti)}
                                    </td>
                                    <td className="num">{formatPercentRatio(row.percentualeAvanzamento)}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="ghost-button detail-inline-action"
                                        onClick={() => toggleRequisitoDettaglio(row.idRequisito)}
                                      >
                                        {isExpanded ? 'Nascondi' : 'Vedi'}
                                      </button>
                                    </td>
                                  </tr>

                                  {isExpanded && (
                                    <tr className="detail-requisito-expand-row">
                                      <td colSpan={6}>
                                        {risorseRows.length === 0 && (
                                          <p className="empty-state">Nessun dettaglio risorsa disponibile per il requisito selezionato.</p>
                                        )}
                                        {risorseRows.length > 0 && (
                                          <div className="detail-requisiti-dettaglio">
                                            <table className="bonifici-table detail-requisiti-table detail-requisiti-table-inline">
                                              <thead>
                                                <tr>
                                                  <th>Risorsa</th>
                                                  <th className="num">Ore Previste</th>
                                                  <th className="num">Ore Spese</th>
                                                  <th className="num">Ore Restanti</th>
                                                  <th className="num">% Avanzamento</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {risorseRows.map((item) => (
                                                  <tr key={`requisito-risorsa-${item.idRequisito}-${item.idRisorsa}`}>
                                                    <td>{item.nomeRisorsa || `ID ${item.idRisorsa}`}</td>
                                                    <td className="num">{formatNumber(item.orePreviste)}</td>
                                                    <td className="num">{formatNumber(item.oreSpese)}</td>
                                                    <td className={`num ${item.oreRestanti < 0 ? 'num-negative' : ''}`}>
                                                      {formatNumber(item.oreRestanti)}
                                                    </td>
                                                    <td className="num">{formatPercentRatio(item.percentualeAvanzamento)}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                              <tfoot>
                                                <tr className="table-totals-row">
                                                  <td className="table-totals-label">Totale requisito</td>
                                                  <td className="num">{formatNumber(risorseTotals.orePreviste)}</td>
                                                  <td className="num">{formatNumber(risorseTotals.oreSpese)}</td>
                                                  <td className={`num ${risorseTotals.oreRestanti < 0 ? 'num-negative' : ''}`}>
                                                    {formatNumber(risorseTotals.oreRestanti)}
                                                  </td>
                                                  <td className="num">
                                                    {formatPercentRatio(
                                                      risorseTotals.orePreviste > 0
                                                        ? risorseTotals.oreSpese / risorseTotals.orePreviste
                                                        : 0,
                                                    )}
                                                  </td>
                                                </tr>
                                              </tfoot>
                                            </table>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="table-totals-row">
                              <td className="table-totals-label">Totale</td>
                              <td className="num">{formatNumber(detailRequisitiOreTotals.orePreviste)}</td>
                              <td className="num">{formatNumber(detailRequisitiOreTotals.oreSpese)}</td>
                              <td className={`num ${detailRequisitiOreTotals.oreRestanti < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(detailRequisitiOreTotals.oreRestanti)}
                              </td>
                              <td className="num">
                                {formatPercentRatio(
                                  detailRequisitiOreTotals.orePreviste > 0
                                    ? detailRequisitiOreTotals.oreSpese / detailRequisitiOreTotals.orePreviste
                                    : 0,
                                )}
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </section>
            </section>
          </section>
        )}
      </main>

      {infoModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="info-title">
            <header className="modal-header">
              <h2 id="info-title">Info Utente</h2>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setInfoModalOpen(false)}
              >
                Chiudi
              </button>
            </header>
            <div className="modal-details">
              <p><strong>Utente autenticato:</strong> {user?.authenticatedUsername || user?.username || 'n/d'}</p>
              <p><strong>Utente effettivo:</strong> {user?.username || 'n/d'}</p>
              <p><strong>Impersonificazione:</strong> {isImpersonating ? 'Attiva' : 'Non attiva'}</p>
              <p><strong>Ruoli autenticati:</strong> {authenticatedRoles.length > 0 ? authenticatedRoles.join(', ') : 'n/d'}</p>
              <p><strong>Profili effettivi:</strong> {profiles.length > 0 ? profiles.join(', ') : 'n/d'}</p>
              <p><strong>OU effettive:</strong> {ouScopes.length > 0 ? ouScopes.join(', ') : 'n/d'}</p>
            </div>
          </section>
        </div>
      )}

      {appInfoModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card app-info-modal-card" role="dialog" aria-modal="true" aria-labelledby="app-info-title">
            <header className="modal-header">
              <h2 id="app-info-title">Info Applicazione - Produzione</h2>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setAppInfoModalOpen(false)}
              >
                Chiudi
              </button>
            </header>
            <div className="modal-details app-info-details">
              <p className="app-info-intro">
                Riepilogo menu e funzionalita principali attive in questa versione dell applicazione.
              </p>
              <p className="app-info-intro">
                Profilo attivo: {currentProfile || 'n/d'}.
                {canEditAppInfo ? ' Modalita modifica descrizioni attiva.' : ' Modalita sola lettura.'}
              </p>
              {appInfoStatus && (
                <p className="app-info-intro">{appInfoStatus}</p>
              )}
              {appInfoLoading && (
                <p className="app-info-intro">Caricamento in corso...</p>
              )}
              {appInfoByMenu.map((group) => (
                <section key={`app-info-${group.menu}`} className="app-info-menu-block">
                  <h3>{group.menu}</h3>
                  <ul className="app-info-voice-list">
                    {group.voci.map((item) => {
                      const itemKey = appInfoVoiceKey(item.menu, item.voce)
                      const draftValue = appInfoDrafts[itemKey] ?? item.sintesi
                      const isSaving = appInfoSavingKey === itemKey
                      const canSave = canEditAppInfo && !appInfoLoading && !isSaving
                      return (
                      <li key={`app-info-${group.menu}-${item.voce}`} className="app-info-voice-item">
                        <p className="app-info-voice-title">{item.voce}</p>
                        {canEditAppInfo ? (
                          <>
                            <textarea
                              className="app-info-voice-input"
                              value={draftValue}
                              onChange={(event) => setAppInfoDrafts((current) => ({
                                ...current,
                                [itemKey]: event.target.value,
                              }))}
                              rows={3}
                            />
                            <div className="app-info-voice-actions">
                              <button
                                type="button"
                                className="ghost-button"
                                disabled={!canSave}
                                onClick={() => void saveAppInfoDescription(item.menu, item.voce)}
                              >
                                {isSaving ? 'Salvo...' : 'Salva'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="app-info-voice-summary">{item.sintesi}</p>
                        )}
                      </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </section>
        </div>
      )}

      {impersonationModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="impersona-title">
            <header className="modal-header">
              <h2 id="impersona-title">Impersonifica Utente</h2>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setImpersonationModalOpen(false)}
                disabled={sessionLoading}
              >
                Chiudi
              </button>
            </header>
            <form className="form" onSubmit={(event) => void applyImpersonation(event)}>
              <label htmlFor="impersona-user">Username target</label>
              <input
                id="impersona-user"
                value={impersonationInput}
                onChange={(event) => setImpersonationInput(event.target.value)}
                placeholder="es: acastiglione"
                autoFocus
              />
              {isImpersonating && (
                <p className="menu-note">
                  Attiva: {user?.impersonatorUsername || user?.authenticatedUsername || '-'}
                  {' -> '}
                  {user?.username}
                </p>
              )}
              <div className="inline-actions">
                <button type="submit" disabled={sessionLoading}>
                  {sessionLoading ? 'Attendi...' : 'Applica'}
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  disabled={sessionLoading || !isImpersonating}
                  onClick={() => void stopImpersonation()}
                >
                  Termina
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

export default App




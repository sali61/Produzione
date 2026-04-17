import { Fragment, type ChangeEvent, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'
import { AppMainContent } from './modules/components/layout/AppMainContent'
import { AppTopBar } from './modules/components/layout/AppTopBar'
import { AppInfoModal } from './modules/components/modals/AppInfoModal'
import { ImpersonationModal } from './modules/components/modals/ImpersonationModal'
import { UserInfoModal } from './modules/components/modals/UserInfoModal'
import {
  analisiBuAllowedProfiles,
  analisiBuPivotBuSelectableProfiles,
  analisiBurccAllowedProfiles,
  analisiCommesseAllowedProfiles,
  analisiDettaglioFatturatoAllowedProfiles,
  analisiPianoFatturazioneAllowedProfiles,
  analisiPianoFatturazioneSelectableProfiles,
  analisiRccAllowedProfiles,
  analisiRccPivotRccSelectableProfiles,
  analisiSearchCollapsiblePages,
  appInfoVoicesDefault,
  datiAnnualiPivotFieldOptions,
  datiContabiliAllowedProfiles,
  impersonationHeaderName,
  impersonationStorageKey,
  previsioniFunnelBuAllowedProfiles,
  previsioniFunnelBurccAllowedProfiles,
  previsioniFunnelBurccSelectableProfiles,
  previsioniFunnelBuSelectableProfiles,
  previsioniFunnelRccAllowedProfiles,
  previsioniFunnelRccSelectableProfiles,
  previsioniUtileMensileBuAllowedProfiles,
  previsioniUtileMensileBuSelectableProfiles,
  previsioniUtileMensileRccAllowedProfiles,
  previsioniUtileMensileRccSelectableProfiles,
  processoOffertaAllowedProfiles,
  risultatiRisorseAllowedProfiles,
  risorsePivotFieldOptions,
  redirectGuardKey,
  sintesiStateStorageKey,
  tokenStorageKey,
} from './modules/config/appConfig'
import type {
  AnalisiRccDettaglioFatturatoResponse,
  AnalisiRccFunnelResponse,
  AnalisiRccPianoFatturazioneProgressRow,
  AnalisiRccPianoFatturazioneResponse,
  AnalisiRccPianoFatturazioneRow,
  AnalisiRccPivotBurccResponse,
  AnalisiRccPivotFatturatoResponse,
  AnalisiRccPivotFunnelResponse,
  AnalisiRccRisultatoMensileBurccResponse,
  AnalisiRccRisultatoMensileGrid,
  AnalisiRccRisultatoMensileResponse,
  AnalisiRccRisultatoMensileRow,
  AnalisiRccUtileMensileResponse,
  AppHealthResponse,
  AppInfoResponse,
  AppInfoSaveRequest,
  AppInfoVoice,
  AppPage,
  AvailableProfilesResponse,
  CommessaAvanzamentoRow,
  CommessaFatturaMovimentoRow,
  CommessaRisorseValutazioneRow,
  CommessaSintesiRow,
  CommesseAndamentoMensileResponse,
  CommesseAnomaleResponse,
  CommesseDatiAnnualiPivotData,
  CommesseDatiAnnualiPivotRow,
  CommesseDettaglioResponse,
  CommesseOptionsResponse,
  CommesseRisorseFilterOption,
  CommesseRisorseFiltersResponse,
  CommesseRisorsePivotRow,
  CommesseRisorseValutazioneResponse,
  CommesseSintesiFiltersResponse,
  CommesseSintesiResponse,
  DatiAnnualiPivotFieldKey,
  DatiContabiliAcquistoResponse,
  DatiContabiliAcquistoRow,
  DatiContabiliVenditaResponse,
  DatiContabiliVenditaRow,
  DetailTabKey,
  FilterOption,
  MenuKey,
  ProcessoOffertaOfferteResponse,
  ProcessoOffertaSintesiResponse,
  ProdottoGroup,
  RisorseFiltersForm,
  RisorsePivotFieldKey,
  SessionProbeResult,
  SintesiFiltersForm,
  SintesiMode,
  SintesiPersistedState,
  SintesiScope,
  SintesiTableRow,
  SortColumn,
  SortDirection,
  CurrentUser,
} from './modules/types/appTypes'
import {
  asDatiAnnualiPivotFieldKeys,
  asRisorsePivotFieldKeys,
  buildDatiAnnualiPivotMetrics,
  buildPersonSelectItems,
  buildRisorsePivotMetrics,
  calculateUtileFineProgetto,
  distinctFilterOptionsForUi,
  distinctPersonFilterOptionsForUi,
  extractCommessaCodeFromOption,
  extractDatiAnnualiPivotFieldValue,
  extractRisorsePivotFieldValue,
  formatReferenceMonthLabel,
  getDefaultReferenceMonth,
  isValidProductValue,
  mesiItaliani,
  mergeFilterOptionValues,
  normalizeDateKey,
  normalizeFilterText,
  normalizePercentTo100,
  normalizePivotFunnelResponse,
  normalizePivotGroupValue,
  normalizeProfileLabel,
  normalizeRisorsaLabel,
  pageToScope,
  parseReferenceMonth,
  parseReferenceMonthStrict,
  resolveOuValue,
  selectMostOperationalProfile,
  shouldShowUtileFineProgettoForRow,
  sortProfilesByOperationalPriority,
} from './modules/utils/appSharedUtils'
import {
  buildAnalisiAlberoProiezioniRows,
  buildPrevisioniReportFunnelBurccPivotRows,
  buildPrevisioniReportFunnelPivotRows,
  buildPrevisioniReportFunnelTotaliDettaglioRows,
  buildProcessoOffertaSuccessoRows,
  buildProcessoOffertaSuccessoSintesiRows,
  buildProcessoOffertaSuccessoSintesiTotale,
  buildProcessoOffertaSuccessoTotaleComplessivo,
  buildProcessoOffertaSuccessoTotaliPerAnno,
  countPrevisioniReportFunnelAggregazioni,
} from './modules/utils/proiezioniProcessoOffertaUtils'
import {
  bootstrapSessionFromStorage,
  installMenuDismissHandlers,
  processDetailRouteRequest,
  restoreSintesiStateForProfile,
} from './modules/utils/appInitializationUtils'
import { buildAppNavigationActions } from './modules/utils/appNavigationActions'

const sharedSsoCookieKey = 'xenia.sso.jwt'

const writeSharedSsoCookie = (token: string) => {
  const value = token.trim()
  if (!value) {
    return
  }

  document.cookie = `${sharedSsoCookieKey}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Secure`
}

const readSharedSsoCookie = () => {
  const cookies = document.cookie.split(';').map((item) => item.trim())
  const entry = cookies.find((cookie) => cookie.startsWith(`${sharedSsoCookieKey}=`))
  if (!entry) {
    return ''
  }

  const rawValue = entry.slice(sharedSsoCookieKey.length + 1)
  try {
    return decodeURIComponent(rawValue).trim()
  } catch {
    return rawValue.trim()
  }
}
const emptySintesiFiltersForm: SintesiFiltersForm = {
  anni: [],
  attiveDalAnno: '',
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
  mesi: [],
  commessa: '',
  tipologiaCommessa: '',
  stato: '',
  macroTipologia: '',
  controparte: '',
  businessUnit: '',
  ou: '',
  rcc: '',
  pm: '',
  idRisorsa: '',
  vistaCosto: false,
}

const emptyRisorseFiltersCatalog: CommesseRisorseFiltersResponse = {
  profile: '',
  mensile: false,
  anni: [],
  mesi: [],
  commesse: [],
  tipologieCommessa: [],
  stati: [],
  macroTipologie: [],
  controparti: [],
  businessUnits: [],
  ous: [],
  rcc: [],
  pm: [],
  risorse: [],
}

function App() {
  const [token, setToken] = useState('')
  const [apiHealth, setApiHealth] = useState('n/d')
  const [appVersion, setAppVersion] = useState('n/d')
  const [statusMessage, setStatusMessage] = useState('')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [profiles, setProfiles] = useState<string[]>([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [ouScopes, setOuScopes] = useState<string[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)
  const [isRedirectingToAuth, setIsRedirectingToAuth] = useState(false)
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const [activePage, setActivePage] = useState<AppPage>('none')
  const [lastSintesiPage, setLastSintesiPage] = useState<'commesse-sintesi' | 'commesse-andamento-mensile' | 'commesse-anomale' | 'commesse-dati-annuali-aggregati' | 'prodotti-sintesi' | 'dati-contabili-vendita' | 'dati-contabili-acquisti'>('commesse-sintesi')
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
  const [detailRicavoPrevistoInput, setDetailRicavoPrevistoInput] = useState('')
  const [detailOreRestantiInput, setDetailOreRestantiInput] = useState('')
  const [detailVenditeDateSortDirection, setDetailVenditeDateSortDirection] = useState<SortDirection>('asc')
  const [detailAcquistiDateSortDirection, setDetailAcquistiDateSortDirection] = useState<SortDirection>('asc')
  const [detailActiveTab, setDetailActiveTab] = useState<DetailTabKey>('storico')
  const [selectedRequisitoId, setSelectedRequisitoId] = useState<number | null>(null)
  const [collapsedProductKeys, setCollapsedProductKeys] = useState<string[]>([])
  const [analisiRccAnno, setAnalisiRccAnno] = useState(new Date().getFullYear().toString())
  const [analisiRccRcc, setAnalisiRccRcc] = useState('')
  const [analisiRccLoading, setAnalisiRccLoading] = useState(false)
  const [analisiRccData, setAnalisiRccData] = useState<AnalisiRccRisultatoMensileResponse | null>(null)
  const [analisiRccPivotData, setAnalisiRccPivotData] = useState<AnalisiRccPivotFatturatoResponse | null>(null)
  const [analisiRccPivotAnni, setAnalisiRccPivotAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [analisiRccPivotRcc, setAnalisiRccPivotRcc] = useState('')
  const [analisiBuAnno, setAnalisiBuAnno] = useState(new Date().getFullYear().toString())
  const [analisiBuBusinessUnit, setAnalisiBuBusinessUnit] = useState('')
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
  const [analisiPianoFatturazioneBusinessUnit, setAnalisiPianoFatturazioneBusinessUnit] = useState('')
  const [analisiPianoFatturazioneRcc, setAnalisiPianoFatturazioneRcc] = useState('')
  const [analisiPianoFatturazioneData, setAnalisiPianoFatturazioneData] = useState<AnalisiRccPianoFatturazioneResponse | null>(null)
  const [analisiDettaglioFatturatoAnni, setAnalisiDettaglioFatturatoAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [analisiDettaglioFatturatoCommessaSearch, setAnalisiDettaglioFatturatoCommessaSearch] = useState('')
  const [analisiDettaglioFatturatoCommessa, setAnalisiDettaglioFatturatoCommessa] = useState('')
  const [analisiDettaglioFatturatoProvenienza, setAnalisiDettaglioFatturatoProvenienza] = useState('')
  const [analisiDettaglioFatturatoControparte, setAnalisiDettaglioFatturatoControparte] = useState('')
  const [analisiDettaglioFatturatoBusinessUnit, setAnalisiDettaglioFatturatoBusinessUnit] = useState('')
  const [analisiDettaglioFatturatoRcc, setAnalisiDettaglioFatturatoRcc] = useState('')
  const [analisiDettaglioFatturatoSoloScadute, setAnalisiDettaglioFatturatoSoloScadute] = useState(false)
  const [analisiDettaglioFatturatoData, setAnalisiDettaglioFatturatoData] = useState<AnalisiRccDettaglioFatturatoResponse | null>(null)
  const [analisiAlberoProiezioniAnno, setAnalisiAlberoProiezioniAnno] = useState(new Date().getFullYear().toString())
  const [analisiAlberoProiezioniRcc, setAnalisiAlberoProiezioniRcc] = useState('')
  const [analisiAlberoProiezioniBusinessUnit, setAnalisiAlberoProiezioniBusinessUnit] = useState('')
  const [analisiAlberoProiezioniData, setAnalisiAlberoProiezioniData] = useState<AnalisiRccDettaglioFatturatoResponse | null>(null)
  const [commesseAndamentoMensileAnni, setCommesseAndamentoMensileAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [commesseAndamentoMensileAggrega, setCommesseAndamentoMensileAggrega] = useState(true)
  const [commesseAndamentoMensileMese, setCommesseAndamentoMensileMese] = useState(getDefaultReferenceMonth().toString())
  const [commesseAndamentoMensileCommessaSearch, setCommesseAndamentoMensileCommessaSearch] = useState('')
  const [commesseAndamentoMensileCommessa, setCommesseAndamentoMensileCommessa] = useState('')
  const [commesseAndamentoMensileTipologia, setCommesseAndamentoMensileTipologia] = useState('')
  const [commesseAndamentoMensileStato, setCommesseAndamentoMensileStato] = useState('')
  const [commesseAndamentoMensileMacroTipologia, setCommesseAndamentoMensileMacroTipologia] = useState('')
  const [commesseAndamentoMensileControparte, setCommesseAndamentoMensileControparte] = useState('')
  const [commesseAndamentoMensileBusinessUnit, setCommesseAndamentoMensileBusinessUnit] = useState('')
  const [commesseAndamentoMensileRcc, setCommesseAndamentoMensileRcc] = useState('')
  const [commesseAndamentoMensilePm, setCommesseAndamentoMensilePm] = useState('')
  const [commesseAndamentoMensileData, setCommesseAndamentoMensileData] = useState<CommesseAndamentoMensileResponse | null>(null)
  const [commesseAnomaleData, setCommesseAnomaleData] = useState<CommesseAnomaleResponse | null>(null)
  const [commesseAnomaleFiltroAnomalia, setCommesseAnomaleFiltroAnomalia] = useState('')
  const [commesseAnomaleFiltroRcc, setCommesseAnomaleFiltroRcc] = useState('')
  const [commesseDatiAnnualiAnni, setCommesseDatiAnnualiAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [commesseDatiAnnualiSelectedFields, setCommesseDatiAnnualiSelectedFields] = useState<DatiAnnualiPivotFieldKey[]>(['anno'])
  const [commesseDatiAnnualiMacroTipologie, setCommesseDatiAnnualiMacroTipologie] = useState<string[]>([])
  const [commesseDatiAnnualiTipologia, setCommesseDatiAnnualiTipologia] = useState('')
  const [commesseDatiAnnualiBusinessUnit, setCommesseDatiAnnualiBusinessUnit] = useState('')
  const [commesseDatiAnnualiRcc, setCommesseDatiAnnualiRcc] = useState('')
  const [commesseDatiAnnualiPm, setCommesseDatiAnnualiPm] = useState('')
  const [commesseDatiAnnualiColonneAggregazione, setCommesseDatiAnnualiColonneAggregazione] = useState(false)
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
  const [previsioniReportFunnelRccTipo, setPrevisioniReportFunnelRccTipo] = useState('')
  const [previsioniReportFunnelRccTipoDocumento, setPrevisioniReportFunnelRccTipoDocumento] = useState('')
  const [previsioniReportFunnelRccPercentuale, setPrevisioniReportFunnelRccPercentuale] = useState('')
  const [previsioniReportFunnelRccData, setPrevisioniReportFunnelRccData] = useState<AnalisiRccPivotFunnelResponse | null>(null)
  const [previsioniReportFunnelBuAnni, setPrevisioniReportFunnelBuAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [previsioniReportFunnelBu, setPrevisioniReportFunnelBu] = useState('')
  const [previsioniReportFunnelBuRcc, setPrevisioniReportFunnelBuRcc] = useState('')
  const [previsioniReportFunnelBuTipo, setPrevisioniReportFunnelBuTipo] = useState('')
  const [previsioniReportFunnelBuPercentuale, setPrevisioniReportFunnelBuPercentuale] = useState('')
  const [previsioniReportFunnelBuData, setPrevisioniReportFunnelBuData] = useState<AnalisiRccPivotFunnelResponse | null>(null)
  const [previsioniReportFunnelBurccAnni, setPrevisioniReportFunnelBurccAnni] = useState<string[]>([new Date().getFullYear().toString()])
  const [previsioniReportFunnelBurccBusinessUnit, setPrevisioniReportFunnelBurccBusinessUnit] = useState('')
  const [previsioniReportFunnelBurccRcc, setPrevisioniReportFunnelBurccRcc] = useState('')
  const [previsioniReportFunnelBurccTipo, setPrevisioniReportFunnelBurccTipo] = useState('')
  const [previsioniReportFunnelBurccPercentuale, setPrevisioniReportFunnelBurccPercentuale] = useState('')
  const [previsioniReportFunnelBurccOrder, setPrevisioniReportFunnelBurccOrder] = useState<'rcc-bu' | 'bu-rcc'>('rcc-bu')
  const [previsioniReportFunnelBurccData, setPrevisioniReportFunnelBurccData] = useState<AnalisiRccPivotFunnelResponse | null>(null)
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
  const isCommesseAnomalePage = activePage === 'commesse-anomale'
  const isProdottiSintesiPage = activePage === 'prodotti-sintesi'
  const isRisorseRisultatiPage = activePage === 'risorse-risultati'
  const isRisorseRisultatiPivotPage = activePage === 'risorse-risultati-pivot'
  const isRisorseRisultatiMensilePage = activePage === 'risorse-risultati-mensile'
  const isRisorseRisultatiMensilePivotPage = activePage === 'risorse-risultati-mensile-pivot'
  const isRisorseOuRisorsePage = activePage === 'risorse-ou-risorse'
  const isRisorseOuRisorsePivotPage = activePage === 'risorse-ou-risorse-pivot'
  const isRisorseOuRisorseMensilePage = activePage === 'risorse-ou-risorse-mensile'
  const isRisorseOuRisorseMensilePivotPage = activePage === 'risorse-ou-risorse-mensile-pivot'
  const isRisorseOuMode = (
    isRisorseOuRisorsePage
    || isRisorseOuRisorsePivotPage
    || isRisorseOuRisorseMensilePage
    || isRisorseOuRisorseMensilePivotPage
  )
  const isRisorseOuPivotMode = false
  const isRisorsePivotPage = (
    isRisorseRisultatiPivotPage
    || isRisorseRisultatiMensilePivotPage
    || isRisorseOuRisorsePivotPage
    || isRisorseOuRisorseMensilePivotPage
  )
  const isRisorseMensilePage = (
    isRisorseRisultatiMensilePage
    || isRisorseRisultatiMensilePivotPage
    || isRisorseOuRisorseMensilePage
    || isRisorseOuRisorseMensilePivotPage
  )
  const isRisorsePage = (
    isRisorseRisultatiPage
    || isRisorseRisultatiPivotPage
    || isRisorseRisultatiMensilePage
    || isRisorseRisultatiMensilePivotPage
    || isRisorseOuRisorsePage
    || isRisorseOuRisorsePivotPage
    || isRisorseOuRisorseMensilePage
    || isRisorseOuRisorseMensilePivotPage
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
  const currentProfile = normalizeProfileLabel(selectedProfile || profiles[0] || '')
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
  const canSelectAnalisiRccRcc = analisiRccPivotRccSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectAnalisiRccPivotRcc = analisiRccPivotRccSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessAnalisiBuPage = analisiBuAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectAnalisiBuBusinessUnit = analisiBuPivotBuSelectableProfiles.some((profile) => (
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
  const canSelectAnalisiPianoFatturazioneBusinessUnit = analisiPianoFatturazioneSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectAnalisiPianoFatturazioneRcc = analisiPianoFatturazioneSelectableProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessAnalisiDettaglioFatturatoPage = analisiDettaglioFatturatoAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canAccessAnalisiAlberoProiezioniPage = canAccessAnalisiDettaglioFatturatoPage
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
  const canAccessPrevisioniFunnelBurccPage = previsioniFunnelBurccAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectPrevisioniFunnelBurcc = previsioniFunnelBurccSelectableProfiles.some((profile) => (
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
  const canAccessAnalisiProiezioniMenu = canAccessAnalisiRccPage
    || canAccessAnalisiBuPage
    || canAccessAnalisiBurccPage
    || canAccessAnalisiPianoFatturazionePage
    || canAccessAnalisiAlberoProiezioniPage
    || canAccessAnalisiDettaglioFatturatoPage
  const canAccessPrevisioniMenu = canAccessPrevisioniFunnelRccPage ||
    canAccessPrevisioniFunnelBuPage ||
    canAccessPrevisioniFunnelBurccPage
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
    setDetailRicavoPrevistoInput('')
    setDetailOreRestantiInput('')
    setDetailActiveTab('storico')
    setSelectedRequisitoId(null)
    setCollapsedProductKeys([])
    setAnalisiRccAnno(new Date().getFullYear().toString())
    setAnalisiRccLoading(false)
    setAnalisiRccData(null)
    setAnalisiRccPivotData(null)
    setAnalisiRccRcc('')
    setAnalisiRccPivotAnni([new Date().getFullYear().toString()])
    setAnalisiRccPivotRcc('')
    setAnalisiBuAnno(new Date().getFullYear().toString())
    setAnalisiBuBusinessUnit('')
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
    setAnalisiPianoFatturazioneBusinessUnit('')
    setAnalisiPianoFatturazioneRcc('')
    setAnalisiPianoFatturazioneData(null)
    setAnalisiDettaglioFatturatoAnni([new Date().getFullYear().toString()])
    setAnalisiDettaglioFatturatoCommessaSearch('')
    setAnalisiDettaglioFatturatoCommessa('')
    setAnalisiDettaglioFatturatoProvenienza('')
    setAnalisiDettaglioFatturatoControparte('')
    setAnalisiDettaglioFatturatoBusinessUnit('')
    setAnalisiDettaglioFatturatoRcc('')
    setAnalisiDettaglioFatturatoData(null)
    setAnalisiAlberoProiezioniAnno(new Date().getFullYear().toString())
    setAnalisiAlberoProiezioniBusinessUnit('')
    setAnalisiAlberoProiezioniRcc('')
    setAnalisiAlberoProiezioniData(null)
    setCommesseAndamentoMensileAnni([new Date().getFullYear().toString()])
    setCommesseAndamentoMensileAggrega(true)
    setCommesseAndamentoMensileMese(getDefaultReferenceMonth().toString())
    setCommesseAndamentoMensileCommessaSearch('')
    setCommesseAndamentoMensileCommessa('')
    setCommesseAndamentoMensileTipologia('')
    setCommesseAndamentoMensileStato('')
    setCommesseAndamentoMensileMacroTipologia('')
    setCommesseAndamentoMensileControparte('')
    setCommesseAndamentoMensileBusinessUnit('')
    setCommesseAndamentoMensileRcc('')
    setCommesseAndamentoMensilePm('')
    setCommesseAndamentoMensileData(null)
    setCommesseAnomaleData(null)
    setCommesseDatiAnnualiAnni([new Date().getFullYear().toString()])
    setCommesseDatiAnnualiSelectedFields(['anno'])
    setCommesseDatiAnnualiMacroTipologie([])
    setCommesseDatiAnnualiTipologia('')
    setCommesseDatiAnnualiBusinessUnit('')
    setCommesseDatiAnnualiRcc('')
    setCommesseDatiAnnualiPm('')
    setCommesseDatiAnnualiColonneAggregazione(false)
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
    setPrevisioniReportFunnelRccTipo('')
    setPrevisioniReportFunnelRccTipoDocumento('')
    setPrevisioniReportFunnelRccPercentuale('')
    setPrevisioniReportFunnelRccData(null)
    setPrevisioniReportFunnelBuAnni([new Date().getFullYear().toString()])
    setPrevisioniReportFunnelBu('')
    setPrevisioniReportFunnelBuRcc('')
    setPrevisioniReportFunnelBuTipo('')
    setPrevisioniReportFunnelBuPercentuale('')
    setPrevisioniReportFunnelBuData(null)
    setPrevisioniReportFunnelBurccAnni([new Date().getFullYear().toString()])
    setPrevisioniReportFunnelBurccBusinessUnit('')
    setPrevisioniReportFunnelBurccRcc('')
    setPrevisioniReportFunnelBurccTipo('')
    setPrevisioniReportFunnelBurccPercentuale('')
    setPrevisioniReportFunnelBurccOrder('rcc-bu')
    setPrevisioniReportFunnelBurccData(null)
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
    try {
      const response = await fetch(toBackendUrl('/api/system/health'))
      if (!response.ok) {
        setApiHealth(`KO (${response.status})`)
        setAppVersion('n/d')
        return
      }

      const payload = (await response.json()) as AppHealthResponse
      setApiHealth('OK')
      const version = payload.applicationVersion?.trim()
      setAppVersion(version || 'n/d')
    } catch {
      setApiHealth('KO')
      setAppVersion('n/d')
    }
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
    const normalizedProfiles = sortProfilesByOperationalPriority(payload.profiles ?? [])

    if (normalizedProfiles.length === 0) {
      forceLogoutForAuthorization(
        'missing_profile',
        'Profilo non individuabile per l utente autenticato. Logout automatico.',
      )
      return false
    }

    setProfiles(normalizedProfiles)
    setOuScopes(payload.ouScopes)
    setSelectedProfile(() => selectMostOperationalProfile(normalizedProfiles))

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
    } catch {
      clearSession()
      sessionStorage.removeItem(redirectGuardKey)
      setStatusMessage('Errore durante la verifica sessione. Nuovo accesso richiesto.')
      redirectToCentralAuth('session_error')
      return false
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
      if (!fallback) {
        return
      }
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
    const catalogLabels = new Map<string, string>()
    sintesiFiltersCatalog.commesse.forEach((option) => {
      const key = normalizeFilterText(option.value).toLocaleLowerCase('it-IT')
      if (!key) {
        return
      }
      const label = normalizeFilterText(option.label) || normalizeFilterText(option.value)
      if (label) {
        catalogLabels.set(key, label)
      }
    })

    const descriptionByCommessa = new Map<string, string>()
    sintesiRows.forEach((row) => {
      const commessa = normalizeFilterText(row.commessa)
      const descrizione = normalizeFilterText(row.descrizioneCommessa)
      if (!commessa || !descrizione) {
        return
      }
      const key = commessa.toLocaleLowerCase('it-IT')
      if (!descriptionByCommessa.has(key)) {
        descriptionByCommessa.set(key, descrizione)
      }
    })

    const commesseMap = new Map<string, FilterOption>()
    payload.items.forEach((item) => {
      const value = normalizeFilterText(item.commessa)
      if (!value) {
        return
      }

      const key = value.toLocaleLowerCase('it-IT')
      const apiLabel = normalizeFilterText(item.label ?? '')
      const apiDescrizione = normalizeFilterText(item.descrizioneCommessa ?? '')
      const catalogLabel = catalogLabels.get(key)
      const description = descriptionByCommessa.get(key)
      const fallbackDescription = apiDescrizione || description
      const fallbackLabel = fallbackDescription ? `${value} - ${fallbackDescription}` : value
      const label = apiLabel || normalizeFilterText(catalogLabel ?? '') || fallbackLabel

      commesseMap.set(key, { value, label })
    })

    const commesse = [...commesseMap.values()]
      .sort((left, right) => left.label.localeCompare(right.label, 'it', { sensitivity: 'base' }))

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
      const take = scope === 'prodotti' ? 5000 : 100000
      params.set('take', take.toString())
      params.set('aggrega', isAggregated ? 'true' : 'false')

      const selectedAnni = sintesiFiltersForm.anni
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
      for (const year of selectedAnni) {
        params.append('anni', year)
      }

      const normalizedAttiveDalAnno = sintesiFiltersForm.attiveDalAnno.trim()
      if (normalizedAttiveDalAnno) {
        params.set('attiveDalAnno', normalizedAttiveDalAnno)
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
    const selectedRcc = analisiRccRcc.trim()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', annoValue.toString())
      if (canSelectAnalisiRccRcc && selectedRcc) {
        params.set('rcc', selectedRcc)
      }

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
      if (canSelectAnalisiRccRcc) {
        const normalizedRccFiltro = (payload.rccFiltro ?? '').trim()
        if (normalizedRccFiltro.length > 0) {
          setAnalisiRccRcc(normalizedRccFiltro)
        } else if (!payload.vediTutto) {
          setAnalisiRccRcc('')
        }
      }
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
    const selectedBusinessUnit = analisiBuBusinessUnit.trim()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', annoValue.toString())
      if (canSelectAnalisiBuBusinessUnit && selectedBusinessUnit) {
        params.set('businessUnit', selectedBusinessUnit)
      }

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
      if (canSelectAnalisiBuBusinessUnit) {
        const normalizedBuFiltro = (payload.rccFiltro ?? '').trim()
        if (normalizedBuFiltro.length > 0) {
          setAnalisiBuBusinessUnit(normalizedBuFiltro)
        } else if (!payload.vediTutto) {
          setAnalisiBuBusinessUnit('')
        }
      }
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
      if (canSelectAnalisiPianoFatturazioneBusinessUnit && analisiPianoFatturazioneBusinessUnit.trim()) {
        params.set('businessUnit', analisiPianoFatturazioneBusinessUnit.trim())
      }
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
      if (canSelectAnalisiPianoFatturazioneBusinessUnit) {
        const normalizedBuFiltro = (payload.businessUnitFiltro ?? '').trim()
        const availableBusinessUnits = (payload.businessUnitDisponibili ?? [])
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
        if (normalizedBuFiltro.length > 0 && availableBusinessUnits.some((value) => value.localeCompare(normalizedBuFiltro, 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiPianoFatturazioneBusinessUnit(normalizedBuFiltro)
        } else if (!availableBusinessUnits.some((value) => value.localeCompare(analisiPianoFatturazioneBusinessUnit.trim(), 'it', { sensitivity: 'base' }) === 0)) {
          setAnalisiPianoFatturazioneBusinessUnit('')
        }
      }
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

  const loadAnalisiDettaglioFatturato = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessAnalisiDettaglioFatturatoPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Dettaglio Fatturato.`)
      setAnalisiDettaglioFatturatoData(null)
      return
    }

    const selectedYears = [...new Set(
      analisiDettaglioFatturatoAnni
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    )].sort((left, right) => left - right)
    const yearsToQuery = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear()]
    const selectedCommessaCode = extractCommessaCodeFromOption(analisiDettaglioFatturatoCommessa)
    const selectedCommessaSearch = analisiDettaglioFatturatoCommessaSearch.trim()
    const selectedProvenienza = analisiDettaglioFatturatoProvenienza.trim()
    const selectedControparte = analisiDettaglioFatturatoControparte.trim()
    const selectedBusinessUnit = analisiDettaglioFatturatoBusinessUnit.trim()
    const selectedRcc = analisiDettaglioFatturatoRcc.trim()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      if (selectedCommessaCode) {
        params.set('commessa', selectedCommessaCode)
      }
      if (selectedCommessaSearch) {
        params.set('commessaSearch', selectedCommessaSearch)
      }
      if (selectedProvenienza) {
        params.set('provenienza', selectedProvenienza)
      }
      if (selectedControparte) {
        params.set('controparte', selectedControparte)
      }
      if (selectedBusinessUnit) {
        params.set('businessUnit', selectedBusinessUnit)
      }
      if (selectedRcc) {
        params.set('rcc', selectedRcc)
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/dettaglio-fatturato?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setAnalisiDettaglioFatturatoData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Dettaglio Fatturato.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiDettaglioFatturatoData(null)
        setStatusMessage(message || `Errore caricamento Dettaglio Fatturato (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccDettaglioFatturatoResponse
      const payloadYears = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => value.toString())
      setAnalisiDettaglioFatturatoAnni(payloadYears.length > 0 ? payloadYears : yearsToQuery.map((value) => value.toString()))

      const commesseDisponibili = payload.commesseDisponibili ?? []
      if (selectedCommessaCode) {
        const matched = commesseDisponibili.find((value) => (
          extractCommessaCodeFromOption(value).localeCompare(selectedCommessaCode, 'it', { sensitivity: 'base' }) === 0
        ))
        if (matched) {
          setAnalisiDettaglioFatturatoCommessa(matched)
        } else if (selectedCommessaCode.length > 0) {
          setAnalisiDettaglioFatturatoCommessa('')
        }
      } else if (!analisiDettaglioFatturatoCommessa.trim()) {
        setAnalisiDettaglioFatturatoCommessa('')
      }

      if (selectedProvenienza && !(payload.provenienzeDisponibili ?? []).some((value) => (
        value.localeCompare(selectedProvenienza, 'it', { sensitivity: 'base' }) === 0
      ))) {
        setAnalisiDettaglioFatturatoProvenienza('')
      }

      if (selectedControparte && !(payload.contropartiDisponibili ?? []).some((value) => (
        value.localeCompare(selectedControparte, 'it', { sensitivity: 'base' }) === 0
      ))) {
        setAnalisiDettaglioFatturatoControparte('')
      }
      if (selectedBusinessUnit && !(payload.businessUnitDisponibili ?? []).some((value) => (
        value.localeCompare(selectedBusinessUnit, 'it', { sensitivity: 'base' }) === 0
      ))) {
        setAnalisiDettaglioFatturatoBusinessUnit('')
      }
      if (selectedRcc && !(payload.rccDisponibili ?? []).some((value) => (
        value.localeCompare(selectedRcc, 'it', { sensitivity: 'base' }) === 0
      ))) {
        setAnalisiDettaglioFatturatoRcc('')
      }

      setAnalisiDettaglioFatturatoData(payload)
      setStatusMessage(`Dettaglio Fatturato caricato: ${payload.items.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadAnalisiAlberoProiezioni = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessAnalisiAlberoProiezioniPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato ad Albero Proiezioni.`)
      setAnalisiAlberoProiezioniData(null)
      return
    }

    const yearFromState = Number.parseInt(analisiAlberoProiezioniAnno.trim(), 10)
    const selectedYear = Number.isFinite(yearFromState) && yearFromState > 0
      ? yearFromState
      : new Date().getFullYear()
    const selectedRcc = analisiAlberoProiezioniRcc.trim()
    const selectedBusinessUnit = analisiAlberoProiezioniBusinessUnit.trim()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.append('anni', selectedYear.toString())
      if (selectedRcc) {
        params.set('rcc', selectedRcc)
      }
      if (selectedBusinessUnit) {
        params.set('businessUnit', selectedBusinessUnit)
      }

      const response = await fetch(toBackendUrl(`/api/analisi-rcc/dettaglio-fatturato?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setAnalisiAlberoProiezioniData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Albero Proiezioni.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiAlberoProiezioniData(null)
        setStatusMessage(message || `Errore caricamento Albero Proiezioni (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccDettaglioFatturatoResponse
      const payloadYears = (payload.anni ?? [])
        .filter((value) => Number.isFinite(value) && value > 0)
      const matchingYear = payloadYears.find((value) => value === selectedYear)
      setAnalisiAlberoProiezioniAnno((matchingYear ?? selectedYear).toString())

      if (selectedRcc && !(payload.rccDisponibili ?? []).some((value) => (
        value.localeCompare(selectedRcc, 'it', { sensitivity: 'base' }) === 0
      ))) {
        setAnalisiAlberoProiezioniRcc('')
      }
      if (selectedBusinessUnit && !(payload.businessUnitDisponibili ?? []).some((value) => (
        value.localeCompare(selectedBusinessUnit, 'it', { sensitivity: 'base' }) === 0
      ))) {
        setAnalisiAlberoProiezioniBusinessUnit('')
      }

      setAnalisiAlberoProiezioniData(payload)
      setStatusMessage(`Albero Proiezioni caricato: ${payload.items.length} righe sorgente.`)
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
    const selectedMese = parseReferenceMonthStrict(commesseAndamentoMensileMese) ?? getDefaultReferenceMonth()
    const selectedCommessa = commesseAndamentoMensileCommessa.trim()
    const selectedTipologia = commesseAndamentoMensileTipologia.trim()
    const selectedStato = commesseAndamentoMensileStato.trim()
    const selectedMacroTipologia = commesseAndamentoMensileMacroTipologia.trim()
    const selectedControparte = commesseAndamentoMensileControparte.trim()
    const selectedBusinessUnit = commesseAndamentoMensileBusinessUnit.trim()
    const selectedRcc = commesseAndamentoMensileRcc.trim()
    const selectedPm = commesseAndamentoMensilePm.trim()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      yearsToQuery.forEach((value) => params.append('anni', value.toString()))
      params.set('aggrega', commesseAndamentoMensileAggrega ? 'true' : 'false')
      if (commesseAndamentoMensileAggrega) {
        params.set('mese', selectedMese.toString())
      }
      if (selectedCommessa) {
        params.set('commessa', selectedCommessa)
      }
      if (selectedTipologia) {
        params.set('tipologiaCommessa', selectedTipologia)
      }
      if (selectedStato) {
        params.set('stato', selectedStato)
      }
      if (selectedMacroTipologia) {
        params.set('macroTipologia', selectedMacroTipologia)
      }
      if (selectedControparte) {
        params.set('prodotto', selectedControparte)
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
      const modeLabel = commesseAndamentoMensileAggrega ? 'aggregato fino a mese' : 'dettaglio mensile'
      const meseDetail = commesseAndamentoMensileAggrega
        ? `, mese: ${selectedMese.toString().padStart(2, '0')}`
        : ''
      setStatusMessage(`Andamento Mensile caricato (${modeLabel}${meseDetail}): ${payload.count} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadCommesseAnomale = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('take', '10000')

      const response = await fetch(toBackendUrl(`/api/commesse/anomale?${params.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setCommesseAnomaleData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Commesse Anomale.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setCommesseAnomaleData(null)
        setStatusMessage(message || `Errore caricamento Commesse Anomale (${response.status}).`)
        return
      }

      const payload = (await response.json()) as CommesseAnomaleResponse
      setCommesseAnomaleData(payload)
      setStatusMessage(`Commesse anomale caricate: ${payload.count} righe.`)
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
        const allowedMesi = new Set(
          payload.mesi
            .map((option) => parseReferenceMonthStrict(option.value))
            .filter((value): value is number => value !== null)
            .map((value) => value.toString()),
        )
        const nextMesi = mensile
          ? current.mesi
            .map((value) => parseReferenceMonthStrict(value))
            .filter((value): value is number => value !== null)
            .map((value) => value.toString())
            .filter((value) => allowedMesi.has(value))
          : []

        const risorseValues = new Set(
          payload.risorse
            .map((option) => normalizeFilterText(option.value))
            .filter((value) => value.length > 0),
        )
        const normalizedIdRisorsa = normalizeFilterText(current.idRisorsa)

        return {
          ...current,
          anni: [...new Set(nextAnni)],
          mesi: [...new Set(nextMesi)],
          commessa: keepIfPresent(current.commessa, payload.commesse),
          tipologiaCommessa: keepIfPresent(current.tipologiaCommessa, payload.tipologieCommessa),
          stato: keepIfPresent(current.stato, payload.stati),
          macroTipologia: keepIfPresent(current.macroTipologia, payload.macroTipologie),
          controparte: keepIfPresent(current.controparte, payload.controparti),
          businessUnit: keepIfPresent(current.businessUnit, payload.businessUnits),
          ou: keepIfPresent(current.ou, payload.ous),
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
    const selectedMonths = [...new Set(
      risorseFiltersForm.mesi
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value) && value >= 1 && value <= 12),
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
      if (mensile) {
        selectedMonths.forEach((value) => params.append('mesi', value.toString()))
      }
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
      const ou = risorseFiltersForm.ou.trim()
      if (ou) {
        params.set('ou', ou)
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
      if (previsioniReportFunnelRccTipo.trim()) {
        params.set('tipo', previsioniReportFunnelRccTipo.trim())
      }
      if (previsioniReportFunnelRccPercentuale.trim()) {
        params.set('percentualeSuccesso', previsioniReportFunnelRccPercentuale.trim().replace(',', '.'))
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

      const tipoFiltroPayload = (payload.tipoFiltro ?? '').trim()
      if (tipoFiltroPayload.length > 0) {
        setPrevisioniReportFunnelRccTipo(tipoFiltroPayload)
      } else {
        const selectedTipo = previsioniReportFunnelRccTipo.trim()
        if (selectedTipo.length > 0) {
          const keepTipo = (payload.tipiDisponibili ?? []).some((value) => value.localeCompare(selectedTipo, 'it', { sensitivity: 'base' }) === 0)
          if (!keepTipo) {
            setPrevisioniReportFunnelRccTipo('')
          }
        }
      }

      setPrevisioniReportFunnelRccTipoDocumento('')

      if (payload.percentualeSuccessoFiltro !== null && payload.percentualeSuccessoFiltro !== undefined) {
        setPrevisioniReportFunnelRccPercentuale(payload.percentualeSuccessoFiltro.toString())
      } else {
        const selectedPercentuale = previsioniReportFunnelRccPercentuale.trim()
        if (selectedPercentuale.length > 0) {
          const selectedPercentualeValue = Number.parseFloat(selectedPercentuale.replace(',', '.'))
          const keepPercentuale = Number.isFinite(selectedPercentualeValue) && (payload.percentualiSuccessoDisponibili ?? []).some((value) => Math.abs(value - selectedPercentualeValue) < 0.0001)
          if (!keepPercentuale) {
            setPrevisioniReportFunnelRccPercentuale('')
          }
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
      if (previsioniReportFunnelBuTipo.trim()) {
        params.set('tipo', previsioniReportFunnelBuTipo.trim())
      }
      if (previsioniReportFunnelBuPercentuale.trim()) {
        params.set('percentualeSuccesso', previsioniReportFunnelBuPercentuale.trim().replace(',', '.'))
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

      const tipoFiltroPayload = (payload.tipoFiltro ?? '').trim()
      if (tipoFiltroPayload.length > 0) {
        setPrevisioniReportFunnelBuTipo(tipoFiltroPayload)
      } else {
        const selectedTipo = previsioniReportFunnelBuTipo.trim()
        if (selectedTipo.length > 0) {
          const keepTipo = (payload.tipiDisponibili ?? []).some((value) => value.localeCompare(selectedTipo, 'it', { sensitivity: 'base' }) === 0)
          if (!keepTipo) {
            setPrevisioniReportFunnelBuTipo('')
          }
        }
      }

      if (payload.percentualeSuccessoFiltro !== null && payload.percentualeSuccessoFiltro !== undefined) {
        setPrevisioniReportFunnelBuPercentuale(payload.percentualeSuccessoFiltro.toString())
      } else {
        const selectedPercentuale = previsioniReportFunnelBuPercentuale.trim()
        if (selectedPercentuale.length > 0) {
          const selectedPercentualeValue = Number.parseFloat(selectedPercentuale.replace(',', '.'))
          const keepPercentuale = Number.isFinite(selectedPercentualeValue) && (payload.percentualiSuccessoDisponibili ?? []).some((value) => Math.abs(value - selectedPercentualeValue) < 0.0001)
          if (!keepPercentuale) {
            setPrevisioniReportFunnelBuPercentuale('')
          }
        }
      }

      setPrevisioniReportFunnelBuData(payload)
      setStatusMessage(`Report Funnel BU caricato (anno: ${payloadYear}): ${payload.righe.length} righe.`)
    } finally {
      setAnalisiRccLoading(false)
    }
  }

  const loadPrevisioniReportFunnelBurcc = async () => {
    if (!token.trim() || !currentProfile.trim()) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    if (!canAccessPrevisioniFunnelBurccPage) {
      setStatusMessage(`Profilo "${currentProfile}" non abilitato a Report Funnel BU RCC.`)
      setPrevisioniReportFunnelBurccData(null)
      return
    }

    const selectedYear = Number.parseInt((previsioniReportFunnelBurccAnni[0] ?? '').trim(), 10)
    const yearToQuery = Number.isFinite(selectedYear) && selectedYear > 0
      ? selectedYear
      : new Date().getFullYear()

    setAnalisiRccLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('anno', yearToQuery.toString())
      if (canSelectPrevisioniFunnelBurcc && previsioniReportFunnelBurccBusinessUnit.trim()) {
        params.set('businessUnit', previsioniReportFunnelBurccBusinessUnit.trim())
      }
      if (previsioniReportFunnelBurccRcc.trim()) {
        params.set('rcc', previsioniReportFunnelBurccRcc.trim())
      }
      if (previsioniReportFunnelBurccTipo.trim()) {
        params.set('tipo', previsioniReportFunnelBurccTipo.trim())
      }
      if (previsioniReportFunnelBurccPercentuale.trim()) {
        params.set('percentualeSuccesso', previsioniReportFunnelBurccPercentuale.trim().replace(',', '.'))
      }

      const fetchPivotFunnelBurcc = (path: string) => (
        fetch(toBackendUrl(`${path}?${params.toString()}`), {
          headers: authHeaders(token, activeImpersonation),
        })
      )

      let response = await fetchPivotFunnelBurcc('/api/analisi-rcc/pivot-funnel-burcc')
      if (response.status === 404) {
        response = await fetchPivotFunnelBurcc('/api/analisi-rcc/pivot-funnel-bu-rcc')
      }

      if (response.status === 401) {
        clearSession()
        redirectToCentralAuth('stale_token')
        return
      }

      if (response.status === 403) {
        const message = await readApiMessage(response)
        setPrevisioniReportFunnelBurccData(null)
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Report Funnel BU RCC.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setPrevisioniReportFunnelBurccData(null)
        setStatusMessage(message || `Errore caricamento Report Funnel BU RCC (${response.status}).`)
        return
      }

      const payload = normalizePivotFunnelResponse(await response.json())
      const payloadYear = (payload.anni ?? [])
        .find((value) => Number.isFinite(value) && value > 0) ?? yearToQuery
      setPrevisioniReportFunnelBurccAnni([payloadYear.toString()])

      if (canSelectPrevisioniFunnelBurcc) {
        const normalizedBuFilter = (payload.aggregazioneFiltro ?? '').trim()
        if (normalizedBuFilter.length > 0) {
          setPrevisioniReportFunnelBurccBusinessUnit(normalizedBuFilter)
        } else if (!payload.vediTutto) {
          setPrevisioniReportFunnelBurccBusinessUnit((payload.aggregazioniDisponibili?.[0] ?? '').trim())
        } else if (!previsioniReportFunnelBurccBusinessUnit.trim()) {
          setPrevisioniReportFunnelBurccBusinessUnit('')
        }
      }

      const normalizedRccFiltro = (payload.rccFiltro ?? '').trim()
      if (normalizedRccFiltro.length > 0) {
        setPrevisioniReportFunnelBurccRcc(normalizedRccFiltro)
      } else {
        const currentRccFilter = previsioniReportFunnelBurccRcc.trim()
        if (currentRccFilter.length > 0) {
          const hasCurrent = (payload.rccDisponibili ?? []).some((value) => (
            value.localeCompare(currentRccFilter, 'it', { sensitivity: 'base' }) === 0
          ))
          if (!hasCurrent) {
            setPrevisioniReportFunnelBurccRcc('')
          }
        }
      }

      const tipoFiltroPayload = (payload.tipoFiltro ?? '').trim()
      if (tipoFiltroPayload.length > 0) {
        setPrevisioniReportFunnelBurccTipo(tipoFiltroPayload)
      } else {
        const selectedTipo = previsioniReportFunnelBurccTipo.trim()
        if (selectedTipo.length > 0) {
          const keepTipo = (payload.tipiDisponibili ?? []).some((value) => value.localeCompare(selectedTipo, 'it', { sensitivity: 'base' }) === 0)
          if (!keepTipo) {
            setPrevisioniReportFunnelBurccTipo('')
          }
        }
      }

      if (payload.percentualeSuccessoFiltro !== null && payload.percentualeSuccessoFiltro !== undefined) {
        setPrevisioniReportFunnelBurccPercentuale(payload.percentualeSuccessoFiltro.toString())
      } else {
        const selectedPercentuale = previsioniReportFunnelBurccPercentuale.trim()
        if (selectedPercentuale.length > 0) {
          const selectedPercentualeValue = Number.parseFloat(selectedPercentuale.replace(',', '.'))
          const keepPercentuale = Number.isFinite(selectedPercentualeValue) && (payload.percentualiSuccessoDisponibili ?? []).some((value) => Math.abs(value - selectedPercentualeValue) < 0.0001)
          if (!keepPercentuale) {
            setPrevisioniReportFunnelBurccPercentuale('')
          }
        }
      }

      setPrevisioniReportFunnelBurccData(payload)
      setStatusMessage(`Report Funnel BU RCC caricato (anno: ${payloadYear}): ${payload.righe.length} righe.`)
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
    setDetailRicavoPrevistoInput('')
    setDetailOreRestantiInput('')
    setDetailActiveTab('storico')
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
      activePage === 'commesse-anomale' ||
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

    if (lastSintesiPage === 'commesse-anomale') {
      if (!commesseAnomaleData && !analisiRccLoading) {
        void loadCommesseAnomale()
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

  const resetAnalisiFilters = () => {
    const currentYear = new Date().getFullYear().toString()
    const previousYear = (new Date().getFullYear() - 1).toString()
    const defaultReferenceMonth = getDefaultReferenceMonth().toString()

    if (isRisorsePage) {
      resetRisorseFilters()
      return
    }

    switch (activePage) {
      case 'commesse-andamento-mensile':
        setCommesseAndamentoMensileAnni([currentYear])
        setCommesseAndamentoMensileAggrega(true)
        setCommesseAndamentoMensileMese(defaultReferenceMonth)
        setCommesseAndamentoMensileCommessaSearch('')
        setCommesseAndamentoMensileCommessa('')
        setCommesseAndamentoMensileTipologia('')
        setCommesseAndamentoMensileStato('')
        setCommesseAndamentoMensileMacroTipologia('')
        setCommesseAndamentoMensileControparte('')
        setCommesseAndamentoMensileBusinessUnit('')
        setCommesseAndamentoMensileRcc('')
        setCommesseAndamentoMensilePm('')
        setCommesseAndamentoMensileData(null)
        break
      case 'commesse-anomale':
        setCommesseAnomaleFiltroAnomalia('')
        setCommesseAnomaleFiltroRcc('')
        setCommesseAnomaleData(null)
        break
      case 'commesse-dati-annuali-aggregati':
        setCommesseDatiAnnualiAnni([currentYear])
        setCommesseDatiAnnualiMacroTipologie([])
        setCommesseDatiAnnualiTipologia('')
        setCommesseDatiAnnualiBusinessUnit('')
        setCommesseDatiAnnualiRcc('')
        setCommesseDatiAnnualiPm('')
        setCommesseDatiAnnualiColonneAggregazione(false)
        setCommesseDatiAnnualiSelectedFields(['anno'])
        setCommesseDatiAnnualiAvailableSelection([])
        setCommesseDatiAnnualiSelectedSelection([])
        setCommesseDatiAnnualiData(null)
        break
      case 'analisi-rcc-risultato-mensile':
        setAnalisiRccAnno(currentYear)
        setAnalisiRccRcc('')
        setAnalisiRccData(null)
        break
      case 'analisi-rcc-pivot-fatturato':
        setAnalisiRccPivotAnni([currentYear])
        setAnalisiRccPivotRcc('')
        setAnalisiRccPivotData(null)
        break
      case 'analisi-bu-risultato-mensile':
        setAnalisiBuAnno(currentYear)
        setAnalisiBuBusinessUnit('')
        setAnalisiBuData(null)
        break
      case 'analisi-bu-pivot-fatturato':
        setAnalisiBuPivotAnni([currentYear])
        setAnalisiBuPivotBusinessUnit('')
        setAnalisiBuPivotData(null)
        break
      case 'analisi-burcc-risultato-mensile':
        setAnalisiBurccAnno(currentYear)
        setAnalisiBurccBusinessUnit('')
        setAnalisiBurccRcc('')
        setAnalisiBurccData(null)
        break
      case 'analisi-burcc-pivot-fatturato':
        setAnalisiBurccPivotAnni([currentYear])
        setAnalisiBurccPivotBusinessUnit('')
        setAnalisiBurccPivotRcc('')
        setAnalisiBurccPivotData(null)
        break
      case 'analisi-piano-fatturazione':
        setAnalisiPianoFatturazioneAnno(currentYear)
        setAnalisiPianoFatturazioneMesiSnapshot([])
        setAnalisiPianoFatturazioneTipoCalcolo('complessivo')
        setAnalisiPianoFatturazioneBusinessUnit('')
        setAnalisiPianoFatturazioneRcc('')
        setAnalisiPianoFatturazioneData(null)
        break
      case 'analisi-albero-proiezioni':
        setAnalisiAlberoProiezioniAnno(currentYear)
        setAnalisiAlberoProiezioniBusinessUnit('')
        setAnalisiAlberoProiezioniRcc('')
        setAnalisiAlberoProiezioniData(null)
        break
      case 'analisi-dettaglio-fatturato':
        setAnalisiDettaglioFatturatoAnni([currentYear])
        setAnalisiDettaglioFatturatoCommessaSearch('')
        setAnalisiDettaglioFatturatoCommessa('')
        setAnalisiDettaglioFatturatoProvenienza('')
        setAnalisiDettaglioFatturatoControparte('')
        setAnalisiDettaglioFatturatoBusinessUnit('')
        setAnalisiDettaglioFatturatoRcc('')
        setAnalisiDettaglioFatturatoSoloScadute(false)
        setAnalisiDettaglioFatturatoData(null)
        break
      case 'previsioni-funnel':
        setPrevisioniFunnelAnni([currentYear])
        setPrevisioniFunnelRcc('')
        setPrevisioniFunnelTipo('')
        setPrevisioniFunnelStatoDocumento('')
        setPrevisioniFunnelData(null)
        break
      case 'previsioni-report-funnel-rcc':
        setPrevisioniReportFunnelRccAnni([currentYear])
        setPrevisioniReportFunnelRcc('')
        setPrevisioniReportFunnelRccTipo('')
        setPrevisioniReportFunnelRccTipoDocumento('')
        setPrevisioniReportFunnelRccPercentuale('')
        setPrevisioniReportFunnelRccData(null)
        break
      case 'previsioni-report-funnel-bu':
        setPrevisioniReportFunnelBuAnni([currentYear])
        setPrevisioniReportFunnelBu('')
        setPrevisioniReportFunnelBuRcc('')
        setPrevisioniReportFunnelBuTipo('')
        setPrevisioniReportFunnelBuPercentuale('')
        setPrevisioniReportFunnelBuData(null)
        break
      case 'previsioni-report-funnel-burcc':
        setPrevisioniReportFunnelBurccAnni([currentYear])
        setPrevisioniReportFunnelBurccBusinessUnit('')
        setPrevisioniReportFunnelBurccRcc('')
        setPrevisioniReportFunnelBurccTipo('')
        setPrevisioniReportFunnelBurccPercentuale('')
        setPrevisioniReportFunnelBurccOrder('rcc-bu')
        setPrevisioniReportFunnelBurccData(null)
        break
      case 'previsioni-utile-mensile-rcc':
        setPrevisioniUtileMensileRccAnno(currentYear)
        setPrevisioniUtileMensileRccMeseRiferimento(defaultReferenceMonth)
        setPrevisioniUtileMensileRcc('')
        setPrevisioniUtileMensileRccProduzione('')
        setPrevisioniUtileMensileRccData(null)
        break
      case 'previsioni-utile-mensile-bu':
        setPrevisioniUtileMensileBuAnno(currentYear)
        setPrevisioniUtileMensileBuMeseRiferimento(defaultReferenceMonth)
        setPrevisioniUtileMensileBu('')
        setPrevisioniUtileMensileBuProduzione('')
        setPrevisioniUtileMensileBuData(null)
        break
      case 'processo-offerta-offerte':
      case 'processo-offerta-sintesi-rcc':
      case 'processo-offerta-sintesi-bu':
      case 'processo-offerta-percentuale-successo-rcc':
      case 'processo-offerta-percentuale-successo-bu':
      case 'processo-offerta-incidenza-rcc':
      case 'processo-offerta-incidenza-bu':
        setProcessoOffertaAnni([currentYear, previousYear])
        setProcessoOffertaEsiti([])
        setProcessoOffertaPercentualeRcc('')
        setProcessoOffertaPercentualeBu('')
        setProcessoOffertaOfferteData(null)
        setProcessoOffertaSintesiRccData(null)
        setProcessoOffertaSintesiBuData(null)
        break
      default:
        break
    }

    setStatusMessage('Filtri reimpostati. Premi Cerca per ricaricare i dati.')
  }

  const {
    activateSintesiPage,
    activateCommesseAndamentoMensilePage,
    activateCommesseAnomalePage,
    activateCommesseDatiAnnualiAggregatiPage,
    addCommesseDatiAnnualiSelectedFields,
    removeCommesseDatiAnnualiSelectedFields,
    moveCommesseDatiAnnualiField,
    addRisorsePivotSelectedFields,
    removeRisorsePivotSelectedFields,
    moveRisorsePivotField,
    activateProdottiPage,
    activateRisorseRisultatiPage,
    activateRisorseRisultatiPivotPage,
    activateRisorseRisultatiMensilePage,
    activateRisorseRisultatiMensilePivotPage,
    activateRisorseOuRisorsePage,
    activateRisorseOuRisorsePivotPage,
    activateRisorseOuRisorseMensilePage,
    activateRisorseOuRisorseMensilePivotPage,
    activateAnalisiRccRisultatoMensilePage,
    activateAnalisiRccPivotFatturatoPage,
    activateAnalisiBuRisultatoMensilePage,
    activateAnalisiBuPivotFatturatoPage,
    activateAnalisiBurccRisultatoMensilePage,
    activateAnalisiBurccPivotFatturatoPage,
    activateAnalisiPianoFatturazionePage,
    activateAnalisiAlberoProiezioniPage,
    activateAnalisiDettaglioFatturatoPage,
    activatePrevisioniFunnelPage,
    activatePrevisioniReportFunnelRccPage,
    activatePrevisioniReportFunnelBuPage,
    activatePrevisioniReportFunnelBurccPage,
    activatePrevisioniUtileMensileRccPage,
    activatePrevisioniUtileMensileBuPage,
    activateProcessoOffertaOffertePage,
    activateProcessoOffertaSintesiRccPage,
    activateProcessoOffertaSintesiBuPage,
    activateProcessoOffertaPercentualeSuccessoRccPage,
    activateProcessoOffertaPercentualeSuccessoBuPage,
    activateProcessoOffertaIncidenzaRccPage,
    activateProcessoOffertaIncidenzaBuPage,
    activateDatiContabiliVenditaPage,
    activateDatiContabiliAcquistiPage,
    handleSintesiSubmit,
    handleAnalisiSubmit,
    applyImpersonation,
    stopImpersonation,
    handleOpenInfo,
    handleOpenAppInfo,
    handleOpenImpersonation,
    handleLogout,
    toggleMenu,
  } = buildAppNavigationActions({
    activeImpersonation,
    activePage,
    canImpersonate,
    clearSession,
    commesseAndamentoMensileAnni,
    commesseDatiAnnualiAvailableSelection,
    commesseDatiAnnualiSelectedSelection,
    currentProfile,
    ensureSession,
    getDefaultReferenceMonth,
    impersonationInput,
    isRisorseMensilePage,
    isRisorsePage,
    loadAnalisiBuPivotFatturato,
    loadAnalisiBuRisultatoMensile,
    loadAnalisiAlberoProiezioni,
    loadAnalisiBurccPivotFatturato,
    loadAnalisiBurccRisultatoMensile,
    loadAnalisiDettaglioFatturato,
    loadAnalisiPianoFatturazione,
    loadAnalisiRccPivotFatturato,
    loadAnalisiRccRisultatoMensile,
    loadCommesseAndamentoMensile,
    loadCommesseAnomale,
    loadCommesseDatiAnnualiAggregati,
    loadPrevisioniFunnel,
    loadPrevisioniReportFunnelBu,
    loadPrevisioniReportFunnelBurcc,
    loadPrevisioniReportFunnelRcc,
    loadPrevisioniUtileMensileBu,
    loadPrevisioniUtileMensileRcc,
    loadProcessoOffertaOfferte,
    loadProcessoOffertaSintesiBu,
    loadProcessoOffertaSintesiRcc,
    loadRisorseFilters,
    loadRisorseValutazione,
    loadSintesiFilters,
    redirectGuardKey,
    redirectToCentralAuth,
    risorseFiltersForm,
    risorsePivotAvailableSelection,
    risorsePivotSelectedSelection,
    setActivePage,
    setCollapsedProductKeys,
    setCommesseDatiAnnualiAvailableSelection,
    setCommesseDatiAnnualiSelectedFields,
    setCommesseDatiAnnualiSelectedSelection,
    setCommessaSearch,
    setImpersonationInput,
    setImpersonationModalOpen,
    setInfoModalOpen,
    setLastSintesiPage,
    setOpenMenu,
    setPrevisioniUtileMensileBu,
    setPrevisioniUtileMensileBuAnno,
    setPrevisioniUtileMensileBuMeseRiferimento,
    setPrevisioniUtileMensileBuProduzione,
    setPrevisioniUtileMensileRcc,
    setPrevisioniUtileMensileRccAnno,
    setPrevisioniUtileMensileRccMeseRiferimento,
    setPrevisioniUtileMensileRccProduzione,
    setProcessoOffertaEsiti,
    setRisorsePivotAvailableSelection,
    setRisorsePivotSelectedFields,
    setRisorsePivotSelectedSelection,
    setSortColumn,
    setSortDirection,
    setStatusMessage,
    setAppInfoModalOpen,
    sintesiFiltersForm,
    token,
    executeDatiContabiliVenditaSearch,
    executeDatiContabiliAcquistiSearch,
    executeSintesiSearch,
    loadAppInfoDescriptions,
  })
  useEffect(() => installMenuDismissHandlers(setOpenMenu), [])

  useEffect(() => {
    bootstrapSessionFromStorage({
      ensureSession,
      impersonationStorageKey,
      loadHealth,
      readSharedSsoCookie,
      redirectGuardKey,
      redirectToCentralAuth,
      routeActAs: routeRequest.actAs,
      saveToken,
      setImpersonationInput,
      setStatusMessage,
      tokenStorageKey,
      writeSharedSsoCookie,
    })
  }, [routeRequest.actAs])

  useEffect(() => {
    restoreSintesiStateForProfile({
      activeImpersonation,
      canAccessAnalisiCommesseMenu,
      currentProfile,
      emptySintesiFiltersForm,
      loadSintesiFilters,
      setActivePage,
      setCommessaSearch,
      setSintesiFiltersForm,
      setSintesiMode,
      setSintesiRows,
      setSintesiSearched,
      setSortColumn,
      setSortDirection,
      setStatusMessage,
      sintesiMode,
      token,
      tryReadPersistedSintesiState,
    })
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
    processDetailRouteRequest({
      activeImpersonation,
      currentProfile,
      detailRouteProcessed,
      profiles,
      routeRequest,
      setDetailRouteProcessed,
      setSelectedProfile,
      token,
    })
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
      activePage === 'commesse-anomale' ||
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
    key: keyof Omit<SintesiFiltersForm, 'anni' | 'attiveDalAnno' | 'commessa' | 'escludiProdotti' | 'provenienza' | 'soloScadute'>
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
    key: keyof Omit<SintesiFiltersForm, 'anni' | 'attiveDalAnno' | 'commessa' | 'escludiProdotti' | 'provenienza' | 'soloScadute'>
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
    key: keyof Omit<SintesiFiltersForm, 'anni' | 'attiveDalAnno' | 'commessa' | 'escludiProdotti' | 'provenienza' | 'soloScadute'>
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
    if (!isDatiContabiliPage) {
      count += 1 // Attive dal
    }
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
  const showUtileFineProgettoColumn = (isCommesseSintesiPage || isProdottiSintesiPage) && isAggregatedMode
  const annoOptions = useMemo(() => (
    [...sintesiFiltersCatalog.anni]
      .sort((left, right) => Number(right.value) - Number(left.value))
  ), [sintesiFiltersCatalog.anni])
  const attiveDalAnnoOptions = useMemo(() => {
    const values = new Set(
      annoOptions
        .map((option) => option.value?.trim() ?? '')
        .filter((value) => value.length > 0),
    )
    const selected = sintesiFiltersForm.attiveDalAnno.trim()
    if (selected.length > 0) {
      values.add(selected)
    }

    return [...values].sort((left, right) => Number(right) - Number(left))
  }, [annoOptions, sintesiFiltersForm.attiveDalAnno])
  const datiContabiliProvenienzaOptions = useMemo(() => {
    const merged = new Set<string>([
      'Fattura in contabilita',
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
    const source = sintesiCommesseOptions.length > 0
      ? sintesiCommesseOptions
      : sintesiFiltersCatalog.commesse

    const catalogLabels = new Map<string, string>()
    sintesiFiltersCatalog.commesse.forEach((option) => {
      const key = normalizeFilterText(option.value).toLocaleLowerCase('it-IT')
      if (!key) {
        return
      }
      const label = normalizeFilterText(option.label) || normalizeFilterText(option.value)
      if (label) {
        catalogLabels.set(key, label)
      }
    })

    const descriptionByCommessa = new Map<string, string>()
    sintesiRows.forEach((row) => {
      const commessa = normalizeFilterText(row.commessa)
      const descrizione = normalizeFilterText(row.descrizioneCommessa)
      if (!commessa || !descrizione || descriptionByCommessa.has(commessa.toLocaleLowerCase('it-IT'))) {
        return
      }
      descriptionByCommessa.set(commessa.toLocaleLowerCase('it-IT'), descrizione)
    })

    const resolved = new Map<string, FilterOption>()
    source.forEach((option) => {
      const value = normalizeFilterText(option.value)
      if (!value) {
        return
      }

      const key = value.toLocaleLowerCase('it-IT')
      const optionLabel = normalizeFilterText(option.label)
      const catalogLabel = catalogLabels.get(key)
      const description = descriptionByCommessa.get(key)
      const fallbackLabel = description ? `${value} - ${description}` : value
      const label = optionLabel || catalogLabel || fallbackLabel

      resolved.set(key, { value, label })
    })

    return [...resolved.values()]
      .sort((left, right) => left.label.localeCompare(right.label, 'it', { sensitivity: 'base' }))
  }, [sintesiCommesseOptions, sintesiFiltersCatalog.commesse, sintesiRows])
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
      case 'ricaviMaturati':
        return row.ricaviMaturati
      case 'utileSpecifico':
        return row.utileSpecifico
      case 'ricaviFuturi':
        return row.ricaviFuturi
      case 'costiFuturi':
        return row.costiFuturi
      case 'oreFuture':
        return row.oreFuture
      case 'costoPersonaleFuturo':
        return row.costoPersonaleFuturo
      case 'utileFineProgetto':
        return calculateUtileFineProgetto(row)
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
            ricaviMaturati: 0,
            utileSpecifico: 0,
            ricaviFuturi: 0,
            costiFuturi: 0,
            oreFuture: 0,
            costoPersonaleFuturo: 0,
          },
          rows: [],
        })
      }

      const current = groups.get(productKey)!
      current.summary.oreLavorate += row.oreLavorate
      current.summary.costoPersonale += row.costoPersonale
      current.summary.ricavi += row.ricavi
      current.summary.costi += row.costi
      current.summary.ricaviMaturati += row.ricaviMaturati
      current.summary.utileSpecifico += row.utileSpecifico
      current.summary.ricaviFuturi += row.ricaviFuturi
      current.summary.costiFuturi += row.costiFuturi
      current.summary.oreFuture += row.oreFuture
      current.summary.costoPersonaleFuturo += row.costoPersonaleFuturo
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
            case 'ricaviMaturati':
              return group.summary.ricaviMaturati
            case 'utileSpecifico':
              return group.summary.utileSpecifico
            case 'ricaviFuturi':
              return group.summary.ricaviFuturi
            case 'costiFuturi':
              return group.summary.costiFuturi
            case 'oreFuture':
              return group.summary.oreFuture
            case 'costoPersonaleFuturo':
              return group.summary.costoPersonaleFuturo
            case 'utileFineProgetto':
              return calculateUtileFineProgetto(group.summary)
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
      ricaviMaturati: acc.ricaviMaturati + row.ricaviMaturati,
      utileSpecifico: acc.utileSpecifico + row.utileSpecifico,
      ricaviFuturi: acc.ricaviFuturi + row.ricaviFuturi,
      costiFuturi: acc.costiFuturi + row.costiFuturi,
      oreFuture: acc.oreFuture + row.oreFuture,
      costoPersonaleFuturo: acc.costoPersonaleFuturo + row.costoPersonaleFuturo,
    }), {
      oreLavorate: 0,
      costoPersonale: 0,
      ricavi: 0,
      costi: 0,
      ricaviMaturati: 0,
      utileSpecifico: 0,
      ricaviFuturi: 0,
      costiFuturi: 0,
      oreFuture: 0,
      costoPersonaleFuturo: 0,
    })
  ), [sortedRows])
  const totaleUtileFineProgettoValorizzato = useMemo(
    () => sortedRows.reduce((acc, row) => (
      shouldShowUtileFineProgettoForRow(row)
        ? acc + calculateUtileFineProgetto(row)
        : acc
    ), 0),
    [sortedRows],
  )

  const analisiRccGrids = useMemo(() => {
    if (!analisiRccData) {
      return []
    }

    return [analisiRccData.risultatoPesato, analisiRccData.percentualePesata]
  }, [analisiRccData])
  const analisiRccRccOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.rcc,
      analisiRccRcc,
      [analisiRccData?.rccFiltro ?? ''],
    ),
    [analisiRccData?.rccFiltro, analisiRccRcc, sintesiFiltersCatalog.rcc],
  )
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

    const currentYear = new Date().getFullYear()
    if (years.size < 2) {
      for (let offset = 0; offset <= 5; offset += 1) {
        years.add((currentYear - offset).toString())
      }
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
  const analisiBuBusinessUnitOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.businessUnits,
      analisiBuBusinessUnit,
      [analisiBuData?.rccFiltro ?? ''],
    ),
    [analisiBuBusinessUnit, analisiBuData?.rccFiltro, sintesiFiltersCatalog.businessUnits],
  )
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

    const currentYear = new Date().getFullYear()
    if (years.size < 2) {
      for (let offset = 0; offset <= 5; offset += 1) {
        years.add((currentYear - offset).toString())
      }
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

    const currentYear = new Date().getFullYear()
    if (years.size < 2) {
      for (let offset = 0; offset <= 5; offset += 1) {
        years.add((currentYear - offset).toString())
      }
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
  const analisiPianoFatturazioneBusinessUnitOptions = useMemo(() => {
    const options = new Set<string>()
    sintesiFiltersCatalog.businessUnits.forEach((option) => {
      const normalized = normalizeFilterText(option.value)
      if (normalized) {
        options.add(normalized)
      }
    })
    ;(analisiPianoFatturazioneData?.businessUnitDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = analisiPianoFatturazioneBusinessUnit.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (analisiPianoFatturazioneData?.businessUnitFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [
    analisiPianoFatturazioneBusinessUnit,
    analisiPianoFatturazioneData?.businessUnitDisponibili,
    analisiPianoFatturazioneData?.businessUnitFiltro,
    sintesiFiltersCatalog.businessUnits,
  ])
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
  const analisiDettaglioFatturatoRowsRaw = analisiDettaglioFatturatoData?.items ?? []
  const analisiDettaglioFatturatoRows = useMemo(() => {
    if (!analisiDettaglioFatturatoSoloScadute) {
      return analisiDettaglioFatturatoRowsRaw
    }

    const todayKey = normalizeDateKey(new Date())
    if (!todayKey) {
      return analisiDettaglioFatturatoRowsRaw
    }

    return analisiDettaglioFatturatoRowsRaw.filter((row) => {
      const provenienza = normalizeFilterText(row.provenienza ?? '').toLocaleLowerCase('it-IT')
      if (provenienza !== 'fattura futura') {
        return false
      }

      const dataKey = normalizeDateKey(row.data)
      return Boolean(dataKey) && dataKey < todayKey
    })
  }, [analisiDettaglioFatturatoRowsRaw, analisiDettaglioFatturatoSoloScadute])
  const analisiDettaglioFatturatoAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    analisiDettaglioFatturatoAnni.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    ;(analisiDettaglioFatturatoData?.anni ?? []).forEach((value) => {
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
  }, [analisiDettaglioFatturatoAnni, analisiDettaglioFatturatoData?.anni, sintesiFiltersCatalog.anni])
  const analisiDettaglioFatturatoCommesseOptions = useMemo(() => {
    const options = new Set<string>()
    ;(analisiDettaglioFatturatoData?.commesseDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = analisiDettaglioFatturatoCommessa.trim()
    if (selected) {
      options.add(selected)
    }
    const searchTerm = normalizeFilterText(analisiDettaglioFatturatoCommessaSearch).toLowerCase()
    return [...options]
      .filter((value) => {
        if (!searchTerm) {
          return true
        }
        const code = extractCommessaCodeFromOption(value).toLowerCase()
        const label = value.toLowerCase()
        return code.includes(searchTerm) || label.includes(searchTerm)
      })
      .sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [
    analisiDettaglioFatturatoData?.commesseDisponibili,
    analisiDettaglioFatturatoCommessa,
    analisiDettaglioFatturatoCommessaSearch,
  ])
  const analisiDettaglioFatturatoProvenienzaOptions = useMemo(() => {
    const values = new Set<string>()
    ;(analisiDettaglioFatturatoData?.provenienzeDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        values.add(normalized)
      }
    })
    const selected = analisiDettaglioFatturatoProvenienza.trim()
    if (selected) {
      values.add(selected)
    }
    return [...values].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiDettaglioFatturatoData?.provenienzeDisponibili, analisiDettaglioFatturatoProvenienza])
  const analisiDettaglioFatturatoControparteOptions = useMemo(() => {
    const values = new Set<string>()
    ;(analisiDettaglioFatturatoData?.contropartiDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        values.add(normalized)
      }
    })
    const selected = analisiDettaglioFatturatoControparte.trim()
    if (selected) {
      values.add(selected)
    }
    return [...values].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiDettaglioFatturatoData?.contropartiDisponibili, analisiDettaglioFatturatoControparte])
  const analisiDettaglioFatturatoBusinessUnitOptions = useMemo(() => {
    const values = new Set<string>()
    sintesiFiltersCatalog.businessUnits.forEach((option) => {
      const normalized = normalizeFilterText(option.value)
      if (normalized) {
        values.add(normalized)
      }
    })
    ;(analisiDettaglioFatturatoData?.businessUnitDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        values.add(normalized)
      }
    })
    const selected = analisiDettaglioFatturatoBusinessUnit.trim()
    if (selected) {
      values.add(selected)
    }
    const serverFilter = (analisiDettaglioFatturatoData?.businessUnitFiltro ?? '').trim()
    if (serverFilter) {
      values.add(serverFilter)
    }
    return [...values].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [
    analisiDettaglioFatturatoBusinessUnit,
    analisiDettaglioFatturatoData?.businessUnitDisponibili,
    analisiDettaglioFatturatoData?.businessUnitFiltro,
    sintesiFiltersCatalog.businessUnits,
  ])
  const analisiDettaglioFatturatoRccOptions = useMemo(() => {
    const values = new Set<string>()
    sintesiFiltersCatalog.rcc.forEach((option) => {
      const normalized = normalizeFilterText(option.value)
      if (normalized) {
        values.add(normalized)
      }
    })
    ;(analisiDettaglioFatturatoData?.rccDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        values.add(normalized)
      }
    })
    const selected = analisiDettaglioFatturatoRcc.trim()
    if (selected) {
      values.add(selected)
    }
    const serverFilter = (analisiDettaglioFatturatoData?.rccFiltro ?? '').trim()
    if (serverFilter) {
      values.add(serverFilter)
    }
    return [...values].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiDettaglioFatturatoData?.rccDisponibili, analisiDettaglioFatturatoData?.rccFiltro, analisiDettaglioFatturatoRcc, sintesiFiltersCatalog.rcc])
  const analisiAlberoProiezioniRowsRaw = analisiAlberoProiezioniData?.items ?? []
  const analisiAlberoProiezioniRows = useMemo(() => (
    buildAnalisiAlberoProiezioniRows(analisiAlberoProiezioniRowsRaw)
  ), [analisiAlberoProiezioniRowsRaw])
  const analisiAlberoProiezioniAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const normalized = option.value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    ;(analisiAlberoProiezioniData?.anni ?? []).forEach((year) => {
      if (Number.isFinite(year) && year > 0) {
        years.add(year.toString())
      }
    })
    const selected = analisiAlberoProiezioniAnno.trim()
    if (selected) {
      years.add(selected)
    }
    if (years.size === 0) {
      years.add(new Date().getFullYear().toString())
    }
    return [...years].sort((left, right) => Number(right) - Number(left))
  }, [analisiAlberoProiezioniAnno, analisiAlberoProiezioniData?.anni, sintesiFiltersCatalog.anni])
  const analisiAlberoProiezioniRccOptions = useMemo(() => {
    const values = new Set<string>()
    sintesiFiltersCatalog.rcc.forEach((option) => {
      const normalized = normalizeFilterText(option.value)
      if (normalized) {
        values.add(normalized)
      }
    })
    ;(analisiAlberoProiezioniData?.rccDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        values.add(normalized)
      }
    })
    const selected = analisiAlberoProiezioniRcc.trim()
    if (selected) {
      values.add(selected)
    }
    return [...values].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [analisiAlberoProiezioniData?.rccDisponibili, analisiAlberoProiezioniRcc, sintesiFiltersCatalog.rcc])
  const analisiAlberoProiezioniBusinessUnitOptions = useMemo(() => {
    const values = new Set<string>()
    sintesiFiltersCatalog.businessUnits.forEach((option) => {
      const normalized = normalizeFilterText(option.value)
      if (normalized) {
        values.add(normalized)
      }
    })
    ;(analisiAlberoProiezioniData?.businessUnitDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        values.add(normalized)
      }
    })
    const selected = analisiAlberoProiezioniBusinessUnit.trim()
    if (selected) {
      values.add(selected)
    }
    return [...values].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [
    analisiAlberoProiezioniBusinessUnit,
    analisiAlberoProiezioniData?.businessUnitDisponibili,
    sintesiFiltersCatalog.businessUnits,
  ])
  const commesseAnomaleRowsRaw = commesseAnomaleData?.items ?? []
  const commesseAnomaleAnomaliaOptions = useMemo(() => {
    const values = new Set<string>()
    commesseAnomaleRowsRaw.forEach((row) => {
      const normalized = normalizeFilterText(row.tipoAnomalia ?? '')
      if (normalized) {
        values.add(normalized)
      }
    })

    const selected = normalizeFilterText(commesseAnomaleFiltroAnomalia)
    if (selected) {
      values.add(selected)
    }

    return [...values].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [commesseAnomaleFiltroAnomalia, commesseAnomaleRowsRaw])
  const commesseAnomaleRccOptions = useMemo(() => {
    const values = new Set<string>()
    commesseAnomaleRowsRaw.forEach((row) => {
      const normalized = normalizeFilterText(row.rcc ?? '')
      if (normalized) {
        values.add(normalized)
      }
    })

    const selected = normalizeFilterText(commesseAnomaleFiltroRcc)
    if (selected) {
      values.add(selected)
    }

    return [...values].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [commesseAnomaleFiltroRcc, commesseAnomaleRowsRaw])
  const commesseAnomaleRows = useMemo(() => {
    const anomaliaKey = normalizeFilterText(commesseAnomaleFiltroAnomalia).toLocaleLowerCase('it-IT')
    const rccKey = normalizeFilterText(commesseAnomaleFiltroRcc).toLocaleLowerCase('it-IT')

    return commesseAnomaleRowsRaw.filter((row) => {
      const rowAnomaliaKey = normalizeFilterText(row.tipoAnomalia ?? '').toLocaleLowerCase('it-IT')
      const rowRccKey = normalizeFilterText(row.rcc ?? '').toLocaleLowerCase('it-IT')
      const matchesAnomalia = !anomaliaKey || rowAnomaliaKey === anomaliaKey
      const matchesRcc = !rccKey || rowRccKey === rccKey
      return matchesAnomalia && matchesRcc
    })
  }, [commesseAnomaleFiltroAnomalia, commesseAnomaleFiltroRcc, commesseAnomaleRowsRaw])
  const commesseAnomaleDataLoaded = commesseAnomaleData !== null
  const commesseAnomaleRowsRawCount = commesseAnomaleRowsRaw.length
  const commesseAndamentoMensileRows = commesseAndamentoMensileData?.items ?? []
  const commesseAndamentoMensileTotals = useMemo(() => (
    commesseAndamentoMensileRows.reduce((acc, row) => ({
      oreLavorate: acc.oreLavorate + row.oreLavorate,
      costoPersonale: acc.costoPersonale + row.costoPersonale,
      ricavi: acc.ricavi + row.ricavi,
      costi: acc.costi + row.costi,
      ricaviMaturati: acc.ricaviMaturati + row.ricaviMaturati,
      oreFuture: acc.oreFuture + row.oreFuture,
      costoPersonaleFuturo: acc.costoPersonaleFuturo + row.costoPersonaleFuturo,
      costoGeneraleRibaltato: acc.costoGeneraleRibaltato + row.costoGeneraleRibaltato,
      utileSpecifico: acc.utileSpecifico + row.utileSpecifico,
    }), {
      oreLavorate: 0,
      costoPersonale: 0,
      ricavi: 0,
      costi: 0,
      ricaviMaturati: 0,
      oreFuture: 0,
      costoPersonaleFuturo: 0,
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
  const commesseAndamentoMensileStatoOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.stati,
      commesseAndamentoMensileStato,
      commesseAndamentoMensileRows.map((row) => row.stato),
    ),
    [commesseAndamentoMensileRows, commesseAndamentoMensileStato, sintesiFiltersCatalog.stati],
  )
  const commesseAndamentoMensileMacroTipologiaOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.macroTipologie,
      commesseAndamentoMensileMacroTipologia,
      commesseAndamentoMensileRows.map((row) => row.macroTipologia),
    ),
    [commesseAndamentoMensileMacroTipologia, commesseAndamentoMensileRows, sintesiFiltersCatalog.macroTipologie],
  )
  const commesseAndamentoMensileControparteOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.prodotti,
      commesseAndamentoMensileControparte,
      commesseAndamentoMensileRows.map((row) => row.controparte),
    ),
    [commesseAndamentoMensileControparte, commesseAndamentoMensileRows, sintesiFiltersCatalog.prodotti],
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
  const commesseAndamentoMensileAllCommesseOptions = useMemo(() => {
    const map = new Map<string, FilterOption>()
    const addOption = (rawValue: string, rawLabel?: string) => {
      const normalizedValue = normalizeFilterText(rawValue)
      if (!normalizedValue) {
        return
      }
      const normalizedLabel = normalizeFilterText(rawLabel ?? rawValue) || normalizedValue
      const key = normalizedValue.toLocaleLowerCase('it-IT')
      const existing = map.get(key)
      if (!existing) {
        map.set(key, { value: normalizedValue, label: normalizedLabel })
        return
      }

      const existingIsFallback = existing.label.localeCompare(existing.value, 'it', { sensitivity: 'base' }) === 0
      const incomingIsDescriptive = normalizedLabel.localeCompare(normalizedValue, 'it', { sensitivity: 'base' }) !== 0
      if (existingIsFallback && incomingIsDescriptive) {
        map.set(key, { value: normalizedValue, label: normalizedLabel })
      }
    }

    sintesiFiltersCatalog.commesse.forEach((option) => {
      addOption(option.value, option.label)
    })
    commesseAndamentoMensileRows.forEach((row) => addOption(row.commessa))
    addOption(commesseAndamentoMensileCommessa)

    return [...map.values()].sort((left, right) => left.label.localeCompare(right.label, 'it', { sensitivity: 'base' }))
  }, [commesseAndamentoMensileCommessa, commesseAndamentoMensileRows, sintesiFiltersCatalog.commesse])
  const commesseAndamentoMensileCommessaOptions = useMemo(() => {
    const searchTerm = normalizeFilterText(commesseAndamentoMensileCommessaSearch).toLowerCase()
    const filtered = searchTerm
      ? commesseAndamentoMensileAllCommesseOptions
        .filter((option) => (
          option.label.toLowerCase().includes(searchTerm)
          || option.value.toLowerCase().includes(searchTerm)
        ))
      : commesseAndamentoMensileAllCommesseOptions

    const selected = normalizeFilterText(commesseAndamentoMensileCommessa)
    if (!selected) {
      return filtered.slice(0, 500)
    }

    if (filtered.some((option) => option.value.localeCompare(selected, 'it', { sensitivity: 'base' }) === 0)) {
      return filtered.slice(0, 500)
    }

    return [{ value: selected, label: selected }, ...filtered.slice(0, 499)]
  }, [commesseAndamentoMensileAllCommesseOptions, commesseAndamentoMensileCommessa, commesseAndamentoMensileCommessaSearch])
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
  const commesseDatiAnnualiTipologiaOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.tipologieCommessa,
      commesseDatiAnnualiTipologia,
      commesseDatiAnnualiRows.map((row) => row.tipologiaCommessa),
    ).map((value) => ({ value, label: value })),
    [commesseDatiAnnualiTipologia, commesseDatiAnnualiRows, sintesiFiltersCatalog.tipologieCommessa],
  )
  const commesseDatiAnnualiBusinessUnitOptions = useMemo(
    () => mergeFilterOptionValues(
      sintesiFiltersCatalog.businessUnits,
      commesseDatiAnnualiBusinessUnit,
      commesseDatiAnnualiRows.map((row) => row.businessUnit),
    ).map((value) => ({ value, label: value })),
    [commesseDatiAnnualiBusinessUnit, commesseDatiAnnualiRows, sintesiFiltersCatalog.businessUnits],
  )
  const commesseDatiAnnualiRccOptions = useMemo(
    () => buildPersonSelectItems(mergeFilterOptionValues(
      sintesiFiltersCatalog.rcc,
      commesseDatiAnnualiRcc,
      commesseDatiAnnualiRows.map((row) => row.rcc),
    )),
    [commesseDatiAnnualiRcc, commesseDatiAnnualiRows, sintesiFiltersCatalog.rcc],
  )
  const commesseDatiAnnualiPmOptions = useMemo(
    () => buildPersonSelectItems(mergeFilterOptionValues(
      sintesiFiltersCatalog.pm,
      commesseDatiAnnualiPm,
      commesseDatiAnnualiRows.map((row) => row.pm),
    )),
    [commesseDatiAnnualiPm, commesseDatiAnnualiRows, sintesiFiltersCatalog.pm],
  )
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
  const commesseDatiAnnualiUseAggregationColumns = (
    commesseDatiAnnualiColonneAggregazione
    && commesseDatiAnnualiSelectedFieldOptions.length > 0
  )
  const commesseDatiAnnualiPivotRows = useMemo(() => {
    const selectedMacroSet = new Set(
      commesseDatiAnnualiMacroTipologie
        .map((value) => normalizeFilterText(value).toUpperCase())
        .filter((value) => value.length > 0),
    )
    const selectedTipologia = normalizeFilterText(commesseDatiAnnualiTipologia).toUpperCase()
    const selectedBusinessUnit = normalizeFilterText(commesseDatiAnnualiBusinessUnit).toUpperCase()
    const selectedRcc = normalizeFilterText(commesseDatiAnnualiRcc).toUpperCase()
    const selectedPm = normalizeFilterText(commesseDatiAnnualiPm).toUpperCase()

    const validRows = commesseDatiAnnualiRows
      .filter((row): row is CommessaSintesiRow & { anno: number } => Number.isFinite(row.anno ?? NaN) && (row.anno ?? 0) > 0)
      .filter((row) => {
        if (selectedMacroSet.size === 0) {
          return true
        }

        const rowMacro = normalizeFilterText(row.macroTipologia).toUpperCase()
        if (!selectedMacroSet.has(rowMacro)) {
          return false
        }
        return true
      })
      .filter((row) => {
        if (selectedTipologia.length > 0) {
          const rowTipologia = normalizeFilterText(row.tipologiaCommessa).toUpperCase()
          if (rowTipologia !== selectedTipologia) {
            return false
          }
        }

        if (selectedBusinessUnit.length > 0) {
          const rowBusinessUnit = normalizeFilterText(row.businessUnit).toUpperCase()
          if (rowBusinessUnit !== selectedBusinessUnit) {
            return false
          }
        }

        if (selectedRcc.length > 0) {
          const rowRcc = normalizeFilterText(row.rcc).toUpperCase()
          if (rowRcc !== selectedRcc) {
            return false
          }
        }

        if (selectedPm.length > 0) {
          const rowPm = normalizeFilterText(row.pm).toUpperCase()
          if (rowPm !== selectedPm) {
            return false
          }
        }

        return true
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
      parentValues: Partial<Record<DatiAnnualiPivotFieldKey, string>>,
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
        const groupValues: Partial<Record<DatiAnnualiPivotFieldKey, string>> = {
          ...parentValues,
          [fieldKey]: group.value,
        }
        pivotRows.push({
          key: groupKey,
          kind: 'gruppo',
          level,
          anno: fieldKey === 'anno' ? Number.parseInt(group.value, 10) || null : null,
          label: groupLabel,
          groupValues,
          ...metrics,
        })

        if (level + 1 < commesseDatiAnnualiSelectedFields.length) {
          buildGroupRows(group.rows, level + 1, groupKey, groupValues)
        }
      })
    }

    if (commesseDatiAnnualiSelectedFields.length > 0) {
      buildGroupRows(validRows, 0, 'root', {})
    } else {
      const metrics = buildDatiAnnualiPivotMetrics(validRows)
      pivotRows.push({
        key: 'totale-dati',
        kind: 'gruppo',
        level: 0,
        anno: null,
        label: 'Dati',
        groupValues: {},
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
      groupValues: {},
      ...grandTotal,
    })

    return pivotRows
  }, [
    commesseDatiAnnualiBusinessUnit,
    commesseDatiAnnualiMacroTipologie,
    commesseDatiAnnualiPm,
    commesseDatiAnnualiRcc,
    commesseDatiAnnualiRows,
    commesseDatiAnnualiSelectedFields,
    commesseDatiAnnualiTipologia,
  ])
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
  const risorseMeseOptions = useMemo(() => {
    const months = new Set<number>()
    risorseFiltersCatalog.mesi.forEach((option) => {
      const parsed = parseReferenceMonthStrict(option.value)
      if (parsed !== null) {
        months.add(parsed)
      }
    })
    risorseFiltersForm.mesi.forEach((value) => {
      const parsed = parseReferenceMonthStrict(value)
      if (parsed !== null) {
        months.add(parsed)
      }
    })
    risorseRowsSorted.forEach((row) => {
      const parsed = parseReferenceMonthStrict(row.meseCompetenza)
      if (parsed !== null) {
        months.add(parsed)
      }
    })
    return [...months]
      .sort((left, right) => left - right)
      .map((value) => ({
        value: value.toString(),
        label: formatReferenceMonthLabel(value),
      }))
  }, [risorseFiltersCatalog.mesi, risorseFiltersForm.mesi, risorseRowsSorted])
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
      ...risorseRowsSorted.map((row) => {
        const bu = normalizeFilterText(row.businessUnit)
        return { value: bu, label: bu }
      }),
    ])
  ), [risorseFiltersCatalog.businessUnits, risorseRowsSorted])
  const risorseOuOptions = useMemo(() => (
    distinctFilterOptionsForUi([
      ...risorseFiltersCatalog.ous,
      ...risorseRowsSorted.map((row) => {
        const ou = resolveOuValue(row)
        return { value: ou, label: ou }
      }),
    ])
  ), [risorseFiltersCatalog.ous, risorseRowsSorted])
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
  const risorseEntityFilterLabel = 'Risorsa'
  const getRisorsePivotFieldLabel = (_key: RisorsePivotFieldKey, fallback: string) => fallback
  const risorsePivotSelectedFieldOptions = useMemo(
    () => risorsePivotSelectedFields
      .map((key) => risorsePivotFieldOptions.find((option) => option.key === key))
      .filter((option): option is { key: RisorsePivotFieldKey; label: string } => Boolean(option))
      .map((option) => ({ ...option, label: getRisorsePivotFieldLabel(option.key, option.label) })),
    [getRisorsePivotFieldLabel, risorsePivotSelectedFields],
  )
  const risorsePivotAvailableFieldOptions = useMemo(
    () => risorsePivotFieldOptions
      .filter((option) => !risorsePivotSelectedFields.includes(option.key))
      .map((option) => ({ ...option, label: getRisorsePivotFieldLabel(option.key, option.label) })),
    [getRisorsePivotFieldLabel, risorsePivotSelectedFields],
  )
  const risorsePivotRows = useMemo(() => {
    if (risorseRowsSorted.length === 0) {
      return [] as CommesseRisorsePivotRow[]
    }

    const fieldLabels = new Map(risorsePivotFieldOptions.map((option) => [option.key, getRisorsePivotFieldLabel(option.key, option.label)]))
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
  }, [getRisorsePivotFieldLabel, risorseRowsSorted, risorsePivotSelectedFields, risorseFiltersForm.vistaCosto])
  const risorseSelects: Array<{
    id: string
    label: string
    key: keyof Omit<RisorseFiltersForm, 'anni' | 'mesi' | 'idRisorsa' | 'vistaCosto'>
    options: FilterOption[]
  }> = [
    { id: 'risorse-tipologia', label: 'Tipologia Commessa', key: 'tipologiaCommessa', options: risorseTipologiaOptions },
    { id: 'risorse-stato', label: 'Stato', key: 'stato', options: risorseStatoOptions },
    { id: 'risorse-macro', label: 'Macrotipologia', key: 'macroTipologia', options: risorseMacroOptions },
    { id: 'risorse-controparte', label: 'Controparte', key: 'controparte', options: risorseControparteOptions },
    { id: 'risorse-business-unit', label: 'Business Unit', key: 'businessUnit', options: risorseBusinessUnitOptions },
    { id: 'risorse-ou', label: 'OU', key: 'ou', options: risorseOuOptions },
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
  const previsioniReportFunnelRccTipoOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniReportFunnelRccData?.tipiDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    if (options.size === 0) {
      previsioniReportFunnelRccRows.forEach((row) => {
        const normalized = row.tipo.trim()
        if (normalized) {
          options.add(normalized)
        }
      })
    }
    const selected = previsioniReportFunnelRccTipo.trim()
    if (selected) {
      options.add(selected)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniReportFunnelRccData?.tipiDisponibili, previsioniReportFunnelRccRows, previsioniReportFunnelRccTipo])
  const previsioniReportFunnelRccTipoDocumentoOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniReportFunnelRccData?.tipiDocumentoDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    if (options.size === 0) {
      previsioniReportFunnelRccRows.forEach((row) => {
        const normalized = row.tipoDocumento.trim()
        if (normalized) {
          options.add(normalized)
        }
      })
    }
    const selected = previsioniReportFunnelRccTipoDocumento.trim()
    if (selected) {
      options.add(selected)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniReportFunnelRccData?.tipiDocumentoDisponibili, previsioniReportFunnelRccRows, previsioniReportFunnelRccTipoDocumento])
  const previsioniReportFunnelRccPercentualeOptions = useMemo(() => {
    const values = new Set<number>()
    ;(previsioniReportFunnelRccData?.percentualiSuccessoDisponibili ?? []).forEach((value) => {
      if (Number.isFinite(value)) {
        values.add(value)
      }
    })
    if (values.size === 0) {
      previsioniReportFunnelRccRows.forEach((row) => {
        if (Number.isFinite(row.percentualeSuccesso)) {
          values.add(row.percentualeSuccesso)
        }
      })
    }
    const selected = Number.parseFloat(previsioniReportFunnelRccPercentuale.trim().replace(',', '.'))
    if (Number.isFinite(selected)) {
      values.add(selected)
    }
    return [...values].sort((left, right) => left - right)
  }, [previsioniReportFunnelRccData?.percentualiSuccessoDisponibili, previsioniReportFunnelRccRows, previsioniReportFunnelRccPercentuale])
  const previsioniReportFunnelRccAnnoSelezionato = previsioniReportFunnelRccAnni[0]?.trim()
    || new Date().getFullYear().toString()
  const previsioniReportFunnelBuRows = previsioniReportFunnelBuData?.righe ?? []
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
  const previsioniReportFunnelBuTipoOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniReportFunnelBuData?.tipiDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    if (options.size === 0) {
      previsioniReportFunnelBuRows.forEach((row) => {
        const normalized = row.tipo.trim()
        if (normalized) {
          options.add(normalized)
        }
      })
    }
    const selected = previsioniReportFunnelBuTipo.trim()
    if (selected) {
      options.add(selected)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniReportFunnelBuData?.tipiDisponibili, previsioniReportFunnelBuRows, previsioniReportFunnelBuTipo])
  const previsioniReportFunnelBuPercentualeOptions = useMemo(() => {
    const values = new Set<number>()
    ;(previsioniReportFunnelBuData?.percentualiSuccessoDisponibili ?? []).forEach((value) => {
      if (Number.isFinite(value)) {
        values.add(value)
      }
    })
    if (values.size === 0) {
      previsioniReportFunnelBuRows.forEach((row) => {
        if (Number.isFinite(row.percentualeSuccesso)) {
          values.add(row.percentualeSuccesso)
        }
      })
    }
    const selected = Number.parseFloat(previsioniReportFunnelBuPercentuale.trim().replace(',', '.'))
    if (Number.isFinite(selected)) {
      values.add(selected)
    }
    return [...values].sort((left, right) => left - right)
  }, [previsioniReportFunnelBuData?.percentualiSuccessoDisponibili, previsioniReportFunnelBuRows, previsioniReportFunnelBuPercentuale])
  const previsioniReportFunnelBuAnnoSelezionato = previsioniReportFunnelBuAnni[0]?.trim()
    || new Date().getFullYear().toString()
  const previsioniReportFunnelBuRowsFiltered = useMemo(() => {
    const selectedTipo = previsioniReportFunnelBuTipo.trim()
    const selectedPercentRaw = previsioniReportFunnelBuPercentuale.trim()
    const selectedPercent = selectedPercentRaw.length > 0
      ? Number.parseFloat(selectedPercentRaw.replace(',', '.'))
      : null
    return previsioniReportFunnelBuRows.filter((row) => {
      const matchesTipo = selectedTipo.length === 0
        || row.tipo.localeCompare(selectedTipo, 'it', { sensitivity: 'base' }) === 0
      const matchesPercent = selectedPercent === null
        || (Number.isFinite(selectedPercent) && Math.abs(row.percentualeSuccesso - selectedPercent) < 0.0001)
      return matchesTipo && matchesPercent
    })
  }, [previsioniReportFunnelBuPercentuale, previsioniReportFunnelBuRows, previsioniReportFunnelBuTipo])
  const previsioniReportFunnelBuTotaliPerAnno = useMemo(() => {
    if (previsioniReportFunnelBuRowsFiltered.length === 0) {
      return []
    }
    const grouped = new Map<number, {
      anno: number
      numeroProtocolli: number
      percentualeSuccessoNumeratore: number
      totaleBudgetRicavo: number
      totaleBudgetCosti: number
      totaleFatturatoFuturo: number
      totaleFuturaAnno: number
      totaleEmessaAnno: number
      totaleRicaviComplessivi: number
    }>()

    previsioniReportFunnelBuRowsFiltered.forEach((row) => {
      const bucket = grouped.get(row.anno) ?? {
        anno: row.anno,
        numeroProtocolli: 0,
        percentualeSuccessoNumeratore: 0,
        totaleBudgetRicavo: 0,
        totaleBudgetCosti: 0,
        totaleFatturatoFuturo: 0,
        totaleFuturaAnno: 0,
        totaleEmessaAnno: 0,
        totaleRicaviComplessivi: 0,
      }

      bucket.numeroProtocolli += row.numeroProtocolli
      bucket.percentualeSuccessoNumeratore += row.percentualeSuccesso * row.numeroProtocolli
      bucket.totaleBudgetRicavo += row.totaleBudgetRicavo
      bucket.totaleBudgetCosti += row.totaleBudgetCosti
      bucket.totaleFatturatoFuturo += row.totaleFatturatoFuturo
      bucket.totaleFuturaAnno += row.totaleFuturaAnno
      bucket.totaleEmessaAnno += row.totaleEmessaAnno
      bucket.totaleRicaviComplessivi += row.totaleRicaviComplessivi
      grouped.set(row.anno, bucket)
    })

    return [...grouped.values()]
      .sort((left, right) => left.anno - right.anno)
      .map((row) => ({
        anno: row.anno,
        numeroProtocolli: row.numeroProtocolli,
        percentualeSuccesso: row.numeroProtocolli > 0
          ? row.percentualeSuccessoNumeratore / row.numeroProtocolli
          : 0,
        totaleBudgetRicavo: row.totaleBudgetRicavo,
        totaleBudgetCosti: row.totaleBudgetCosti,
        totaleFatturatoFuturo: row.totaleFatturatoFuturo,
        totaleFuturaAnno: row.totaleFuturaAnno,
        totaleEmessaAnno: row.totaleEmessaAnno,
        totaleRicaviComplessivi: row.totaleRicaviComplessivi,
      }))
  }, [previsioniReportFunnelBuRowsFiltered])
  const previsioniReportFunnelRccRowsFiltered = useMemo(() => {
    const selectedTipo = previsioniReportFunnelRccTipo.trim()
    const selectedPercentRaw = previsioniReportFunnelRccPercentuale.trim()
    const selectedPercent = selectedPercentRaw.length > 0
      ? Number.parseFloat(selectedPercentRaw.replace(',', '.'))
      : null
    return previsioniReportFunnelRccRows.filter((row) => {
      const matchesTipo = selectedTipo.length === 0
        || row.tipo.localeCompare(selectedTipo, 'it', { sensitivity: 'base' }) === 0
      const matchesPercent = selectedPercent === null
        || (Number.isFinite(selectedPercent) && Math.abs(row.percentualeSuccesso - selectedPercent) < 0.0001)
      return matchesTipo && matchesPercent
    })
  }, [previsioniReportFunnelRccPercentuale, previsioniReportFunnelRccRows, previsioniReportFunnelRccTipo])
  const previsioniReportFunnelRccPivotRows = useMemo(
    () => buildPrevisioniReportFunnelPivotRows(previsioniReportFunnelRccRowsFiltered),
    [previsioniReportFunnelRccRowsFiltered],
  )
  const previsioniReportFunnelRccTotaliPerAnno = useMemo(() => {
    if (previsioniReportFunnelRccRowsFiltered.length === 0) {
      return []
    }
    const grouped = new Map<number, {
      anno: number
      numeroProtocolli: number
      percentualeSuccessoNumeratore: number
      totaleBudgetRicavo: number
      totaleBudgetCosti: number
      totaleFatturatoFuturo: number
      totaleFuturaAnno: number
      totaleEmessaAnno: number
      totaleRicaviComplessivi: number
    }>()

    previsioniReportFunnelRccRowsFiltered.forEach((row) => {
      const bucket = grouped.get(row.anno) ?? {
        anno: row.anno,
        numeroProtocolli: 0,
        percentualeSuccessoNumeratore: 0,
        totaleBudgetRicavo: 0,
        totaleBudgetCosti: 0,
        totaleFatturatoFuturo: 0,
        totaleFuturaAnno: 0,
        totaleEmessaAnno: 0,
        totaleRicaviComplessivi: 0,
      }

      bucket.numeroProtocolli += row.numeroProtocolli
      bucket.percentualeSuccessoNumeratore += row.percentualeSuccesso * row.numeroProtocolli
      bucket.totaleBudgetRicavo += row.totaleBudgetRicavo
      bucket.totaleBudgetCosti += row.totaleBudgetCosti
      bucket.totaleFatturatoFuturo += row.totaleFatturatoFuturo
      bucket.totaleFuturaAnno += row.totaleFuturaAnno
      bucket.totaleEmessaAnno += row.totaleEmessaAnno
      bucket.totaleRicaviComplessivi += row.totaleRicaviComplessivi
      grouped.set(row.anno, bucket)
    })

    return [...grouped.values()]
      .sort((left, right) => left.anno - right.anno)
      .map((row) => ({
        anno: row.anno,
        numeroProtocolli: row.numeroProtocolli,
        percentualeSuccesso: row.numeroProtocolli > 0
          ? row.percentualeSuccessoNumeratore / row.numeroProtocolli
          : 0,
        totaleBudgetRicavo: row.totaleBudgetRicavo,
        totaleBudgetCosti: row.totaleBudgetCosti,
        totaleFatturatoFuturo: row.totaleFatturatoFuturo,
        totaleFuturaAnno: row.totaleFuturaAnno,
        totaleEmessaAnno: row.totaleEmessaAnno,
        totaleRicaviComplessivi: row.totaleRicaviComplessivi,
      }))
  }, [previsioniReportFunnelRccRowsFiltered])
  const previsioniReportFunnelBuPivotRows = useMemo(
    () => buildPrevisioniReportFunnelPivotRows(previsioniReportFunnelBuRowsFiltered),
    [previsioniReportFunnelBuRowsFiltered],
  )
  const previsioniReportFunnelRccHasMultipleAggregazioni = countPrevisioniReportFunnelAggregazioni(previsioniReportFunnelRccRows) > 1
  const previsioniReportFunnelBuHasMultipleAggregazioni = countPrevisioniReportFunnelAggregazioni(previsioniReportFunnelBuRowsFiltered) > 1
  const previsioniReportFunnelRccTotaliDettaglioRows = useMemo(
    () => buildPrevisioniReportFunnelTotaliDettaglioRows(previsioniReportFunnelRccRowsFiltered),
    [previsioniReportFunnelRccRowsFiltered],
  )
  const previsioniReportFunnelBuTotaliDettaglioRows = useMemo(
    () => buildPrevisioniReportFunnelTotaliDettaglioRows(previsioniReportFunnelBuRowsFiltered),
    [previsioniReportFunnelBuRowsFiltered],
  )
  const previsioniReportFunnelBurccRows = previsioniReportFunnelBurccData?.righe ?? []
  const previsioniReportFunnelBurccAnnoOptions = useMemo(() => {
    const years = new Set<string>()
    sintesiFiltersCatalog.anni.forEach((option) => {
      const value = option.value.trim()
      if (value) {
        years.add(value)
      }
    })
    previsioniReportFunnelBurccAnni.forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        years.add(normalized)
      }
    })
    ;(previsioniReportFunnelBurccData?.anni ?? []).forEach((value) => {
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
  }, [previsioniReportFunnelBurccAnni, previsioniReportFunnelBurccData?.anni, sintesiFiltersCatalog.anni])
  const previsioniReportFunnelBurccBusinessUnitOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniReportFunnelBurccData?.aggregazioniDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = previsioniReportFunnelBurccBusinessUnit.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (previsioniReportFunnelBurccData?.aggregazioneFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [
    previsioniReportFunnelBurccBusinessUnit,
    previsioniReportFunnelBurccData?.aggregazioniDisponibili,
    previsioniReportFunnelBurccData?.aggregazioneFiltro,
  ])
  const previsioniReportFunnelBurccRccOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniReportFunnelBurccData?.rccDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    const selected = previsioniReportFunnelBurccRcc.trim()
    if (selected) {
      options.add(selected)
    }
    const serverFilter = (previsioniReportFunnelBurccData?.rccFiltro ?? '').trim()
    if (serverFilter) {
      options.add(serverFilter)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniReportFunnelBurccData?.rccDisponibili, previsioniReportFunnelBurccData?.rccFiltro, previsioniReportFunnelBurccRcc])
  const previsioniReportFunnelBurccTipoOptions = useMemo(() => {
    const options = new Set<string>()
    ;(previsioniReportFunnelBurccData?.tipiDisponibili ?? []).forEach((value) => {
      const normalized = value.trim()
      if (normalized) {
        options.add(normalized)
      }
    })
    if (options.size === 0) {
      previsioniReportFunnelBurccRows.forEach((row) => {
        const normalized = row.tipo.trim()
        if (normalized) {
          options.add(normalized)
        }
      })
    }
    const selected = previsioniReportFunnelBurccTipo.trim()
    if (selected) {
      options.add(selected)
    }
    return [...options].sort((left, right) => left.localeCompare(right, 'it', { sensitivity: 'base' }))
  }, [previsioniReportFunnelBurccData?.tipiDisponibili, previsioniReportFunnelBurccRows, previsioniReportFunnelBurccTipo])
  const previsioniReportFunnelBurccPercentualeOptions = useMemo(() => {
    const values = new Set<number>()
    ;(previsioniReportFunnelBurccData?.percentualiSuccessoDisponibili ?? []).forEach((value) => {
      if (Number.isFinite(value)) {
        values.add(value)
      }
    })
    if (values.size === 0) {
      previsioniReportFunnelBurccRows.forEach((row) => {
        if (Number.isFinite(row.percentualeSuccesso)) {
          values.add(row.percentualeSuccesso)
        }
      })
    }
    const selected = Number.parseFloat(previsioniReportFunnelBurccPercentuale.trim().replace(',', '.'))
    if (Number.isFinite(selected)) {
      values.add(selected)
    }
    return [...values].sort((left, right) => left - right)
  }, [
    previsioniReportFunnelBurccData?.percentualiSuccessoDisponibili,
    previsioniReportFunnelBurccPercentuale,
    previsioniReportFunnelBurccRows,
  ])
  const previsioniReportFunnelBurccAnnoSelezionato = previsioniReportFunnelBurccAnni[0]?.trim()
    || new Date().getFullYear().toString()
  const previsioniReportFunnelBurccRowsFiltered = useMemo(() => {
    const selectedBusinessUnit = previsioniReportFunnelBurccBusinessUnit.trim()
    const selectedRcc = previsioniReportFunnelBurccRcc.trim()
    const selectedTipo = previsioniReportFunnelBurccTipo.trim()
    const selectedPercentRaw = previsioniReportFunnelBurccPercentuale.trim()
    const selectedPercent = selectedPercentRaw.length > 0
      ? Number.parseFloat(selectedPercentRaw.replace(',', '.'))
      : null

    const splitAggregazione = (value: string) => {
      const normalized = value.trim()
      const separator = ' - '
      const separatorIndex = normalized.indexOf(separator)
      if (separatorIndex < 0) {
        return {
          businessUnit: normalized,
          rcc: '',
        }
      }
      return {
        businessUnit: normalized.slice(0, separatorIndex).trim(),
        rcc: normalized.slice(separatorIndex + separator.length).trim(),
      }
    }

    return previsioniReportFunnelBurccRows.filter((row) => {
      const aggregated = splitAggregazione(row.aggregazione)
      const matchesBusinessUnit = selectedBusinessUnit.length === 0
        || aggregated.businessUnit.localeCompare(selectedBusinessUnit, 'it', { sensitivity: 'base' }) === 0
      const matchesRcc = selectedRcc.length === 0
        || aggregated.rcc.localeCompare(selectedRcc, 'it', { sensitivity: 'base' }) === 0
      const matchesTipo = selectedTipo.length === 0
        || row.tipo.localeCompare(selectedTipo, 'it', { sensitivity: 'base' }) === 0
      const matchesPercent = selectedPercent === null
        || (Number.isFinite(selectedPercent) && Math.abs(row.percentualeSuccesso - selectedPercent) < 0.0001)
      return matchesBusinessUnit && matchesRcc && matchesTipo && matchesPercent
    })
  }, [
    previsioniReportFunnelBurccBusinessUnit,
    previsioniReportFunnelBurccPercentuale,
    previsioniReportFunnelBurccRcc,
    previsioniReportFunnelBurccRows,
    previsioniReportFunnelBurccTipo,
  ])
  const previsioniReportFunnelBurccPivotRows = useMemo(
    () => buildPrevisioniReportFunnelBurccPivotRows(previsioniReportFunnelBurccRowsFiltered, previsioniReportFunnelBurccOrder),
    [previsioniReportFunnelBurccOrder, previsioniReportFunnelBurccRowsFiltered],
  )
  const previsioniReportFunnelBurccTotaliPerAnnoFiltered = useMemo(() => {
    if (previsioniReportFunnelBurccRowsFiltered.length === 0) {
      return []
    }
    const grouped = new Map<number, {
      anno: number
      numeroProtocolli: number
      percentualeSuccessoNumeratore: number
      totaleBudgetRicavo: number
      totaleBudgetCosti: number
      totaleFatturatoFuturo: number
      totaleFuturaAnno: number
      totaleEmessaAnno: number
      totaleRicaviComplessivi: number
    }>()

    previsioniReportFunnelBurccRowsFiltered.forEach((row) => {
      const bucket = grouped.get(row.anno) ?? {
        anno: row.anno,
        numeroProtocolli: 0,
        percentualeSuccessoNumeratore: 0,
        totaleBudgetRicavo: 0,
        totaleBudgetCosti: 0,
        totaleFatturatoFuturo: 0,
        totaleFuturaAnno: 0,
        totaleEmessaAnno: 0,
        totaleRicaviComplessivi: 0,
      }

      bucket.numeroProtocolli += row.numeroProtocolli
      bucket.percentualeSuccessoNumeratore += row.percentualeSuccesso * row.numeroProtocolli
      bucket.totaleBudgetRicavo += row.totaleBudgetRicavo
      bucket.totaleBudgetCosti += row.totaleBudgetCosti
      bucket.totaleFatturatoFuturo += row.totaleFatturatoFuturo
      bucket.totaleFuturaAnno += row.totaleFuturaAnno
      bucket.totaleEmessaAnno += row.totaleEmessaAnno
      bucket.totaleRicaviComplessivi += row.totaleRicaviComplessivi
      grouped.set(row.anno, bucket)
    })

    return [...grouped.values()]
      .sort((left, right) => left.anno - right.anno)
      .map((row) => ({
        anno: row.anno,
        numeroProtocolli: row.numeroProtocolli,
        percentualeSuccesso: row.numeroProtocolli > 0
          ? row.percentualeSuccessoNumeratore / row.numeroProtocolli
          : 0,
        totaleBudgetRicavo: row.totaleBudgetRicavo,
        totaleBudgetCosti: row.totaleBudgetCosti,
        totaleFatturatoFuturo: row.totaleFatturatoFuturo,
        totaleFuturaAnno: row.totaleFuturaAnno,
        totaleEmessaAnno: row.totaleEmessaAnno,
        totaleRicaviComplessivi: row.totaleRicaviComplessivi,
      }))
  }, [previsioniReportFunnelBurccRowsFiltered])
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
  const detailOreSpeseRisorseRows = detailData?.oreSpeseRisorse ?? []

  const sortMovimentiByDate = (rows: CommessaFatturaMovimentoRow[], direction: SortDirection) => (
    [...rows].sort((left, right) => {
      const leftTime = left.dataMovimento ? new Date(left.dataMovimento).getTime() : Number.MIN_SAFE_INTEGER
      const rightTime = right.dataMovimento ? new Date(right.dataMovimento).getTime() : Number.MIN_SAFE_INTEGER
      if (leftTime !== rightTime) {
        return direction === 'asc'
          ? leftTime - rightTime
          : rightTime - leftTime
      }

      const byDocumento = left.numeroDocumento.localeCompare(right.numeroDocumento, 'it', { sensitivity: 'base', numeric: true })
      return direction === 'asc' ? byDocumento : -byDocumento
    })
  )

  const detailVenditeSorted = useMemo(
    () => sortMovimentiByDate(detailVenditeRows, detailVenditeDateSortDirection),
    [detailVenditeRows, detailVenditeDateSortDirection],
  )

  const detailAcquistiSorted = useMemo(
    () => sortMovimentiByDate(detailAcquistiRows, detailAcquistiDateSortDirection),
    [detailAcquistiRows, detailAcquistiDateSortDirection],
  )

  const toggleDetailVenditeDateSort = () => {
    setDetailVenditeDateSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  const toggleDetailAcquistiDateSort = () => {
    setDetailAcquistiDateSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
  }

  const detailVenditeDateSortIndicator = detailVenditeDateSortDirection === 'asc' ? '?' : '?'
  const detailAcquistiDateSortIndicator = detailAcquistiDateSortDirection === 'asc' ? '?' : '?'

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
      durataRequisito: acc.durataRequisito + row.durataRequisito,
      orePreviste: acc.orePreviste + row.orePreviste,
      oreSpese: acc.oreSpese + row.oreSpese,
      oreRestanti: acc.oreRestanti + row.oreRestanti,
      oreRiferimento: acc.oreRiferimento + (row.orePreviste > 0 ? row.orePreviste : row.durataRequisito),
    }), {
      durataRequisito: 0,
      orePreviste: 0,
      oreSpese: 0,
      oreRestanti: 0,
      oreRiferimento: 0,
    })
  ), [detailRequisitiOreRows])

  const detailRequisitiOrePercentualeProposta = useMemo(() => {
    const fromApi = detailData?.percentualeRaggiuntoProposta
    if (typeof fromApi === 'number' && Number.isFinite(fromApi)) {
      return Math.min(1, Math.max(0, fromApi))
    }

    if (detailRequisitiOreTotals.oreRiferimento <= 0) {
      return null
    }

    return Math.min(
      1,
      Math.max(0, detailRequisitiOreTotals.oreSpese / detailRequisitiOreTotals.oreRiferimento),
    )
  }, [detailData?.percentualeRaggiuntoProposta, detailRequisitiOreTotals])

  const detailOreSpeseRisorseTotal = useMemo(
    () => detailOreSpeseRisorseRows.reduce((acc, row) => acc + row.oreSpeseTotali, 0),
    [detailOreSpeseRisorseRows],
  )

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
  const detailRicavoPrevistoSalvato = useMemo(() => (
    detailAvanzamentoRiferimentoCorrente
      ? (Number.isFinite(detailAvanzamentoRiferimentoCorrente.importoRiferimento)
          ? detailAvanzamentoRiferimentoCorrente.importoRiferimento
          : null)
      : null
  ), [detailAvanzamentoRiferimentoCorrente])
  const detailOreRestantiSalvate = useMemo(() => (
    detailAvanzamentoRiferimentoCorrente
      ? (Number.isFinite(detailAvanzamentoRiferimentoCorrente.oreFuture)
          ? detailAvanzamentoRiferimentoCorrente.oreFuture
          : (Number.isFinite(detailAvanzamentoRiferimentoCorrente.oreRestanti)
              ? detailAvanzamentoRiferimentoCorrente.oreRestanti
              : null))
      : null
  ), [detailAvanzamentoRiferimentoCorrente])
  const detailCostoPersonaleFuturoSalvato = useMemo(() => (
    detailAvanzamentoRiferimentoCorrente
      ? (Number.isFinite(detailAvanzamentoRiferimentoCorrente.costoPersonaleFuturo)
          ? detailAvanzamentoRiferimentoCorrente.costoPersonaleFuturo
          : null)
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
  const detailRicaviAnniSuccessivi = detailData?.ricaviAnniSuccessivi ?? 0
  const detailRicaviFuturiComplessivi = detailRicaviFuturiAggregati + detailRicaviAnniSuccessivi
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

  const detailRicavoPrevistoManuale = useMemo(
    () => parseDecimalInput(detailRicavoPrevistoInput),
    [detailRicavoPrevistoInput],
  )
  const detailOreRestantiManuale = useMemo(
    () => parseDecimalInput(detailOreRestantiInput),
    [detailOreRestantiInput],
  )
  const detailCostoPersonaleMedioStorico = detailConsuntivoMesePrecedente.oreLavorate > 0
    ? detailConsuntivoMesePrecedente.costoPersonale / detailConsuntivoMesePrecedente.oreLavorate
    : 0
  const detailOreRestantiProiezione = detailOreRestantiManuale
    ?? detailOreRestantiSalvate
    ?? detailOreFuture
  const detailCostoPersonaleFuturoCalcolato = detailOreRestantiProiezione * detailCostoPersonaleMedioStorico
  const detailCostoPersonaleFuturoProiezione = detailOreRestantiManuale === null
    ? (detailCostoPersonaleFuturoSalvato ?? detailCostoPersonaleFuturoCalcolato)
    : detailCostoPersonaleFuturoCalcolato
  const detailFatturatoPassato = detailConsuntivoMesePrecedente.ricavi
  const detailRicavoPrevisto = detailRicavoPrevistoManuale
    ?? detailRicavoPrevistoSalvato
    ?? detailRicaviFuturiComplessivi
  const detailRicavoMaturatoAlMesePrecedente = detailRicavoPrevisto * detailPercentRaggiuntoMesePrecedente
  const detailUtileRicalcolatoMesePrecedente = (
    detailFatturatoPassato
    + detailRicavoMaturatoAlMesePrecedente
    - detailConsuntivoMesePrecedente.costoPersonale
    - detailCostiPassatiRiconciliati
  )
  const detailUtileFineProgetto = (
    detailUtileConsuntivatoRiconciliato
    + detailRicaviFuturiComplessivi
    - detailCostiFuturiAggregati
    - detailCostoPersonaleFuturoProiezione
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
          isRisorseOuRisorseMensilePage
            ? 'Analisi Mensile OU Risorse'
            : (
              isRisorseOuRisorseMensilePivotPage
                ? 'Analisi Mensile OU Risorse Pivot'
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
    isCommesseAnomalePage
      ? commesseAnomaleRows.length
      : (
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
                                        activePage === 'analisi-albero-proiezioni'
                                          ? analisiAlberoProiezioniRows.length
                                          : (
                                        activePage === 'analisi-dettaglio-fatturato'
                                          ? analisiDettaglioFatturatoRows.length
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
                                                activePage === 'previsioni-report-funnel-burcc'
                                                  ? previsioniReportFunnelBurccPivotRows.length
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
    return `${sign}${currencyFormatter.format(Math.abs(safeValue))} EUR`
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

  function parseDecimalInput(rawValue: string) {
    const compactValue = rawValue.trim().replace(/\s+/g, '')
    if (!compactValue) {
      return null
    }

    let normalized = compactValue
    const hasComma = normalized.includes(',')
    const hasDot = normalized.includes('.')
    if (hasComma && hasDot) {
      if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
        normalized = normalized.replace(/\./g, '').replace(',', '.')
      } else {
        normalized = normalized.replace(/,/g, '')
      }
    } else if (hasComma) {
      normalized = normalized.replace(',', '.')
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
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

  const handleDetailRicavoPrevistoInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const compactValue = event.target.value.replace(/\s+/g, '')
    if (!compactValue) {
      setDetailRicavoPrevistoInput('')
      return
    }

    if (!/^-?[0-9.,]*$/.test(compactValue)) {
      return
    }

    setDetailRicavoPrevistoInput(compactValue)
  }

  const handleDetailRicavoPrevistoInputBlur = () => {
    const normalized = detailRicavoPrevistoInput.trim()
    if (!normalized) {
      setDetailRicavoPrevistoInput(numberFormatter.format(detailRicavoPrevisto))
      return
    }

    const parsed = parseDecimalInput(normalized)
    if (parsed === null) {
      return
    }

    setDetailRicavoPrevistoInput(numberFormatter.format(parsed))
  }

  const handleDetailOreRestantiInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const compactValue = event.target.value.replace(/\s+/g, '')
    if (!compactValue) {
      setDetailOreRestantiInput('')
      return
    }

    if (!/^-?[0-9.,]*$/.test(compactValue)) {
      return
    }

    setDetailOreRestantiInput(compactValue)
  }

  const handleDetailOreRestantiInputBlur = () => {
    const normalized = detailOreRestantiInput.trim()
    if (!normalized) {
      setDetailOreRestantiInput(numberFormatter.format(detailOreRestantiProiezione))
      return
    }

    const parsed = parseDecimalInput(normalized)
    if (parsed === null) {
      return
    }

    setDetailOreRestantiInput(numberFormatter.format(parsed))
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

    const parsedRicavo = parseDecimalInput(detailRicavoPrevistoInput)
    const ricavoRiferimento = parsedRicavo === null
      ? (detailRicavoPrevistoSalvato ?? detailRicaviFuturiComplessivi)
      : parsedRicavo
    if (!Number.isFinite(ricavoRiferimento)) {
      setDetailStatusMessage('Valore Ricavo previsto non valido.')
      return
    }
    setDetailRicavoPrevistoInput(numberFormatter.format(ricavoRiferimento))

    const parsedOreRestanti = parseDecimalInput(detailOreRestantiInput)
    const oreRestantiRiferimentoRaw = parsedOreRestanti === null
      ? (detailOreRestantiSalvate ?? detailOreFuture)
      : parsedOreRestanti
    const oreRestantiRiferimento = Math.max(0, oreRestantiRiferimentoRaw)
    if (!Number.isFinite(oreRestantiRiferimento)) {
      setDetailStatusMessage('Valore Ore restanti non valido.')
      return
    }
    setDetailOreRestantiInput(numberFormatter.format(oreRestantiRiferimento))
    const costoPersonaleFuturoRiferimento = oreRestantiRiferimento * detailCostoPersonaleMedioStorico

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
          importoRiferimento: ricavoRiferimento,
          oreFuture: oreRestantiRiferimento,
          oreRestanti: oreRestantiRiferimento,
          costoPersonaleFuturo: costoPersonaleFuturoRiferimento,
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
      setDetailRicavoPrevistoInput(numberFormatter.format(payload.importoRiferimento))
      const oreFutureSalvate = Number.isFinite(payload.oreFuture) ? payload.oreFuture : payload.oreRestanti
      setDetailOreRestantiInput(numberFormatter.format(oreFutureSalvate))
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

    const ricavoDaImpostare = detailRicavoPrevistoSalvato ?? detailRicaviFuturiComplessivi
    setDetailRicavoPrevistoInput(numberFormatter.format(ricavoDaImpostare))
    const oreRestantiDaImpostare = detailOreRestantiSalvate ?? detailOreFuture
    setDetailOreRestantiInput(numberFormatter.format(oreRestantiDaImpostare))

    if (detailPercentRaggiuntoSalvato !== null) {
      setDetailPercentRaggiuntoInput(percentFormatter.format(detailPercentRaggiuntoSalvato))
      return
    }

    const suggestedPercent = Math.min(
      100,
      Math.max(0, detailPercentRaggiuntoMesePrecedenteAutomatico * 100),
    )
    setDetailPercentRaggiuntoInput(percentFormatter.format(suggestedPercent))
  }, [
    detailData?.commessa,
    detailPercentRaggiuntoMesePrecedenteAutomatico,
    detailPercentRaggiuntoSalvato,
    detailRicavoPrevistoSalvato,
    detailRicaviFuturiComplessivi,
    detailOreRestantiSalvate,
    detailOreFuture,
    percentFormatter,
    numberFormatter,
  ])

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
        Causale: row.causale,
        Sottoconto: row.sottoconto,
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
        { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 40 }, { wch: 20 }, { wch: 18 }, { wch: 24 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 },
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
        Causale: row.causale,
        Sottoconto: row.sottoconto,
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
        { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 18 }, { wch: 24 },
        { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 10 },
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
            RicaviMaturati: row.ricaviMaturati,
            UtileSpecifico: row.utileSpecifico,
            RicaviFuturi: row.ricaviFuturi,
            CostiFuturi: row.costiFuturi,
            OreFuture: row.oreFuture,
            CostoPersonaleFuturo: row.costoPersonaleFuturo,
            ...(isAggregatedMode
              ? { UtileFineProgetto: shouldShowUtileFineProgettoForRow(row) ? calculateUtileFineProgetto(row) : '' }
              : {}),
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
          RicaviMaturati: row.ricaviMaturati,
          UtileSpecifico: row.utileSpecifico,
          RicaviFuturi: row.ricaviFuturi,
          CostiFuturi: row.costiFuturi,
          OreFuture: row.oreFuture,
          CostoPersonaleFuturo: row.costoPersonaleFuturo,
          ...(isAggregatedMode
            ? { UtileFineProgetto: shouldShowUtileFineProgettoForRow(row) ? calculateUtileFineProgetto(row) : '' }
            : {}),
        }
      })
      const worksheet = XLSX.utils.json_to_sheet(rows)
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 56 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 18 },
        { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 },
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
        RicaviMaturati: row.ricaviMaturati,
        UtileSpecifico: row.utileSpecifico,
        RicaviFuturi: row.ricaviFuturi,
        CostiFuturi: row.costiFuturi,
        OreFuture: row.oreFuture,
        CostoPersonaleFuturo: row.costoPersonaleFuturo,
        ...(isAggregatedMode
          ? { UtileFineProgetto: shouldShowUtileFineProgettoForRow(row) ? calculateUtileFineProgetto(row) : '' }
          : {}),
      }))
      const worksheet = XLSX.utils.json_to_sheet(rows)
      worksheet['!cols'] = [
        { wch: 8 }, { wch: 14 }, { wch: 56 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 18 },
        { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 },
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

    const rows = commesseDatiAnnualiPivotRows.map((row) => {
      const base: Record<string, unknown> = {
        TipoRiga: row.kind === 'totale' ? 'Totale complessivo' : 'Gruppo',
        Livello: row.level,
      }

      if (commesseDatiAnnualiUseAggregationColumns) {
        commesseDatiAnnualiSelectedFieldOptions.forEach((option, index) => {
          base[option.label] = row.kind === 'totale'
            ? (index === 0 ? row.label : '')
            : (row.groupValues[option.key] ?? '')
        })
      } else {
        base.Etichetta = row.label
      }

      base.NumeroCommesse = row.numeroCommesse
      base.OreLavorate = row.oreLavorate
      base.CostoPersonale = row.costoPersonale
      base.Ricavi = row.ricavi
      base.Costi = row.costi
      base.UtileSpecifico = row.utileSpecifico
      base.RicaviFuturi = row.ricaviFuturi
      base.CostiFuturi = row.costiFuturi
      return base
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const leadingCols = commesseDatiAnnualiUseAggregationColumns
      ? commesseDatiAnnualiSelectedFieldOptions.map(() => ({ wch: 22 }))
      : [{ wch: 48 }]
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 8 },
      ...leadingCols,
      { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
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
    const buildGridRows = (grid: AnalisiRccRisultatoMensileGrid) => {
      const hasBurccColumns = grid.righe.some((item) => (
        (item.businessUnit ?? '').trim().length > 0 || (item.rcc ?? '').trim().length > 0
      ))

      return grid.righe.map((row) => {
        const isTotalRow = row.aggregazione.localeCompare('Totale complessivo', 'it', { sensitivity: 'base' }) === 0
        const output: Record<string, unknown> = {
          ...(hasBurccColumns
            ? {
              BU: isTotalRow ? row.aggregazione : (row.businessUnit ?? row.aggregazione),
              RCC: isTotalRow ? '' : (row.rcc ?? ''),
            }
            : { Aggregazione: row.aggregazione }),
        }
        if (!grid.valoriPercentuali) {
          output.Budget = row.budget ?? null
        }
        grid.mesi.forEach((mese) => {
          output[`M${mese.toString().padStart(2, '0')}`] = getAnalisiRccValueForMonth(row, mese)
        })
        return output
        })
    }

    let filenamePrefix = 'Analisi'
    switch (activePage) {
      case 'commesse-anomale': {
        appendSheet(commesseAnomaleRows.map((row) => ({
          Anomalia: row.tipoAnomalia,
          DettaglioAnomalia: row.dettaglioAnomalia,
          Commessa: row.commessa,
          Descrizione: row.descrizioneCommessa,
          Tipologia: row.tipologiaCommessa,
          Stato: row.stato,
          Macrotipologia: row.macroTipologia,
          Controparte: row.controparte,
          BusinessUnit: row.businessUnit,
          RCC: row.rcc,
          PM: row.pm,
          OreLavorate: row.oreLavorate,
          CostoPersonale: row.costoPersonale,
          Ricavi: row.ricavi,
          Costi: row.costi,
          RicaviFuturi: row.ricaviFuturi,
          CostiFuturi: row.costiFuturi,
        })), 'CommesseAnomale')
        filenamePrefix = 'Commesse_Anomale'
        break
      }
      case 'commesse-andamento-mensile': {
        const andamentoRows: Record<string, unknown>[] = commesseAndamentoMensileRows.map((row) => ({
            AnnoCompetenza: row.annoCompetenza,
            MeseCompetenza: row.meseCompetenza > 0 ? row.meseCompetenza : '',
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
            RicaviMaturati: row.ricaviMaturati,
            UtileSpecifico: row.utileSpecifico,
            OreFuture: row.oreFuture,
            CostoPersonaleFuturo: row.costoPersonaleFuturo,
          }))

        andamentoRows.push({
          AnnoCompetenza: 'Totale',
          MeseCompetenza: '',
          Commessa: '',
          Descrizione: '',
          Tipologia: '',
          Stato: '',
          Macrotipologia: '',
          Prodotto: '',
          Controparte: '',
          BusinessUnit: '',
          RCC: '',
          PM: '',
          Produzione: '',
          OreLavorate: commesseAndamentoMensileTotals.oreLavorate,
          CostoPersonale: commesseAndamentoMensileTotals.costoPersonale,
          Ricavi: commesseAndamentoMensileTotals.ricavi,
          Costi: commesseAndamentoMensileTotals.costi,
          RicaviMaturati: commesseAndamentoMensileTotals.ricaviMaturati,
          UtileSpecifico: commesseAndamentoMensileTotals.utileSpecifico,
          OreFuture: commesseAndamentoMensileTotals.oreFuture,
          CostoPersonaleFuturo: commesseAndamentoMensileTotals.costoPersonaleFuturo,
        })

        appendSheet(andamentoRows, 'AndamentoMensile')
        appendSheet([
          {
            OreLavorate: commesseAndamentoMensileTotals.oreLavorate,
            CostoPersonale: commesseAndamentoMensileTotals.costoPersonale,
            Ricavi: commesseAndamentoMensileTotals.ricavi,
            Costi: commesseAndamentoMensileTotals.costi,
            RicaviMaturati: commesseAndamentoMensileTotals.ricaviMaturati,
            UtileSpecifico: commesseAndamentoMensileTotals.utileSpecifico,
            OreFuture: commesseAndamentoMensileTotals.oreFuture,
            CostoPersonaleFuturo: commesseAndamentoMensileTotals.costoPersonaleFuturo,
          },
        ], 'Totali')
        filenamePrefix = 'Commesse_AndamentoMensile'
        break
      }
      case 'risorse-risultati':
      case 'risorse-risultati-mensile':
      case 'risorse-ou-risorse':
      case 'risorse-ou-risorse-mensile': {
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
          BusinessUnitCommessa: row.businessUnit,
          OURisorsa: resolveOuValue(row),
          RCC: row.rcc,
          PM: row.pm,
          IdRisorsa: row.idRisorsa,
          NomeRisorsa: normalizeRisorsaLabel(row),
          OreTotali: row.oreTotali,
          CostoSpecificoRisorsa: row.costoSpecificoRisorsa,
          Fatturato: risorseFiltersForm.vistaCosto ? row.fatturatoInBaseACosto : row.fatturatoInBaseAdOre,
          Utile: risorseFiltersForm.vistaCosto ? row.utileInBaseACosto : row.utileInBaseAdOre,
          VistaCalcolo: risorseFiltersForm.vistaCosto ? 'Costo' : 'Ore',
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
                    : 'AnalisiMensileOURisorse'
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
                  : 'AnalisiOU_RisorseMensile'
              )
          )
        break
      }
      case 'risorse-risultati-pivot':
      case 'risorse-risultati-mensile-pivot':
      case 'risorse-ou-risorse-pivot':
      case 'risorse-ou-risorse-mensile-pivot': {
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
              : (
                activePage === 'risorse-ou-risorse-mensile-pivot'
                  ? 'AnalisiMensileOURisorsePivot'
                  : 'AnalisiOURisorsePivot'
              )
          ))
        filenamePrefix = activePage === 'risorse-risultati-pivot'
          ? 'Risorse_PivotAnnuale'
          : (
            activePage === 'risorse-risultati-mensile-pivot'
              ? 'Risorse_PivotMensile'
              : (
                activePage === 'risorse-ou-risorse-mensile-pivot'
                  ? 'AnalisiOU_RisorsePivotMensile'
                  : 'AnalisiOU_RisorsePivot'
              )
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
          PercentualeRaggiungimentoTemporale: row.percentualeRaggiungimentoTemporale,
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
          PercentualeRaggiungimentoTemporale: row.percentualeRaggiungimentoTemporale,
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
          PercentualeRaggiungimentoTemporale: row.percentualeRaggiungimentoTemporale,
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
          PercentualeRaggiungimentoTemporale: row.percentualeRaggiungimentoTemporale,
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
          PercentualeRaggiungimentoTemporale: row.percentualeRaggiungimentoTemporale,
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
          PercentualeRaggiungimentoTemporale: row.percentualeRaggiungimentoTemporale,
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
      case 'analisi-albero-proiezioni': {
        appendSheet(analisiAlberoProiezioniRows.map((row) => ({
          Livello: row.livello,
          Anno: row.anno,
          RCC: row.rcc,
          BU: row.businessUnit,
          Cliente: row.cliente,
          Commessa: row.commessa,
          Fatturato: row.fatturato,
          FatturatoFuturo: row.fatturatoFuturo,
          Totale: row.totale,
          RicavoIpotetico: row.ricavoIpotetico,
        })), 'AlberoProiezioni')
        filenamePrefix = 'AnalisiProiezioni_AlberoProiezioni'
        break
      }
      case 'analisi-dettaglio-fatturato': {
        appendSheet(analisiDettaglioFatturatoRows.map((row) => ({
          Anno: row.anno,
          Data: row.data ? formatDate(row.data) : '',
          Commessa: row.commessa,
          BusinessUnit: row.businessUnit,
          Controparte: row.controparte,
          Provenienza: row.provenienza,
          Fatturato: row.fatturato,
          FatturatoFuturo: row.fatturatoFuturo,
          RicavoIpotetico: row.ricavoIpotetico,
          RCC: row.rcc,
          PM: row.pm,
          DescrizioneMastro: row.descrizioneMastro,
          DescrizioneConto: row.descrizioneConto,
          DescrizioneSottoconto: row.descrizioneSottoconto,
        })), 'DettaglioFatturato')
        filenamePrefix = 'AnalisiProiezioni_DettaglioFatturato'
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
          RCC: row.aggregazione,
          Tipo: row.tipo,
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
      case 'previsioni-report-funnel-burcc': {
        appendSheet(previsioniReportFunnelBurccPivotRows.map((row) => ({
          Anno: row.anno,
          Livello: row.livello,
          BU: row.businessUnit,
          RCC: row.rcc,
          Tipo: row.tipo,
          PercentualeSuccesso: row.percentualeSuccesso,
          NumeroProtocolli: row.numeroProtocolli,
          BudgetRicavo: row.totaleBudgetRicavo,
          BudgetCosti: row.totaleBudgetCosti,
          FatturatoFuturo: row.totaleFatturatoFuturo,
          FuturaAnno: row.totaleFuturaAnno,
          EmessaAnno: row.totaleEmessaAnno,
          TotaleAnno: row.totaleRicaviComplessivi,
        })), 'ReportFunnel')
        appendSheet(previsioniReportFunnelBurccTotaliPerAnnoFiltered.map((row) => ({
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
        filenamePrefix = 'Previsioni_ReportFunnelBURCC'
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
          DataApertura: detailAnagrafica.dataApertura ? formatDate(detailAnagrafica.dataApertura) : '',
          DataChiusura: detailAnagrafica.dataChiusura ? formatDate(detailAnagrafica.dataChiusura) : '',
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
        Causale: row.causale,
        Sottoconto: row.sottoconto,
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
        Causale: row.causale,
        Sottoconto: row.sottoconto,
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
        DurataRequisito: row.durataRequisito,
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
        DurataRequisito: row.durataRequisito,
        OrePreviste: row.orePreviste,
        OreSpese: row.oreSpese,
        OreRestanti: row.oreRestanti,
        PercentualeAvanzamento: row.percentualeAvanzamento,
      })),
      'RequisitiRisorse',
    )

    appendSheet(
      detailOreSpeseRisorseRows.map((row) => ({
        IdRisorsa: row.idRisorsa,
        NomeRisorsa: row.nomeRisorsa,
        OreSpeseTotali: row.oreSpeseTotali,
      })),
      'OreSpeseRisorse',
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
  const remainingPagesProps = {
    analisiPageCountLabel,
    addRisorsePivotSelectedFields,
    analisiRccLoading,
    analisiBuBusinessUnitOptions,
    analisiBuPivotAnnoOptions,
    analisiBuPivotBusinessUnitOptions,
    analisiBurccBusinessUnitOptions,
    analisiBurccPivotAnnoOptions,
    analisiBurccPivotBusinessUnitOptions,
    analisiBurccPivotRccOptions,
    analisiBurccRccOptions,
    analisiDettaglioFatturatoAnnoOptions,
    analisiDettaglioFatturatoBusinessUnitOptions,
    analisiDettaglioFatturatoCommesseOptions,
    analisiDettaglioFatturatoControparteOptions,
    analisiDettaglioFatturatoProvenienzaOptions,
    analisiDettaglioFatturatoRccOptions,
    analisiPianoFatturazioneAnnoOptions,
    analisiPianoFatturazioneBusinessUnitOptions,
    analisiPianoFatturazioneMesiSnapshotOptions,
    analisiPianoFatturazioneRccOptions,
    analisiRccPivotAnnoOptions,
    analisiRccPivotRccOptions,
    analisiRccRccOptions,
    canAccessPrevisioniUtileMensileBuPage,
    canAccessPrevisioniUtileMensileRccPage,
    canAccessPrevisioniFunnelBurccPage,
    canAccessRisultatiRisorseMenu,
    canAccessProcessoOffertaPage,
    canExportAnalisiPage,
    canSelectPrevisioniFunnelBurcc,
    canSelectPrevisioniUtileMensileBu,
    canSelectPrevisioniUtileMensileRcc,
    currentProfile,
    asRisorsePivotFieldKeys,
    exportAnalisiExcel,
    formatDate,
    formatAnalisiRccPercent,
    formatCurrency,
    formatNumber,
    formatPercentRatio,
    formatPercentValue,
    formatPercentRatioUnbounded,
    formatReferenceMonthLabel,
    handleAnalisiSubmit,
    isProcessoOffertaPage,
    isProcessoOffertaIncidenzaBuPage,
    isProcessoOffertaIncidenzaRccPage,
    isProcessoOffertaOffertePage,
    isProcessoOffertaPercentualeSuccessoBuPage,
    isProcessoOffertaPercentualeSuccessoRccPage,
    isProcessoOffertaSintesiBuPage,
    isProcessoOffertaSintesiRccPage,
    isRisorsePage,
    isRisorseMensilePage,
    isRisorseOuMode,
    isRisorsePivotPage,
    isAnalisiRccPercentUnderTarget,
    isAnalisiSearchCollapsed,
    isAnalisiSearchCollapsible,
    mesiItaliani,
    moveRisorsePivotField,
    normalizeRisorsaLabel,
    openCommessaDetail,
    previsioniFunnelAnnoOptions,
    previsioniFunnelRccOptions,
    previsioniFunnelStatoDocumentoOptions,
    previsioniFunnelTipoOptions,
    previsioniReportFunnelBuAnnoOptions,
    previsioniReportFunnelBuAnnoSelezionato,
    previsioniReportFunnelBuHasMultipleAggregazioni,
    previsioniReportFunnelBuOptions,
    previsioniReportFunnelBuPercentuale,
    previsioniReportFunnelBuPercentualeOptions,
    previsioniReportFunnelBuRccOptions,
    previsioniReportFunnelBuTipo,
    previsioniReportFunnelBuTipoOptions,
    previsioniReportFunnelBuTotaliDettaglioRows,
    previsioniReportFunnelBurccAnnoOptions,
    previsioniReportFunnelBurccAnnoSelezionato,
    previsioniReportFunnelBurccBusinessUnitOptions,
    previsioniReportFunnelBurccPercentualeOptions,
    previsioniReportFunnelBurccRccOptions,
    previsioniReportFunnelBurccTipoOptions,
    previsioniReportFunnelRccAnnoOptions,
    previsioniReportFunnelRccAnnoSelezionato,
    previsioniReportFunnelRccHasMultipleAggregazioni,
    previsioniReportFunnelRccOptions,
    previsioniReportFunnelRccPercentualeOptions,
    previsioniReportFunnelRccTipoDocumentoOptions,
    previsioniReportFunnelRccTipoOptions,
    previsioniReportFunnelRccTotaliDettaglioRows,
    previsioniUtileMensileBu,
    previsioniUtileMensileBuAnno,
    previsioniUtileMensileBuAnnoOptions,
    previsioniUtileMensileBuData,
    previsioniUtileMensileBuMeseRiferimento,
    previsioniUtileMensileBuMeseRiferimentoValue,
    previsioniUtileMensileBuOptions,
    previsioniUtileMensileBuProduzione,
    previsioniUtileMensileBuRows,
    previsioniUtileMensileBuTotaliPerAnno,
    previsioniUtileMensileRcc,
    previsioniUtileMensileRccAnno,
    previsioniUtileMensileRccAnnoOptions,
    previsioniUtileMensileRccData,
    previsioniUtileMensileRccMeseRiferimento,
    previsioniUtileMensileRccMeseRiferimentoValue,
    previsioniUtileMensileRccOptions,
    previsioniUtileMensileRccProduzione,
    previsioniUtileMensileRccRows,
    previsioniUtileMensileRccTotaliPerAnno,
    processoOffertaAggregazioneLabel,
    processoOffertaAnni,
    processoOffertaAnnoOptions,
    processoOffertaCountLabel,
    processoOffertaCurrentData,
    processoOffertaEsiti,
    processoOffertaEsitiOptions,
    processoOffertaIncidenzaRows,
    processoOffertaIncidenzaTotaliPerAnno,
    processoOffertaOfferteRows,
    processoOffertaOfferteTotals,
    processoOffertaPercentualeAggregazioneOptions,
    processoOffertaPercentualeSelectedAggregazione,
    processoOffertaSintesiRicaricoTotale,
    processoOffertaSintesiRows,
    processoOffertaSintesiTotals,
    processoOffertaSuccessoRows,
    processoOffertaSuccessoSintesiRows,
    processoOffertaSuccessoSintesiTotale,
    processoOffertaSuccessoTotale,
    processoOffertaSuccessoTotaleNegativo,
    processoOffertaSuccessoTotaleNonDefinito,
    processoOffertaSuccessoTotalePositivo,
    processoOffertaSuccessoTotaliPerAnno,
    processoOffertaTitle,
    processoOffertaVisibilityMessage,
    refreshRisorseFilters,
    removeRisorsePivotSelectedFields,
    resetAnalisiFilters,
    resetRisorseFilters,
    resolveOuValue,
    risorseAnnoOptions,
    risorseCommessaOptions,
    risorseCommessaSearch,
    risorseCountLabel,
    risorseEntityFilterLabel,
    risorseFatturatoLabel,
    risorseFiltersForm,
    risorseFormDisabled,
    risorseMeseOptions,
    risorsePivotAvailableFieldOptions,
    risorsePivotAvailableSelection,
    risorsePivotRows,
    risorsePivotSelectedFieldOptions,
    risorsePivotSelectedSelection,
    risorseRisorsaOptions,
    risorseRisorsaSearch,
    risorseRowsSorted,
    risorseSearched,
    risorseSelects,
    risorseTitle,
    risorseTotals,
    risorseUtileLabel,
    setRisorseCommessaSearch,
    setRisorseFiltersForm,
    setRisorsePivotAvailableSelection,
    setRisorsePivotSelectedSelection,
    setRisorseRisorsaSearch,
    setPrevisioniUtileMensileBu,
    setPrevisioniUtileMensileBuAnno,
    setPrevisioniUtileMensileBuMeseRiferimento,
    setPrevisioniUtileMensileBuProduzione,
    setPrevisioniUtileMensileRcc,
    setPrevisioniUtileMensileRccAnno,
    setPrevisioniUtileMensileRccMeseRiferimento,
    setPrevisioniUtileMensileRccProduzione,
    setPrevisioniReportFunnelBuPercentuale,
    setPrevisioniReportFunnelBuTipo,
    setPrevisioniReportFunnelBurccAnni,
    setPrevisioniReportFunnelBurccBusinessUnit,
    setPrevisioniReportFunnelBurccOrder,
    setPrevisioniReportFunnelBurccPercentuale,
    setPrevisioniReportFunnelBurccRcc,
    setPrevisioniReportFunnelBurccTipo,
    setProcessoOffertaAnni,
    setProcessoOffertaEsiti,
    setProcessoOffertaPercentualeBu,
    setProcessoOffertaPercentualeRcc,
    statusMessageVisible,
    toggleAnalisiSearchCollapsed,
  } as const
  const analisiCommessePageProps = {
    ...remainingPagesProps,
    addCommesseDatiAnnualiSelectedFields,
    annoOptions,
    areAllProductsCollapsed,
    asDatiAnnualiPivotFieldKeys,
    attiveDalAnnoOptions,
    backToSintesi,
    calculateUtileFineProgetto,
    collapseAllProducts,
    commessaOptions,
    commessaSearch,
    commesseAndamentoMensileAggrega,
    commesseAndamentoMensileAnni,
    commesseAndamentoMensileAnnoOptions,
    commesseAndamentoMensileBusinessUnit,
    commesseAndamentoMensileBusinessUnitOptions,
    commesseAndamentoMensileCommessa,
    commesseAndamentoMensileCommessaOptions,
    commesseAndamentoMensileCommessaSearch,
    commesseAndamentoMensileControparte,
    commesseAndamentoMensileControparteOptions,
    commesseAndamentoMensileData,
    commesseAndamentoMensileMacroTipologia,
    commesseAndamentoMensileMacroTipologiaOptions,
    commesseAndamentoMensileMese,
    commesseAndamentoMensileMeseOptions,
    commesseAndamentoMensilePm,
    commesseAndamentoMensilePmSelectItems,
    commesseAndamentoMensileRcc,
    commesseAndamentoMensileRccSelectItems,
    commesseAndamentoMensileRows,
    commesseAndamentoMensileStato,
    commesseAndamentoMensileStatoOptions,
    commesseAndamentoMensileTipologia,
    commesseAndamentoMensileTipologiaOptions,
    commesseAndamentoMensileTotals,
    commesseAnomaleAnomaliaOptions,
    commesseAnomaleDataLoaded,
    commesseAnomaleFiltroAnomalia,
    commesseAnomaleFiltroRcc,
    commesseAnomaleRccOptions,
    commesseAnomaleRows,
    commesseAnomaleRowsRawCount,
    commesseDatiAnnualiAnni,
    commesseDatiAnnualiAnnoOptions,
    commesseDatiAnnualiAvailableFieldOptions,
    commesseDatiAnnualiAvailableSelection,
    commesseDatiAnnualiBusinessUnit,
    commesseDatiAnnualiBusinessUnitOptions,
    commesseDatiAnnualiColonneAggregazione,
    commesseDatiAnnualiData,
    commesseDatiAnnualiFiltersCollapsed,
    commesseDatiAnnualiMacroTipologiaOptions,
    commesseDatiAnnualiMacroTipologie,
    commesseDatiAnnualiPivotRows,
    commesseDatiAnnualiPm,
    commesseDatiAnnualiPmOptions,
    commesseDatiAnnualiRcc,
    commesseDatiAnnualiRccOptions,
    commesseDatiAnnualiSelectedFieldOptions,
    commesseDatiAnnualiSelectedSelection,
    commesseDatiAnnualiTipologia,
    commesseDatiAnnualiTipologiaOptions,
    commesseDatiAnnualiUseAggregationColumns,
    datiContabiliAcquistoSearched,
    datiContabiliAcquistoSortedRows,
    datiContabiliCountLabel,
    datiContabiliLoading,
    datiContabiliProvenienzaOptions,
    datiContabiliVenditaSearched,
    datiContabiliVenditaSortedRows,
    detailAcquistiDateSortIndicator,
    detailAcquistiSorted,
    detailAcquistiTotaleImporto,
    detailActiveTab,
    detailAnagrafica,
    detailAvanzamentoStorico,
    detailCommessa,
    detailConsuntivoMesePrecedente,
    detailCostiFuturiAggregati,
    detailCostiPassatiRiconciliati,
    detailCostoPersonaleFuturoProiezione,
    detailCurrentYear,
    detailData,
    detailLastDayPreviousMonth,
    detailLoading,
    detailOfferteSorted,
    detailOrdiniAggregati,
    detailOrdiniPercentualeQuantita,
    detailOrdiniSorted,
    detailOreFuture,
    detailOreRestantiInput,
    detailOreRestantiProiezione,
    detailOreSpeseRisorseRows,
    detailOreSpeseRisorseTotal,
    detailPercentRaggiuntoInput,
    detailRequisitiOreRisorseRows,
    detailRequisitiOreRows,
    detailRequisitiOreTotals,
    detailRicaviAnniSuccessivi,
    detailRicaviFuturiAggregati,
    detailRicavoMaturatoAlMesePrecedente,
    detailRicavoPrevisto,
    detailRicavoPrevistoInput,
    detailSaving,
    detailSintesiRows,
    detailStatusMessage,
    detailTotals,
    detailUtileConsuntivatoRiconciliato,
    detailUtileFineProgetto,
    detailUtileRicalcolatoMesePrecedente,
    detailVenditeDateSortIndicator,
    detailVenditeSorted,
    detailVenditeTotaleImporto,
    expandAllProducts,
    exportCommesseDatiAnnualiExcel,
    exportDettaglioExcel,
    exportSintesiExcel,
    formatDate,
    formatPercentRatio,
    formatPercentValue,
    getDefaultReferenceMonth,
    handleDetailOreRestantiInputBlur,
    handleDetailOreRestantiInputChange,
    handleDetailPercentRaggiuntoInputBlur,
    handleDetailPercentRaggiuntoInputChange,
    handleDetailRicavoPrevistoInputBlur,
    handleDetailRicavoPrevistoInputChange,
    handleSaveDetailPercentRaggiunto,
    handleSintesiSubmit,
    hasCollapsedProducts,
    hasProductGroups,
    isAggregatedMode,
    isDatiContabiliAcquistiPage,
    isDatiContabiliPage,
    isDatiContabiliVenditaPage,
    isProdottiSintesiPage,
    isSintesiFiltersCollapsible,
    moveCommesseDatiAnnualiField,
    parseReferenceMonthStrict,
    productOrCounterpartColumn,
    productOrCounterpartLabel,
    refreshSintesiFilters,
    removeCommesseDatiAnnualiSelectedFields,
    resetSintesi,
    selectedRequisitoId,
    sessionLoading,
    setCommesseAndamentoMensileAggrega,
    setCommesseAndamentoMensileAnni,
    setCommesseAndamentoMensileBusinessUnit,
    setCommesseAndamentoMensileCommessa,
    setCommesseAndamentoMensileCommessaSearch,
    setCommesseAndamentoMensileControparte,
    setCommesseAndamentoMensileMacroTipologia,
    setCommesseAndamentoMensileMese,
    setCommesseAndamentoMensilePm,
    setCommesseAndamentoMensileRcc,
    setCommesseAndamentoMensileStato,
    setCommesseAndamentoMensileTipologia,
    setCommesseAnomaleFiltroAnomalia,
    setCommesseAnomaleFiltroRcc,
    setCommesseDatiAnnualiAnni,
    setCommesseDatiAnnualiAvailableSelection,
    setCommesseDatiAnnualiBusinessUnit,
    setCommesseDatiAnnualiColonneAggregazione,
    setCommesseDatiAnnualiFiltersCollapsed,
    setCommesseDatiAnnualiMacroTipologie,
    setCommesseDatiAnnualiPm,
    setCommesseDatiAnnualiRcc,
    setCommesseDatiAnnualiSelectedSelection,
    setCommesseDatiAnnualiTipologia,
    setCommessaSearch,
    setDetailActiveTab,
    setSintesiFiltersCollapsed,
    setSintesiFiltersForm,
    setSintesiMode,
    shouldShowUtileFineProgettoForRow,
    showUtileFineProgettoColumn,
    sintesiCountLabel,
    sintesiExportRowsCount,
    sintesiFilterLoadingDetail,
    sintesiFiltersCollapsed,
    sintesiFiltersForm,
    sintesiLoadingData,
    sintesiLoadingFilters,
    sintesiSearched,
    sintesiSelects,
    sintesiTableRows,
    sintesiTitle,
    sortedRows,
    sortIndicator,
    toggleDetailAcquistiDateSort,
    toggleDetailVenditeDateSort,
    toggleProductCollapse,
    toggleRequisitoDettaglio,
    toggleSort,
    totaleUtileFineProgettoValorizzato,
    totals,
  } as const
  const analisiProiezioniPageProps = {
    ...remainingPagesProps,
    Fragment,
    analisiRccAnno,
    analisiRccData,
    analisiRccGrids,
    analisiRccRcc,
    analisiRccPivotAnni,
    analisiRccPivotRcc,
    analisiRccPivotRows,
    analisiRccPivotTotaliPerAnno,
    analisiBuAnno,
    analisiBuBusinessUnit,
    analisiBuData,
    analisiBuGrids,
    analisiBuPivotAnni,
    analisiBuPivotBusinessUnit,
    analisiBuPivotRows,
    analisiBuPivotTotaliPerAnno,
    analisiBurccAnno,
    analisiBurccBusinessUnit,
    analisiBurccData,
    analisiBurccGrids,
    analisiBurccRcc,
    analisiBurccPivotAnni,
    analisiBurccPivotBusinessUnit,
    analisiBurccPivotRcc,
    analisiBurccPivotRows,
    analisiBurccPivotTotaliPerAnno,
    analisiAlberoProiezioniAnno,
    analisiAlberoProiezioniAnnoOptions,
    analisiAlberoProiezioniBusinessUnit,
    analisiAlberoProiezioniBusinessUnitOptions,
    analisiAlberoProiezioniData,
    analisiAlberoProiezioniRcc,
    analisiAlberoProiezioniRccOptions,
    analisiAlberoProiezioniRows,
    analisiDettaglioFatturatoAnni,
    analisiDettaglioFatturatoBusinessUnit,
    analisiDettaglioFatturatoCommessa,
    analisiDettaglioFatturatoCommessaSearch,
    analisiDettaglioFatturatoControparte,
    analisiDettaglioFatturatoProvenienza,
    analisiDettaglioFatturatoRcc,
    analisiDettaglioFatturatoRows,
    analisiDettaglioFatturatoSoloScadute,
    analisiPianoFatturazioneAnno,
    analisiPianoFatturazioneBusinessUnit,
    analisiPianoFatturazioneMesiRiferimento,
    analisiPianoFatturazioneMesiSnapshot,
    analisiPianoFatturazioneProgressRows,
    analisiPianoFatturazioneRcc,
    analisiPianoFatturazioneRows,
    analisiPianoFatturazioneTipoCalcolo,
    canAccessAnalisiBuPage,
    canAccessAnalisiBurccPage,
    canAccessAnalisiAlberoProiezioniPage,
    canAccessAnalisiDettaglioFatturatoPage,
    canAccessAnalisiPianoFatturazionePage,
    canAccessAnalisiRccPage,
    canAccessPrevisioniFunnelBuPage,
    canAccessPrevisioniFunnelRccPage,
    canSelectAnalisiBuBusinessUnit,
    canSelectAnalisiBuPivotBusinessUnit,
    canSelectAnalisiBurccBusinessUnit,
    canSelectAnalisiBurccRcc,
    canSelectAnalisiPianoFatturazioneBusinessUnit,
    canSelectAnalisiPianoFatturazioneRcc,
    canSelectAnalisiRccPivotRcc,
    canSelectAnalisiRccRcc,
    canSelectPrevisioniFunnelBu,
    canSelectPrevisioniFunnelRcc,
    formatDate,
    getAnalisiPianoFatturazioneProgressAmountForMonth,
    getAnalisiPianoFatturazioneProgressPercentForMonth,
    getAnalisiPianoFatturazioneQuarterTotal,
    getAnalisiPianoFatturazioneValueForMonth,
    getAnalisiRccValueForMonth,
    getQuarterFromMonth,
    isQuarterEndMonth,
    previsioniFunnelAnni,
    previsioniFunnelData,
    previsioniFunnelRcc,
    previsioniFunnelRows,
    previsioniFunnelStatoDocumento,
    previsioniFunnelTipo,
    previsioniFunnelTotals,
    previsioniReportFunnelBu,
    previsioniReportFunnelBuData,
    previsioniReportFunnelBuPercentuale,
    previsioniReportFunnelBuPivotRows,
    previsioniReportFunnelBuRcc,
    previsioniReportFunnelBuTipo,
    previsioniReportFunnelBuTotaliPerAnno,
    previsioniReportFunnelBurccBusinessUnit,
    previsioniReportFunnelBurccData,
    previsioniReportFunnelBurccOrder,
    previsioniReportFunnelBurccPercentuale,
    previsioniReportFunnelBurccPivotRows,
    previsioniReportFunnelBurccRcc,
    previsioniReportFunnelBurccTipo,
    previsioniReportFunnelBurccTotaliPerAnno: previsioniReportFunnelBurccTotaliPerAnnoFiltered,
    previsioniReportFunnelRcc,
    previsioniReportFunnelRccData,
    previsioniReportFunnelRccPercentuale,
    previsioniReportFunnelRccPivotRows,
    previsioniReportFunnelRccTipo,
    previsioniReportFunnelRccTipoDocumento,
    previsioniReportFunnelRccTotaliPerAnno,
    setAnalisiBuAnno,
    setAnalisiBuBusinessUnit,
    setAnalisiBuPivotAnni,
    setAnalisiBuPivotBusinessUnit,
    setAnalisiBurccAnno,
    setAnalisiBurccBusinessUnit,
    setAnalisiBurccPivotAnni,
    setAnalisiBurccPivotBusinessUnit,
    setAnalisiBurccPivotRcc,
    setAnalisiBurccRcc,
    setAnalisiAlberoProiezioniAnno,
    setAnalisiAlberoProiezioniBusinessUnit,
    setAnalisiAlberoProiezioniRcc,
    setAnalisiDettaglioFatturatoAnni,
    setAnalisiDettaglioFatturatoBusinessUnit,
    setAnalisiDettaglioFatturatoCommessa,
    setAnalisiDettaglioFatturatoCommessaSearch,
    setAnalisiDettaglioFatturatoControparte,
    setAnalisiDettaglioFatturatoProvenienza,
    setAnalisiDettaglioFatturatoRcc,
    setAnalisiDettaglioFatturatoSoloScadute,
    setAnalisiPianoFatturazioneAnno,
    setAnalisiPianoFatturazioneBusinessUnit,
    setAnalisiPianoFatturazioneMesiSnapshot,
    setAnalisiPianoFatturazioneRcc,
    setAnalisiPianoFatturazioneTipoCalcolo,
    setAnalisiRccAnno,
    setAnalisiRccPivotAnni,
    setAnalisiRccPivotRcc,
    setAnalisiRccRcc,
    setPrevisioniFunnelAnni,
    setPrevisioniFunnelRcc,
    setPrevisioniFunnelStatoDocumento,
    setPrevisioniFunnelTipo,
    setPrevisioniReportFunnelBu,
    setPrevisioniReportFunnelBuAnni,
    setPrevisioniReportFunnelBuPercentuale,
    setPrevisioniReportFunnelBuRcc,
    setPrevisioniReportFunnelBuTipo,
    setPrevisioniReportFunnelBurccAnni,
    setPrevisioniReportFunnelBurccBusinessUnit,
    setPrevisioniReportFunnelBurccOrder,
    setPrevisioniReportFunnelBurccPercentuale,
    setPrevisioniReportFunnelBurccRcc,
    setPrevisioniReportFunnelBurccTipo,
    setPrevisioniReportFunnelRcc,
    setPrevisioniReportFunnelRccAnni,
    setPrevisioniReportFunnelRccPercentuale,
    setPrevisioniReportFunnelRccTipo,
    setPrevisioniReportFunnelRccTipoDocumento,
  } as const
  const appTopBarProps = {
    apiHealth,
    appVersion,
    canAccessAnalisiCommesseMenu,
    canAccessAnalisiAlberoProiezioniPage,
    canAccessAnalisiDettaglioFatturatoPage,
    canAccessAnalisiPianoFatturazionePage,
    canAccessAnalisiProiezioniMenu,
    canAccessAnalisiBuPage,
    canAccessAnalisiBurccPage,
    canAccessAnalisiRccPage,
    canAccessDatiContabiliMenu,
    canAccessPrevisioniMenu,
    canAccessPrevisioniFunnelBuPage,
    canAccessPrevisioniFunnelBurccPage,
    canAccessPrevisioniFunnelRccPage,
    canAccessPrevisioniUtileMensileBuPage,
    canAccessPrevisioniUtileMensileRccPage,
    canAccessProcessoOffertaPage,
    canAccessRisultatiRisorseMenu,
    canImpersonate,
    currentProfile,
    handleLogout,
    handleOpenAppInfo,
    handleOpenImpersonation,
    handleOpenInfo,
    isImpersonating,
    onProfileChange: (value: string) => setSelectedProfile(normalizeProfileLabel(value)),
    openMenu,
    profiles,
    sessionLoading,
    stopImpersonation,
    toggleMenu,
    user,
    activateAnalisiBuPivotFatturatoPage,
    activateAnalisiBuRisultatoMensilePage,
    activateAnalisiAlberoProiezioniPage,
    activateAnalisiBurccPivotFatturatoPage,
    activateAnalisiBurccRisultatoMensilePage,
    activateAnalisiDettaglioFatturatoPage,
    activateAnalisiPianoFatturazionePage,
    activateAnalisiRccPivotFatturatoPage,
    activateAnalisiRccRisultatoMensilePage,
    activateCommesseAndamentoMensilePage,
    activateCommesseAnomalePage,
    activateCommesseDatiAnnualiAggregatiPage,
    activateDatiContabiliAcquistiPage,
    activateDatiContabiliVenditaPage,
    activatePrevisioniFunnelPage,
    activatePrevisioniReportFunnelBuPage,
    activatePrevisioniReportFunnelBurccPage,
    activatePrevisioniReportFunnelRccPage,
    activatePrevisioniUtileMensileBuPage,
    activatePrevisioniUtileMensileRccPage,
    activateProcessoOffertaIncidenzaBuPage,
    activateProcessoOffertaIncidenzaRccPage,
    activateProcessoOffertaOffertePage,
    activateProcessoOffertaPercentualeSuccessoBuPage,
    activateProcessoOffertaPercentualeSuccessoRccPage,
    activateProcessoOffertaSintesiBuPage,
    activateProcessoOffertaSintesiRccPage,
    activateProdottiPage,
    activateRisorseOuRisorseMensilePage,
    activateRisorseOuRisorseMensilePivotPage,
    activateRisorseOuRisorsePage,
    activateRisorseOuRisorsePivotPage,
    activateRisorseRisultatiMensilePage,
    activateRisorseRisultatiMensilePivotPage,
    activateRisorseRisultatiPage,
    activateRisorseRisultatiPivotPage,
    activateSintesiPage,
  } as const
  const appMainContentProps = {
    activePage,
    analisiCommessePageProps,
    analisiProiezioniPageProps,
    remainingPagesProps,
    statusMessageVisible,
  } as const

  return (
    <div className="app-shell">
      <AppTopBar {...appTopBarProps} />

      <AppMainContent {...appMainContentProps} />

      <UserInfoModal
        open={infoModalOpen}
        user={user}
        isImpersonating={isImpersonating}
        authenticatedRoles={authenticatedRoles}
        profiles={profiles}
        ouScopes={ouScopes}
        onClose={() => setInfoModalOpen(false)}
      />

      <AppInfoModal
        open={appInfoModalOpen}
        currentProfile={currentProfile}
        appVersion={appVersion}
        canEditAppInfo={canEditAppInfo}
        appInfoStatus={appInfoStatus}
        appInfoLoading={appInfoLoading}
        appInfoByMenu={appInfoByMenu}
        appInfoDrafts={appInfoDrafts}
        appInfoSavingKey={appInfoSavingKey}
        appInfoVoiceKey={appInfoVoiceKey}
        setAppInfoDrafts={setAppInfoDrafts}
        saveAppInfoDescription={saveAppInfoDescription}
        onClose={() => setAppInfoModalOpen(false)}
      />

      <ImpersonationModal
        open={impersonationModalOpen}
        sessionLoading={sessionLoading}
        impersonationInput={impersonationInput}
        isImpersonating={isImpersonating}
        user={user}
        setImpersonationInput={(value) => setImpersonationInput(value)}
        applyImpersonation={applyImpersonation}
        stopImpersonation={stopImpersonation}
        onClose={() => setImpersonationModalOpen(false)}
      />
    </div>
  )
}

export default App















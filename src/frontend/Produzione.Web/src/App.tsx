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

type MenuKey = 'sintesi' | 'analisi-rcc' | 'dati-contabili' | 'user'
type AppPage =
  | 'none'
  | 'commesse-sintesi'
  | 'prodotti-sintesi'
  | 'analisi-rcc-risultato-mensile'
  | 'analisi-rcc-pivot-fatturato'
  | 'dati-contabili-vendita'
  | 'dati-contabili-acquisti'
  | 'commessa-dettaglio'
type SintesiScope = 'commesse' | 'prodotti'

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
const analisiRccAllowedProfiles = ['Supervisore', 'Responsabile Commerciale', 'Responsabile Commerciale Commessa']
const analisiRccPivotRccSelectableProfiles = ['Supervisore', 'Responsabile Commerciale']

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

const isValidProductValue = (value: string) => {
  const normalized = value.trim()
  if (!normalized) {
    return false
  }

  const upper = normalized.toUpperCase()
  return upper !== 'NON DEFINITO' && upper !== 'NON DEFINTO'
}

const pageToScope = (page: AppPage): SintesiScope => (
  page === 'prodotti-sintesi' ? 'prodotti' : 'commesse'
)

function App() {
  const [token, setToken] = useState('')
  const [apiHealth, setApiHealth] = useState('n/d')
  const [statusMessage, setStatusMessage] = useState('Inizializzazione sessione.')
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [profiles, setProfiles] = useState<string[]>([])
  const [selectedProfile, setSelectedProfile] = useState('')
  const [ouScopes, setOuScopes] = useState<string[]>([])
  const [sessionLoading, setSessionLoading] = useState(false)
  const [isRedirectingToAuth, setIsRedirectingToAuth] = useState(false)
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const [activePage, setActivePage] = useState<AppPage>('none')
  const [lastSintesiPage, setLastSintesiPage] = useState<'commesse-sintesi' | 'prodotti-sintesi' | 'dati-contabili-vendita' | 'dati-contabili-acquisti'>('commesse-sintesi')
  const [activeImpersonation, setActiveImpersonation] = useState('')
  const [impersonationInput, setImpersonationInput] = useState('')
  const [infoModalOpen, setInfoModalOpen] = useState(false)
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
  const [datiContabiliVenditaRows, setDatiContabiliVenditaRows] = useState<DatiContabiliVenditaRow[]>([])
  const [datiContabiliVenditaLoading, setDatiContabiliVenditaLoading] = useState(false)
  const [datiContabiliVenditaSearched, setDatiContabiliVenditaSearched] = useState(false)
  const [datiContabiliAcquistoRows, setDatiContabiliAcquistoRows] = useState<DatiContabiliAcquistoRow[]>([])
  const [datiContabiliAcquistoLoading, setDatiContabiliAcquistoLoading] = useState(false)
  const [datiContabiliAcquistoSearched, setDatiContabiliAcquistoSearched] = useState(false)

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
  const isProdottiSintesiPage = activePage === 'prodotti-sintesi'
  const isDatiContabiliVenditaPage = activePage === 'dati-contabili-vendita'
  const isDatiContabiliAcquistiPage = activePage === 'dati-contabili-acquisti'
  const isDatiContabiliPage = isDatiContabiliVenditaPage || isDatiContabiliAcquistiPage
  const sintesiScope = pageToScope(activePage)
  const sintesiTitle = isDatiContabiliVenditaPage
    ? 'Dati Contabili - Vendite'
    : (isDatiContabiliAcquistiPage
      ? 'Dati Contabili - Acquisti'
      : (isProdottiSintesiPage ? 'Prodotti - Sintesi' : 'Commesse - Sintesi'))
  const currentProfile = selectedProfile || profiles[0] || ''
  const canAccessAnalisiRccPage = analisiRccAllowedProfiles.some((profile) => (
    profile.localeCompare(currentProfile, 'it', { sensitivity: 'base' }) === 0
  ))
  const canSelectAnalisiRccPivotRcc = analisiRccPivotRccSelectableProfiles.some((profile) => (
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
    setDatiContabiliVenditaRows([])
    setDatiContabiliVenditaLoading(false)
    setDatiContabiliVenditaSearched(false)
    setDatiContabiliAcquistoRows([])
    setDatiContabiliAcquistoLoading(false)
    setDatiContabiliAcquistoSearched(false)
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
      setStatusMessage(message || 'Utente autenticato ma senza profili disponibili su Produzione.')
      setProfiles([])
      setSelectedProfile('')
      setOuScopes([])
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
        setUser(null)
        setProfiles([])
        setSelectedProfile('')
        setOuScopes([])
        setSintesiRows([])
        setSintesiSearched(false)
        setStatusMessage(userProbe.message)
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

  const keepIfPresent = (value: string, options: FilterOption[]) => {
    if (!value) {
      return ''
    }

    return options.some((option) => option.value === value) ? value : ''
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
    setStatusMessage(`Aggiornamento filtri in corso per il profilo "${profile}"...`)
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
      setStatusMessage(`Filtri caricati per il profilo "${profile}".`)
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
      setStatusMessage(`Profilo "${currentProfile}" non abilitato ad Analisi RCC.`)
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
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Analisi RCC.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiRccData(null)
        setStatusMessage(message || `Errore caricamento Analisi RCC (${response.status}).`)
        return
      }

      const payload = (await response.json()) as AnalisiRccRisultatoMensileResponse
      setAnalisiRccAnno(payload.anno.toString())
      setAnalisiRccData(payload)
      const righeCount = payload.risultatoPesato?.righe?.length ?? 0
      setStatusMessage(`Analisi RCC caricata per anno ${payload.anno}: ${righeCount} righe.`)
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
      setStatusMessage(`Profilo "${currentProfile}" non abilitato ad Analisi RCC.`)
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
        setStatusMessage(message || `Profilo "${currentProfile}" non autorizzato per Analisi RCC.`)
        return
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setAnalisiRccPivotData(null)
        setStatusMessage(message || `Errore caricamento PivotFatturato (${response.status}).`)
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
      setStatusMessage(`PivotFatturato RCC caricato (anni: ${yearsLabel || yearsToQuery.join(', ')}): ${payload.righe.length} righe.`)
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
    if (activePage === 'commesse-sintesi' || activePage === 'prodotti-sintesi' || activePage === 'dati-contabili-vendita' || activePage === 'dati-contabili-acquisti') {
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

  const handleAnalisiRccSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (activePage === 'analisi-rcc-pivot-fatturato') {
      void loadAnalisiRccPivotFatturato()
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
    setInfoModalOpen(true)
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
  }, [token, activeImpersonation, currentProfile])

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

    if (routeRequest.page === 'commessa-dettaglio' && routeRequest.commessa) {
      setActivePage('commessa-dettaglio')
      void loadCommessaDetail(routeRequest.commessa, token, activeImpersonation, currentProfile)
      setDetailRouteProcessed(true)
      return
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

  const sintesiSelects: Array<{
    id: string
    label: string
    key: keyof Omit<SintesiFiltersForm, 'anni' | 'commessa' | 'escludiProdotti' | 'provenienza' | 'soloScadute'>
    options: FilterOption[]
  }> = [
    { id: 'sintesi-tipologia', label: 'Tipologia Commessa', key: 'tipologiaCommessa', options: sintesiFiltersCatalog.tipologieCommessa },
    { id: 'sintesi-stato', label: 'Stato', key: 'stato', options: sintesiFiltersCatalog.stati },
    { id: 'sintesi-macro', label: 'Macrotipologia', key: 'macroTipologia', options: sintesiFiltersCatalog.macroTipologie },
    {
      id: isProdottiSintesiPage ? 'sintesi-prodotto' : 'sintesi-controparte',
      label: isProdottiSintesiPage ? 'Prodotto' : 'Controparte',
      key: 'prodotto',
      options: sintesiFiltersCatalog.prodotti,
    },
    { id: 'sintesi-business-unit', label: 'Business Unit', key: 'businessUnit', options: sintesiFiltersCatalog.businessUnits },
    { id: 'sintesi-rcc', label: 'RCC', key: 'rcc', options: sintesiFiltersCatalog.rcc },
    { id: 'sintesi-pm', label: 'PM', key: 'pm', options: sintesiFiltersCatalog.pm },
  ]

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
  const totalFilterOptions = useMemo(() => (
    sintesiFiltersCatalog.anni.length +
    sintesiFiltersCatalog.commesse.length +
    sintesiFiltersCatalog.tipologieCommessa.length +
    sintesiFiltersCatalog.stati.length +
    sintesiFiltersCatalog.macroTipologie.length +
    sintesiFiltersCatalog.prodotti.length +
    sintesiFiltersCatalog.businessUnits.length +
    sintesiFiltersCatalog.rcc.length +
    sintesiFiltersCatalog.pm.length
  ), [sintesiFiltersCatalog])
  const populatedFilterBuckets = useMemo(() => (
    [
      sintesiFiltersCatalog.anni,
      sintesiFiltersCatalog.commesse,
      sintesiFiltersCatalog.tipologieCommessa,
      sintesiFiltersCatalog.stati,
      sintesiFiltersCatalog.macroTipologie,
      sintesiFiltersCatalog.prodotti,
      sintesiFiltersCatalog.businessUnits,
      sintesiFiltersCatalog.rcc,
      sintesiFiltersCatalog.pm,
    ].filter((options) => options.length > 0).length
  ), [sintesiFiltersCatalog])
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
  const datiContabiliCountLabel = isDatiContabiliVenditaPage
    ? datiContabiliVenditaCountLabel
    : datiContabiliAcquistoCountLabel
  const datiContabiliLoading = isDatiContabiliVenditaPage
    ? datiContabiliVenditaLoading
    : datiContabiliAcquistoLoading
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
      return 'Ã¢â€ â€¢'
    }

    return sortDirection === 'asc' ? 'Ã¢â€“Â²' : 'Ã¢â€“Â¼'
  }

  const exportSintesiExcel = () => {
    const hasDataToExport = isProdottiSintesiPage
      ? sintesiTableRows.length > 0
      : sortedRows.length > 0

    if (!hasDataToExport) {
      setStatusMessage('Nessun dato disponibile da esportare in Excel.')
      return
    }

    const rows = isProdottiSintesiPage
      ? sintesiTableRows.map((tableRow) => {
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
      : sortedRows.map((row) => ({
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
    worksheet['!cols'] = isProdottiSintesiPage
      ? [
        { wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 56 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 18 },
        { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
        { wch: 16 }, { wch: 16 }, { wch: 16 },
      ]
      : [
        { wch: 8 }, { wch: 14 }, { wch: 56 }, { wch: 24 }, { wch: 10 }, { wch: 18 }, { wch: 18 },
        { wch: 14 }, { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
        { wch: 16 }, { wch: 16 }, { wch: 16 },
      ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, isProdottiSintesiPage ? 'SintesiProdotti' : 'SintesiCommesse')

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
    const scopeLabel = isProdottiSintesiPage ? 'Prodotti' : 'Commesse'
    const filename = `Produzione_${scopeLabel}_Sintesi_${mode}_${anno}_${timestamp}.xlsx`

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
          <div className={`menu-dropdown ${openMenu === 'sintesi' ? 'is-open' : ''}`}>
            <button
              type="button"
              className="menu-trigger"
              onClick={() => toggleMenu('sintesi')}
              aria-expanded={openMenu === 'sintesi'}
            >
              Sintesi
            </button>
            <div className="menu-dropdown-panel">
              <button type="button" className="menu-action" onClick={activateSintesiPage}>
                Commesse
              </button>
              <button type="button" className="menu-action" onClick={activateProdottiPage}>
                Prodotti
              </button>
            </div>
          </div>
          {canAccessAnalisiRccPage && (
            <div className={`menu-dropdown ${openMenu === 'analisi-rcc' ? 'is-open' : ''}`}>
              <button
                type="button"
                className="menu-trigger"
                onClick={() => toggleMenu('analisi-rcc')}
                aria-expanded={openMenu === 'analisi-rcc'}
              >
                Analisi RCC
              </button>
              <div className="menu-dropdown-panel">
                <button type="button" className="menu-action" onClick={activateAnalisiRccRisultatoMensilePage}>
                  Risultato Mensile
                </button>
                <button type="button" className="menu-action" onClick={activateAnalisiRccPivotFatturatoPage}>
                  PivotFatturato
                </button>
              </div>
            </div>
          )}
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
          <span className="sr-only" aria-live="polite">{statusMessage}</span>
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
                  {!isDatiContabiliPage && (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={exportSintesiExcel}
                      disabled={sintesiLoadingData || sortedRows.length === 0}
                    >
                      Export Excel
                    </button>
                  )}
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
                </div>

                <div className="sintesi-toolbar-row" role="status" aria-live="polite" aria-atomic="true">
                  <p className="sintesi-toolbar-message">
                    {sintesiLoadingFilters
                      ? `Aggiornamento filtri in corso. ${sintesiFilterLoadingDetail || 'Attendere...'}`
                      : `${statusMessage} Filtri disponibili: ${populatedFilterBuckets}/9 categorie, ${totalFilterOptions} opzioni.`}
                  </p>
                  <span className="status-badge neutral">
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
                                    {tableRow.isCollapsed ? 'â–¸' : 'â–¾'}
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

        {activePage === 'analisi-rcc-risultato-mensile' && (
          <section className="panel sintesi-page analisi-rcc-page">
            <header className="panel-header">
              <h2>Analisi RCC - Risultato Mensile</h2>
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
                  <form className="analisi-rcc-toolbar" onSubmit={handleAnalisiRccSubmit}>
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
                    <button type="submit" disabled={analisiRccLoading}>
                      {analisiRccLoading ? 'Caricamento...' : 'Aggiorna'}
                    </button>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {analisiRccData
                        ? `Anno ${analisiRccData.anno}. Visibilita: ${analisiRccData.vediTutto ? 'tutti gli RCC' : `solo ${analisiRccData.rccFiltro || 'RCC corrente'}`}.`
                        : statusMessage}
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
              <h2>Analisi RCC - PivotFatturato</h2>
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
                  <form className="analisi-rcc-toolbar" onSubmit={handleAnalisiRccSubmit}>
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
                    <button type="submit" disabled={analisiRccLoading}>
                      {analisiRccLoading ? 'Caricamento...' : 'Aggiorna'}
                    </button>
                  </form>
                  <div className="sintesi-toolbar-row">
                    <p className="sintesi-toolbar-message">
                      {analisiRccPivotData
                        ? `Anni ${analisiRccPivotData.anni.join(', ') || '-'}. Visibilita: ${analisiRccPivotData.vediTutto ? 'tutti gli RCC' : `solo ${analisiRccPivotData.rccFiltro || 'RCC corrente'}`}.`
                        : statusMessage}
                    </p>
                    <span className="status-badge neutral">
                      {analisiRccPivotData ? `${analisiRccPivotRows.length} righe` : '0 righe'}
                    </span>
                  </div>
                </section>

                <section className="panel analisi-rcc-grid-card">
                  <header className="panel-header">
                    <h3>PivotFatturatoBIPivot</h3>
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

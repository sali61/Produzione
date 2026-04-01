import { type FormEvent, useEffect, useMemo, useState } from 'react'
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

type MenuKey = 'commesse' | 'user'
type AppPage = 'none' | 'commesse-sintesi' | 'commessa-dettaglio'

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

type SintesiMode = 'dettaglio' | 'aggregato'
type SortDirection = 'asc' | 'desc'
type SortColumn =
  | 'anno'
  | 'commessa'
  | 'descrizioneCommessa'
  | 'tipologiaCommessa'
  | 'stato'
  | 'macroTipologia'
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
}

type CommessaSintesiRow = {
  anno?: number | null
  commessa: string
  descrizioneCommessa: string
  tipologiaCommessa: string
  stato: string
  macroTipologia: string
  prodotto: string
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

type CommesseDettaglioResponse = {
  profile: string
  commessa: string
  currentYear: number
  currentMonth: number
  anagrafica?: CommessaDettaglioAnagrafica | null
  anniStorici: CommessaDettaglioAnnoRow[]
  annoCorrenteProgressivo?: CommessaDettaglioAnnoRow | null
  vendite: CommessaFatturaMovimentoRow[]
  acquisti: CommessaFatturaMovimentoRow[]
  fatturatoPivot: CommessaFatturatoPivotRow[]
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

type DetailTabKey = 'numeri' | 'vendite' | 'acquisti'

const tokenStorageKey = 'produzione.jwt'
const redirectGuardKey = 'produzione.sso.redirecting'
const impersonationStorageKey = 'produzione.sso.actas'
const impersonationHeaderName = 'X-Act-As-Username'
const sintesiStateStorageKey = 'produzione.sintesi.state'

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
  const [sintesiRows, setSintesiRows] = useState<CommessaSintesiRow[]>([])
  const [sintesiSearched, setSintesiSearched] = useState(false)
  const [sintesiLoadingFilters, setSintesiLoadingFilters] = useState(false)
  const [sintesiLoadingData, setSintesiLoadingData] = useState(false)
  const [detailCommessa, setDetailCommessa] = useState('')
  const [detailData, setDetailData] = useState<CommesseDettaglioResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailStatusMessage, setDetailStatusMessage] = useState('')
  const [detailRouteProcessed, setDetailRouteProcessed] = useState(false)
  const [detailActiveTab, setDetailActiveTab] = useState<DetailTabKey>('numeri')

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
  const currentProfile = selectedProfile || profiles[0] || ''
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
    setSintesiMode('dettaglio')
    setCommessaSearch('')
    setSortColumn('commessa')
    setSortDirection('asc')
    setSintesiFiltersForm(emptySintesiFiltersForm)
    setSintesiFiltersCatalog(emptyFiltersCatalog)
    setSintesiRows([])
    setSintesiSearched(false)
    setDetailCommessa('')
    setDetailData(null)
    setDetailStatusMessage('')
    setDetailRouteProcessed(false)
    setDetailActiveTab('numeri')
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

  const loadSintesiFilters = async (
    jwt: string,
    impersonationUsername: string,
    profile: string,
    anni: string[],
  ) => {
    if (!jwt.trim() || !profile.trim()) {
      return false
    }

    setSintesiLoadingFilters(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', profile)
      const normalizedAnni = anni
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
      if (normalizedAnni.length === 1) {
        params.set('anno', normalizedAnni[0])
      }

      const response = await fetch(toBackendUrl(`/api/commesse/sintesi/filters?${params.toString()}`), {
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
        setStatusMessage(message || 'Profilo non autorizzato per i filtri commesse.')
        return false
      }

      if (!response.ok) {
        const message = await readApiMessage(response)
        setStatusMessage(message || `Errore caricamento filtri sintesi (${response.status}).`)
        return false
      }

      const payload = (await response.json()) as CommesseSintesiFiltersResponse
      setSintesiFiltersCatalog(payload)
      const allowedAnni = new Set(payload.anni.map((option) => option.value))
      setSintesiFiltersForm((current) => ({
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
    }
  }

  const executeSintesiSearch = async () => {
    if (!token.trim() || !currentProfile) {
      setStatusMessage("Sessione non disponibile, esegui nuovamente l'accesso.")
      return
    }

    const isAggregated = sintesiMode === 'aggregato'

    setSintesiLoadingData(true)
    try {
      const params = new URLSearchParams()
      params.set('profile', currentProfile)
      params.set('take', '250')
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
        setSintesiRows([])
        setSintesiSearched(true)
        setStatusMessage(message || 'Profilo non autorizzato sulla ricerca commesse.')
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
    setDetailCommessa(normalizedCommessa)
    setDetailActiveTab('numeri')
    setDetailData(null)
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
      const venditeCount = payload.vendite?.length ?? 0
      const acquistiCount = payload.acquisti?.length ?? 0
      const mese = payload.currentMonth.toString().padStart(2, '0')
      setDetailStatusMessage(
        `Dettaglio commessa "${normalizedCommessa}": ${storicoCount} anni storici, ${venditeCount} vendite, ${acquistiCount} acquisti + progressivo ${payload.currentYear}/${mese}.`,
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const openCommessaDetailInNewTab = (commessa: string) => {
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

    window.open(url.toString(), '_blank', 'noopener')
  }

  const refreshSintesiFilters = () => {
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni)
  }

  const resetSintesi = () => {
    setSintesiMode('dettaglio')
    setCommessaSearch('')
    setSortColumn('commessa')
    setSortDirection('asc')
    setSintesiFiltersForm(emptySintesiFiltersForm)
    setSintesiRows([])
    setSintesiSearched(false)

    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, [])
  }

  const activateSintesiPage = () => {
    setOpenMenu(null)
    setActivePage('commesse-sintesi')
    if (!token.trim() || !currentProfile) {
      return
    }

    void loadSintesiFilters(token, activeImpersonation, currentProfile, sintesiFiltersForm.anni)
  }

  const handleSintesiSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void executeSintesiSearch()
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
      }

      setActivePage(persisted.activePage === 'commesse-sintesi' ? 'commesse-sintesi' : 'none')
      setSintesiMode(persisted.mode === 'aggregato' ? 'aggregato' : 'dettaglio')
      setCommessaSearch(persisted.commessaSearch ?? '')
      setSortColumn((persisted.sortColumn as SortColumn) ?? 'commessa')
      setSortDirection(persisted.sortDirection === 'desc' ? 'desc' : 'asc')
      setSintesiFiltersForm(restoredFilters)
      setSintesiRows(Array.isArray(persisted.rows) ? persisted.rows : [])
      setSintesiSearched(Boolean(persisted.searched))
      void loadSintesiFilters(token, activeImpersonation, currentProfile, restoredFilters.anni)
      setStatusMessage('Lista commesse ripristinata dalla sessione.')
      return
    }

    setSintesiRows([])
    setSintesiSearched(false)
    setCommessaSearch('')
    setSortColumn('commessa')
    setSortDirection('asc')
    setSintesiFiltersForm(emptySintesiFiltersForm)
    void loadSintesiFilters(token, activeImpersonation, currentProfile, [])
  }, [token, activeImpersonation, currentProfile])

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
    key: keyof Omit<SintesiFiltersForm, 'anni' | 'commessa'>
    options: FilterOption[]
  }> = [
    { id: 'sintesi-tipologia', label: 'Tipologia Commessa', key: 'tipologiaCommessa', options: sintesiFiltersCatalog.tipologieCommessa },
    { id: 'sintesi-stato', label: 'Stato', key: 'stato', options: sintesiFiltersCatalog.stati },
    { id: 'sintesi-macro', label: 'Macrotipologia', key: 'macroTipologia', options: sintesiFiltersCatalog.macroTipologie },
    { id: 'sintesi-prodotto', label: 'Prodotto', key: 'prodotto', options: sintesiFiltersCatalog.prodotti },
    { id: 'sintesi-business-unit', label: 'Business Unit', key: 'businessUnit', options: sintesiFiltersCatalog.businessUnits },
    { id: 'sintesi-rcc', label: 'RCC', key: 'rcc', options: sintesiFiltersCatalog.rcc },
    { id: 'sintesi-pm', label: 'PM', key: 'pm', options: sintesiFiltersCatalog.pm },
  ]

  const isAggregatedMode = sintesiMode === 'aggregato'
  const annoOptions = useMemo(() => (
    [...sintesiFiltersCatalog.anni]
      .sort((left, right) => Number(right.value) - Number(left.value))
  ), [sintesiFiltersCatalog.anni])
  const normalizedCommessaSearch = commessaSearch.trim().toLowerCase()
  const filteredCommesse = useMemo(() => {
    const allOptions = sintesiFiltersCatalog.commesse
    if (!normalizedCommessaSearch) {
      return allOptions.slice(0, 500)
    }

    return allOptions
      .filter((option) => (
        option.label.toLowerCase().includes(normalizedCommessaSearch) ||
        option.value.toLowerCase().includes(normalizedCommessaSearch)
      ))
      .slice(0, 500)
  }, [normalizedCommessaSearch, sintesiFiltersCatalog.commesse])

  const commessaOptions = useMemo(() => {
    const selected = sintesiFiltersCatalog.commesse.find((option) => option.value === sintesiFiltersForm.commessa)
    if (!selected) {
      return filteredCommesse
    }

    if (filteredCommesse.some((option) => option.value === selected.value)) {
      return filteredCommesse
    }

    return [selected, ...filteredCommesse]
  }, [filteredCommesse, sintesiFiltersCatalog.commesse, sintesiFiltersForm.commessa])
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

  const sortedRows = useMemo(() => {
    const direction = sortDirection === 'asc' ? 1 : -1
    return [...sintesiRows].sort((leftRow, rightRow) => {
      const left = resolveSortValue(leftRow, sortColumn)
      const right = resolveSortValue(rightRow, sortColumn)

      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction
      }

      const leftText = String(left ?? '').toLowerCase()
      const rightText = String(right ?? '').toLowerCase()
      return leftText.localeCompare(rightText, 'it', { sensitivity: 'base', numeric: true }) * direction
    })
  }, [sintesiRows, sortColumn, sortDirection])

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

  const detailAnagrafica = detailData?.anagrafica ?? null
  const detailStoricoRows = detailData?.anniStorici ?? []
  const detailProgressivoRow = detailData?.annoCorrenteProgressivo ?? null
  const detailVenditeRows = detailData?.vendite ?? []
  const detailAcquistiRows = detailData?.acquisti ?? []
  const detailPivotRows = detailData?.fatturatoPivot ?? []

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

  const detailRowsForTotals = useMemo(() => {
    if (!detailProgressivoRow) {
      return detailStoricoRows
    }

    return [...detailStoricoRows, detailProgressivoRow]
  }, [detailStoricoRows, detailProgressivoRow])

  const detailTotals = useMemo(() => (
    detailRowsForTotals.reduce((acc, row) => ({
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
  ), [detailRowsForTotals])

  const sintesiCountLabel = sintesiLoadingData
    ? 'Caricamento dati...'
    : `${sortedRows.length} righe`
  const detailCountLabel = useMemo(() => {
    if (detailLoading) {
      return 'Caricamento dettaglio...'
    }

    if (detailActiveTab === 'vendite') {
      return `${detailVenditeSorted.length} vendite`
    }

    if (detailActiveTab === 'acquisti') {
      return `${detailAcquistiSorted.length} acquisti`
    }

    return `${detailStoricoRows.length} anni storici`
  }, [detailLoading, detailActiveTab, detailVenditeSorted.length, detailAcquistiSorted.length, detailStoricoRows.length])

  const numberFormatter = useMemo(() => (
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
      return '↕'
    }

    return sortDirection === 'asc' ? '▲' : '▼'
  }

  const exportSintesiExcel = () => {
    if (sortedRows.length === 0) {
      setStatusMessage('Nessun dato disponibile da esportare in Excel.')
      return
    }

    const rows = sortedRows.map((row) => ({
      Anno: row.anno ?? '',
      Commessa: row.commessa,
      Descrizione: row.descrizioneCommessa,
      Tipologia: row.tipologiaCommessa,
      Stato: row.stato,
      Macrotipologia: row.macroTipologia,
      Prodotto: row.prodotto,
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

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SintesiCommesse')

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
    const filename = `Produzione_Sintesi_${mode}_${anno}_${timestamp}.xlsx`

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
          <div className={`menu-dropdown ${openMenu === 'commesse' ? 'is-open' : ''}`}>
            <button
              type="button"
              className="menu-trigger"
              onClick={() => toggleMenu('commesse')}
              aria-expanded={openMenu === 'commesse'}
            >
              Commesse
            </button>
            <div className="menu-dropdown-panel">
              <button type="button" className="menu-action" onClick={activateSintesiPage}>
                Sintesi
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

        {activePage === 'commesse-sintesi' && (
          <section className="panel sintesi-page">
            <header className="panel-header">
              <h2>Commesse - Sintesi</h2>
              <span className="status-badge neutral">Profilo attivo: {currentProfile || '-'}</span>
            </header>
            <p className="status-text">{statusMessage}</p>

            <section className="panel sintesi-filter-panel">
              <form className="sintesi-form" onSubmit={handleSintesiSubmit}>
                <div className="sintesi-filters-grid">
                  <div className="sintesi-field sintesi-field-anni">
                    <div className="sintesi-field-header-row">
                      <label htmlFor="sintesi-anni">Anni</label>
                      <label htmlFor="sintesi-aggrega" className="checkbox-label checkbox-label-inline">
                        <input
                          id="sintesi-aggrega"
                          type="checkbox"
                          checked={isAggregatedMode}
                          onChange={(event) => setSintesiMode(event.target.checked ? 'aggregato' : 'dettaglio')}
                        />
                        Aggrega
                      </label>
                    </div>
                    <select
                      id="sintesi-anni"
                      multiple
                      size={4}
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
                      />
                      <select
                        id="sintesi-commessa"
                        value={sintesiFiltersForm.commessa}
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
                      className={`sintesi-field ${selectField.id === 'sintesi-stato' ? 'sintesi-field-stato' : ''}`}
                    >
                      <label htmlFor={selectField.id}>{selectField.label}</label>
                      <select
                        id={selectField.id}
                        value={sintesiFiltersForm[selectField.key]}
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
                </div>

                <div className="inline-actions">
                  <button type="submit" disabled={sintesiLoadingData || sessionLoading}>
                    {sintesiLoadingData ? 'Ricerca in corso...' : 'Cerca'}
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
                    disabled={sintesiLoadingData || sintesiLoadingFilters || sessionLoading}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={exportSintesiExcel}
                    disabled={sintesiLoadingData || sortedRows.length === 0}
                  >
                    Export Excel
                  </button>
                </div>
              </form>
            </section>

            <section className="panel sintesi-data-panel">
              <header className="panel-header">
                <span className="status-badge neutral">{sintesiCountLabel}</span>
              </header>

              {!sintesiSearched && (
                <p className="empty-state">
                  Nessun dato visualizzato. Imposta i filtri e premi Cerca.
                </p>
              )}

              {sintesiSearched && sortedRows.length === 0 && (
                <p className="empty-state">
                  Nessuna commessa trovata con i filtri correnti.
                </p>
              )}

              {sortedRows.length > 0 && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
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
                          <button type="button" className="sort-header-btn" onClick={() => toggleSort('prodotto')}>
                            Prodotto <span className="sort-indicator">{sortIndicator('prodotto')}</span>
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
                      {sortedRows.map((row, index) => (
                        <tr key={`${row.commessa}-${row.businessUnit}-${index}`}>
                          <td>{row.anno ?? ''}</td>
                          <td>
                            <button
                              type="button"
                              className="inline-link-button"
                              onClick={() => openCommessaDetailInNewTab(row.commessa)}
                              title={`Apri dettaglio commessa ${row.commessa} in nuova pagina`}
                            >
                              {row.commessa}
                            </button>
                          </td>
                          <td>{row.descrizioneCommessa}</td>
                          <td>{row.tipologiaCommessa}</td>
                          <td>{row.stato}</td>
                          <td>{row.macroTipologia}</td>
                          <td>{row.prodotto}</td>
                          <td>{row.businessUnit}</td>
                          <td>{row.rcc}</td>
                          <td>{row.pm}</td>
                          <td className="num">{formatNumber(row.oreLavorate)}</td>
                          <td className="num">{formatNumber(row.costoPersonale)}</td>
                          <td className="num">{formatNumber(row.ricavi)}</td>
                          <td className="num">{formatNumber(row.costi)}</td>
                          <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                            {formatNumber(row.utileSpecifico)}
                          </td>
                          <td className="num">{formatNumber(row.ricaviFuturi)}</td>
                          <td className="num">{formatNumber(row.costiFuturi)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="table-totals-row">
                        <td colSpan={10} className="table-totals-label">Totale</td>
                        <td className="num">{formatNumber(totals.oreLavorate)}</td>
                        <td className="num">{formatNumber(totals.costoPersonale)}</td>
                        <td className="num">{formatNumber(totals.ricavi)}</td>
                        <td className="num">{formatNumber(totals.costi)}</td>
                        <td className={`num ${totals.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                          {formatNumber(totals.utileSpecifico)}
                        </td>
                        <td className="num">{formatNumber(totals.ricaviFuturi)}</td>
                        <td className="num">{formatNumber(totals.costiFuturi)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>
          </section>
        )}

        {activePage === 'commessa-dettaglio' && (
          <section className="panel sintesi-page">
            <header className="panel-header">
              <h2>Commesse - Dettaglio {detailCommessa ? `"${detailCommessa}"` : ''}</h2>
              <div className="inline-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setActivePage('commesse-sintesi')}
                >
                  Torna a Sintesi
                </button>
              </div>
            </header>
            <p className="status-text">{detailStatusMessage || 'Dettaglio commessa in caricamento.'}</p>

            <section className="panel detail-anagrafica-panel">
              <header className="panel-header">
                <h3>Anagrafica Commessa</h3>
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
                        <td>{detailAnagrafica.businessUnit}</td>
                        <td>{detailAnagrafica.rcc}</td>
                        <td>{detailAnagrafica.pm}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="panel sintesi-data-panel detail-tabs-panel">
              <header className="panel-header">
                <span className="status-badge neutral">{detailCountLabel}</span>
              </header>

              <div className="detail-tabs" role="tablist" aria-label="Sezioni dettaglio commessa">
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailActiveTab === 'numeri'}
                  className={`detail-tab ${detailActiveTab === 'numeri' ? 'is-active' : ''}`}
                  onClick={() => setDetailActiveTab('numeri')}
                >
                  Numeri
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailActiveTab === 'vendite'}
                  className={`detail-tab ${detailActiveTab === 'vendite' ? 'is-active' : ''}`}
                  onClick={() => setDetailActiveTab('vendite')}
                >
                  Vendite
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={detailActiveTab === 'acquisti'}
                  className={`detail-tab ${detailActiveTab === 'acquisti' ? 'is-active' : ''}`}
                  onClick={() => setDetailActiveTab('acquisti')}
                >
                  Acquisti
                </button>
              </div>

              {detailPivotRows.length > 0 && (
                <div className="detail-pivot-box">
                  <h4 className="detail-pivot-title">Sintesi Fatturato Pivot</h4>
                  <div className="bonifici-table-wrap">
                    <table className="bonifici-table detail-pivot-table">
                      <thead>
                        <tr>
                          <th>Anno</th>
                          <th>RCC</th>
                          <th>Fatturato</th>
                          <th>Fatturato Futuro</th>
                          <th>Ricavo Ipotetico</th>
                          <th>Ricavo Ipotetico Pesato</th>
                          <th>Totale Complessivo</th>
                          <th>Budget</th>
                          <th>% Raggiungimento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailPivotRows.map((row, index) => (
                          <tr key={`pivot-${row.anno ?? 'na'}-${row.rcc}-${index}`}>
                            <td>{row.anno ?? ''}</td>
                            <td>{row.rcc}</td>
                            <td>{row.totaleFatturato}</td>
                            <td>{row.totaleFatturatoFuturo}</td>
                            <td>{row.totaleRicavoIpotetico}</td>
                            <td>{row.totaleRicavoIpoteticoPesato}</td>
                            <td>{row.totaleComplessivo}</td>
                            <td>{row.budget}</td>
                            <td>{row.percentualeRaggiungimento}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detailActiveTab === 'numeri' && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
                  {(detailStoricoRows.length === 0 && !detailProgressivoRow && !detailLoading) && (
                    <p className="empty-state">Nessun dato numerico disponibile per la commessa selezionata.</p>
                  )}

                  {(detailStoricoRows.length > 0 || detailProgressivoRow) && (
                    <table className="bonifici-table detail-numeri-table">
                      <thead>
                        <tr>
                          <th>Anno</th>
                          <th>Scenario</th>
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
                        {detailStoricoRows.map((row) => (
                          <tr key={`storico-${row.anno}`}>
                            <td>{row.anno}</td>
                            <td>Consuntivo annuale</td>
                            <td className="num">{formatNumber(row.oreLavorate)}</td>
                            <td className="num">{formatNumber(row.costoPersonale)}</td>
                            <td className="num">{formatNumber(row.ricavi)}</td>
                            <td className="num">{formatNumber(row.costi)}</td>
                            <td className={`num ${row.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                              {formatNumber(row.utileSpecifico)}
                            </td>
                            <td className="num">{formatNumber(row.ricaviFuturi)}</td>
                            <td className="num">{formatNumber(row.costiFuturi)}</td>
                          </tr>
                        ))}
                        {detailProgressivoRow && (
                          <tr className="detail-progressivo-row">
                            <td>{detailProgressivoRow.anno}</td>
                            <td>
                              Progressivo fino al mese {String(detailData?.currentMonth ?? 0).padStart(2, '0')}
                            </td>
                            <td className="num">{formatNumber(detailProgressivoRow.oreLavorate)}</td>
                            <td className="num">{formatNumber(detailProgressivoRow.costoPersonale)}</td>
                            <td className="num">{formatNumber(detailProgressivoRow.ricavi)}</td>
                            <td className="num">{formatNumber(detailProgressivoRow.costi)}</td>
                            <td className={`num ${detailProgressivoRow.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                              {formatNumber(detailProgressivoRow.utileSpecifico)}
                            </td>
                            <td className="num">{formatNumber(detailProgressivoRow.ricaviFuturi)}</td>
                            <td className="num">{formatNumber(detailProgressivoRow.costiFuturi)}</td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="table-totals-row">
                          <td colSpan={2} className="table-totals-label">Totale</td>
                          <td className="num">{formatNumber(detailTotals.oreLavorate)}</td>
                          <td className="num">{formatNumber(detailTotals.costoPersonale)}</td>
                          <td className="num">{formatNumber(detailTotals.ricavi)}</td>
                          <td className="num">{formatNumber(detailTotals.costi)}</td>
                          <td className={`num ${detailTotals.utileSpecifico < 0 ? 'num-negative' : ''}`}>
                            {formatNumber(detailTotals.utileSpecifico)}
                          </td>
                          <td className="num">{formatNumber(detailTotals.ricaviFuturi)}</td>
                          <td className="num">{formatNumber(detailTotals.costiFuturi)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}

              {detailActiveTab === 'vendite' && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
                  {(detailVenditeSorted.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessuna vendita disponibile per la commessa selezionata.</p>
                  )}

                  {detailVenditeSorted.length > 0 && (
                    <table className="bonifici-table detail-movimenti-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Documento</th>
                          <th>Descrizione</th>
                          <th>Controparte</th>
                          <th>Provenienza</th>
                          <th>Temporale</th>
                          <th className="num">Importo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailVenditeSorted.map((row, index) => (
                          <tr key={`vendita-${row.numeroDocumento}-${row.dataMovimento ?? 'na'}-${index}`} className={row.isFuture ? 'detail-mov-row-future' : 'detail-mov-row-past'}>
                            <td>{formatDate(row.dataMovimento)}</td>
                            <td>{row.numeroDocumento}</td>
                            <td>{row.descrizione}</td>
                            <td>{row.controparte}</td>
                            <td>{row.provenienza}</td>
                            <td>
                              <span className={`detail-time-badge ${row.isFuture ? 'future' : 'past'}`}>
                                {row.statoTemporale || (row.isFuture ? 'Futuro' : 'Passato')}
                              </span>
                            </td>
                            <td className="num">{formatNumber(row.importo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {detailActiveTab === 'acquisti' && (
                <div className="bonifici-table-wrap bonifici-table-wrap-main">
                  {(detailAcquistiSorted.length === 0 && !detailLoading) && (
                    <p className="empty-state">Nessun acquisto disponibile per la commessa selezionata.</p>
                  )}

                  {detailAcquistiSorted.length > 0 && (
                    <table className="bonifici-table detail-movimenti-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Documento</th>
                          <th>Descrizione</th>
                          <th>Controparte</th>
                          <th>Provenienza</th>
                          <th>Temporale</th>
                          <th className="num">Importo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailAcquistiSorted.map((row, index) => (
                          <tr key={`acquisto-${row.numeroDocumento}-${row.dataMovimento ?? 'na'}-${index}`} className={row.isFuture ? 'detail-mov-row-future' : 'detail-mov-row-past'}>
                            <td>{formatDate(row.dataMovimento)}</td>
                            <td>{row.numeroDocumento}</td>
                            <td>{row.descrizione}</td>
                            <td>{row.controparte}</td>
                            <td>{row.provenienza}</td>
                            <td>
                              <span className={`detail-time-badge ${row.isFuture ? 'future' : 'past'}`}>
                                {row.statoTemporale || (row.isFuture ? 'Futuro' : 'Passato')}
                              </span>
                            </td>
                            <td className="num">{formatNumber(row.importo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
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


// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react'
import { risorsePivotFieldOptions } from '../../config/appConfig'
import type {
  CommessaRisorseValutazioneRow,
  CommesseRisorseFilterOption,
  CommesseRisorseFiltersResponse,
  CommesseRisorsePivotRow,
  CommesseRisorseValutazioneResponse,
  FilterOption,
  RisorseFiltersForm,
  RisorsePivotFieldKey,
} from '../../types/appTypes'
import {
  buildRisorsePivotMetrics,
  distinctFilterOptionsForUi,
  distinctPersonFilterOptionsForUi,
  extractRisorsePivotFieldValue,
  formatReferenceMonthLabel,
  normalizeFilterText,
  normalizePivotGroupValue,
  normalizeRisorsaLabel,
  parseReferenceMonthStrict,
  resolveOuValue,
} from '../../utils/appSharedUtils'

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

const keepIfPresent = (value: string, options: FilterOption[]) => {
  const normalizedValue = normalizeFilterText(value ?? '')
  if (!normalizedValue) {
    return ''
  }

  return options.some((option) => normalizeFilterText(option.value) === normalizedValue)
    ? normalizedValue
    : ''
}

type UseAnalisiRisorsePageStateParams = {
  activeImpersonation: string
  activePage: string
  analisiRccLoading: boolean
  authHeaders: (jwt?: string, impersonationUsername?: string) => Record<string, string>
  canAccessRisultatiRisorseMenu: boolean
  currentProfile: string
  isRisorseMensilePage: boolean
  isRisorseOuMode: boolean
  isRisorseOuPivotMode: boolean
  isRisorseOuRisorseMensilePage: boolean
  isRisorseOuRisorseMensilePivotPage: boolean
  isRisorseOuRisorsePage: boolean
  isRisorseOuRisorsePivotPage: boolean
  isRisorsePivotPage: boolean
  isRisorseRisultatiMensilePage: boolean
  isRisorseRisultatiPivotPage: boolean
  isRisorseRisultatiPage: boolean
  onUnauthorized: () => void
  readApiMessage: (response: Response) => Promise<string>
  setAnalisiRccLoading: (value: boolean) => void
  setStatusMessage: (value: string) => void
  toBackendUrl: (path: string) => string
  token: string
}

export function useAnalisiRisorsePageState(params: UseAnalisiRisorsePageStateParams) {
  const {
    activeImpersonation,
    activePage,
    analisiRccLoading,
    authHeaders,
    canAccessRisultatiRisorseMenu,
    currentProfile,
    isRisorseMensilePage,
    isRisorseOuMode,
    isRisorseOuPivotMode,
    isRisorseOuRisorseMensilePage,
    isRisorseOuRisorseMensilePivotPage,
    isRisorseOuRisorsePage,
    isRisorseOuRisorsePivotPage,
    isRisorsePivotPage,
    isRisorseRisultatiMensilePage,
    isRisorseRisultatiPivotPage,
    isRisorseRisultatiPage,
    onUnauthorized,
    readApiMessage,
    setAnalisiRccLoading,
    setStatusMessage,
    toBackendUrl,
    token,
  } = params

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

  const resetRisorseState = () => {
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
      const query = new URLSearchParams()
      query.set('profile', currentProfile)
      query.set('mensile', mensile ? 'true' : 'false')
      if (analisiOu) {
        query.set('analisiOu', 'true')
      }
      if (analisiOuPivot) {
        query.set('analisiOuPivot', 'true')
      }
      selectedYears.forEach((value) => query.append('anni', value.toString()))

      const response = await fetch(toBackendUrl(`/api/commesse/risorse/filters?${query.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        onUnauthorized()
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
      const query = new URLSearchParams()
      query.set('profile', currentProfile)
      query.set('mensile', mensile ? 'true' : 'false')
      if (analisiOu) {
        query.set('analisiOu', 'true')
      }
      if (analisiOuPivot) {
        query.set('analisiOuPivot', 'true')
      }
      query.set('take', '100000')
      selectedYears.forEach((value) => query.append('anni', value.toString()))
      if (mensile) {
        selectedMonths.forEach((value) => query.append('mesi', value.toString()))
      }

      const stringParams: Array<[keyof RisorseFiltersForm, string]> = [
        ['commessa', 'commessa'],
        ['tipologiaCommessa', 'tipologiaCommessa'],
        ['stato', 'stato'],
        ['macroTipologia', 'macroTipologia'],
        ['controparte', 'controparte'],
        ['businessUnit', 'businessUnit'],
        ['ou', 'ou'],
        ['rcc', 'rcc'],
        ['pm', 'pm'],
      ]
      stringParams.forEach(([key, queryKey]) => {
        const value = `${risorseFiltersForm[key] ?? ''}`.trim()
        if (value) {
          query.set(queryKey, value)
        }
      })

      const idRisorsa = Number.parseInt(risorseFiltersForm.idRisorsa.trim(), 10)
      if (Number.isFinite(idRisorsa) && idRisorsa > 0) {
        query.set('idRisorsa', idRisorsa.toString())
      }

      const response = await fetch(toBackendUrl(`/api/commesse/risorse/valutazione?${query.toString()}`), {
        headers: authHeaders(token, activeImpersonation),
      })

      if (response.status === 401) {
        onUnauthorized()
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

  const risorseCountLabel = analisiRccLoading
    ? 'Caricamento...'
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

  return {
    activePage,
    loadRisorseFilters,
    loadRisorseValutazione,
    refreshRisorseFilters,
    resetRisorseFilters,
    resetRisorseState,
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
    risorsePivotSelectedFields,
    risorsePivotSelectedSelection,
    risorseRisorsaOptions,
    risorseRisorsaSearch,
    risorseRows,
    risorseRowsSorted,
    risorseSearched,
    risorseSelects,
    risorseTitle,
    risorseTotals,
    risorseUtileLabel,
    setRisorseCommessaSearch,
    setRisorseFiltersForm,
    setRisorsePivotAvailableSelection,
    setRisorsePivotSelectedFields,
    setRisorsePivotSelectedSelection,
    setRisorseRisorsaSearch,
  }
}

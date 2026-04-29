import { datiAnnualiPivotFieldSet, risorsePivotFieldSet } from '../config/appConfig'
import type {
  AnalisiRccPivotFunnelResponse,
  AnalisiRccPivotFunnelRow,
  AnalisiRccPivotFunnelTotaleAnno,
  AppPage,
  CommesseDatiAnnualiPivotMetrics,
  CommesseRisorsePivotMetrics,
  CommessaRisorseValutazioneRow,
  CommessaSintesiRow,
  DatiAnnualiPivotFieldKey,
  FilterOption,
  RisorsePivotFieldKey,
  SintesiScope,
} from '../types/appTypes'

export const normalizeDateKey = (value?: string | Date | null) => {
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

  const italianMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\b|$)/)
  if (italianMatch) {
    const day = italianMatch[1].padStart(2, '0')
    const month = italianMatch[2].padStart(2, '0')
    const year = italianMatch[3]
    return `${year}-${month}-${day}`
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

export const normalizePercentTo100 = (value: number) => {
  const safeValue = Number.isFinite(value) ? value : 0
  const scaledValue = Math.abs(safeValue) <= 1 ? safeValue * 100 : safeValue
  return Math.min(100, Math.max(0, scaledValue))
}

export const mesiItaliani = [
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

export const getDefaultReferenceMonth = () => {
  const currentMonth = new Date().getMonth() + 1
  return currentMonth <= 1 ? 12 : currentMonth - 1
}

export const parseReferenceMonthStrict = (value?: string | number | null) => {
  const numericValue = typeof value === 'number'
    ? value
    : Number.parseInt((value ?? '').toString().trim(), 10)
  return numericValue >= 1 && numericValue <= 12
    ? numericValue
    : null
}

export const parseReferenceMonth = (value?: string | number | null) => {
  return parseReferenceMonthStrict(value) ?? getDefaultReferenceMonth()
}

export const formatReferenceMonthLabel = (month: number) => {
  const normalizedMonth = parseReferenceMonth(month)
  return `${normalizedMonth.toString().padStart(2, '0')} - ${mesiItaliani[normalizedMonth - 1]}`
}

export const normalizeTextForMatch = (value: string) => (
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
)

export const normalizeProfileLabel = (value: string) => (
  value
    .replace(/\s+/g, ' ')
    .trim()
)

const profileOperationalPriorityMap = new Map<string, number>([
  ['Supervisore', 0],
  ['Responsabile Commerciale', 1],
  ['Responsabile Produzione', 2],
  ['Responsabile Qualita', 3],
  ['Responsabile Commerciale Commessa', 4],
  ['Responsabile OU', 5],
  ['Risorse Umane', 6],
  ['General Project Manager', 7],
  ['Project Manager', 8],
])

const getProfileOperationalPriority = (value: string) => {
  const normalized = normalizeProfileLabel(value)
  const priority = profileOperationalPriorityMap.get(normalized)
  return typeof priority === 'number' ? priority : Number.MAX_SAFE_INTEGER
}

export const sortProfilesByOperationalPriority = (profiles: string[]) => {
  const normalizedDistinct = Array.from(new Set(
    profiles
      .map((value) => normalizeProfileLabel(value))
      .filter((value) => value.length > 0),
  ))

  return normalizedDistinct.sort((left, right) => {
    const priorityDiff = getProfileOperationalPriority(left) - getProfileOperationalPriority(right)
    if (priorityDiff !== 0) {
      return priorityDiff
    }

    return left.localeCompare(right, 'it', { sensitivity: 'base' })
  })
}

export const selectMostOperationalProfile = (profiles: string[]) => {
  const orderedProfiles = sortProfilesByOperationalPriority(profiles)
  return orderedProfiles[0] ?? ''
}

export const isProcessoOffertaEsitoPositivo = (value: string) => {
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

export type ProcessoOffertaEsitoBucket = 'negativo' | 'non-definito' | 'positivo'

export const getProcessoOffertaEsitoBucket = (value: string): ProcessoOffertaEsitoBucket => {
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

export const isValidProductValue = (value: string) => {
  const normalized = value.trim()
  if (!normalized) {
    return false
  }

  const upper = normalized.toUpperCase()
  return upper !== 'NON DEFINITO' && upper !== 'NON DEFINTO'
}

export const toSafeNumber = (value: unknown) => {
  const numericValue = typeof value === 'number'
    ? value
    : Number.parseFloat((value ?? '').toString())
  return Number.isFinite(numericValue) ? numericValue : 0
}

export const normalizeFilterText = (value: string) => (
  value
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
)

export const normalizePersonFilterLabel = (value: string) => {
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

export const distinctFilterOptionsForUi = (options: FilterOption[]) => {
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

export const distinctPersonFilterOptionsForUi = (options: FilterOption[]) => {
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

export const mergeFilterOptionValues = (
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

export const isClosedCommessaStatus = (stato?: string | null) => {
  const normalized = normalizeFilterText(stato ?? '').toUpperCase()
  return normalized === 'NF' || normalized === 'T'
}

export const calculateUtileFineProgetto = (
  metrics: Pick<CommessaSintesiRow, 'ricavi' | 'costi' | 'costoPersonale' | 'utileSpecifico' | 'ricaviFuturi' | 'costiFuturi' | 'costoPersonaleFuturo'> & { stato?: string | null },
) => {
  if (isClosedCommessaStatus(metrics.stato)) {
    return metrics.ricavi - metrics.costi - metrics.costoPersonale
  }

  return (
    metrics.utileSpecifico
    + metrics.ricaviFuturi
    - metrics.costiFuturi
    - metrics.costoPersonaleFuturo
  )
}

export const hasFuturePersonnelCost = (value: number) => Math.abs(value) > 0.000001
export const shouldShowUtileFineProgettoForRow = (row: { costoPersonaleFuturo: number; stato?: string | null }) => {
  return isClosedCommessaStatus(row.stato) || hasFuturePersonnelCost(row.costoPersonaleFuturo)
}

export const buildPersonSelectItems = (values: string[]) => {
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

export const extractCommessaCodeFromOption = (value: string) => {
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }

  const separatorIndex = normalized.indexOf(' - ')
  return separatorIndex > 0
    ? normalized.slice(0, separatorIndex).trim()
    : normalized
}

export const normalizePivotGroupValue = (value: string) => {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : '(vuoto)'
}

export const asDatiAnnualiPivotFieldKeys = (values: string[]) => (
  values.filter((value): value is DatiAnnualiPivotFieldKey => (
    datiAnnualiPivotFieldSet.has(value as DatiAnnualiPivotFieldKey)
  ))
)

export const extractDatiAnnualiPivotFieldValue = (row: CommessaSintesiRow, fieldKey: DatiAnnualiPivotFieldKey) => {
  switch (fieldKey) {
    case 'anno':
      return Number.isFinite(row.anno ?? NaN) && (row.anno ?? 0) > 0
        ? (row.anno ?? 0).toString()
        : ''
    case 'controparte':
      return row.controparte
    case 'commessa':
      return row.commessa
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

export const buildDatiAnnualiPivotMetrics = (rows: CommessaSintesiRow[]): CommesseDatiAnnualiPivotMetrics => {
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

export const asRisorsePivotFieldKeys = (values: string[]) => (
  values.filter((value): value is RisorsePivotFieldKey => (
    risorsePivotFieldSet.has(value as RisorsePivotFieldKey)
  ))
)

export const normalizeRisorsaLabel = (row: CommessaRisorseValutazioneRow) => {
  const nome = (row.nomeRisorsa ?? '').trim()
  if (!nome) {
    return row.idRisorsa > 0 ? `ID ${row.idRisorsa}` : ''
  }
  return row.risorsaInForza ? nome : `^ ${nome}`
}

export const resolveOuValue = (row: CommessaRisorseValutazioneRow) => {
  const idOu = (row.idOu ?? '').trim()
  if (idOu) {
    return idOu
  }
  return (row.businessUnit ?? '').trim()
}

export const extractRisorsePivotFieldValue = (row: CommessaRisorseValutazioneRow, fieldKey: RisorsePivotFieldKey) => {
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
    case 'controparte':
      return row.controparte
    case 'businessUnit':
      return row.businessUnit
    case 'ou':
      return resolveOuValue(row)
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

export const buildRisorsePivotMetrics = (
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

export const normalizePivotFunnelResponse = (raw: unknown): AnalisiRccPivotFunnelResponse => {
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
    tipoFiltro: source.tipoFiltro == null ? null : source.tipoFiltro.toString(),
    tipoDocumentoFiltro: source.tipoDocumentoFiltro == null ? null : source.tipoDocumentoFiltro.toString(),
    percentualeSuccessoFiltro: source.percentualeSuccessoFiltro == null ? null : toSafeNumber(source.percentualeSuccessoFiltro),
    aggregazioniDisponibili: (Array.isArray(source.aggregazioniDisponibili) ? source.aggregazioniDisponibili : [])
      .map((value) => (value ?? '').toString())
      .filter((value) => value.trim().length > 0),
    rccDisponibili: (Array.isArray(source.rccDisponibili) ? source.rccDisponibili : [])
      .map((value) => (value ?? '').toString())
      .filter((value) => value.trim().length > 0),
    tipiDisponibili: (Array.isArray(source.tipiDisponibili) ? source.tipiDisponibili : [])
      .map((value) => (value ?? '').toString())
      .filter((value) => value.trim().length > 0),
    tipiDocumentoDisponibili: (Array.isArray(source.tipiDocumentoDisponibili) ? source.tipiDocumentoDisponibili : [])
      .map((value) => (value ?? '').toString())
      .filter((value) => value.trim().length > 0),
    percentualiSuccessoDisponibili: (Array.isArray(source.percentualiSuccessoDisponibili) ? source.percentualiSuccessoDisponibili : [])
      .map((value) => toSafeNumber(value))
      .filter((value) => Number.isFinite(value)),
    righe: righeRaw.map((row): AnalisiRccPivotFunnelRow => {
      const item = (row ?? {}) as Partial<AnalisiRccPivotFunnelRow> & { [key: string]: unknown }
      return {
        anno: Number.parseInt((item.anno ?? '').toString(), 10) || 0,
        aggregazione: (item.aggregazione ?? '').toString(),
        tipo: (item.tipo ?? '').toString(),
        tipoDocumento: (item.tipoDocumento ?? '').toString(),
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

export const pageToScope = (page: AppPage): SintesiScope => (
  page === 'prodotti-sintesi' ? 'prodotti' : 'commesse'
)

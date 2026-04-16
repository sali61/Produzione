import { getProcessoOffertaEsitoBucket } from './appSharedUtils'
import type {
  AnalisiRccDettaglioFatturatoRow,
  AnalisiRccPivotFunnelRow,
  ProcessoOffertaSintesiRow,
  ProcessoOffertaSuccessoCategoria,
  ProcessoOffertaSuccessoReportRow,
  ProcessoOffertaSuccessoReportTotaleAnno,
  ProcessoOffertaSuccessoSintesiCategoria,
  ProcessoOffertaSuccessoSintesiRow,
} from '../types/appTypes'

export type AnalisiAlberoProiezioniRow = {
  key: string
  livello: 0 | 1 | 2 | 3 | 4
  anno: number
  rcc: string
  businessUnit: string
  cliente: string
  commessa: string
  fatturato: number
  fatturatoFuturo: number
  totale: number
  ricavoIpotetico: number
}

export type AnalisiAlberoGroupOrder = 'rcc-bu' | 'bu-rcc'

type AnalisiAlberoMetrics = {
  fatturato: number
  fatturatoFuturo: number
  ricavoIpotetico: number
}

const buildAnalisiAlberoMetrics = (): AnalisiAlberoMetrics => ({
  fatturato: 0,
  fatturatoFuturo: 0,
  ricavoIpotetico: 0,
})

const addAnalisiAlberoMetrics = (target: AnalisiAlberoMetrics, row: AnalisiRccDettaglioFatturatoRow) => {
  target.fatturato += Number.isFinite(row.fatturato) ? row.fatturato : 0
  target.fatturatoFuturo += Number.isFinite(row.fatturatoFuturo) ? row.fatturatoFuturo : 0
  target.ricavoIpotetico += Number.isFinite(row.ricavoIpotetico) ? row.ricavoIpotetico : 0
}

const safeGroupValue = (value?: string | null) => {
  const normalized = (value ?? '').trim()
  return normalized.length > 0 ? normalized : '-'
}

const groupKeyOf = (value: string) => value.toLocaleUpperCase('it-IT')

export const buildAnalisiAlberoProiezioniRows = (
  rows: AnalisiRccDettaglioFatturatoRow[],
  groupOrder: AnalisiAlberoGroupOrder = 'rcc-bu',
): AnalisiAlberoProiezioniRow[] => {
  type CommessaBucket = {
    commessa: string
    metrics: AnalisiAlberoMetrics
  }
  type ClienteBucket = {
    cliente: string
    metrics: AnalisiAlberoMetrics
    commesse: Map<string, CommessaBucket>
  }
  type BuBucket = {
    businessUnit: string
    metrics: AnalisiAlberoMetrics
    clienti: Map<string, ClienteBucket>
  }
  type RccBucket = {
    rcc: string
    metrics: AnalisiAlberoMetrics
    businessUnits: Map<string, BuBucket>
  }
  type AnnoBucket = {
    anno: number
    metrics: AnalisiAlberoMetrics
    rccs: Map<string, RccBucket>
  }
  type BuRccBucket = {
    rcc: string
    metrics: AnalisiAlberoMetrics
    clienti: Map<string, ClienteBucket>
  }
  type BuFirstBucket = {
    businessUnit: string
    metrics: AnalisiAlberoMetrics
    rccs: Map<string, BuRccBucket>
  }
  type AnnoBuBucket = {
    anno: number
    metrics: AnalisiAlberoMetrics
    businessUnits: Map<string, BuFirstBucket>
  }

  const groupedByYear = new Map<number, AnnoBucket>()
  const groupedByYearBu = new Map<number, AnnoBuBucket>()
  rows.forEach((row) => {
    const anno = Number.isFinite(row.anno) ? row.anno : 0
    const rcc = safeGroupValue(row.rcc)
    const businessUnit = safeGroupValue(row.businessUnit)
    const cliente = safeGroupValue(row.controparte)
    const commessa = safeGroupValue(row.commessa)

    let annoBucket = groupedByYear.get(anno)
    if (!annoBucket) {
      annoBucket = {
        anno,
        metrics: buildAnalisiAlberoMetrics(),
        rccs: new Map<string, RccBucket>(),
      }
      groupedByYear.set(anno, annoBucket)
    }
    addAnalisiAlberoMetrics(annoBucket.metrics, row)

    const rccMapKey = groupKeyOf(rcc)
    let rccBucket = annoBucket.rccs.get(rccMapKey)
    if (!rccBucket) {
      rccBucket = {
        rcc,
        metrics: buildAnalisiAlberoMetrics(),
        businessUnits: new Map<string, BuBucket>(),
      }
      annoBucket.rccs.set(rccMapKey, rccBucket)
    }
    addAnalisiAlberoMetrics(rccBucket.metrics, row)

    const buMapKey = groupKeyOf(businessUnit)
    let buBucket = rccBucket.businessUnits.get(buMapKey)
    if (!buBucket) {
      buBucket = {
        businessUnit,
        metrics: buildAnalisiAlberoMetrics(),
        clienti: new Map<string, ClienteBucket>(),
      }
      rccBucket.businessUnits.set(buMapKey, buBucket)
    }
    addAnalisiAlberoMetrics(buBucket.metrics, row)

    const clienteMapKey = groupKeyOf(cliente)
    let clienteBucket = buBucket.clienti.get(clienteMapKey)
    if (!clienteBucket) {
      clienteBucket = {
        cliente,
        metrics: buildAnalisiAlberoMetrics(),
        commesse: new Map<string, CommessaBucket>(),
      }
      buBucket.clienti.set(clienteMapKey, clienteBucket)
    }
    addAnalisiAlberoMetrics(clienteBucket.metrics, row)

    const commessaMapKey = groupKeyOf(commessa)
    let commessaBucket = clienteBucket.commesse.get(commessaMapKey)
    if (!commessaBucket) {
      commessaBucket = {
        commessa,
        metrics: buildAnalisiAlberoMetrics(),
      }
      clienteBucket.commesse.set(commessaMapKey, commessaBucket)
    }
    addAnalisiAlberoMetrics(commessaBucket.metrics, row)

    let annoBuBucket = groupedByYearBu.get(anno)
    if (!annoBuBucket) {
      annoBuBucket = {
        anno,
        metrics: buildAnalisiAlberoMetrics(),
        businessUnits: new Map<string, BuFirstBucket>(),
      }
      groupedByYearBu.set(anno, annoBuBucket)
    }
    addAnalisiAlberoMetrics(annoBuBucket.metrics, row)

    let buFirstBucket = annoBuBucket.businessUnits.get(buMapKey)
    if (!buFirstBucket) {
      buFirstBucket = {
        businessUnit,
        metrics: buildAnalisiAlberoMetrics(),
        rccs: new Map<string, BuRccBucket>(),
      }
      annoBuBucket.businessUnits.set(buMapKey, buFirstBucket)
    }
    addAnalisiAlberoMetrics(buFirstBucket.metrics, row)

    let buRccBucket = buFirstBucket.rccs.get(rccMapKey)
    if (!buRccBucket) {
      buRccBucket = {
        rcc,
        metrics: buildAnalisiAlberoMetrics(),
        clienti: new Map<string, ClienteBucket>(),
      }
      buFirstBucket.rccs.set(rccMapKey, buRccBucket)
    }
    addAnalisiAlberoMetrics(buRccBucket.metrics, row)

    let buClienteBucket = buRccBucket.clienti.get(clienteMapKey)
    if (!buClienteBucket) {
      buClienteBucket = {
        cliente,
        metrics: buildAnalisiAlberoMetrics(),
        commesse: new Map<string, CommessaBucket>(),
      }
      buRccBucket.clienti.set(clienteMapKey, buClienteBucket)
    }
    addAnalisiAlberoMetrics(buClienteBucket.metrics, row)

    let buCommessaBucket = buClienteBucket.commesse.get(commessaMapKey)
    if (!buCommessaBucket) {
      buCommessaBucket = {
        commessa,
        metrics: buildAnalisiAlberoMetrics(),
      }
      buClienteBucket.commesse.set(commessaMapKey, buCommessaBucket)
    }
    addAnalisiAlberoMetrics(buCommessaBucket.metrics, row)
  })

  const toRow = (
    key: string,
    livello: 0 | 1 | 2 | 3 | 4,
    anno: number,
    rcc: string,
    businessUnit: string,
    cliente: string,
    commessa: string,
    metrics: AnalisiAlberoMetrics,
  ): AnalisiAlberoProiezioniRow => ({
    key,
    livello,
    anno,
    rcc,
    businessUnit,
    cliente,
    commessa,
    fatturato: metrics.fatturato,
    fatturatoFuturo: metrics.fatturatoFuturo,
    totale: metrics.fatturato + metrics.fatturatoFuturo,
    ricavoIpotetico: metrics.ricavoIpotetico,
  })

  const sortedYears = [...(groupOrder === 'bu-rcc' ? groupedByYearBu.values() : groupedByYear.values())]
    .sort((left, right) => left.anno - right.anno)
  const result: AnalisiAlberoProiezioniRow[] = []

  sortedYears.forEach((annoBucket) => {
    result.push(toRow(
      `albero-anno-${annoBucket.anno}`,
      0,
      annoBucket.anno,
      '',
      '',
      '',
      '',
      annoBucket.metrics,
    ))

    if (groupOrder === 'bu-rcc') {
      const buYearBucket = annoBucket as AnnoBuBucket
      const sortedBu = [...buYearBucket.businessUnits.values()].sort((left, right) => (
        left.businessUnit.localeCompare(right.businessUnit, 'it', { sensitivity: 'base' })
      ))
      sortedBu.forEach((buBucket) => {
        result.push(toRow(
          `albero-bu-${buYearBucket.anno}-${groupKeyOf(buBucket.businessUnit)}`,
          1,
          buYearBucket.anno,
          '',
          buBucket.businessUnit,
          '',
          '',
          buBucket.metrics,
        ))

        const sortedRcc = [...buBucket.rccs.values()].sort((left, right) => (
          left.rcc.localeCompare(right.rcc, 'it', { sensitivity: 'base' })
        ))
        sortedRcc.forEach((rccBucket) => {
          result.push(toRow(
            `albero-rcc-${buYearBucket.anno}-${groupKeyOf(buBucket.businessUnit)}-${groupKeyOf(rccBucket.rcc)}`,
            2,
            buYearBucket.anno,
            rccBucket.rcc,
            buBucket.businessUnit,
            '',
            '',
            rccBucket.metrics,
          ))

          const sortedClienti = [...rccBucket.clienti.values()].sort((left, right) => (
            left.cliente.localeCompare(right.cliente, 'it', { sensitivity: 'base' })
          ))
          sortedClienti.forEach((clienteBucket) => {
            result.push(toRow(
              `albero-cliente-${buYearBucket.anno}-${groupKeyOf(buBucket.businessUnit)}-${groupKeyOf(rccBucket.rcc)}-${groupKeyOf(clienteBucket.cliente)}`,
              3,
              buYearBucket.anno,
              rccBucket.rcc,
              buBucket.businessUnit,
              clienteBucket.cliente,
              '',
              clienteBucket.metrics,
            ))

            const sortedCommesse = [...clienteBucket.commesse.values()].sort((left, right) => (
              left.commessa.localeCompare(right.commessa, 'it', { sensitivity: 'base' })
            ))
            sortedCommesse.forEach((commessaBucket) => {
              result.push(toRow(
                `albero-commessa-${buYearBucket.anno}-${groupKeyOf(buBucket.businessUnit)}-${groupKeyOf(rccBucket.rcc)}-${groupKeyOf(clienteBucket.cliente)}-${groupKeyOf(commessaBucket.commessa)}`,
                4,
                buYearBucket.anno,
                rccBucket.rcc,
                buBucket.businessUnit,
                clienteBucket.cliente,
                commessaBucket.commessa,
                commessaBucket.metrics,
              ))
            })
          })
        })
      })
      return
    }

    const rccYearBucket = annoBucket as AnnoBucket
    const sortedRcc = [...rccYearBucket.rccs.values()].sort((left, right) => (
      left.rcc.localeCompare(right.rcc, 'it', { sensitivity: 'base' })
    ))
    sortedRcc.forEach((rccBucket) => {
      result.push(toRow(
        `albero-rcc-${rccYearBucket.anno}-${groupKeyOf(rccBucket.rcc)}`,
        1,
        rccYearBucket.anno,
        rccBucket.rcc,
        '',
        '',
        '',
        rccBucket.metrics,
      ))

      const sortedBu = [...rccBucket.businessUnits.values()].sort((left, right) => (
        left.businessUnit.localeCompare(right.businessUnit, 'it', { sensitivity: 'base' })
      ))
      sortedBu.forEach((buBucket) => {
        result.push(toRow(
          `albero-bu-${rccYearBucket.anno}-${groupKeyOf(rccBucket.rcc)}-${groupKeyOf(buBucket.businessUnit)}`,
          2,
          rccYearBucket.anno,
          rccBucket.rcc,
          buBucket.businessUnit,
          '',
          '',
          buBucket.metrics,
        ))

        const sortedClienti = [...buBucket.clienti.values()].sort((left, right) => (
          left.cliente.localeCompare(right.cliente, 'it', { sensitivity: 'base' })
        ))
        sortedClienti.forEach((clienteBucket) => {
          result.push(toRow(
            `albero-cliente-${rccYearBucket.anno}-${groupKeyOf(rccBucket.rcc)}-${groupKeyOf(buBucket.businessUnit)}-${groupKeyOf(clienteBucket.cliente)}`,
            3,
            rccYearBucket.anno,
            rccBucket.rcc,
            buBucket.businessUnit,
            clienteBucket.cliente,
            '',
            clienteBucket.metrics,
          ))

          const sortedCommesse = [...clienteBucket.commesse.values()].sort((left, right) => (
            left.commessa.localeCompare(right.commessa, 'it', { sensitivity: 'base' })
          ))
          sortedCommesse.forEach((commessaBucket) => {
            result.push(toRow(
              `albero-commessa-${rccYearBucket.anno}-${groupKeyOf(rccBucket.rcc)}-${groupKeyOf(buBucket.businessUnit)}-${groupKeyOf(clienteBucket.cliente)}-${groupKeyOf(commessaBucket.commessa)}`,
              4,
              rccYearBucket.anno,
              rccBucket.rcc,
              buBucket.businessUnit,
              clienteBucket.cliente,
              commessaBucket.commessa,
              commessaBucket.metrics,
            ))
          })
        })
      })
    })
  })

  return result
}

export type PrevisioniReportFunnelPivotRow = {
  key: string
  anno: number
  livello: 0 | 1 | 2
  etichetta: string
  aggregazione: string
  tipo: string
  tipoDocumento: string
  isPercentualeRow: boolean
  percentualeSuccesso: number
  numeroProtocolli: number
  totaleBudgetRicavo: number
  totaleBudgetCosti: number
  totaleFatturatoFuturo: number
  totaleEmessaAnno: number
  totaleFuturaAnno: number
  totaleRicaviComplessivi: number
}

export const buildPrevisioniReportFunnelPivotRows = (rows: AnalisiRccPivotFunnelRow[]): PrevisioniReportFunnelPivotRow[] => {
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

  const result: PrevisioniReportFunnelPivotRow[] = []

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
      aggregazione: aggregazioneBucket.aggregazione,
      tipo: '',
      tipoDocumento: '',
      isPercentualeRow: false,
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
        aggregazione: aggregazioneBucket.aggregazione,
        tipo: tipoBucket.tipo,
        tipoDocumento: '',
        isPercentualeRow: false,
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
          aggregazione: aggregazioneBucket.aggregazione,
          tipo: tipoBucket.tipo,
          tipoDocumento: '',
          isPercentualeRow: true,
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

export const buildPrevisioniReportFunnelTotaliDettaglioRows = (rows: AnalisiRccPivotFunnelRow[]) => (
  buildPrevisioniReportFunnelPivotRows(
    rows.map((row) => ({
      ...row,
      aggregazione: 'Totale complessivo',
    })),
  )
)

export type PrevisioniReportFunnelBurccOrder = 'rcc-bu' | 'bu-rcc'

export type PrevisioniReportFunnelBurccPivotRow = {
  key: string
  anno: number
  livello: 0 | 1 | 2 | 3
  businessUnit: string
  rcc: string
  tipo: string
  isPercentualeRow: boolean
  percentualeSuccesso: number
  numeroProtocolli: number
  totaleBudgetRicavo: number
  totaleBudgetCosti: number
  totaleFatturatoFuturo: number
  totaleEmessaAnno: number
  totaleFuturaAnno: number
  totaleRicaviComplessivi: number
}

const splitBurccAggregazione = (value: string) => {
  const normalized = value.trim()
  if (!normalized) {
    return { businessUnit: '-', rcc: '-' }
  }

  const separator = ' - '
  const separatorIndex = normalized.indexOf(separator)
  if (separatorIndex < 0) {
    return { businessUnit: normalized, rcc: '-' }
  }

  const businessUnit = normalized.slice(0, separatorIndex).trim()
  const rcc = normalized.slice(separatorIndex + separator.length).trim()
  return {
    businessUnit: businessUnit || '-',
    rcc: rcc || '-',
  }
}

export const buildPrevisioniReportFunnelBurccPivotRows = (
  rows: AnalisiRccPivotFunnelRow[],
  order: PrevisioniReportFunnelBurccOrder = 'rcc-bu',
): PrevisioniReportFunnelBurccPivotRow[] => {
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

  type SecondBucket = {
    businessUnit: string
    rcc: string
    numeroProtocolli: number
    totaleBudgetRicavo: number
    totaleBudgetCosti: number
    totaleFatturatoFuturo: number
    totaleEmessaAnno: number
    totaleFuturaAnno: number
    totaleRicaviComplessivi: number
    tipi: Map<string, TipoBucket>
  }

  type FirstBucket = {
    businessUnit: string
    rcc: string
    numeroProtocolli: number
    totaleBudgetRicavo: number
    totaleBudgetCosti: number
    totaleFatturatoFuturo: number
    totaleEmessaAnno: number
    totaleFuturaAnno: number
    totaleRicaviComplessivi: number
    second: Map<string, SecondBucket>
  }

  type YearBucket = {
    anno: number
    first: Map<string, FirstBucket>
  }

  const keyOf = (value: string) => value.trim().toUpperCase()
  const percentKeyOf = (value: number) => (
    Number.isFinite(value) ? value.toFixed(6) : '0.000000'
  )

  const grouped = new Map<number, YearBucket>()
  rows.forEach((row) => {
    const anno = Number.isFinite(row.anno) ? row.anno : 0
    const parsed = splitBurccAggregazione(row.aggregazione)
    const businessUnit = parsed.businessUnit
    const rcc = parsed.rcc
    const firstLabel = order === 'rcc-bu' ? rcc : businessUnit
    const secondLabel = order === 'rcc-bu' ? businessUnit : rcc
    const tipo = row.tipo.trim() || '-'
    const percentualeSuccesso = Number.isFinite(row.percentualeSuccesso) ? row.percentualeSuccesso : 0
    const numeroProtocolli = Number.isFinite(row.numeroProtocolli) ? row.numeroProtocolli : 0

    let yearBucket = grouped.get(anno)
    if (!yearBucket) {
      yearBucket = { anno, first: new Map<string, FirstBucket>() }
      grouped.set(anno, yearBucket)
    }

    const firstKey = keyOf(firstLabel)
    let firstBucket = yearBucket.first.get(firstKey)
    if (!firstBucket) {
      firstBucket = {
        businessUnit: order === 'rcc-bu' ? '' : firstLabel,
        rcc: order === 'rcc-bu' ? firstLabel : '',
        numeroProtocolli: 0,
        totaleBudgetRicavo: 0,
        totaleBudgetCosti: 0,
        totaleFatturatoFuturo: 0,
        totaleEmessaAnno: 0,
        totaleFuturaAnno: 0,
        totaleRicaviComplessivi: 0,
        second: new Map<string, SecondBucket>(),
      }
      yearBucket.first.set(firstKey, firstBucket)
    }

    firstBucket.numeroProtocolli += numeroProtocolli
    firstBucket.totaleBudgetRicavo += row.totaleBudgetRicavo
    firstBucket.totaleBudgetCosti += row.totaleBudgetCosti
    firstBucket.totaleFatturatoFuturo += row.totaleFatturatoFuturo
    firstBucket.totaleEmessaAnno += row.totaleEmessaAnno
    firstBucket.totaleFuturaAnno += row.totaleFuturaAnno
    firstBucket.totaleRicaviComplessivi += row.totaleRicaviComplessivi

    const secondKey = keyOf(secondLabel)
    let secondBucket = firstBucket.second.get(secondKey)
    if (!secondBucket) {
      secondBucket = {
        businessUnit,
        rcc,
        numeroProtocolli: 0,
        totaleBudgetRicavo: 0,
        totaleBudgetCosti: 0,
        totaleFatturatoFuturo: 0,
        totaleEmessaAnno: 0,
        totaleFuturaAnno: 0,
        totaleRicaviComplessivi: 0,
        tipi: new Map<string, TipoBucket>(),
      }
      firstBucket.second.set(secondKey, secondBucket)
    }

    secondBucket.numeroProtocolli += numeroProtocolli
    secondBucket.totaleBudgetRicavo += row.totaleBudgetRicavo
    secondBucket.totaleBudgetCosti += row.totaleBudgetCosti
    secondBucket.totaleFatturatoFuturo += row.totaleFatturatoFuturo
    secondBucket.totaleEmessaAnno += row.totaleEmessaAnno
    secondBucket.totaleFuturaAnno += row.totaleFuturaAnno
    secondBucket.totaleRicaviComplessivi += row.totaleRicaviComplessivi

    const tipoKey = keyOf(tipo)
    let tipoBucket = secondBucket.tipi.get(tipoKey)
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
      secondBucket.tipi.set(tipoKey, tipoBucket)
    }

    tipoBucket.numeroProtocolli += numeroProtocolli
    tipoBucket.totaleBudgetRicavo += row.totaleBudgetRicavo
    tipoBucket.totaleBudgetCosti += row.totaleBudgetCosti
    tipoBucket.totaleFatturatoFuturo += row.totaleFatturatoFuturo
    tipoBucket.totaleEmessaAnno += row.totaleEmessaAnno
    tipoBucket.totaleFuturaAnno += row.totaleFuturaAnno
    tipoBucket.totaleRicaviComplessivi += row.totaleRicaviComplessivi

    const percentKey = percentKeyOf(percentualeSuccesso)
    let percentBucket = tipoBucket.percentuali.get(percentKey)
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
      tipoBucket.percentuali.set(percentKey, percentBucket)
    }

    percentBucket.numeroProtocolli += numeroProtocolli
    percentBucket.totaleBudgetRicavo += row.totaleBudgetRicavo
    percentBucket.totaleBudgetCosti += row.totaleBudgetCosti
    percentBucket.totaleFatturatoFuturo += row.totaleFatturatoFuturo
    percentBucket.totaleEmessaAnno += row.totaleEmessaAnno
    percentBucket.totaleFuturaAnno += row.totaleFuturaAnno
    percentBucket.totaleRicaviComplessivi += row.totaleRicaviComplessivi
  })

  const result: PrevisioniReportFunnelBurccPivotRow[] = []
  const sortedYears = [...grouped.values()].sort((left, right) => left.anno - right.anno)
  sortedYears.forEach((yearBucket) => {
    const sortedFirst = [...yearBucket.first.values()].sort((left, right) => (
      `${left.rcc} ${left.businessUnit}`.localeCompare(
        `${right.rcc} ${right.businessUnit}`,
        'it',
        { sensitivity: 'base' },
      )
    ))

    sortedFirst.forEach((firstBucket) => {
      result.push({
        key: `burcc-first-${yearBucket.anno}-${keyOf(firstBucket.rcc)}-${keyOf(firstBucket.businessUnit)}`,
        anno: yearBucket.anno,
        livello: 0,
        businessUnit: firstBucket.businessUnit,
        rcc: firstBucket.rcc,
        tipo: '',
        isPercentualeRow: false,
        percentualeSuccesso: 0,
        numeroProtocolli: firstBucket.numeroProtocolli,
        totaleBudgetRicavo: firstBucket.totaleBudgetRicavo,
        totaleBudgetCosti: firstBucket.totaleBudgetCosti,
        totaleFatturatoFuturo: firstBucket.totaleFatturatoFuturo,
        totaleEmessaAnno: firstBucket.totaleEmessaAnno,
        totaleFuturaAnno: firstBucket.totaleFuturaAnno,
        totaleRicaviComplessivi: firstBucket.totaleRicaviComplessivi,
      })

      const sortedSecond = [...firstBucket.second.values()].sort((left, right) => (
        `${left.rcc} ${left.businessUnit}`.localeCompare(
          `${right.rcc} ${right.businessUnit}`,
          'it',
          { sensitivity: 'base' },
        )
      ))
      sortedSecond.forEach((secondBucket) => {
        result.push({
          key: `burcc-second-${yearBucket.anno}-${keyOf(secondBucket.rcc)}-${keyOf(secondBucket.businessUnit)}`,
          anno: yearBucket.anno,
          livello: 1,
          businessUnit: secondBucket.businessUnit,
          rcc: secondBucket.rcc,
          tipo: '',
          isPercentualeRow: false,
          percentualeSuccesso: 0,
          numeroProtocolli: secondBucket.numeroProtocolli,
          totaleBudgetRicavo: secondBucket.totaleBudgetRicavo,
          totaleBudgetCosti: secondBucket.totaleBudgetCosti,
          totaleFatturatoFuturo: secondBucket.totaleFatturatoFuturo,
          totaleEmessaAnno: secondBucket.totaleEmessaAnno,
          totaleFuturaAnno: secondBucket.totaleFuturaAnno,
          totaleRicaviComplessivi: secondBucket.totaleRicaviComplessivi,
        })

        const sortedTipi = [...secondBucket.tipi.values()].sort((left, right) => (
          left.tipo.localeCompare(right.tipo, 'it', { sensitivity: 'base' })
        ))
        sortedTipi.forEach((tipoBucket) => {
          result.push({
            key: `burcc-tipo-${yearBucket.anno}-${keyOf(secondBucket.rcc)}-${keyOf(secondBucket.businessUnit)}-${keyOf(tipoBucket.tipo)}`,
            anno: yearBucket.anno,
            livello: 2,
            businessUnit: secondBucket.businessUnit,
            rcc: secondBucket.rcc,
            tipo: tipoBucket.tipo,
            isPercentualeRow: false,
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
              key: `burcc-percent-${yearBucket.anno}-${keyOf(secondBucket.rcc)}-${keyOf(secondBucket.businessUnit)}-${keyOf(tipoBucket.tipo)}-${percentKeyOf(percentBucket.percentualeSuccesso)}`,
              anno: yearBucket.anno,
              livello: 3,
              businessUnit: secondBucket.businessUnit,
              rcc: secondBucket.rcc,
              tipo: tipoBucket.tipo,
              isPercentualeRow: true,
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
    })
  })

  return result
}

export const countPrevisioniReportFunnelAggregazioni = (rows: AnalisiRccPivotFunnelRow[]) => (
  new Set(
    rows
      .map((row) => `${row.anno}|${row.aggregazione.trim().toUpperCase()}`)
      .filter((value) => !value.endsWith('|')),
  ).size
)

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

export const buildProcessoOffertaSuccessoSintesiRows = (
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

export const buildProcessoOffertaSuccessoSintesiTotale = (
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

export const buildProcessoOffertaSuccessoRows = (
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

export const buildProcessoOffertaSuccessoTotaliPerAnno = (
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

export const buildProcessoOffertaSuccessoTotaleComplessivo = (
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

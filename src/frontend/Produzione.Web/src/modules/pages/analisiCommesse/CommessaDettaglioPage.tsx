// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useEffect, useMemo, useState } from 'react'

type CommessaDettaglioPageProps = any
type DetailRequisitiSortKey =
  | 'requisito'
  | 'durataRequisito'
  | 'venduto'
  | 'orePreviste'
  | 'oreSpese'
  | 'oreRestanti'
  | 'delta'
  | 'percentualeAvanzamento'

export function CommessaDettaglioPage(props: CommessaDettaglioPageProps) {
  const {
    backToSintesi,
    detailAcquistiDateSortIndicator,
    detailAcquistiSorted,
    detailAcquistiTotaleImporto,
    detailActiveTab,
    detailAnagrafica,
    detailAvanzamentoStorico,
    detailCommessa,
    detailCommessaChiusa,
    detailConfiguraData,
    detailConfiguraLoading,
    detailConfiguraSaving,
    detailConfiguraStatusMessage,
    detailConsuntivoMesePrecedente,
    detailCostiFuturiAggregati,
    detailCostiPassatiRiconciliati,
    detailCostoPersonaleFuturoProiezione,
    detailCurrentUserId,
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
    detailSegnalazioniData,
    detailSegnalazioniIncludeChiuse,
    detailSegnalazioniLoading,
    detailSegnalazioniSaving,
    detailSegnalazioniStatusMessage,
    detailSintesiRows,
    detailStatusMessage,
    detailTotals,
    detailUtileConsuntivatoRiconciliato,
    detailUtileFineProgetto,
    detailUtileRicalcolatoMesePrecedente,
    detailVenditeDateSortIndicator,
    detailVenditeSorted,
    detailVenditeTotaleImporto,
    openDetailSintesiMailModal,
    exportDettaglioPdf,
    exportDettaglioExcel,
    formatDate,
    formatNumber,
    formatPercentRatio,
    formatPercentValue,
    inserisciDetailSegnalazioneMessaggio,
    handleDetailOreRestantiInputBlur,
    handleDetailOreRestantiInputChange,
    handleDetailPercentRaggiuntoInputBlur,
    handleDetailPercentRaggiuntoInputChange,
    handleDetailRicavoPrevistoInputBlur,
    handleDetailRicavoPrevistoInputChange,
    loadDetailConfigura,
    loadDetailSegnalazioni,
    saveDetailConfigura,
    modificaDetailSegnalazione,
    modificaDetailSegnalazioneMessaggio,
    eliminaDetailSegnalazioneMessaggio,
    apriDetailSegnalazione,
    cambiaStatoDetailSegnalazione,
    chiudiDetailSegnalazione,
    eliminaDetailSegnalazione,
    handleSaveDetailPercentRaggiunto,
    selectedRequisitoId,
    setDetailActiveTab,
    setDetailSegnalazioniIncludeChiuse,
    toggleDetailAcquistiDateSort,
    toggleDetailVenditeDateSort,
    toggleRequisitoDettaglio,
  } = props as any

  const detailCommessaReadOnly = Boolean(detailCommessaChiusa)
  const detailKpiReadOnly = detailCommessaReadOnly
  const detailSegnalazioniReadOnly = false
  const detailOreRestantiVisual = detailKpiReadOnly ? 0 : detailOreRestantiProiezione
  const detailCostoPersonaleFuturoVisual = detailKpiReadOnly ? 0 : detailCostoPersonaleFuturoProiezione
  const detailRicavoPrevistoVisual = detailKpiReadOnly ? 0 : detailRicavoPrevisto
  const detailRicavoMaturatoVisual = detailKpiReadOnly ? 0 : detailRicavoMaturatoAlMesePrecedente
  const detailPercentRaggiuntoVisualInput = detailKpiReadOnly ? '0,00' : detailPercentRaggiuntoInput
  const [configuraForm, setConfiguraForm] = useState({
    idTipoCommessa: '',
    idProdotto: '',
    budgetImportoInvestimento: '0',
    budgetOreInvestimento: '0',
    prezzoVenditaInizialeRcc: '0',
    prezzoVenditaFinaleRcc: '0',
    stimaInizialeOrePm: '0',
  })
  const [segnalazioneEditorMode, setSegnalazioneEditorMode] = useState<'hidden' | 'new' | 'edit'>('hidden')
  const [selectedSegnalazioneId, setSelectedSegnalazioneId] = useState<number | null>(null)
  const [selectedMessaggioId, setSelectedMessaggioId] = useState<number | null>(null)
  const [replyParentMessageId, setReplyParentMessageId] = useState<number | null>(null)
  const [segnalazioneForm, setSegnalazioneForm] = useState({
    idTipoSegnalazione: 0,
    titolo: '',
    testo: '',
    priorita: 2,
    stato: 1,
    impattaCliente: false,
    dataEvento: '',
    idRisorsaDestinataria: '',
  })
  const [messaggioForm, setMessaggioForm] = useState('')
  const [detailOreSpeseAnnoFilter, setDetailOreSpeseAnnoFilter] = useState('')
  const [detailRequisitiStatoFilter, setDetailRequisitiStatoFilter] = useState<'tutte' | 'aperte' | 'chiuse'>('tutte')
  const [detailRequisitiCommercialeFilter, setDetailRequisitiCommercialeFilter] = useState<'tutte' | 'commerciali' | 'operative'>('tutte')
  const [detailRequisitiUnitaView, setDetailRequisitiUnitaView] = useState<'ore' | 'giorni'>('ore')
  const [detailRequisitiSort, setDetailRequisitiSort] = useState<{ key: DetailRequisitiSortKey; direction: 'asc' | 'desc' }>({
    key: 'requisito',
    direction: 'asc',
  })
  const showSegnalazioneEditor = segnalazioneEditorMode !== 'hidden'
  const isEditingSegnalazione = segnalazioneEditorMode === 'edit'

  const detailOreSpeseAnnoOptions = useMemo(() => (
    Array.from(
      new Set(
        detailOreSpeseRisorseRows
          .map((row: any) => Number(row?.anno))
          .filter((year: number) => Number.isInteger(year) && year > 0),
      ),
    ).sort((left, right) => right - left)
  ), [detailOreSpeseRisorseRows])

  useEffect(() => {
    if (!detailOreSpeseAnnoFilter) {
      return
    }

    const selectedYear = Number(detailOreSpeseAnnoFilter)
    const filterIsValid = detailOreSpeseAnnoOptions.some((year) => year === selectedYear)
    if (!filterIsValid) {
      setDetailOreSpeseAnnoFilter('')
    }
  }, [detailOreSpeseAnnoFilter, detailOreSpeseAnnoOptions])

  const detailOreSpeseRisorseRowsView = useMemo(() => {
    const selectedYear = Number(detailOreSpeseAnnoFilter)
    const rowsFilteredByYear = (!detailOreSpeseAnnoFilter || !Number.isInteger(selectedYear) || selectedYear <= 0)
      ? detailOreSpeseRisorseRows
      : detailOreSpeseRisorseRows.filter((row: any) => Number(row?.anno) === selectedYear)

    const groupedRows = new Map<string, { idRisorsa: number; nomeRisorsa: string; oreSpeseTotali: number }>()
    rowsFilteredByYear.forEach((row: any) => {
      const idRisorsa = Number(row?.idRisorsa ?? 0)
      const nomeRisorsa = String(row?.nomeRisorsa ?? '')
      const oreSpeseValue = Number(row?.oreSpeseTotali ?? 0)
      const oreSpeseTotali = Number.isFinite(oreSpeseValue) ? oreSpeseValue : 0
      const groupKey = `${idRisorsa}|${nomeRisorsa.trim().toUpperCase()}`
      const current = groupedRows.get(groupKey)

      if (current) {
        current.oreSpeseTotali += oreSpeseTotali
        return
      }

      groupedRows.set(groupKey, {
        idRisorsa,
        nomeRisorsa,
        oreSpeseTotali,
      })
    })

    return Array.from(groupedRows.values()).sort((left, right) => {
      const byName = left.nomeRisorsa.localeCompare(right.nomeRisorsa, 'it', { sensitivity: 'base' })
      if (byName !== 0) {
        return byName
      }

      return left.idRisorsa - right.idRisorsa
    })
  }, [detailOreSpeseRisorseRows, detailOreSpeseAnnoFilter])

  const detailOreSpeseRisorseTotalView = useMemo(
    () => detailOreSpeseRisorseRowsView.reduce((acc, row) => acc + row.oreSpeseTotali, 0),
    [detailOreSpeseRisorseRowsView],
  )

  const isRequisitoAttivo = (item: any) => item?.attivo !== false
  const isRequisitoCommerciale = (item: any) => item?.commerciale === true
  const getRequisitoRowClass = (item: any) => {
    if (isRequisitoCommerciale(item)) {
      return isRequisitoAttivo(item)
        ? 'detail-requisito-row-commerciale-attivo'
        : 'detail-requisito-row-commerciale-non-attivo'
    }

    if (!isRequisitoAttivo(item)) {
      return 'detail-requisito-row-inactive'
    }

    return ''
  }
  const getRequisitoVenduto = (item: any) => (isRequisitoCommerciale(item) ? 0 : (Number(item?.durataRequisito) || 0))
  const getRequisitoOreRiferimento = (item: any) => (item?.orePreviste > 0 ? item.orePreviste : item?.durataRequisito ?? 0)
  const getRequisitoDelta = (item: any) => getRequisitoVenduto(item) - (Number(item?.oreSpese) || 0)
  const getRequisitoOreRestantiVisual = (item: any) => {
    if (isRequisitoCommerciale(item)) {
      return 0
    }

    if (!isRequisitoAttivo(item)) {
      return 0
    }

    return getRequisitoOreRiferimento(item) - (Number(item?.oreSpese) || 0)
  }
  const getRequisitoPercentualeVisual = (item: any) => (isRequisitoAttivo(item) ? (Number(item?.percentualeAvanzamento) || 0) : 1)
  const toRequisitiDisplayValue = (value: number) => (detailRequisitiUnitaView === 'giorni' ? value / 8 : value)
  const formatRequisitiDisplayValue = (value: number) => formatNumber(toRequisitiDisplayValue(Number(value) || 0))
  const getDetailRequisitiSortValue = (item: any, key: DetailRequisitiSortKey) => {
    switch (key) {
      case 'requisito':
        return String(item?.requisito || `Requisito ${item?.idRequisito ?? ''}`)
      case 'durataRequisito':
        return Number(item?.durataRequisito) || 0
      case 'venduto':
        return getRequisitoVenduto(item)
      case 'orePreviste':
        return Number(item?.orePreviste) || 0
      case 'oreSpese':
        return Number(item?.oreSpese) || 0
      case 'oreRestanti':
        return getRequisitoOreRestantiVisual(item)
      case 'delta':
        return getRequisitoDelta(item)
      case 'percentualeAvanzamento':
        return getRequisitoPercentualeVisual(item)
      default:
        return 0
    }
  }
  const toggleDetailRequisitiSort = (key: DetailRequisitiSortKey) => {
    setDetailRequisitiSort((current) => {
      if (current.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        }
      }

      return {
        key,
        direction: 'asc',
      }
    })
  }
  const handleDetailRequisitiSortHeaderKeyDown = (event: any, key: DetailRequisitiSortKey) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    toggleDetailRequisitiSort(key)
  }
  const getDetailRequisitiSortIndicator = (key: DetailRequisitiSortKey) => {
    if (detailRequisitiSort.key !== key) {
      return '↕'
    }

    return detailRequisitiSort.direction === 'asc' ? '▲' : '▼'
  }
  const detailRequisitiOreRowsView = useMemo(() => (
    detailRequisitiOreRows.filter((row: any) => {
      const statoMatches = detailRequisitiStatoFilter === 'tutte'
        || (detailRequisitiStatoFilter === 'aperte' && isRequisitoAttivo(row))
        || (detailRequisitiStatoFilter === 'chiuse' && !isRequisitoAttivo(row))
      const commercialeMatches = detailRequisitiCommercialeFilter === 'tutte'
        || (detailRequisitiCommercialeFilter === 'commerciali' && isRequisitoCommerciale(row))
        || (detailRequisitiCommercialeFilter === 'operative' && !isRequisitoCommerciale(row))
      return statoMatches && commercialeMatches
    })
  ), [detailRequisitiCommercialeFilter, detailRequisitiOreRows, detailRequisitiStatoFilter])
  const detailRequisitiOreRowsSorted = useMemo(() => {
    const directionFactor = detailRequisitiSort.direction === 'asc' ? 1 : -1
    return detailRequisitiOreRowsView
      .map((row: any, index: number) => ({ row, index }))
      .sort((left, right) => {
        const leftValue = getDetailRequisitiSortValue(left.row, detailRequisitiSort.key)
        const rightValue = getDetailRequisitiSortValue(right.row, detailRequisitiSort.key)
        const compareAsString = typeof leftValue === 'string' || typeof rightValue === 'string'

        if (compareAsString) {
          const result = String(leftValue).localeCompare(String(rightValue), 'it', { sensitivity: 'base' })
          if (result !== 0) {
            return result * directionFactor
          }
        } else {
          const leftNumber = Number(leftValue) || 0
          const rightNumber = Number(rightValue) || 0
          if (leftNumber !== rightNumber) {
            return (leftNumber - rightNumber) * directionFactor
          }
        }

        return left.index - right.index
      })
      .map((item) => item.row)
  }, [detailRequisitiOreRowsView, detailRequisitiSort])
  const detailRequisitiOreTotalsView = useMemo(() => (
    detailRequisitiOreRowsView.reduce((acc: any, row: any) => {
      const oreSpese = Number(row?.oreSpese) || 0
      const oreRiferimento = isRequisitoAttivo(row)
        ? getRequisitoOreRiferimento(row)
        : Math.max(oreSpese, 0)
      const venduto = getRequisitoVenduto(row)
      return {
        durataRequisito: acc.durataRequisito + (Number(row?.durataRequisito) || 0),
        venduto: acc.venduto + venduto,
        orePreviste: acc.orePreviste + (Number(row?.orePreviste) || 0),
        oreSpese: acc.oreSpese + oreSpese,
        oreRestanti: acc.oreRestanti + getRequisitoOreRestantiVisual(row),
        delta: acc.delta + (venduto - oreSpese),
        oreRiferimento: acc.oreRiferimento + oreRiferimento,
      }
    }, {
      durataRequisito: 0,
      venduto: 0,
      orePreviste: 0,
      oreSpese: 0,
      oreRestanti: 0,
      delta: 0,
      oreRiferimento: 0,
    })
  ), [detailRequisitiOreRowsView])
  const detailRequisitiOreTotalsCurrent = useMemo(() => (
    detailRequisitiStatoFilter === 'tutte' && detailRequisitiCommercialeFilter === 'tutte'
      ? (detailRequisitiOreTotals ?? detailRequisitiOreTotalsView)
      : detailRequisitiOreTotalsView
  ), [
    detailRequisitiCommercialeFilter,
    detailRequisitiOreTotals,
    detailRequisitiOreTotalsView,
    detailRequisitiStatoFilter,
  ])
  const renderHeaderWithTooltip = (label: string, tooltip: string) => (
    <span className="detail-col-header-with-tooltip">
      <span>{label}</span>
      <span
        className="detail-col-tooltip-trigger"
        tabIndex={0}
        aria-label={`${label}: ${tooltip}`}
        data-tooltip={tooltip}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        i
      </span>
    </span>
  )
  const renderDetailRequisitiSortableHeader = (
    key: DetailRequisitiSortKey,
    content: any,
    isNumeric: boolean = false,
  ) => (
    <th
      className={`${isNumeric ? 'num ' : ''}detail-requisiti-sortable-header`}
      tabIndex={0}
      aria-sort={detailRequisitiSort.key === key ? (detailRequisitiSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      onClick={() => toggleDetailRequisitiSort(key)}
      onKeyDown={(event) => handleDetailRequisitiSortHeaderKeyDown(event, key)}
    >
      <span className={`detail-requisiti-sort-header-content ${isNumeric ? 'detail-requisiti-sort-header-content-num' : ''}`}>
        <span>{content}</span>
        <span className="sort-indicator" aria-hidden="true">{getDetailRequisitiSortIndicator(key)}</span>
      </span>
    </th>
  )

  const parseDecimalInput = (rawValue: string) => {
    const compactValue = (rawValue ?? '').trim().replace(/\s+/g, '')
    if (!compactValue) {
      return 0
    }

    let normalized = compactValue
    const hasComma = normalized.includes(',')
    const hasDot = normalized.includes('.')
    if (hasComma && hasDot) {
      normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
        ? normalized.replace(/\./g, '').replace(',', '.')
        : normalized.replace(/,/g, '')
    } else if (hasComma) {
      normalized = normalized.replace(',', '.')
    }

    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const getSegnalazionePrioritaLabel = (value: number | null | undefined) => {
    switch (Number(value ?? 0)) {
      case 1:
        return 'Alta'
      case 2:
        return 'Media'
      case 3:
        return 'Bassa'
      default:
        return 'Non definita'
    }
  }

  const getSegnalazioneStatoLabel = (value: number | null | undefined) => {
    switch (Number(value ?? 0)) {
      case 1:
        return 'Aperta'
      case 2:
        return 'In lavorazione'
      case 3:
        return 'In attesa'
      case 4:
        return 'Chiusa'
      default:
        return 'Non definito'
    }
  }

  const getSegnalazioneImpattaClienteLabel = (value: boolean | null | undefined) => {
    return value ? 'Si' : 'No'
  }

  const formatSegnalazioneTesto = (value: string | null | undefined) => {
    const normalized = String(value ?? '').trim()
    if (!normalized) {
      return '-'
    }

    if (normalized.length <= 140) {
      return normalized
    }

    return `${normalized.slice(0, 137)}...`
  }

  const getSegnalazioneDataModifica = (row: any) => {
    return formatDate(row?.dataUltimaModifica || row?.dataInserimento || row?.dataEvento)
  }

  const canEditTipologiaCommessa = Boolean(detailConfiguraData?.canEditTipologiaCommessa ?? detailConfiguraData?.canEdit)
  const canEditProdotto = Boolean(detailConfiguraData?.canEditProdotto ?? detailConfiguraData?.canEdit)
  const canEditBudgetImportoInvestimento = Boolean(detailConfiguraData?.canEditBudgetImportoInvestimento ?? detailConfiguraData?.canEdit)
  const canEditBudgetOreInvestimento = Boolean(detailConfiguraData?.canEditBudgetOreInvestimento ?? detailConfiguraData?.canEdit)
  const canEditPrezzoVenditaInizialeRcc = Boolean(detailConfiguraData?.canEditPrezzoVenditaInizialeRcc ?? detailConfiguraData?.canEdit)
  const canEditPrezzoVenditaFinaleRcc = Boolean(detailConfiguraData?.canEditPrezzoVenditaFinaleRcc ?? detailConfiguraData?.canEdit)
  const canEditStimaInizialeOrePm = Boolean(detailConfiguraData?.canEditStimaInizialeOrePm ?? detailConfiguraData?.canEdit)
  const canSaveConfigura = (
    canEditTipologiaCommessa
    || canEditProdotto
    || canEditBudgetImportoInvestimento
    || canEditBudgetOreInvestimento
    || canEditPrezzoVenditaInizialeRcc
    || canEditPrezzoVenditaFinaleRcc
    || canEditStimaInizialeOrePm
  )

  const selectedSegnalazione = useMemo(
    () => detailSegnalazioniData?.segnalazioni?.find((item: any) => item.id === selectedSegnalazioneId) ?? null,
    [detailSegnalazioniData, selectedSegnalazioneId],
  )
  const selectedSegnalazioneChiusa = (selectedSegnalazione?.stato ?? 0) === 4
  const canEditSelectedSegnalazione = Number(selectedSegnalazione?.idRisorsaInserimento ?? 0) === Number(detailCurrentUserId ?? 0)
  const hasSegnalazioniAperte = useMemo(
    () => (detailSegnalazioniData?.segnalazioni ?? []).some((item: any) => Number(item?.stato ?? 0) !== 4),
    [detailSegnalazioniData],
  )
  const segnalazioniDestinatariOptions = useMemo(() => {
    const sourceRows = (detailSegnalazioniData?.destinatari ?? []).filter((item: any) => Number(item?.idRisorsa ?? 0) > 0)
    const dedupedMap = new Map<string, any>()
    sourceRows.forEach((item: any) => {
      const roleCode = String(item.roleCode ?? '').trim().toUpperCase()
      const idRisorsa = Number(item.idRisorsa ?? 0)
      if (!roleCode || idRisorsa <= 0) {
        return
      }

      const key = `${roleCode}|${idRisorsa}`
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, item)
      }
    })

    return Array.from(dedupedMap.values()).sort((left: any, right: any) => {
      const roleCompare = String(left.roleLabel ?? left.roleCode ?? '').localeCompare(
        String(right.roleLabel ?? right.roleCode ?? ''),
        'it',
        { sensitivity: 'base' },
      )
      if (roleCompare !== 0) {
        return roleCompare
      }

      return String(left.nomeRisorsa ?? '').localeCompare(String(right.nomeRisorsa ?? ''), 'it', { sensitivity: 'base' })
    })
  }, [detailSegnalazioniData])

  const destinatarioSelezionatoDisponibile = useMemo(
    () => segnalazioniDestinatariOptions.some((item: any) => Number(item.idRisorsa) === Number(segnalazioneForm.idRisorsaDestinataria || 0)),
    [segnalazioneForm.idRisorsaDestinataria, segnalazioniDestinatariOptions],
  )

  const selectedThreadRows = useMemo(
    () => (detailSegnalazioniData?.thread ?? []).filter((item: any) => (
      selectedSegnalazioneId !== null ? item.idSegnalazione === selectedSegnalazioneId : true
    )),
    [detailSegnalazioniData, selectedSegnalazioneId],
  )
  const selectedMessaggio = useMemo(
    () => selectedThreadRows.find((item: any) => item.id === selectedMessaggioId) ?? null,
    [selectedThreadRows, selectedMessaggioId],
  )
  const canEditSelectedMessaggio = Number(selectedMessaggio?.idRisorsaInserimento ?? 0) === Number(detailCurrentUserId ?? 0)
  const canDeleteSelectedSegnalazione = Boolean(
    selectedSegnalazione
    && canEditSelectedSegnalazione
    && !selectedSegnalazioneChiusa
    && selectedThreadRows.length === 0,
  )

  useEffect(() => {
    if (!detailConfiguraData) {
      return
    }

    setConfiguraForm({
      idTipoCommessa: detailConfiguraData.idTipoCommessa ? detailConfiguraData.idTipoCommessa.toString() : '',
      idProdotto: detailConfiguraData.idProdotto ? detailConfiguraData.idProdotto.toString() : '',
      budgetImportoInvestimento: Number.isFinite(detailConfiguraData.budgetImportoInvestimento)
        ? formatNumber(detailConfiguraData.budgetImportoInvestimento)
        : '0',
      budgetOreInvestimento: Number.isFinite(detailConfiguraData.budgetOreInvestimento)
        ? formatNumber(detailConfiguraData.budgetOreInvestimento)
        : '0',
      prezzoVenditaInizialeRcc: Number.isFinite(detailConfiguraData.prezzoVenditaInizialeRcc)
        ? formatNumber(detailConfiguraData.prezzoVenditaInizialeRcc)
        : '0',
      prezzoVenditaFinaleRcc: Number.isFinite(detailConfiguraData.prezzoVenditaFinaleRcc)
        ? formatNumber(detailConfiguraData.prezzoVenditaFinaleRcc)
        : '0',
      stimaInizialeOrePm: Number.isFinite(detailConfiguraData.stimaInizialeOrePm)
        ? formatNumber(detailConfiguraData.stimaInizialeOrePm)
        : '0',
    })
  }, [detailConfiguraData, formatNumber])

  useEffect(() => {
    if (!detailSegnalazioniData) {
      setSelectedSegnalazioneId(null)
      return
    }

    if (!detailSegnalazioniData.segnalazioni.length) {
      setSelectedSegnalazioneId(null)
      return
    }

    const hasCurrent = detailSegnalazioniData.segnalazioni.some((item: any) => item.id === selectedSegnalazioneId)
    if (!hasCurrent) {
      setSelectedSegnalazioneId(detailSegnalazioniData.segnalazioni[0].id)
    }
  }, [detailSegnalazioniData, selectedSegnalazioneId])

  useEffect(() => {
    if (!selectedSegnalazione) {
      setSegnalazioneEditorMode('hidden')
      return
    }

    if (!isEditingSegnalazione) {
      return
    }

    setSegnalazioneForm({
      idTipoSegnalazione: selectedSegnalazione.idTipoSegnalazione ?? 0,
      titolo: selectedSegnalazione.titolo ?? '',
      testo: selectedSegnalazione.testo ?? '',
      priorita: selectedSegnalazione.priorita ?? 2,
      stato: selectedSegnalazione.stato ?? 1,
      impattaCliente: Boolean(selectedSegnalazione.impattaCliente),
      dataEvento: selectedSegnalazione.dataEvento ? String(selectedSegnalazione.dataEvento).slice(0, 10) : '',
      idRisorsaDestinataria: selectedSegnalazione.idRisorsaDestinataria ? selectedSegnalazione.idRisorsaDestinataria.toString() : '',
    })
  }, [selectedSegnalazione, isEditingSegnalazione])

  useEffect(() => {
    setSelectedMessaggioId(null)
    setReplyParentMessageId(null)
    setMessaggioForm('')
  }, [selectedSegnalazioneId])

  useEffect(() => {
    if (!detailSegnalazioniData?.tipiSegnalazione?.length) {
      return
    }

    if (segnalazioneForm.idTipoSegnalazione > 0) {
      return
    }

    const firstType = detailSegnalazioniData.tipiSegnalazione[0]
    setSegnalazioneForm((current) => ({
      ...current,
      idTipoSegnalazione: firstType.id,
      impattaCliente: Boolean(firstType.impattaClienteDefault),
    }))
  }, [detailSegnalazioniData, segnalazioneForm.idTipoSegnalazione])

  const handleConfiguraSave = () => {
    if (!detailConfiguraData) {
      return
    }

    const payload = {
      commessa: detailConfiguraData.commessa || detailCommessa,
      idTipoCommessa: configuraForm.idTipoCommessa ? Number(configuraForm.idTipoCommessa) : null,
      idProdotto: configuraForm.idProdotto ? Number(configuraForm.idProdotto) : null,
      budgetImportoInvestimento: parseDecimalInput(configuraForm.budgetImportoInvestimento),
      budgetOreInvestimento: parseDecimalInput(configuraForm.budgetOreInvestimento),
      prezzoVenditaInizialeRcc: parseDecimalInput(configuraForm.prezzoVenditaInizialeRcc),
      prezzoVenditaFinaleRcc: parseDecimalInput(configuraForm.prezzoVenditaFinaleRcc),
      stimaInizialeOrePm: parseDecimalInput(configuraForm.stimaInizialeOrePm),
    }
    saveDetailConfigura(payload)
  }

  const resetNuovaSegnalazioneForm = () => {
    if (detailSegnalazioniReadOnly) {
      return
    }

    const firstType = detailSegnalazioniData?.tipiSegnalazione?.[0]
    setSegnalazioneEditorMode('new')
    setSelectedMessaggioId(null)
    setReplyParentMessageId(null)
    setMessaggioForm('')
    setSegnalazioneForm({
      idTipoSegnalazione: firstType?.id ?? 0,
      titolo: '',
      testo: '',
      priorita: 2,
      stato: 1,
      impattaCliente: Boolean(firstType?.impattaClienteDefault),
      dataEvento: '',
      idRisorsaDestinataria: '',
    })
  }

  const handleApriSegnalazione = async () => {
    if (detailSegnalazioniReadOnly || !detailCommessa || segnalazioneForm.idTipoSegnalazione <= 0 || !segnalazioneForm.titolo.trim()) {
      return
    }

    const success = await apriDetailSegnalazione({
      commessa: detailCommessa,
      idTipoSegnalazione: segnalazioneForm.idTipoSegnalazione,
      titolo: segnalazioneForm.titolo.trim(),
      testo: segnalazioneForm.testo.trim(),
      priorita: segnalazioneForm.priorita,
      impattaCliente: segnalazioneForm.impattaCliente,
      dataEvento: segnalazioneForm.dataEvento || undefined,
      idRisorsaDestinataria: segnalazioneForm.idRisorsaDestinataria
        ? Number(segnalazioneForm.idRisorsaDestinataria)
        : undefined,
    })
    if (success) {
      setSegnalazioneEditorMode('hidden')
      setReplyParentMessageId(null)
      setSelectedMessaggioId(null)
      setMessaggioForm('')
    }
  }

  const handleModificaSegnalazione = async () => {
    if (detailSegnalazioniReadOnly || !selectedSegnalazione || !canEditSelectedSegnalazione) {
      return
    }

    let success = true
    const statoSelezionato = Number(segnalazioneForm.stato ?? selectedSegnalazione.stato ?? 1)
    const statoCorrente = Number(selectedSegnalazione.stato ?? 1)
    const isHeaderChanged = (
      Number(segnalazioneForm.idTipoSegnalazione ?? 0) !== Number(selectedSegnalazione.idTipoSegnalazione ?? 0)
      || segnalazioneForm.titolo.trim() !== String(selectedSegnalazione.titolo ?? '').trim()
      || segnalazioneForm.testo.trim() !== String(selectedSegnalazione.testo ?? '').trim()
      || Number(segnalazioneForm.priorita ?? 0) !== Number(selectedSegnalazione.priorita ?? 0)
      || Boolean(segnalazioneForm.impattaCliente) !== Boolean(selectedSegnalazione.impattaCliente)
      || (segnalazioneForm.dataEvento || '') !== (selectedSegnalazione.dataEvento ? String(selectedSegnalazione.dataEvento).slice(0, 10) : '')
      || Number(segnalazioneForm.idRisorsaDestinataria || 0) !== Number(selectedSegnalazione.idRisorsaDestinataria || 0)
    )

    if (!selectedSegnalazioneChiusa && isHeaderChanged) {
      success = await modificaDetailSegnalazione({
        idSegnalazione: selectedSegnalazione.id,
        idTipoSegnalazione: segnalazioneForm.idTipoSegnalazione,
        titolo: segnalazioneForm.titolo.trim(),
        testo: segnalazioneForm.testo.trim(),
        priorita: segnalazioneForm.priorita,
        impattaCliente: segnalazioneForm.impattaCliente,
        dataEvento: segnalazioneForm.dataEvento || undefined,
        idRisorsaDestinataria: segnalazioneForm.idRisorsaDestinataria
          ? Number(segnalazioneForm.idRisorsaDestinataria)
          : undefined,
      })
    }

    if (!success) {
      return
    }

    if (statoSelezionato !== statoCorrente) {
      success = await cambiaStatoDetailSegnalazione({
        idSegnalazione: selectedSegnalazione.id,
        stato: statoSelezionato,
      })
    }

    if (success) {
      setSegnalazioneEditorMode('hidden')
      setReplyParentMessageId(null)
      setSelectedMessaggioId(null)
      setMessaggioForm('')
    }
  }

  const handleEliminaSegnalazione = async () => {
    if (detailSegnalazioniReadOnly || !selectedSegnalazione || !canDeleteSelectedSegnalazione) {
      return
    }

    const success = await eliminaDetailSegnalazione({
      idSegnalazione: selectedSegnalazione.id,
    })
    if (success) {
      setSegnalazioneEditorMode('hidden')
      setSelectedSegnalazioneId(null)
      setSelectedMessaggioId(null)
      setReplyParentMessageId(null)
      setMessaggioForm('')
    }
  }

  const handleInviaMessaggio = async () => {
    if (detailSegnalazioniReadOnly || !selectedSegnalazioneId || !messaggioForm.trim() || selectedSegnalazioneChiusa) {
      return
    }

    const success = await inserisciDetailSegnalazioneMessaggio({
      idSegnalazione: selectedSegnalazioneId,
      idMessaggioPadre: replyParentMessageId && replyParentMessageId > 0 ? replyParentMessageId : undefined,
      testo: messaggioForm.trim(),
    })
    if (success) {
      setReplyParentMessageId(null)
      setMessaggioForm('')
    }
  }

  const handleModificaMessaggio = async () => {
    if (detailSegnalazioniReadOnly || !selectedSegnalazioneId || !selectedMessaggioId || !messaggioForm.trim() || selectedSegnalazioneChiusa || !canEditSelectedMessaggio) {
      return
    }

    const success = await modificaDetailSegnalazioneMessaggio(selectedSegnalazioneId, {
      idMessaggio: selectedMessaggioId,
      testo: messaggioForm.trim(),
    })
    if (success) {
      setSelectedMessaggioId(null)
      setReplyParentMessageId(null)
      setMessaggioForm('')
    }
  }

  return (
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
                      onClick={exportDettaglioPdf}
                      disabled={detailLoading || !detailData}
                    >
                      Export PDF
                    </button>
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
                      onClick={openDetailSintesiMailModal}
                      disabled={detailLoading || !detailData?.commessa}
                    >
                      Invia sintesi
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
                        <th>Data apertura</th>
                        <th>Data chiusura</th>
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
                        <td>{formatDate(detailAnagrafica.dataApertura)}</td>
                        <td>{formatDate(detailAnagrafica.dataChiusura)}</td>
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
                      <th className="detail-kpi-group-head" colSpan={4}>
                        {detailCurrentYear > 0 ? `Futuro ${detailCurrentYear}` : 'Futuro'}
                      </th>
                      <th className="detail-kpi-group-head" colSpan={7}>
                        Proiezione {detailLastDayPreviousMonth ? detailLastDayPreviousMonth.toLocaleDateString('it-IT') : 'mese precedente'}
                      </th>
                      {!detailKpiReadOnly && (
                        <th className="detail-kpi-group-head detail-kpi-action-col" colSpan={1}>
                          Azione
                        </th>
                      )}
                    </tr>
                    <tr>
                      <th className="num">Ore lavorate</th>
                      <th className="num">Costo personale</th>
                      <th className="num">Ricavi passati</th>
                      <th className="num">Costi passati</th>
                      <th className="num">Utile consuntivato</th>
                      <th className="num">Ricavi futuri</th>
                      <th className="num">Ricavi anni successivi</th>
                      <th className="num">Costi futuri</th>
                      <th className="num">Ore future</th>
                      <th className="num">Ore restanti</th>
                      <th className="num">Costo personale futuro</th>
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
                        <span className="detail-tooltip-label" title="Utile storico + Ricavi futuri complessivi - Costi futuri - Costo personale futuro.">
                          Utile fine progetto
                        </span>
                      </th>
                      {!detailKpiReadOnly && <th className="detail-kpi-action-col">Salva</th>}
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
                      <td className={`num ${detailRicaviAnniSuccessivi < 0 ? 'num-negative' : ''}`}>{formatNumber(detailRicaviAnniSuccessivi)}</td>
                      <td className={`num ${detailCostiFuturiAggregati < 0 ? 'num-negative' : ''}`}>{formatNumber(detailCostiFuturiAggregati)}</td>
                      <td className={`num ${detailOreFuture < 0 ? 'num-negative' : ''}`}>{formatNumber(detailOreFuture)}</td>
                      <td className={`detail-kpi-amount-cell ${detailOreRestantiVisual < 0 ? 'num-negative' : ''}`}>
                        <label className="detail-kpi-amount-input-wrap">
                          <input
                            className="detail-kpi-amount-input"
                            type="text"
                            inputMode="decimal"
                            value={detailKpiReadOnly ? '0,00' : detailOreRestantiInput}
                            onChange={handleDetailOreRestantiInputChange}
                            onBlur={handleDetailOreRestantiInputBlur}
                            aria-label="Ore restanti"
                            disabled={detailKpiReadOnly}
                          />
                          <span className="detail-kpi-amount-suffix">h</span>
                        </label>
                      </td>
                      <td className={`num ${detailCostoPersonaleFuturoVisual < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailCostoPersonaleFuturoVisual)}
                      </td>
                      <td className={`detail-kpi-amount-cell ${detailRicavoPrevistoVisual < 0 ? 'num-negative' : ''}`}>
                        <label className="detail-kpi-amount-input-wrap">
                          <input
                            className="detail-kpi-amount-input"
                            type="text"
                            inputMode="decimal"
                            value={detailKpiReadOnly ? '0,00' : detailRicavoPrevistoInput}
                            onChange={handleDetailRicavoPrevistoInputChange}
                            onBlur={handleDetailRicavoPrevistoInputBlur}
                            aria-label="Ricavo previsto"
                            disabled={detailKpiReadOnly}
                          />
                          <span className="detail-kpi-amount-suffix">EUR</span>
                        </label>
                      </td>
                      <td className="detail-kpi-percent-cell">
                        <label className="detail-kpi-percent-input-wrap">
                          <input
                            className="detail-kpi-percent-input"
                            type="text"
                            inputMode="decimal"
                            value={detailPercentRaggiuntoVisualInput}
                            onChange={handleDetailPercentRaggiuntoInputChange}
                            onBlur={handleDetailPercentRaggiuntoInputBlur}
                            aria-label="% raggiunto progetto"
                            disabled={detailKpiReadOnly}
                          />
                          <span className="detail-kpi-percent-suffix">%</span>
                        </label>
                      </td>
                      <td className={`num ${detailRicavoMaturatoVisual < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailRicavoMaturatoVisual)}
                      </td>
                      <td className={`num ${detailUtileRicalcolatoMesePrecedente < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailUtileRicalcolatoMesePrecedente)}
                      </td>
                      <td className={`num ${detailUtileFineProgetto < 0 ? 'num-negative' : ''}`}>
                        {formatNumber(detailUtileFineProgetto)}
                      </td>
                      {!detailKpiReadOnly && (
                        <td className="detail-kpi-action-cell">
                          <button
                            type="button"
                            onClick={handleSaveDetailPercentRaggiunto}
                            disabled={detailLoading || detailSaving || !detailData?.commessa}
                          >
                            {detailSaving ? 'Salvataggio...' : 'Salva'}
                          </button>
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            </section>

            <section className="detail-main-zone">
            <section className="detail-tabs-bar" aria-label="Navigazione dettaglio commessa">
              <button
                type="button"
                className={`detail-tab-button ${detailActiveTab === 'storico' ? 'is-active' : ''}`}
                onClick={() => setDetailActiveTab('storico')}
              >
                Storico
              </button>
              <button
                type="button"
                className={`detail-tab-button ${detailActiveTab === 'dati-contabili' ? 'is-active' : ''}`}
                onClick={() => setDetailActiveTab('dati-contabili')}
              >
                Dati contabili
              </button>
              <button
                type="button"
                className={`detail-tab-button ${detailActiveTab === 'commerciale' ? 'is-active' : ''}`}
                onClick={() => setDetailActiveTab('commerciale')}
              >
                Commerciale
              </button>
              <button
                type="button"
                className={`detail-tab-button ${detailActiveTab === 'personale' ? 'is-active' : ''}`}
                onClick={() => setDetailActiveTab('personale')}
              >
                Personale
              </button>
              <button
                type="button"
                className={`detail-tab-button ${detailActiveTab === 'configura' ? 'is-active' : ''}`}
                onClick={() => setDetailActiveTab('configura')}
              >
                Configura commessa
              </button>
              <button
                type="button"
                className={`detail-tab-button ${detailActiveTab === 'segnalazioni' ? 'is-active' : ''} ${hasSegnalazioniAperte ? 'has-open-alert' : ''}`}
                onClick={() => setDetailActiveTab('segnalazioni')}
              >
                Segnalazioni
              </button>
            </section>
            <section className={`detail-grid-panels detail-grid-panels-tab-${detailActiveTab}`}>
              <section className={`panel detail-card detail-card-consuntivo ${detailActiveTab !== 'storico' ? 'detail-card-hidden' : ''}`}>
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

              <section className={`panel detail-card detail-card-vendite ${detailActiveTab !== 'dati-contabili' ? 'detail-card-hidden' : ''}`}>
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
                          <th>
                            <button type="button" className="sort-header-btn" onClick={toggleDetailVenditeDateSort}>
                              Data <span className="sort-indicator">{detailVenditeDateSortIndicator}</span>
                            </button>
                          </th>
                          <th className="num">Importo</th>
                          <th>Documento</th>
                          <th>Descrizione</th>
                          <th>Causale</th>
                          <th>Sottoconto</th>
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
                            <td>{row.causale}</td>
                            <td>{row.sottoconto}</td>
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
                          <td colSpan={6} />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>

              <section className={`panel detail-card detail-card-acquisti ${detailActiveTab !== 'dati-contabili' ? 'detail-card-hidden' : ''}`}>
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
                          <th>
                            <button type="button" className="sort-header-btn" onClick={toggleDetailAcquistiDateSort}>
                              Data <span className="sort-indicator">{detailAcquistiDateSortIndicator}</span>
                            </button>
                          </th>
                          <th className="num">Importo</th>
                          <th>Documento</th>
                          <th>Descrizione</th>
                          <th>Causale</th>
                          <th>Sottoconto</th>
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
                            <td>{row.causale}</td>
                            <td>{row.sottoconto}</td>
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
                          <td colSpan={7} />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </section>

              <section className={`panel detail-card detail-card-ordini ${detailActiveTab !== 'commerciale' ? 'detail-card-hidden' : ''}`}>
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
                          <th className="num">Quantita</th>
                          <th className="num">Prezzo Unit.</th>
                          <th className="num">Importo Ordine</th>
                          <th className="num">Qta originale</th>
                          <th className="num">Qta fatture</th>
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

              <section className={`panel detail-card detail-card-offerte ${detailActiveTab !== 'commerciale' ? 'detail-card-hidden' : ''}`}>
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

              <section className={`panel detail-card detail-card-percent ${detailActiveTab !== 'storico' ? 'detail-card-hidden' : ''}`}>
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
                            <th className="num">Ore future</th>
                            <th className="num">Costo personale futuro</th>
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
                              <td className={`num ${(Number.isFinite(row.oreFuture) ? row.oreFuture : row.oreRestanti) < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(Number.isFinite(row.oreFuture) ? row.oreFuture : row.oreRestanti)}
                              </td>
                              <td className={`num ${row.costoPersonaleFuturo < 0 ? 'num-negative' : ''}`}>
                                {formatNumber(row.costoPersonaleFuturo)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </section>

              <section className={`panel detail-card detail-card-requisiti ${detailActiveTab !== 'personale' ? 'detail-card-hidden' : ''}`}>
                <header className="panel-header">
                  <h3>Ore requisiti commessa</h3>
                </header>
                <div className="detail-card-body">
                  {detailRequisitiOreRows.length === 0 && (
                    <p className="empty-state">
                      Nessun requisito con ore previste/spese disponibile per la commessa selezionata.
                    </p>
                  )}

                  {detailRequisitiOreRows.length > 0 && (
                    <>
                      <div className="detail-requisiti-split">
                        <div className="detail-requisiti-col">
                          <div className="detail-requisiti-caption-row">
                            <p className="detail-kpi-caption">
                              Speso attivita fino al {detailLastDayPreviousMonth ? detailLastDayPreviousMonth.toLocaleDateString('it-IT') : '-'}.
                            </p>
                            <div className="detail-requisiti-caption-filters">
                              <label className="detail-requisiti-caption-filter-field">
                                <span>Stato</span>
                                <select
                                  value={detailRequisitiStatoFilter}
                                  onChange={(event) => setDetailRequisitiStatoFilter(event.target.value as 'tutte' | 'aperte' | 'chiuse')}
                                >
                                  <option value="tutte">Tutte</option>
                                  <option value="aperte">Aperte</option>
                                  <option value="chiuse">Chiuse</option>
                                </select>
                              </label>
                              <label className="detail-requisiti-caption-filter-field">
                                <span>Commerciale</span>
                                <select
                                  value={detailRequisitiCommercialeFilter}
                                  onChange={(event) => setDetailRequisitiCommercialeFilter(event.target.value as 'tutte' | 'commerciali' | 'operative')}
                                >
                                  <option value="tutte">Tutte</option>
                                  <option value="commerciali">Commerciali</option>
                                  <option value="operative">Operative</option>
                                </select>
                              </label>
                              <div className="detail-requisiti-caption-unit-toggle" role="radiogroup" aria-label="Visualizzazione ore o giorni">
                                <label>
                                  <input
                                    type="radio"
                                    name="detail-requisiti-unita"
                                    value="ore"
                                    checked={detailRequisitiUnitaView === 'ore'}
                                    onChange={() => setDetailRequisitiUnitaView('ore')}
                                  />
                                  Ore
                                </label>
                                <label>
                                  <input
                                    type="radio"
                                    name="detail-requisiti-unita"
                                    value="giorni"
                                    checked={detailRequisitiUnitaView === 'giorni'}
                                    onChange={() => setDetailRequisitiUnitaView('giorni')}
                                  />
                                  Giorni
                                </label>
                              </div>
                            </div>
                          </div>

                          {detailRequisitiOreRowsView.length === 0 && (
                            <p className="empty-state">
                              Nessun requisito disponibile con i filtri selezionati.
                            </p>
                          )}

                          {detailRequisitiOreRowsView.length > 0 && (
                          <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                            <table className="bonifici-table detail-requisiti-table">
                              <thead>
                                <tr>
                                  {renderDetailRequisitiSortableHeader('requisito', 'Requisito')}
                                  {renderDetailRequisitiSortableHeader('durataRequisito', renderHeaderWithTooltip('Durata requisito', 'Valutazione per il cliente del requisito'), true)}
                                  {renderDetailRequisitiSortableHeader('venduto', renderHeaderWithTooltip('Venduto', 'Valutazione accettata dal cliente'), true)}
                                  {renderDetailRequisitiSortableHeader('orePreviste', renderHeaderWithTooltip('Ore Previste', 'Ore assegnate alle risorse per eseguire il task'), true)}
                                  {renderDetailRequisitiSortableHeader('oreSpese', renderHeaderWithTooltip('Ore Spese', 'Ore registrate sulla intranet'), true)}
                                  {renderDetailRequisitiSortableHeader('oreRestanti', renderHeaderWithTooltip('Ore Restanti', 'Ore ancora da spendere per completare il task'), true)}
                                  {renderDetailRequisitiSortableHeader('delta', renderHeaderWithTooltip('Delta', 'Differenza fra venduto ed ore spese'), true)}
                                  {renderDetailRequisitiSortableHeader('percentualeAvanzamento', '% Avanz.', true)}
                                  <th>Dettaglio</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailRequisitiOreRowsSorted.map((row) => {
                                  const rowVenduto = getRequisitoVenduto(row)
                                  const rowOreRestantiVisual = getRequisitoOreRestantiVisual(row)
                                  const rowPercentualeVisual = getRequisitoPercentualeVisual(row)
                                  const rowDelta = getRequisitoDelta(row)
                                  const rowClassName = getRequisitoRowClass(row)
                                  const isExpanded = selectedRequisitoId === row.idRequisito
                                  const risorseRows = isExpanded
                                    ? detailRequisitiOreRisorseRows.filter((item) => item.idRequisito === row.idRequisito)
                                    : []
                                  const risorseTotals = risorseRows.reduce((acc, item) => {
                                    const isAttivo = isRequisitoAttivo(item)
                                    const oreRiferimento = getRequisitoOreRiferimento(item)
                                    const oreSpese = Number(item?.oreSpese) || 0
                                    const oreRestanti = getRequisitoOreRestantiVisual(item)
                                    return {
                                      orePreviste: acc.orePreviste + item.orePreviste,
                                      oreSpese: acc.oreSpese + oreSpese,
                                      oreRestanti: acc.oreRestanti + oreRestanti,
                                      oreRiferimento: acc.oreRiferimento + (isAttivo ? oreRiferimento : Math.max(oreSpese, 0)),
                                    }
                                  }, {
                                    orePreviste: 0,
                                    oreSpese: 0,
                                    oreRestanti: 0,
                                    oreRiferimento: 0,
                                  })
                                  const risorseDelta = rowVenduto - risorseTotals.oreSpese

                                  return (
                                    <Fragment key={`requisito-${row.idRequisito}`}>
                                      <tr className={rowClassName}>
                                        <td>{row.requisito || `Requisito ${row.idRequisito}`}</td>
                                        <td className="num">{formatRequisitiDisplayValue(row.durataRequisito)}</td>
                                        <td className="num">{formatRequisitiDisplayValue(rowVenduto)}</td>
                                        <td className="num">{formatRequisitiDisplayValue(row.orePreviste)}</td>
                                        <td className="num">{formatRequisitiDisplayValue(row.oreSpese)}</td>
                                        <td className={`num ${rowOreRestantiVisual < 0 ? 'num-negative' : ''}`}>
                                          {formatRequisitiDisplayValue(rowOreRestantiVisual)}
                                        </td>
                                        <td className={`num ${rowDelta < 0 ? 'num-negative' : ''}`}>{formatRequisitiDisplayValue(rowDelta)}</td>
                                        <td className="num">{formatPercentRatio(rowPercentualeVisual)}</td>
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
                                          <td colSpan={9}>
                                            {risorseRows.length === 0 && (
                                              <p className="empty-state">Nessun dettaglio risorsa disponibile per il requisito selezionato.</p>
                                            )}
                                            {risorseRows.length > 0 && (
                                              <div className="detail-requisiti-dettaglio">
                                                <table className="bonifici-table detail-requisiti-table detail-requisiti-table-inline">
                                                  <thead>
                                                    <tr>
                                                      <th>Risorsa</th>
                                                      <th className="num">{renderHeaderWithTooltip('Durata requisito', 'Valutazione per il cliente del requisito')}</th>
                                                      <th className="num">{renderHeaderWithTooltip('Venduto', 'Valutazione accettata dal cliente')}</th>
                                                      <th className="num">{renderHeaderWithTooltip('Ore Previste', 'Ore assegnate alle risorse per eseguire il task')}</th>
                                                      <th className="num">{renderHeaderWithTooltip('Ore Spese', 'Ore registrate sulla intranet')}</th>
                                                      <th className="num">{renderHeaderWithTooltip('Ore Restanti', 'Ore ancora da spendere per completare il task')}</th>
                                                      <th className="num">{renderHeaderWithTooltip('Delta', 'Differenza fra venduto ed ore spese')}</th>
                                                      <th className="num">% Avanz.</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {risorseRows.map((item) => {
                                                      const itemVenduto = getRequisitoVenduto(item)
                                                      const itemOreRestantiVisual = getRequisitoOreRestantiVisual(item)
                                                      const itemPercentualeVisual = getRequisitoPercentualeVisual(item)
                                                      const itemDelta = getRequisitoDelta(item)
                                                      const itemRowClassName = getRequisitoRowClass(item)
                                                      return (
                                                        <tr key={`requisito-risorsa-${item.idRequisito}-${item.idRisorsa}`} className={itemRowClassName}>
                                                          <td>{item.nomeRisorsa || `ID ${item.idRisorsa}`}</td>
                                                          <td className="num">{formatRequisitiDisplayValue(item.durataRequisito)}</td>
                                                          <td className="num">{formatRequisitiDisplayValue(itemVenduto)}</td>
                                                          <td className="num">{formatRequisitiDisplayValue(item.orePreviste)}</td>
                                                          <td className="num">{formatRequisitiDisplayValue(item.oreSpese)}</td>
                                                          <td className={`num ${itemOreRestantiVisual < 0 ? 'num-negative' : ''}`}>
                                                            {formatRequisitiDisplayValue(itemOreRestantiVisual)}
                                                          </td>
                                                          <td className={`num ${itemDelta < 0 ? 'num-negative' : ''}`}>{formatRequisitiDisplayValue(itemDelta)}</td>
                                                          <td className="num">{formatPercentRatio(itemPercentualeVisual)}</td>
                                                        </tr>
                                                      )
                                                    })}
                                                  </tbody>
                                                  <tfoot>
                                                    <tr className="table-totals-row">
                                                      <td className="table-totals-label">Totale requisito</td>
                                                      <td className="num">{formatRequisitiDisplayValue(row.durataRequisito)}</td>
                                                      <td className="num">{formatRequisitiDisplayValue(rowVenduto)}</td>
                                                      <td className="num">{formatRequisitiDisplayValue(risorseTotals.orePreviste)}</td>
                                                      <td className="num">{formatRequisitiDisplayValue(risorseTotals.oreSpese)}</td>
                                                      <td className={`num ${risorseTotals.oreRestanti < 0 ? 'num-negative' : ''}`}>
                                                        {formatRequisitiDisplayValue(risorseTotals.oreRestanti)}
                                                      </td>
                                                      <td className={`num ${risorseDelta < 0 ? 'num-negative' : ''}`}>
                                                        {formatRequisitiDisplayValue(risorseDelta)}
                                                      </td>
                                                      <td className="num">
                                                        {formatPercentRatio(
                                                          risorseTotals.oreRiferimento > 0
                                                            ? risorseTotals.oreSpese / risorseTotals.oreRiferimento
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
                                  <td className="num">{formatRequisitiDisplayValue(detailRequisitiOreTotalsCurrent.durataRequisito)}</td>
                                  <td className="num">{formatRequisitiDisplayValue(detailRequisitiOreTotalsCurrent.venduto)}</td>
                                  <td className="num">{formatRequisitiDisplayValue(detailRequisitiOreTotalsCurrent.orePreviste)}</td>
                                  <td className="num">{formatRequisitiDisplayValue(detailRequisitiOreTotalsCurrent.oreSpese)}</td>
                                  <td className={`num ${detailRequisitiOreTotalsCurrent.oreRestanti < 0 ? 'num-negative' : ''}`}>
                                    {formatRequisitiDisplayValue(detailRequisitiOreTotalsCurrent.oreRestanti)}
                                  </td>
                                  <td className={`num ${detailRequisitiOreTotalsCurrent.delta < 0 ? 'num-negative' : ''}`}>
                                    {formatRequisitiDisplayValue(detailRequisitiOreTotalsCurrent.delta)}
                                  </td>
                                  <td className="num">
                                    {formatPercentRatio(
                                      detailRequisitiOreTotalsCurrent.oreRiferimento > 0
                                        ? detailRequisitiOreTotalsCurrent.oreSpese / detailRequisitiOreTotalsCurrent.oreRiferimento
                                        : 0,
                                    )}
                                  </td>
                                  <td />
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          )}
                        </div>

                        <div className="detail-requisiti-col">
                          <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                            <div className="detail-requisiti-year-filter-row">
                              <label className="detail-requisiti-year-filter-field">
                                <span>Anno</span>
                                <select
                                  value={detailOreSpeseAnnoFilter}
                                  onChange={(event) => setDetailOreSpeseAnnoFilter(event.target.value)}
                                  disabled={detailOreSpeseAnnoOptions.length === 0}
                                >
                                  <option value="">Tutti gli anni</option>
                                  {detailOreSpeseAnnoOptions.map((year) => (
                                    <option key={`ore-spese-year-${year}`} value={year.toString()}>
                                      {year}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <table className="bonifici-table detail-requisiti-table">
                              <thead>
                                <tr>
                                  <th>Risorsa</th>
                                  <th className="num">Ore spese totali</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailOreSpeseRisorseRowsView.length === 0 && (
                                  <tr>
                                    <td colSpan={2} className="empty-state">Nessun dato ore spese per risorsa.</td>
                                  </tr>
                                )}
                                {detailOreSpeseRisorseRowsView.map((row) => (
                                  <tr key={`ore-spese-risorsa-${row.idRisorsa}-${row.nomeRisorsa}`}>
                                    <td>{row.nomeRisorsa || `ID ${row.idRisorsa}`}</td>
                                    <td className={`num ${row.oreSpeseTotali < 0 ? 'num-negative' : ''}`}>{formatRequisitiDisplayValue(row.oreSpeseTotali)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="table-totals-row">
                                  <td className="table-totals-label">Totale</td>
                                  <td className={`num ${detailOreSpeseRisorseTotalView < 0 ? 'num-negative' : ''}`}>{formatRequisitiDisplayValue(detailOreSpeseRisorseTotalView)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <section className={`panel detail-card detail-card-configura ${detailActiveTab !== 'configura' ? 'detail-card-hidden' : ''}`}>
                <header className="panel-header">
                  <h3>Configura commessa</h3>
                </header>
                <div className="detail-card-body">
                  {detailConfiguraStatusMessage && (
                    <p className={`detail-configura-status ${detailConfiguraStatusMessage.toLowerCase().includes('errore') ? 'error' : ''}`}>
                      {detailConfiguraStatusMessage}
                    </p>
                  )}

                  {!detailConfiguraData && !detailConfiguraLoading && (
                    <p className="empty-state">Nessuna configurazione commessa disponibile.</p>
                  )}

                  {detailConfiguraData && (
                    <div className="detail-configura-grid">
                      <fieldset className="detail-configura-fieldset">
                        <legend>Dati generali</legend>
                        <label className="detail-configura-field">
                          <span>Tipologia commessa</span>
                          <select
                            value={configuraForm.idTipoCommessa}
                            onChange={(event) => setConfiguraForm((current) => ({ ...current, idTipoCommessa: event.target.value }))}
                            disabled={!canEditTipologiaCommessa || detailConfiguraSaving}
                          >
                            <option value="">Seleziona tipologia</option>
                            {detailConfiguraData.tipiCommessa.map((item: any) => (
                              <option key={`config-tipologia-${item.id}`} value={item.id.toString()}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="detail-configura-field">
                          <span>Prodotto</span>
                          <select
                            value={configuraForm.idProdotto}
                            onChange={(event) => setConfiguraForm((current) => ({ ...current, idProdotto: event.target.value }))}
                            disabled={!canEditProdotto || detailConfiguraSaving}
                          >
                            <option value="">Nessun prodotto</option>
                            {detailConfiguraData.prodotti.map((item: any) => (
                              <option key={`config-prodotto-${item.id}`} value={item.id.toString()}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </fieldset>

                      <fieldset className="detail-configura-fieldset">
                        <legend>Commessa a investimento</legend>
                        <label className="detail-configura-field">
                          <span>Budget importo investimento</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={configuraForm.budgetImportoInvestimento}
                            onChange={(event) => setConfiguraForm((current) => ({ ...current, budgetImportoInvestimento: event.target.value }))}
                            disabled={!canEditBudgetImportoInvestimento || detailConfiguraSaving}
                          />
                        </label>
                        <label className="detail-configura-field">
                          <span>Budget ore investimento</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={configuraForm.budgetOreInvestimento}
                            onChange={(event) => setConfiguraForm((current) => ({ ...current, budgetOreInvestimento: event.target.value }))}
                            disabled={!canEditBudgetOreInvestimento || detailConfiguraSaving}
                          />
                        </label>
                      </fieldset>

                      <fieldset className="detail-configura-fieldset">
                        <legend>Dati commerciali</legend>
                        <label className="detail-configura-field">
                          <span>Prezzo di vendita iniziale (RCC)</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={configuraForm.prezzoVenditaInizialeRcc}
                            onChange={(event) => setConfiguraForm((current) => ({ ...current, prezzoVenditaInizialeRcc: event.target.value }))}
                            disabled={!canEditPrezzoVenditaInizialeRcc || detailConfiguraSaving}
                          />
                        </label>
                        <label className="detail-configura-field">
                          <span>Prezzo di vendita finale (RCC)</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={configuraForm.prezzoVenditaFinaleRcc}
                            onChange={(event) => setConfiguraForm((current) => ({ ...current, prezzoVenditaFinaleRcc: event.target.value }))}
                            disabled={!canEditPrezzoVenditaFinaleRcc || detailConfiguraSaving}
                          />
                        </label>
                      </fieldset>

                      <fieldset className="detail-configura-fieldset">
                        <legend>Pianificazione</legend>
                        <label className="detail-configura-field">
                          <span>Stima iniziale ore PM</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={configuraForm.stimaInizialeOrePm}
                            onChange={(event) => setConfiguraForm((current) => ({ ...current, stimaInizialeOrePm: event.target.value }))}
                            disabled={!canEditStimaInizialeOrePm || detailConfiguraSaving}
                          />
                        </label>
                      </fieldset>
                    </div>
                  )}

                  {detailConfiguraData && canSaveConfigura && (
                    <div className="detail-configura-actions">
                      <button
                        type="button"
                        onClick={handleConfiguraSave}
                        disabled={detailConfiguraSaving || detailConfiguraLoading}
                      >
                        {detailConfiguraSaving ? 'Salvataggio...' : 'Salva configurazione'}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className={`panel detail-card detail-card-segnalazioni ${detailActiveTab !== 'segnalazioni' ? 'detail-card-hidden' : ''}`}>
                <header className="panel-header detail-segnalazioni-header">
                  <h3>Segnalazioni commessa</h3>
                  <div className="detail-segnalazioni-toolbar">
                    <label className="detail-segnalazioni-checkbox">
                      <input
                        type="checkbox"
                        checked={detailSegnalazioniIncludeChiuse}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setDetailSegnalazioniIncludeChiuse(checked)
                          loadDetailSegnalazioni({
                            commessa: detailCommessa,
                            includeChiuse: checked,
                          })
                        }}
                        disabled={detailSegnalazioniLoading || detailSegnalazioniSaving}
                      />
                      <span>Includi chiuse</span>
                    </label>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => loadDetailSegnalazioni({
                        commessa: detailCommessa,
                        includeChiuse: detailSegnalazioniIncludeChiuse,
                      })}
                      disabled={detailSegnalazioniLoading || detailSegnalazioniSaving || !detailCommessa}
                    >
                      {detailSegnalazioniLoading ? 'Caricamento...' : 'Aggiorna'}
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={resetNuovaSegnalazioneForm}
                      disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly}
                    >
                      Nuova segnalazione
                    </button>
                  </div>
                </header>
                <div className="detail-card-body">

                  {detailSegnalazioniStatusMessage && (
                    <p className={`detail-configura-status ${detailSegnalazioniStatusMessage.toLowerCase().includes('errore') ? 'error' : ''}`}>
                      {detailSegnalazioniStatusMessage}
                    </p>
                  )}

                  <div className="bonifici-table-wrap bonifici-table-wrap-main detail-card-table-wrap">
                    {!detailSegnalazioniLoading && !detailSegnalazioniData?.segnalazioni?.length && (
                      <p className="empty-state">Nessuna segnalazione disponibile.</p>
                    )}
                    {(detailSegnalazioniData?.segnalazioni?.length ?? 0) > 0 && (
                      <table className="bonifici-table detail-segnalazioni-table">
                        <colgroup>
                          <col style={{ width: '10%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '36%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '7%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '16%' }} />
                        </colgroup>
                        <thead>
                          <tr>
                            <th>Tipo</th>
                            <th>Titolo</th>
                            <th>Testo</th>
                            <th>Priorita</th>
                            <th>Stato</th>
                            <th>Impatta</th>
                            <th>Autore</th>
                            <th>Data modifica</th>
                            <th>Assegnata a</th>
                            <th>Azione</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailSegnalazioniData!.segnalazioni.map((row: any) => {
                            const threadRows = (detailSegnalazioniData?.thread ?? []).filter(
                              (threadRow: any) => threadRow.idSegnalazione === row.id,
                            )
                            const canCloseByCurrentUser = (
                              Number(row.idRisorsaInserimento ?? 0) === Number(detailCurrentUserId ?? 0)
                              || threadRows.some((threadRow: any) => Number(threadRow.idRisorsaInserimento ?? 0) === Number(detailCurrentUserId ?? 0))
                            )
                            return (
                              <Fragment key={`segnalazione-${row.id}`}>
                                <tr
                                  className={selectedSegnalazioneId === row.id ? 'detail-segnalazione-selected' : ''}
                                  onClick={() => {
                                    setSelectedSegnalazioneId(row.id)
                                    setSegnalazioneEditorMode('hidden')
                                    setSelectedMessaggioId(null)
                                    setReplyParentMessageId(null)
                                    setMessaggioForm('')
                                  }}
                                >
                                  <td>{row.tipoDescrizione}</td>
                                  <td>{row.titolo}</td>
                                  <td className="detail-segnalazioni-text-cell" title={row.testo || ''}>{formatSegnalazioneTesto(row.testo)}</td>
                                  <td>{getSegnalazionePrioritaLabel(row.priorita)}</td>
                                  <td>{getSegnalazioneStatoLabel(row.stato)}</td>
                                  <td>{getSegnalazioneImpattaClienteLabel(row.impattaCliente)}</td>
                                  <td>
                                    <div className="detail-segnalazioni-author-cell">{row.nomeRisorsaInserimento || '-'}</div>
                                  </td>
                                  <td>{getSegnalazioneDataModifica(row)}</td>
                                  <td>{row.nomeRisorsaDestinataria || 'Non assegnata'}</td>
                                  <td className="detail-segnalazioni-row-actions">
                                    <button
                                      type="button"
                                      className="ghost-button detail-inline-action"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setSelectedSegnalazioneId(row.id)
                                        setSegnalazioneEditorMode('edit')
                                        setSelectedMessaggioId(null)
                                        setReplyParentMessageId(null)
                                        setMessaggioForm('')
                                      }}
                                      disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || Number(row.idRisorsaInserimento ?? 0) !== Number(detailCurrentUserId ?? 0)}
                                    >
                                      Modifica
                                    </button>
                                    <button
                                      type="button"
                                      className="ghost-button detail-inline-action"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setSelectedSegnalazioneId(row.id)
                                        setSelectedMessaggioId(null)
                                        setReplyParentMessageId(0)
                                        setMessaggioForm('')
                                      }}
                                      disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || Number(row.stato ?? 0) === 4}
                                    >
                                      Rispondi
                                    </button>
                                    <button
                                      type="button"
                                      className="ghost-button detail-inline-action"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setSelectedSegnalazioneId(row.id)
                                        void chiudiDetailSegnalazione({
                                          idSegnalazione: row.id,
                                          stato: 4,
                                        })
                                      }}
                                      disabled={
                                        detailSegnalazioniSaving
                                        || detailSegnalazioniReadOnly
                                        || Number(row.stato ?? 0) === 4
                                        || !canCloseByCurrentUser
                                      }
                                    >
                                      Chiudi
                                    </button>
                                    <button
                                      type="button"
                                      className="ghost-button detail-inline-action"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        void eliminaDetailSegnalazione({ idSegnalazione: row.id })
                                      }}
                                      disabled={
                                        detailSegnalazioniSaving
                                        || detailSegnalazioniReadOnly
                                        || Number(row.idRisorsaInserimento ?? 0) !== Number(detailCurrentUserId ?? 0)
                                        || Number(row.stato ?? 0) === 4
                                        || threadRows.length > 0
                                      }
                                    >
                                      Elimina
                                    </button>
                                  </td>
                                </tr>
                                {threadRows.map((threadRow: any) => {
                                  const canEditMessage = Number(threadRow.idRisorsaInserimento ?? 0) === Number(detailCurrentUserId ?? 0)
                                  const hasChildMessages = threadRows.some(
                                    (candidate: any) => Number(candidate.idMessaggioPadre ?? 0) === Number(threadRow.id ?? 0),
                                  )
                                  const rowChiusa = Number(row.stato ?? 0) === 4
                                  return (
                                    <tr key={`segnalazione-msg-${threadRow.id}`} className="detail-segnalazione-thread-row">
                                      <td />
                                      <td />
                                      <td className="detail-segnalazioni-text-cell">
                                        <div
                                          className="detail-segnalazioni-thread-text"
                                          style={{ paddingLeft: `${Math.max(0, Number(threadRow.livello ?? 0)) * 18}px` }}
                                        >
                                          <div>{threadRow.testo || '-'}</div>
                                        </div>
                                      </td>
                                      <td>-</td>
                                      <td>-</td>
                                      <td>-</td>
                                      <td>
                                        <div className="detail-segnalazioni-author-cell">{threadRow.nomeRisorsaInserimento || '-'}</div>
                                      </td>
                                      <td>{formatDate(threadRow.dataUltimaModifica || threadRow.dataInserimento)}</td>
                                      <td>-</td>
                                      <td className="detail-segnalazioni-row-actions">
                                        <button
                                          type="button"
                                          className="ghost-button detail-inline-action"
                                          disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || rowChiusa}
                                          onClick={() => {
                                            setSelectedSegnalazioneId(row.id)
                                            setSelectedMessaggioId(null)
                                            setReplyParentMessageId(threadRow.id)
                                            setMessaggioForm('')
                                          }}
                                        >
                                          Rispondi
                                        </button>
                                        {canEditMessage && (
                                          <button
                                            type="button"
                                            className="ghost-button detail-inline-action"
                                            disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || rowChiusa}
                                            onClick={() => {
                                              setSelectedSegnalazioneId(row.id)
                                              setSelectedMessaggioId(threadRow.id)
                                              setReplyParentMessageId(null)
                                              setMessaggioForm(threadRow.testo ?? '')
                                            }}
                                          >
                                            Modifica
                                          </button>
                                        )}
                                        {canEditMessage && (
                                          <button
                                            type="button"
                                            className="ghost-button detail-inline-action"
                                            disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || rowChiusa || hasChildMessages}
                                            onClick={() => {
                                              setSelectedSegnalazioneId(row.id)
                                              void eliminaDetailSegnalazioneMessaggio(row.id, {
                                                idMessaggio: threadRow.id,
                                              })
                                            }}
                                          >
                                            Elimina
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {showSegnalazioneEditor && (
                    <fieldset className="detail-configura-fieldset detail-segnalazioni-editor">
                      <legend>{isEditingSegnalazione ? `Modifica segnalazione #${selectedSegnalazione?.id ?? ''}` : 'Nuova segnalazione'}</legend>
                      <label className="detail-configura-field">
                        <span>Tipo segnalazione</span>
                        <select
                          value={segnalazioneForm.idTipoSegnalazione > 0 ? segnalazioneForm.idTipoSegnalazione.toString() : ''}
                          onChange={(event) => setSegnalazioneForm((current) => ({ ...current, idTipoSegnalazione: Number(event.target.value) }))}
                          disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || (isEditingSegnalazione && !canEditSelectedSegnalazione)}
                        >
                          <option value="">Seleziona tipo</option>
                          {(detailSegnalazioniData?.tipiSegnalazione ?? []).map((item: any) => (
                            <option key={`tipo-segnalazione-${item.id}`} value={item.id.toString()}>
                              {item.codice} - {item.descrizione}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="detail-configura-field">
                        <span>Titolo</span>
                        <input
                          type="text"
                          value={segnalazioneForm.titolo}
                          onChange={(event) => setSegnalazioneForm((current) => ({ ...current, titolo: event.target.value }))}
                          disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || (isEditingSegnalazione && (selectedSegnalazioneChiusa || !canEditSelectedSegnalazione))}
                        />
                      </label>
                      <label className="detail-configura-field">
                        <span>Testo</span>
                        <textarea
                          rows={4}
                          value={segnalazioneForm.testo}
                          onChange={(event) => setSegnalazioneForm((current) => ({ ...current, testo: event.target.value }))}
                          disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || (isEditingSegnalazione && (selectedSegnalazioneChiusa || !canEditSelectedSegnalazione))}
                        />
                      </label>
                      <div className="detail-segnalazioni-inline-fields">
                        <label className="detail-configura-field">
                          <span>Priorita</span>
                          <select
                            value={segnalazioneForm.priorita.toString()}
                            onChange={(event) => setSegnalazioneForm((current) => ({ ...current, priorita: Number(event.target.value) }))}
                            disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || (isEditingSegnalazione && (selectedSegnalazioneChiusa || !canEditSelectedSegnalazione))}
                          >
                            <option value="1">Alta</option>
                            <option value="2">Media</option>
                            <option value="3">Bassa</option>
                          </select>
                        </label>
                        <label className="detail-configura-field">
                          <span>Stato</span>
                          <select
                            value={segnalazioneForm.stato.toString()}
                            onChange={(event) => setSegnalazioneForm((current) => ({ ...current, stato: Number(event.target.value) }))}
                            disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || (isEditingSegnalazione && !canEditSelectedSegnalazione)}
                          >
                            <option value="1">Aperta</option>
                            <option value="2">In lavorazione</option>
                            <option value="3">In attesa</option>
                            <option value="4">Chiusa</option>
                          </select>
                        </label>
                        <label className="detail-configura-field">
                          <span>Data evento</span>
                          <input
                            type="date"
                            value={segnalazioneForm.dataEvento}
                            onChange={(event) => setSegnalazioneForm((current) => ({ ...current, dataEvento: event.target.value }))}
                            disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || (isEditingSegnalazione && (selectedSegnalazioneChiusa || !canEditSelectedSegnalazione))}
                          />
                        </label>
                        <label className="detail-configura-field">
                          <span>Figura destinataria</span>
                          <select
                            value={segnalazioneForm.idRisorsaDestinataria}
                            onChange={(event) => setSegnalazioneForm((current) => ({ ...current, idRisorsaDestinataria: event.target.value }))}
                            disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || (isEditingSegnalazione && (selectedSegnalazioneChiusa || !canEditSelectedSegnalazione))}
                          >
                            <option value="">Nessuna</option>
                            {segnalazioniDestinatariOptions.map((item: any) => (
                              <option key={`destinatario-${item.roleCode}-${item.idRisorsa}`} value={String(item.idRisorsa)}>
                                {item.roleLabel || item.roleCode}: {item.nomeRisorsa || `Risorsa ${item.idRisorsa}`}
                                {item.email ? ` (${item.email})` : ''}
                              </option>
                            ))}
                            {segnalazioneForm.idRisorsaDestinataria && !destinatarioSelezionatoDisponibile && (
                              <option value={segnalazioneForm.idRisorsaDestinataria}>
                                Destinatario corrente (ID {segnalazioneForm.idRisorsaDestinataria})
                              </option>
                            )}
                          </select>
                        </label>
                      </div>
                      <label className="detail-segnalazioni-checkbox">
                        <input
                          type="checkbox"
                          checked={segnalazioneForm.impattaCliente}
                          onChange={(event) => setSegnalazioneForm((current) => ({ ...current, impattaCliente: event.target.checked }))}
                          disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || (isEditingSegnalazione && (selectedSegnalazioneChiusa || !canEditSelectedSegnalazione))}
                        />
                        <span>Impatta cliente</span>
                      </label>
                      <div className="detail-configura-actions">
                        <button
                          type="button"
                          onClick={isEditingSegnalazione ? handleModificaSegnalazione : handleApriSegnalazione}
                          disabled={
                            detailSegnalazioniSaving
                            || detailSegnalazioniReadOnly
                            || !segnalazioneForm.titolo.trim()
                            || segnalazioneForm.idTipoSegnalazione <= 0
                            || (isEditingSegnalazione && (!selectedSegnalazione || !canEditSelectedSegnalazione))
                          }
                        >
                          {detailSegnalazioniSaving ? 'Salvataggio...' : 'Salva'}
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setSegnalazioneEditorMode('hidden')}
                          disabled={detailSegnalazioniSaving}
                        >
                          Annulla
                        </button>
                      </div>
                    </fieldset>
                  )}

                  {selectedSegnalazioneId && (selectedMessaggioId !== null || replyParentMessageId !== null) && (
                    <section className="detail-segnalazioni-thread">
                      <div className="detail-segnalazioni-reply">
                        {replyParentMessageId !== null && replyParentMessageId > 0 && !selectedMessaggioId && (
                          <p className="detail-segnalazioni-reply-target">
                            Risposta al messaggio #{replyParentMessageId}
                          </p>
                        )}
                        {replyParentMessageId === 0 && !selectedMessaggioId && (
                          <p className="detail-segnalazioni-reply-target">
                            Risposta generale alla segnalazione
                          </p>
                        )}
                        <label className="detail-configura-field">
                          <span>{selectedMessaggioId ? `Modifica messaggio #${selectedMessaggioId}` : 'Messaggio'}</span>
                          <textarea
                            rows={4}
                            value={messaggioForm}
                            onChange={(event) => setMessaggioForm(event.target.value)}
                            disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || selectedSegnalazioneChiusa}
                          />
                        </label>
                        <div className="detail-configura-actions">
                          <button
                            type="button"
                            onClick={selectedMessaggioId ? handleModificaMessaggio : handleInviaMessaggio}
                            disabled={detailSegnalazioniSaving || detailSegnalazioniReadOnly || !messaggioForm.trim() || selectedSegnalazioneChiusa || (Boolean(selectedMessaggioId) && !canEditSelectedMessaggio)}
                          >
                            {detailSegnalazioniSaving ? 'Salvataggio...' : 'Salva'}
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => {
                              setSelectedMessaggioId(null)
                              setReplyParentMessageId(null)
                              setMessaggioForm('')
                            }}
                            disabled={detailSegnalazioniSaving}
                          >
                            Annulla
                          </button>
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              </section>
            </section>
            </section>
          </section>
  )
}

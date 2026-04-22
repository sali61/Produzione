// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import type {
  CommessaDettaglioConfiguraResponse,
  CommesseDettaglioResponse,
  CommesseDettaglioSegnalazioniResponse,
  CommesseDettaglioSintesiMailPreviewResponse,
  DetailTabKey,
  SortDirection,
} from '../../../types/appTypes'

export function useCommessaDettaglioState() {
  const [detailCommessa, setDetailCommessa] = useState('')
  const [detailData, setDetailData] = useState<CommesseDettaglioResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailStatusMessage, setDetailStatusMessage] = useState('')
  const [detailRouteProcessed, setDetailRouteProcessed] = useState(false)
  const [detailSintesiMailModalOpen, setDetailSintesiMailModalOpen] = useState(false)
  const [detailSintesiMailPreview, setDetailSintesiMailPreview] = useState<CommesseDettaglioSintesiMailPreviewResponse | null>(null)
  const [detailSintesiMailPreviewLoading, setDetailSintesiMailPreviewLoading] = useState(false)
  const [detailSintesiMailSending, setDetailSintesiMailSending] = useState(false)
  const [detailSintesiMailStatusMessage, setDetailSintesiMailStatusMessage] = useState('')
  const [detailSintesiMailErrorMessage, setDetailSintesiMailErrorMessage] = useState('')
  const [detailPercentRaggiuntoInput, setDetailPercentRaggiuntoInput] = useState('')
  const [detailRicavoPrevistoInput, setDetailRicavoPrevistoInput] = useState('')
  const [detailOreRestantiInput, setDetailOreRestantiInput] = useState('')
  const [detailConsuntivoIncludeAnniPrecedenti, setDetailConsuntivoIncludeAnniPrecedenti] = useState(true)
  const [detailVenditeDateSortDirection, setDetailVenditeDateSortDirection] = useState<SortDirection>('asc')
  const [detailAcquistiDateSortDirection, setDetailAcquistiDateSortDirection] = useState<SortDirection>('asc')
  const [detailActiveTab, setDetailActiveTab] = useState<DetailTabKey>('storico')
  const [detailConfiguraData, setDetailConfiguraData] = useState<CommessaDettaglioConfiguraResponse | null>(null)
  const [detailConfiguraLoading, setDetailConfiguraLoading] = useState(false)
  const [detailConfiguraSaving, setDetailConfiguraSaving] = useState(false)
  const [detailConfiguraStatusMessage, setDetailConfiguraStatusMessage] = useState('')
  const [detailSegnalazioniData, setDetailSegnalazioniData] = useState<CommesseDettaglioSegnalazioniResponse | null>(null)
  const [detailSegnalazioniLoading, setDetailSegnalazioniLoading] = useState(false)
  const [detailSegnalazioniSaving, setDetailSegnalazioniSaving] = useState(false)
  const [detailSegnalazioniStatusMessage, setDetailSegnalazioniStatusMessage] = useState('')
  const [detailSegnalazioniIncludeChiuse, setDetailSegnalazioniIncludeChiuse] = useState(true)
  const [selectedRequisitoId, setSelectedRequisitoId] = useState<number | null>(null)

  return {
    detailCommessa,
    setDetailCommessa,
    detailData,
    setDetailData,
    detailLoading,
    setDetailLoading,
    detailSaving,
    setDetailSaving,
    detailStatusMessage,
    setDetailStatusMessage,
    detailRouteProcessed,
    setDetailRouteProcessed,
    detailSintesiMailModalOpen,
    setDetailSintesiMailModalOpen,
    detailSintesiMailPreview,
    setDetailSintesiMailPreview,
    detailSintesiMailPreviewLoading,
    setDetailSintesiMailPreviewLoading,
    detailSintesiMailSending,
    setDetailSintesiMailSending,
    detailSintesiMailStatusMessage,
    setDetailSintesiMailStatusMessage,
    detailSintesiMailErrorMessage,
    setDetailSintesiMailErrorMessage,
    detailPercentRaggiuntoInput,
    setDetailPercentRaggiuntoInput,
    detailRicavoPrevistoInput,
    setDetailRicavoPrevistoInput,
    detailOreRestantiInput,
    setDetailOreRestantiInput,
    detailConsuntivoIncludeAnniPrecedenti,
    setDetailConsuntivoIncludeAnniPrecedenti,
    detailVenditeDateSortDirection,
    setDetailVenditeDateSortDirection,
    detailAcquistiDateSortDirection,
    setDetailAcquistiDateSortDirection,
    detailActiveTab,
    setDetailActiveTab,
    detailConfiguraData,
    setDetailConfiguraData,
    detailConfiguraLoading,
    setDetailConfiguraLoading,
    detailConfiguraSaving,
    setDetailConfiguraSaving,
    detailConfiguraStatusMessage,
    setDetailConfiguraStatusMessage,
    detailSegnalazioniData,
    setDetailSegnalazioniData,
    detailSegnalazioniLoading,
    setDetailSegnalazioniLoading,
    detailSegnalazioniSaving,
    setDetailSegnalazioniSaving,
    detailSegnalazioniStatusMessage,
    setDetailSegnalazioniStatusMessage,
    detailSegnalazioniIncludeChiuse,
    setDetailSegnalazioniIncludeChiuse,
    selectedRequisitoId,
    setSelectedRequisitoId,
  }
}

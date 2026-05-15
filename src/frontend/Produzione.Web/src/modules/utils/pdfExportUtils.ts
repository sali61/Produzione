import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export type PdfTableColumn = {
  key: string
  header: string
}

export type PdfTableExportOptions = {
  title: string
  filename: string
  columns: PdfTableColumn[]
  rows: Array<Record<string, unknown>>
  footerRows?: Array<Record<string, unknown>>
  subtitle?: string
}

const formatPdfCell = (value: unknown) => {
  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No'
  }

  return String(value)
}

export const buildTimestamp = () => {
  const now = new Date()
  return [
    now.getFullYear().toString(),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0'),
    '_',
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0'),
  ].join('')
}

export const exportTableToPdf = ({
  title,
  filename,
  columns,
  rows,
  footerRows = [],
  subtitle,
}: PdfTableExportOptions) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a3',
    compress: true,
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const generatedAt = new Date().toLocaleString('it-IT')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(title, 36, 34)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(`Generato: ${generatedAt}`, pageWidth - 36, 34, { align: 'right' })

  if (subtitle?.trim()) {
    doc.setFontSize(9)
    doc.text(subtitle.trim(), 36, 50)
  }

  const head = [columns.map((column) => column.header)]
  const body = rows.map((row) => columns.map((column) => formatPdfCell(row[column.key])))
  const foot = footerRows.map((row) => columns.map((column) => formatPdfCell(row[column.key])))

  autoTable(doc, {
    head,
    body,
    foot: foot.length > 0 ? foot : undefined,
    startY: subtitle?.trim() ? 62 : 50,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 5.2,
      cellPadding: 2.2,
      overflow: 'linebreak',
      lineColor: [210, 218, 230],
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: [31, 78, 121],
      textColor: 255,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [232, 238, 247],
      textColor: [20, 34, 56],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 253],
    },
    margin: { top: 36, right: 24, bottom: 28, left: 24 },
    didDrawPage: () => {
      const pageNumber = doc.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(90)
      doc.text(
        `Pagina ${pageNumber}`,
        pageWidth - 36,
        doc.internal.pageSize.getHeight() - 14,
        { align: 'right' },
      )
    },
  })

  doc.save(filename)
}

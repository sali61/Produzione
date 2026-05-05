type TableSortDirection = 'asc' | 'desc'
type SortValue =
  | { kind: 'blank'; value: '' }
  | { kind: 'date'; value: number }
  | { kind: 'number'; value: number }
  | { kind: 'text'; value: string }

const sortableTableSelector = 'table.bonifici-table'
const totalRowClassPattern = /(?:^|\s)(?:table-totals-row|[^ ]*(?:totale|total)[^ ]*)(?:\s|$)/i

const normalizeText = (value: string) => (
  value
    .replace(/\s+/g, ' ')
    .trim()
)

const resolveColumnIndex = (headerCell: HTMLTableCellElement) => {
  if (headerCell.colSpan !== 1) {
    return null
  }

  const row = headerCell.parentElement
  if (!row) {
    return null
  }

  let columnIndex = 0
  for (const cell of Array.from(row.children)) {
    if (!(cell instanceof HTMLTableCellElement)) {
      continue
    }
    if (cell === headerCell) {
      return columnIndex
    }
    columnIndex += cell.colSpan || 1
  }

  return null
}

const getCellAtColumn = (row: HTMLTableRowElement, columnIndex: number) => {
  let currentIndex = 0
  for (const cell of Array.from(row.cells)) {
    const span = cell.colSpan || 1
    if (columnIndex >= currentIndex && columnIndex < currentIndex + span) {
      return cell
    }
    currentIndex += span
  }

  return null
}

const parseItalianNumber = (value: string) => {
  const cleaned = value
    .replace(/[€%]/g, '')
    .replace(/\s/g, '')
    .trim()

  if (!cleaned || /[A-Za-zÀ-ÿ]/.test(cleaned)) {
    return null
  }

  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned

  if (!/^[-+]?\d+(?:\.\d+)?$/.test(normalized)) {
    return null
  }

  const number = Number.parseFloat(normalized)
  return Number.isFinite(number) ? number : null
}

const parseDateValue = (value: string) => {
  const normalized = value.trim()
  const italianDate = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (italianDate) {
    const [, day, month, year] = italianDate
    return Date.UTC(Number(year), Number(month) - 1, Number(day))
  }

  const isoDate = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoDate) {
    const [, year, month, day] = isoDate
    return Date.UTC(Number(year), Number(month) - 1, Number(day))
  }

  return null
}

const getSortValue = (cell: HTMLTableCellElement | null): SortValue => {
  const text = normalizeText(cell?.textContent ?? '')
  if (!text) {
    return { kind: 'blank', value: '' }
  }

  const dateValue = parseDateValue(text)
  if (dateValue !== null) {
    return { kind: 'date', value: dateValue }
  }

  const numberValue = parseItalianNumber(text)
  if (numberValue !== null) {
    return { kind: 'number', value: numberValue }
  }

  return { kind: 'text', value: text.toLocaleLowerCase('it') }
}

const compareSortValues = (left: SortValue, right: SortValue) => {
  if (left.kind === 'blank' && right.kind !== 'blank') {
    return 1
  }
  if (right.kind === 'blank' && left.kind !== 'blank') {
    return -1
  }
  if (left.kind !== right.kind) {
    return left.kind.localeCompare(right.kind)
  }
  if (left.kind === 'text' && right.kind === 'text') {
    return left.value.localeCompare(right.value, 'it', { numeric: true, sensitivity: 'base' })
  }
  if ((left.kind === 'number' && right.kind === 'number') || (left.kind === 'date' && right.kind === 'date')) {
    return left.value - right.value
  }

  return 0
}

const isLockedSummaryRow = (row: HTMLTableRowElement) => {
  if (totalRowClassPattern.test(row.className)) {
    return true
  }

  const firstCellText = normalizeText(row.cells[0]?.textContent ?? '')
  return /^totale\b/i.test(firstCellText)
}

const sortTableBody = (table: HTMLTableElement, headerCell: HTMLTableCellElement, columnIndex: number) => {
  const body = table.tBodies[0]
  if (!body || body.rows.length < 2) {
    return
  }

  const currentColumn = table.dataset.sortColumn
  const currentDirection = table.dataset.sortDirection as TableSortDirection | undefined
  const nextDirection: TableSortDirection = currentColumn === columnIndex.toString() && currentDirection === 'asc'
    ? 'desc'
    : 'asc'

  const sortableRows: HTMLTableRowElement[] = []
  const lockedRows: HTMLTableRowElement[] = []
  Array.from(body.rows).forEach((row) => {
    if (isLockedSummaryRow(row)) {
      lockedRows.push(row)
    } else {
      sortableRows.push(row)
    }
  })

  sortableRows
    .map((row, index) => ({
      row,
      index,
      value: getSortValue(getCellAtColumn(row, columnIndex)),
    }))
    .sort((left, right) => {
      const compared = compareSortValues(left.value, right.value)
      if (compared === 0) {
        return left.index - right.index
      }
      return nextDirection === 'asc' ? compared : -compared
    })
    .forEach(({ row }) => body.appendChild(row))

  lockedRows.forEach((row) => body.appendChild(row))

  table.dataset.sortColumn = columnIndex.toString()
  table.dataset.sortDirection = nextDirection
  table.querySelectorAll('th[data-table-sort-direction]').forEach((cell) => {
    cell.removeAttribute('data-table-sort-direction')
    cell.removeAttribute('aria-sort')
  })
  headerCell.dataset.tableSortDirection = nextDirection
  headerCell.setAttribute('aria-sort', nextDirection === 'asc' ? 'ascending' : 'descending')
}

export const installSortableTables = (root: Document = document) => {
  const handleClick = (event: MouseEvent) => {
    const target = event.target
    if (!(target instanceof Element)) {
      return
    }

    const headerCell = target.closest('th')
    if (!(headerCell instanceof HTMLTableCellElement)) {
      return
    }

    if (target.closest('button, a, input, select, textarea, [role="button"]')) {
      return
    }

    if (headerCell.querySelector('.sort-header-btn')) {
      return
    }

    const table = headerCell.closest(sortableTableSelector)
    if (!(table instanceof HTMLTableElement)) {
      return
    }

    const columnIndex = resolveColumnIndex(headerCell)
    if (columnIndex === null) {
      return
    }

    sortTableBody(table, headerCell, columnIndex)
  }

  root.addEventListener('click', handleClick)
  return () => root.removeEventListener('click', handleClick)
}

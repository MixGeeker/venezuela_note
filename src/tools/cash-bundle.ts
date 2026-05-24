export type CashCurrency = 'VES' | 'USD' | 'RMB'
export type BundleColumn = 'bundle500' | 'bundle100' | 'loose'
export type CashBundleAction = 'add' | 'subtract'
export type CashBundleMatrix = Record<number, Record<BundleColumn, number>>

export interface CashCurrencyDefinition {
  code: CashCurrency
  label: string
  name: string
  symbol: string
  denominations: readonly number[]
}

export interface BundleColumnDefinition {
  key: BundleColumn
  label: string
  noteCount: number
}

export interface CashBundleRowTotal {
  denomination: number
  counts: Record<BundleColumn, number>
  totalNotes: number
  amount: number
}

export interface CashBundleTotals {
  rows: CashBundleRowTotal[]
  totalAmount: number
  totalNotes: number
}

export interface CashBundleSnapshot {
  id: string
  currency: CashCurrency
  matrix: CashBundleMatrix
  remark: string
  totalAmount: number
  totalNotes: number
  createdAt: string
}

export interface CreateCashBundleSnapshotInput {
  id: string
  currency: CashCurrency
  matrix: Partial<CashBundleMatrix>
  remark: string
  createdAt: string
}

export const CASH_BUNDLE_HISTORY_KEY = 'note-system:tools:cash-bundle:history:v1'
export const CASH_BUNDLE_HISTORY_LIMIT = 50

export const BUNDLE_COLUMNS: readonly BundleColumnDefinition[] = [
  { key: 'bundle500', label: '500', noteCount: 500 },
  { key: 'bundle100', label: '100', noteCount: 100 },
  { key: 'loose', label: 'Loose', noteCount: 1 },
]

export const CASH_CURRENCIES: Record<CashCurrency, CashCurrencyDefinition> = {
  VES: {
    code: 'VES',
    label: 'VES',
    name: 'Bolivar',
    symbol: 'Bs',
    denominations: [10, 20, 50, 100, 200, 500],
  },
  USD: {
    code: 'USD',
    label: 'USD',
    name: 'US Dollar',
    symbol: '$',
    denominations: [1, 5, 10, 20, 50, 100],
  },
  RMB: {
    code: 'RMB',
    label: 'RMB',
    name: 'Renminbi',
    symbol: '¥',
    denominations: [1, 5, 10, 20, 50, 100],
  },
}

export function createEmptyCashBundleMatrix(currency: CashCurrency): CashBundleMatrix {
  return normalizeCashBundleMatrix(currency)
}

export function normalizeCashBundleMatrix(
  currency: CashCurrency,
  matrix?: Partial<CashBundleMatrix> | null,
): CashBundleMatrix {
  const normalized = {} as CashBundleMatrix

  for (const denomination of CASH_CURRENCIES[currency].denominations) {
    const sourceRow = matrix?.[denomination]
    normalized[denomination] = {
      bundle500: normalizeCount(sourceRow?.bundle500),
      bundle100: normalizeCount(sourceRow?.bundle100),
      loose: normalizeCount(sourceRow?.loose),
    }
  }

  return normalized
}

export function setCashBundleCell(
  currency: CashCurrency,
  matrix: CashBundleMatrix,
  denomination: number,
  column: BundleColumn,
  value: unknown,
): CashBundleMatrix {
  const normalized = normalizeCashBundleMatrix(currency, matrix)
  if (!isKnownDenomination(currency, denomination)) return normalized

  normalized[denomination] = {
    ...normalized[denomination],
    [column]: normalizeCount(value),
  }

  return normalized
}

export function stepCashBundleCell(
  currency: CashCurrency,
  matrix: CashBundleMatrix,
  denomination: number,
  column: BundleColumn,
  action: CashBundleAction,
): CashBundleMatrix {
  const normalized = normalizeCashBundleMatrix(currency, matrix)
  if (!isKnownDenomination(currency, denomination)) return normalized

  const currentValue = normalized[denomination][column]
  normalized[denomination] = {
    ...normalized[denomination],
    [column]: action === 'add' ? currentValue + 1 : Math.max(0, currentValue - 1),
  }

  return normalized
}

export function calculateCashBundleTotals(
  currency: CashCurrency,
  matrix: CashBundleMatrix,
): CashBundleTotals {
  const normalized = normalizeCashBundleMatrix(currency, matrix)
  const rows = CASH_CURRENCIES[currency].denominations.map((denomination) => {
    const counts = normalized[denomination]
    const totalNotes = BUNDLE_COLUMNS.reduce(
      (sum, column) => sum + counts[column.key] * column.noteCount,
      0,
    )

    return {
      denomination,
      counts,
      totalNotes,
      amount: denomination * totalNotes,
    }
  })

  return {
    rows,
    totalNotes: rows.reduce((sum, row) => sum + row.totalNotes, 0),
    totalAmount: rows.reduce((sum, row) => sum + row.amount, 0),
  }
}

export function createCashBundleSnapshot(input: CreateCashBundleSnapshotInput): CashBundleSnapshot {
  const matrix = normalizeCashBundleMatrix(input.currency, input.matrix)
  const totals = calculateCashBundleTotals(input.currency, matrix)

  return {
    id: input.id,
    currency: input.currency,
    matrix,
    remark: input.remark.trim(),
    totalAmount: totals.totalAmount,
    totalNotes: totals.totalNotes,
    createdAt: input.createdAt,
  }
}

export function addCashBundleSnapshot(
  snapshots: readonly CashBundleSnapshot[],
  snapshot: CashBundleSnapshot,
  limit = CASH_BUNDLE_HISTORY_LIMIT,
): CashBundleSnapshot[] {
  const withoutDuplicate = snapshots.filter((item) => item.id !== snapshot.id)
  return [snapshot, ...withoutDuplicate].slice(0, limit)
}

export function removeCashBundleSnapshot(
  snapshots: readonly CashBundleSnapshot[],
  id: string,
): CashBundleSnapshot[] {
  return snapshots.filter((snapshot) => snapshot.id !== id)
}

export function parseCashBundleSnapshots(raw: string | null): CashBundleSnapshot[] {
  if (!raw) return []

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item) => normalizeSnapshot(item))
      .filter((item): item is CashBundleSnapshot => item !== null)
      .slice(0, CASH_BUNDLE_HISTORY_LIMIT)
  } catch {
    return []
  }
}

export function serializeCashBundleSnapshots(snapshots: readonly CashBundleSnapshot[]): string {
  return JSON.stringify(snapshots.slice(0, CASH_BUNDLE_HISTORY_LIMIT))
}

export function formatCashAmount(currency: CashCurrency, amount: number): string {
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)
  const symbol = CASH_CURRENCIES[currency].symbol
  return currency === 'VES' ? `${symbol} ${formatted}` : `${symbol}${formatted}`
}

export function formatDenominationLabel(currency: CashCurrency, denomination: number): string {
  const symbol = CASH_CURRENCIES[currency].symbol
  return currency === 'VES' ? `${symbol} ${denomination}` : `${symbol}${denomination}`
}

export function formatWholeNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
}

function normalizeCount(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0
  return Math.floor(numericValue)
}

function isKnownDenomination(currency: CashCurrency, denomination: number): boolean {
  return CASH_CURRENCIES[currency].denominations.includes(denomination)
}

function isCashCurrency(value: unknown): value is CashCurrency {
  return value === 'VES' || value === 'USD' || value === 'RMB'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeSnapshot(value: unknown): CashBundleSnapshot | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== 'string' || !value.id) return null
  if (!isCashCurrency(value.currency)) return null
  if (typeof value.createdAt !== 'string' || !value.createdAt) return null

  return createCashBundleSnapshot({
    id: value.id,
    currency: value.currency,
    matrix: isRecord(value.matrix) ? (value.matrix as Partial<CashBundleMatrix>) : {},
    remark: typeof value.remark === 'string' ? value.remark : '',
    createdAt: value.createdAt,
  })
}

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addCashBundleSnapshot,
  calculateCashBundleTotals,
  createCashBundleSnapshot,
  createEmptyCashBundleMatrix,
  parseCashBundleSnapshots,
  removeCashBundleSnapshot,
  serializeCashBundleSnapshots,
  setCashBundleCell,
  stepCashBundleCell,
  type CashBundleMatrix,
} from '../src/tools/cash-bundle.ts'

test('calculates VES bundle matrix totals', () => {
  const matrix: CashBundleMatrix = {
    10: { bundle500: 0, bundle100: 0, loose: 0 },
    20: { bundle500: 9, bundle100: 3, loose: 0 },
    50: { bundle500: 5, bundle100: 5, loose: 0 },
    100: { bundle500: 5, bundle100: 4, loose: 0 },
    200: { bundle500: 1, bundle100: 3, loose: 0 },
    500: { bundle500: 0, bundle100: 3, loose: 0 },
  }

  const totals = calculateCashBundleTotals('VES', matrix)

  assert.equal(totals.totalAmount, 846000)
  assert.equal(totals.totalNotes, 11800)
  assert.deepEqual(
    totals.rows.map((row) => [row.denomination, row.totalNotes, row.amount]),
    [
      [10, 0, 0],
      [20, 4800, 96000],
      [50, 3000, 150000],
      [100, 2900, 290000],
      [200, 800, 160000],
      [500, 300, 150000],
    ],
  )
})

test('uses common USD and RMB denominations', () => {
  const usd = setCashBundleCell('USD', createEmptyCashBundleMatrix('USD'), 100, 'bundle500', 1)
  const rmb = setCashBundleCell('RMB', createEmptyCashBundleMatrix('RMB'), 20, 'loose', 2)

  assert.equal(calculateCashBundleTotals('USD', usd).totalAmount, 50000)
  assert.equal(calculateCashBundleTotals('USD', usd).totalNotes, 500)
  assert.equal(calculateCashBundleTotals('RMB', rmb).totalAmount, 40)
  assert.equal(calculateCashBundleTotals('RMB', rmb).totalNotes, 2)
})

test('normalizes input counts and does not subtract below zero', () => {
  let matrix = createEmptyCashBundleMatrix('VES')

  matrix = setCashBundleCell('VES', matrix, 20, 'bundle500', 2.8)
  matrix = setCashBundleCell('VES', matrix, 20, 'bundle100', '-3')
  matrix = setCashBundleCell('VES', matrix, 20, 'loose', 'abc')
  matrix = stepCashBundleCell('VES', matrix, 20, 'bundle500', 'subtract')
  matrix = stepCashBundleCell('VES', matrix, 20, 'bundle100', 'subtract')
  matrix = stepCashBundleCell('VES', matrix, 20, 'loose', 'add')

  assert.deepEqual(matrix[20], {
    bundle500: 1,
    bundle100: 0,
    loose: 1,
  })
  assert.equal(calculateCashBundleTotals('VES', matrix).totalNotes, 501)
})

test('keeps cash bundle history snapshots serialized and limited', () => {
  const matrix = setCashBundleCell('VES', createEmptyCashBundleMatrix('VES'), 20, 'bundle100', 1)
  const first = createCashBundleSnapshot({
    id: 'first',
    currency: 'VES',
    matrix,
    remark: '  morning count  ',
    createdAt: '2026-05-24T12:00:00.000Z',
  })
  const second = createCashBundleSnapshot({
    id: 'second',
    currency: 'USD',
    matrix: setCashBundleCell('USD', createEmptyCashBundleMatrix('USD'), 100, 'loose', 1),
    remark: '',
    createdAt: '2026-05-24T13:00:00.000Z',
  })

  let history = addCashBundleSnapshot([], first)
  history = addCashBundleSnapshot(history, second)

  assert.equal(first.remark, 'morning count')
  assert.deepEqual(history.map((snapshot) => snapshot.id), ['second', 'first'])
  assert.equal(parseCashBundleSnapshots(serializeCashBundleSnapshots(history))[1].totalAmount, 2000)

  history = removeCashBundleSnapshot(history, 'second')
  assert.deepEqual(history.map((snapshot) => snapshot.id), ['first'])

  const manySnapshots = Array.from({ length: 55 }, (_, index) =>
    createCashBundleSnapshot({
      id: `snapshot-${index}`,
      currency: 'RMB',
      matrix: createEmptyCashBundleMatrix('RMB'),
      remark: '',
      createdAt: `2026-05-24T13:${String(index).padStart(2, '0')}:00.000Z`,
    }),
  ).reduce((items, snapshot) => addCashBundleSnapshot(items, snapshot), [] as ReturnType<typeof addCashBundleSnapshot>)

  assert.equal(manySnapshots.length, 50)
  assert.equal(manySnapshots[0].id, 'snapshot-54')
  assert.equal(manySnapshots[49].id, 'snapshot-5')
})

test('ignores invalid history payloads', () => {
  assert.deepEqual(parseCashBundleSnapshots(null), [])
  assert.deepEqual(parseCashBundleSnapshots('{bad json'), [])
  assert.deepEqual(parseCashBundleSnapshots(JSON.stringify([{ id: 'x', currency: 'EUR' }])), [])
})

<template>
  <div class="cash-tool-shell">
    <header class="cash-tool-topbar">
      <button type="button" class="cash-icon-action danger" @click="clearCurrent">
        <svg class="cash-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.9 12.1A2 2 0 0116.1 21H7.9a2 2 0 01-2-1.9L5 7m5 4v6m4-6v6M4 7h16m-6 0V5a2 2 0 00-2-2h0a2 2 0 00-2 2v2" />
        </svg>
        清空
      </button>

      <router-link to="/" class="cash-home-link">返回笔记页面</router-link>

      <button type="button" class="cash-icon-action" @click="saveCurrentSnapshot">
        <svg class="cash-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 21h14a1 1 0 001-1V8l-5-5H5a1 1 0 00-1 1v16a1 1 0 001 1zM8 21v-7h8v7M8 3v5h6" />
        </svg>
        保存
      </button>

      <p v-if="feedback" class="cash-feedback">{{ feedback }}</p>
    </header>

    <main class="cash-tool-main">
      <section class="cash-control-card">
        <div class="cash-card-title">当前币种</div>
        <div class="cash-currency-row">
          <button
            v-for="definition in currencyOptions"
            :key="definition.code"
            type="button"
            :class="['cash-currency-button', { active: currency === definition.code }]"
            @click="currency = definition.code"
          >
            {{ definition.label }}
          </button>
        </div>
      </section>

      <section class="cash-summary-card">
        <div class="cash-summary-meta">
          <div>
            <p class="cash-currency-name">{{ currentCurrency.code }} · {{ currentCurrency.name }}</p>
            <p class="cash-summary-label">总金额</p>
          </div>
          <p class="cash-total-notes">总张数 · {{ formatWholeNumber(totals.totalNotes) }}</p>
        </div>
        <p class="cash-summary-total">{{ formatCashAmount(currency, totals.totalAmount) }}</p>
      </section>

      <section
        :class="[
          'cash-matrix-panel',
          { subtracting: entryMode === 'button' && buttonAction === 'subtract' },
        ]"
      >
        <table class="cash-matrix-table">
          <thead>
            <tr>
              <th>面额</th>
              <th v-for="column in bundleColumns" :key="column.key">{{ column.label }}</th>
              <th>行小计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in totals.rows" :key="row.denomination">
              <th>{{ formatDenominationLabel(currency, row.denomination) }}</th>
              <td v-for="column in bundleColumns" :key="column.key">
                <input
                  v-if="entryMode === 'input'"
                  :value="currentMatrix[row.denomination][column.key]"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  step="1"
                  class="cash-cell-input"
                  @input="onCellInput(row.denomination, column.key, $event)"
                />
                <button
                  v-else
                  type="button"
                  :class="['cash-cell-button', { filled: currentMatrix[row.denomination][column.key] > 0 }]"
                  @click="stepCell(row.denomination, column.key)"
                >
                  {{ currentMatrix[row.denomination][column.key] }}
                </button>
              </td>
              <td class="cash-row-total">{{ formatCashAmount(currency, row.amount) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="cash-bottom-panel">
        <label class="cash-remark-field">
          <span>备注</span>
          <input
            v-model="remark"
            type="text"
            maxlength="80"
            placeholder="上午盘点 / 门店A"
          />
        </label>

        <button type="button" class="cash-history-open" @click="historyModalOpen = true">
          历史 {{ history.length }}
        </button>
      </section>
    </main>

    <footer class="cash-tool-footer">
      <template v-if="entryMode === 'input'">
        <button type="button" class="cash-footer-button secondary" @click="entryMode = 'button'">按钮模式</button>
        <button type="button" class="cash-footer-button primary" :disabled="sharing" @click="shareImage">
          {{ sharing ? '生成中' : '分享图片' }}
        </button>
      </template>

      <template v-else>
        <button
          type="button"
          class="cash-mode-icon"
          aria-label="切换到输入模式"
          title="切换到输入模式"
          @click="entryMode = 'input'"
        >
          <svg class="cash-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16M6 11h2m2 0h2m2 0h2m2 0h2M6 15h8m2 0h2M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          type="button"
          :class="['cash-footer-button mode add-mode', { active: buttonAction === 'add' }]"
          @click="buttonAction = 'add'"
        >
          加模式
        </button>
        <button
          type="button"
          :class="['cash-footer-button mode subtract-mode', { active: buttonAction === 'subtract' }]"
          @click="buttonAction = 'subtract'"
        >
          减模式
        </button>
        <button type="button" class="cash-footer-button primary compact" :disabled="sharing" @click="shareImage">
          {{ sharing ? '生成中' : '分享' }}
        </button>
      </template>
    </footer>

    <div
      v-if="historyModalOpen"
      class="cash-modal-backdrop"
      role="presentation"
      @click.self="historyModalOpen = false"
    >
      <section
        class="cash-history-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-history-title"
      >
        <header class="cash-history-modal-head">
          <div>
            <h2 id="cash-history-title">历史快照</h2>
            <p>{{ history.length }} / 50</p>
          </div>
          <button type="button" class="cash-modal-close" aria-label="关闭历史" @click="historyModalOpen = false">
            ×
          </button>
        </header>

        <div v-if="history.length === 0" class="cash-modal-empty">暂无历史</div>

        <div v-else class="cash-history-list">
          <article v-for="snapshot in history" :key="snapshot.id" class="cash-history-item">
            <div class="cash-history-item-main">
              <div class="cash-history-line">
                <strong>{{ formatCashAmount(snapshot.currency, snapshot.totalAmount) }}</strong>
                <span>{{ snapshot.currency }}</span>
                <span>{{ formatWholeNumber(snapshot.totalNotes) }} 张</span>
              </div>
              <p>{{ formatDate(snapshot.createdAt) }}</p>
              <p v-if="snapshot.remark" class="cash-history-remark">{{ snapshot.remark }}</p>
            </div>
            <div class="cash-history-item-actions">
              <button type="button" class="cash-mini-button" @click="restoreSnapshot(snapshot)">恢复</button>
              <button type="button" class="cash-mini-button danger" @click="deleteSnapshot(snapshot.id)">删除</button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  BUNDLE_COLUMNS,
  CASH_BUNDLE_HISTORY_KEY,
  CASH_CURRENCIES,
  addCashBundleSnapshot,
  calculateCashBundleTotals,
  createCashBundleSnapshot,
  createEmptyCashBundleMatrix,
  formatCashAmount,
  formatDenominationLabel,
  formatWholeNumber,
  normalizeCashBundleMatrix,
  parseCashBundleSnapshots,
  removeCashBundleSnapshot,
  serializeCashBundleSnapshots,
  setCashBundleCell,
  stepCashBundleCell,
  type BundleColumn,
  type CashBundleAction,
  type CashBundleMatrix,
  type CashBundleSnapshot,
  type CashCurrency,
} from '@/tools/cash-bundle'

type EntryMode = 'input' | 'button'
type WorkingMatrices = Record<CashCurrency, CashBundleMatrix>
type LockedPageStyles = {
  bodyOverflow: string
  bodyOverscrollBehavior: string
  bodyTouchAction: string
  htmlOverflow: string
  htmlOverscrollBehavior: string
  htmlTouchAction: string
}

const currencyOptions = Object.values(CASH_CURRENCIES)
const bundleColumns = BUNDLE_COLUMNS

const currency = ref<CashCurrency>('VES')
const matrices = ref<WorkingMatrices>({
  VES: createEmptyCashBundleMatrix('VES'),
  USD: createEmptyCashBundleMatrix('USD'),
  RMB: createEmptyCashBundleMatrix('RMB'),
})
const remark = ref('')
const history = ref<CashBundleSnapshot[]>([])
const historyModalOpen = ref(false)
const entryMode = ref<EntryMode>('input')
const buttonAction = ref<CashBundleAction>('add')
const feedback = ref('')
const sharing = ref(false)

const currentCurrency = computed(() => CASH_CURRENCIES[currency.value])
const currentMatrix = computed(() => matrices.value[currency.value])
const totals = computed(() => calculateCashBundleTotals(currency.value, currentMatrix.value))
let lockedPageStyles: LockedPageStyles | null = null

onMounted(() => {
  lockPageGestures()
  history.value = parseCashBundleSnapshots(localStorage.getItem(CASH_BUNDLE_HISTORY_KEY))
})

onUnmounted(() => {
  unlockPageGestures()
})

function preventPageGesture(event: Event) {
  event.preventDefault()
}

function lockPageGestures() {
  if (lockedPageStyles) return

  lockedPageStyles = {
    bodyOverflow: document.body.style.overflow,
    bodyOverscrollBehavior: document.body.style.overscrollBehavior,
    bodyTouchAction: document.body.style.touchAction,
    htmlOverflow: document.documentElement.style.overflow,
    htmlOverscrollBehavior: document.documentElement.style.overscrollBehavior,
    htmlTouchAction: document.documentElement.style.touchAction,
  }

  document.body.style.overflow = 'hidden'
  document.body.style.overscrollBehavior = 'none'
  document.body.style.touchAction = 'none'
  document.documentElement.style.overflow = 'hidden'
  document.documentElement.style.overscrollBehavior = 'none'
  document.documentElement.style.touchAction = 'none'

  window.addEventListener('touchmove', preventPageGesture, { passive: false })
  window.addEventListener('wheel', preventPageGesture, { passive: false })
  window.addEventListener('gesturestart', preventPageGesture)
  window.addEventListener('gesturechange', preventPageGesture)
}

function unlockPageGestures() {
  if (!lockedPageStyles) return

  document.body.style.overflow = lockedPageStyles.bodyOverflow
  document.body.style.overscrollBehavior = lockedPageStyles.bodyOverscrollBehavior
  document.body.style.touchAction = lockedPageStyles.bodyTouchAction
  document.documentElement.style.overflow = lockedPageStyles.htmlOverflow
  document.documentElement.style.overscrollBehavior = lockedPageStyles.htmlOverscrollBehavior
  document.documentElement.style.touchAction = lockedPageStyles.htmlTouchAction

  window.removeEventListener('touchmove', preventPageGesture)
  window.removeEventListener('wheel', preventPageGesture)
  window.removeEventListener('gesturestart', preventPageGesture)
  window.removeEventListener('gesturechange', preventPageGesture)
  lockedPageStyles = null
}

function updateCurrentMatrix(nextMatrix: CashBundleMatrix) {
  matrices.value = {
    ...matrices.value,
    [currency.value]: normalizeCashBundleMatrix(currency.value, nextMatrix),
  }
}

function onCellInput(denomination: number, column: BundleColumn, event: Event) {
  const input = event.target as HTMLInputElement
  updateCurrentMatrix(setCashBundleCell(currency.value, currentMatrix.value, denomination, column, input.value))
}

function stepCell(denomination: number, column: BundleColumn) {
  updateCurrentMatrix(stepCashBundleCell(currency.value, currentMatrix.value, denomination, column, buttonAction.value))
}

function clearCurrent() {
  updateCurrentMatrix(createEmptyCashBundleMatrix(currency.value))
  remark.value = ''
  showFeedback('已清空')
}

function saveCurrentSnapshot() {
  const snapshot = createCashBundleSnapshot({
    id: createSnapshotId(),
    currency: currency.value,
    matrix: currentMatrix.value,
    remark: remark.value,
    createdAt: new Date().toISOString(),
  })

  history.value = addCashBundleSnapshot(history.value, snapshot)
  persistHistory()
  showFeedback('已保存')
}

function restoreSnapshot(snapshot: CashBundleSnapshot) {
  currency.value = snapshot.currency
  matrices.value = {
    ...matrices.value,
    [snapshot.currency]: normalizeCashBundleMatrix(snapshot.currency, snapshot.matrix),
  }
  remark.value = snapshot.remark
  historyModalOpen.value = false
  showFeedback('已恢复')
}

function deleteSnapshot(id: string) {
  history.value = removeCashBundleSnapshot(history.value, id)
  persistHistory()
  showFeedback('已删除')
}

function persistHistory() {
  localStorage.setItem(CASH_BUNDLE_HISTORY_KEY, serializeCashBundleSnapshots(history.value))
}

async function shareImage() {
  sharing.value = true
  try {
    const blob = await renderShareImage()
    const file = new File([blob], `cash-bundle-${currency.value}.png`, { type: 'image/png' })

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: '捆数工作台',
        text: `${currentCurrency.value.code} ${formatCashAmount(currency.value, totals.value.totalAmount)}`,
        files: [file],
      })
      showFeedback('已打开分享')
    } else {
      downloadBlob(blob, file.name)
      showFeedback('图片已下载')
    }
  } catch {
    showFeedback('图片生成失败')
  } finally {
    sharing.value = false
  }
}

function createSnapshotId(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `cash-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function showFeedback(message: string) {
  feedback.value = message
  window.setTimeout(() => {
    if (feedback.value === message) feedback.value = ''
  }, 1800)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

async function renderShareImage(): Promise<Blob> {
  const scale = Math.min(Math.max(window.devicePixelRatio || 2, 2), 3)
  const width = 960
  const rowHeight = 62
  const remarkHeight = remark.value.trim() ? 50 : 0
  const height = 360 + totals.value.rows.length * rowHeight + remarkHeight
  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')

  context.scale(scale, scale)
  context.fillStyle = '#f8fafc'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#ffffff'
  context.fillRect(36, 36, width - 72, height - 72)
  context.strokeStyle = '#111827'
  context.lineWidth = 3
  context.strokeRect(36, 36, width - 72, height - 72)

  context.fillStyle = '#111827'
  context.font = '700 28px Arial, "Microsoft YaHei", sans-serif'
  context.fillText('捆数工作台', 72, 88)
  context.font = '700 20px Arial, "Microsoft YaHei", sans-serif'
  context.fillText(`${currentCurrency.value.code} · ${currentCurrency.value.name}`, 72, 128)

  context.font = '900 56px Arial, "Microsoft YaHei", sans-serif'
  context.textAlign = 'right'
  context.fillText(formatCashAmount(currency.value, totals.value.totalAmount), width - 72, 130)
  context.font = '700 22px Arial, "Microsoft YaHei", sans-serif'
  context.fillText(`总张数 · ${formatWholeNumber(totals.value.totalNotes)}`, width - 72, 170)
  context.textAlign = 'left'

  let y = 218
  if (remark.value.trim()) {
    context.font = '400 22px Arial, "Microsoft YaHei", sans-serif'
    context.fillStyle = '#374151'
    context.fillText(`备注：${remark.value.trim()}`, 72, y)
    y += remarkHeight
  }

  const tableX = 72
  const tableWidth = width - 144
  const columnWidths = [150, 135, 135, 135, tableWidth - 555]
  const headers = ['面额', '500', '100', 'Loose', '行小计']

  context.fillStyle = '#e0f2fe'
  context.fillRect(tableX, y, tableWidth, 48)
  context.strokeStyle = '#22d3ee'
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(tableX, y + 48)
  context.lineTo(tableX + tableWidth, y + 48)
  context.stroke()

  context.fillStyle = '#4b5563'
  context.font = '700 20px Arial, "Microsoft YaHei", sans-serif'
  let x = tableX
  headers.forEach((header, index) => {
    context.fillText(header, x + 18, y + 32)
    x += columnWidths[index]
  })

  y += 48
  for (const row of totals.value.rows) {
    context.fillStyle = '#ffffff'
    context.fillRect(tableX, y, tableWidth, rowHeight)
    context.strokeStyle = '#d1d5db'
    context.lineWidth = 1
    context.strokeRect(tableX, y, tableWidth, rowHeight)

    const values = [
      formatDenominationLabel(currency.value, row.denomination),
      String(row.counts.bundle500),
      String(row.counts.bundle100),
      String(row.counts.loose),
      formatCashAmount(currency.value, row.amount),
    ]

    context.fillStyle = '#111827'
    context.font = '800 22px Arial, "Microsoft YaHei", sans-serif'
    x = tableX
    values.forEach((value, index) => {
      context.fillText(value, x + 18, y + 39)
      x += columnWidths[index]
    })

    y += rowHeight
  }

  context.fillStyle = '#6b7280'
  context.font = '400 18px Arial, "Microsoft YaHei", sans-serif'
  context.fillText(`生成时间：${new Date().toLocaleString('zh-CN')}`, 72, height - 58)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas export failed'))
    }, 'image/png')
  })
}
</script>

<style scoped>
.cash-tool-shell {
  background: #f4f5f7;
  color: #111827;
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr) 64px;
  height: 100vh;
  height: 100dvh;
  inset: 0;
  overflow: hidden;
  overscroll-behavior: none;
  position: fixed;
  touch-action: none;
  width: 100%;
}

.cash-tool-shell * {
  touch-action: none;
}

.cash-tool-topbar {
  align-items: center;
  background: #ffffff;
  border-bottom: 2px solid #111827;
  display: grid;
  gap: 8px;
  grid-template-columns: 86px minmax(0, 1fr) 86px;
  padding: 8px 12px;
  position: relative;
}

.cash-icon-action,
.cash-home-link,
.cash-footer-button,
.cash-mode-icon,
.cash-mini-button {
  align-items: center;
  border-radius: 0;
  display: inline-flex;
  justify-content: center;
  min-width: 0;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.cash-icon-action {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  font-size: 13px;
  font-weight: 800;
  gap: 5px;
  height: 38px;
}

.cash-icon-action:hover {
  background: #f8fafc;
}

.cash-icon-action.danger {
  color: #991b1b;
}

.cash-home-link {
  border: 1px solid #111827;
  color: #111827;
  font-size: 15px;
  font-weight: 900;
  height: 38px;
  text-decoration: none;
}

.cash-home-link:hover {
  background: #111827;
  color: #ffffff;
}

.cash-feedback {
  background: #dcfce7;
  border: 1px solid #86efac;
  color: #166534;
  font-size: 12px;
  font-weight: 800;
  left: 50%;
  padding: 2px 8px;
  position: absolute;
  top: 45px;
  transform: translateX(-50%);
  z-index: 5;
}

.cash-icon {
  height: 16px;
  width: 16px;
}

.cash-tool-main {
  display: grid;
  gap: 6px;
  grid-template-rows: 74px 92px minmax(0, 1fr) 52px;
  min-height: 0;
  padding: 8px 10px 6px;
}

.cash-control-card,
.cash-summary-card,
.cash-matrix-panel,
.cash-bottom-panel {
  background: #ffffff;
  border: 2px solid #111827;
  min-width: 0;
}

.cash-control-card {
  display: grid;
  gap: 7px;
  grid-template-rows: auto 1fr;
  padding: 8px 10px;
}

.cash-card-title {
  border-left: 4px solid #111827;
  font-size: 13px;
  font-weight: 900;
  line-height: 1;
  padding-left: 8px;
}

.cash-currency-row {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(3, 1fr);
}

.cash-currency-button {
  background: #ffffff;
  border: 2px solid #9ca3af;
  font-size: 16px;
  font-weight: 900;
}

.cash-currency-button.active {
  background: #030712;
  border-color: #030712;
  color: #ffffff;
}

.cash-summary-card {
  align-content: center;
  display: grid;
  gap: 7px;
  grid-template-rows: auto minmax(0, 1fr);
  padding: 10px 12px;
}

.cash-summary-meta {
  align-items: start;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  min-width: 0;
}

.cash-currency-name {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.16em;
  line-height: 1;
}

.cash-summary-label {
  font-size: 16px;
  font-weight: 900;
  margin-top: 8px;
}

.cash-summary-total {
  align-self: end;
  font-size: clamp(30px, 9vw, 48px);
  font-weight: 950;
  line-height: 0.95;
  min-width: 0;
  text-align: right;
  white-space: nowrap;
}

.cash-total-notes {
  border: 1px solid #cbd5e1;
  color: #111827;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
  padding: 5px 7px;
  white-space: nowrap;
}

.cash-matrix-panel {
  background: transparent;
  border: 0;
  display: flex;
  min-height: 0;
  padding: 0;
}

.cash-matrix-table {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-collapse: collapse;
  flex: 1;
  height: 100%;
  table-layout: fixed;
  --matrix-head-height: 34px;
  width: 100%;
}

.cash-matrix-table th,
.cash-matrix-table td {
  border-bottom: 1px solid #e5e7eb;
  height: auto;
  padding: 4px;
}

.cash-matrix-table thead th {
  background: #ecfeff;
  border-bottom: 4px solid #22d3ee;
  color: #4b5563;
  font-size: 12px;
  font-weight: 900;
  height: var(--matrix-head-height);
}

.cash-matrix-table tbody tr {
  height: calc((100% - var(--matrix-head-height)) / 6);
}

.cash-matrix-table th:first-child {
  width: 58px;
}

.cash-matrix-table th:last-child {
  width: 82px;
}

.cash-matrix-table tbody th {
  font-size: 13px;
  font-weight: 950;
  text-align: center;
  white-space: nowrap;
}

.cash-matrix-table tbody td {
  padding: 6px 4px;
}

.cash-cell-input,
.cash-cell-button {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  box-sizing: border-box;
  color: #111827;
  display: flex;
  font-size: clamp(24px, 6vw, 34px);
  font-weight: 950;
  height: 100%;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  text-align: center;
  width: 100%;
}

.cash-cell-input {
  display: block;
  outline: none;
}

.cash-cell-input:focus {
  background: #fefce8;
  border-color: #06b6d4;
}

.cash-cell-button.filled {
  background: #f5efdf;
  border-color: #9ca3af;
}

.cash-matrix-panel.subtracting .cash-cell-button {
  background: #fff1f2;
  border-color: #f87171;
  color: #991b1b;
}

.cash-matrix-panel.subtracting .cash-cell-button.filled {
  background: #fee2e2;
  border-color: #dc2626;
}

.cash-matrix-panel.subtracting .cash-cell-button:hover {
  background: #fecaca;
}

.cash-row-total {
  color: #4b5563;
  font-size: 12px;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cash-bottom-panel {
  border-color: #d1d5db;
  display: grid;
  gap: 7px;
  grid-template-columns: minmax(0, 1fr) 84px;
  padding: 7px;
}

.cash-remark-field {
  display: grid;
  gap: 4px;
  grid-template-columns: 42px minmax(0, 1fr);
}

.cash-remark-field span {
  align-self: center;
  font-size: 13px;
  font-weight: 900;
}

.cash-remark-field input {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  font-size: 13px;
  height: 34px;
  min-width: 0;
  outline: none;
  padding: 0 8px;
  width: 100%;
}

.cash-remark-field input:focus {
  border-color: #06b6d4;
}

.cash-history-open {
  background: #ffffff;
  border: 2px solid #111827;
  font-size: 13px;
  font-weight: 950;
}

.cash-history-open:hover {
  background: #f8fafc;
}

.cash-mini-button {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  font-size: 12px;
  font-weight: 900;
  height: 34px;
}

.cash-mini-button.danger {
  color: #b91c1c;
}

.cash-mini-button:disabled {
  color: #9ca3af;
}

.cash-modal-backdrop {
  align-items: center;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 16px;
  position: fixed;
  z-index: 50;
}

.cash-history-modal {
  background: #f8fafc;
  border: 2px solid #111827;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  max-height: min(78dvh, 680px);
  max-width: 520px;
  min-height: 240px;
  width: 100%;
}

.cash-history-modal-head {
  align-items: center;
  background: #ffffff;
  border-bottom: 1px solid #cbd5e1;
  display: flex;
  justify-content: space-between;
  padding: 12px;
}

.cash-history-modal-head h2 {
  font-size: 18px;
  font-weight: 950;
  line-height: 1;
}

.cash-history-modal-head p {
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
  margin-top: 4px;
}

.cash-modal-close {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  font-size: 26px;
  font-weight: 700;
  height: 40px;
  line-height: 1;
  width: 40px;
}

.cash-modal-empty {
  align-items: center;
  color: #6b7280;
  display: flex;
  font-size: 14px;
  font-weight: 800;
  justify-content: center;
}

.cash-history-list {
  display: grid;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  padding: 10px;
}

.cash-history-item {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 10px;
}

.cash-history-line {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.cash-history-line strong {
  font-size: 18px;
  font-weight: 950;
}

.cash-history-line span,
.cash-history-item-main p {
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
}

.cash-history-remark {
  color: #374151 !important;
  margin-top: 5px;
}

.cash-history-item-actions {
  display: grid;
  gap: 6px;
  grid-template-columns: 48px;
}

.cash-tool-footer {
  align-items: center;
  background: rgba(248, 250, 252, 0.97);
  border-top: 1px solid #cbd5e1;
  display: flex;
  gap: 10px;
  padding: 8px 12px;
}

.cash-footer-button,
.cash-mode-icon {
  font-weight: 950;
  height: 48px;
}

.cash-footer-button.secondary,
.cash-footer-button.mode,
.cash-mode-icon {
  background: #ffffff;
  border: 2px solid #facc15;
  color: #111827;
}

.cash-footer-button.primary {
  background: #facc15;
  border: 2px solid #facc15;
  color: #111827;
  flex: 1;
  font-size: 17px;
}

.cash-footer-button.secondary {
  flex: 0 0 112px;
  font-size: 16px;
}

.cash-footer-button.mode {
  border-color: #cbd5e1;
  flex: 0 0 76px;
  font-size: 14px;
}

.cash-footer-button.mode.add-mode.active {
  background: #fefce8;
  border-color: #facc15;
}

.cash-footer-button.mode.subtract-mode.active {
  background: #fee2e2;
  border-color: #dc2626;
  color: #991b1b;
}

.cash-footer-button.compact {
  flex: 1 1 auto;
}

.cash-mode-icon {
  flex: 0 0 48px;
}

@media (min-width: 640px) {
  .cash-tool-shell {
    grid-template-rows: 64px minmax(0, 1fr) 72px;
  }

  .cash-tool-topbar {
    grid-template-columns: 110px minmax(0, 1fr) 110px;
    margin: 0 auto;
    max-width: 920px;
    width: 100%;
  }

  .cash-tool-main {
    grid-template-rows: 86px 108px minmax(0, 1fr) 56px;
    margin: 0 auto;
    max-width: 920px;
    padding: 12px 16px 8px;
    width: 100%;
  }

  .cash-tool-footer {
    margin: 0 auto;
    max-width: 920px;
    width: 100%;
  }

  .cash-matrix-table th,
  .cash-matrix-table td {
    height: auto;
  }

  .cash-matrix-table thead th {
    --matrix-head-height: 40px;
  }
}

@media (max-height: 760px) {
  .cash-tool-shell {
    grid-template-rows: 50px minmax(0, 1fr) 56px;
  }

  .cash-tool-main {
    gap: 4px;
    grid-template-rows: 62px 78px minmax(0, 1fr) 46px;
    padding: 5px 8px 4px;
  }

  .cash-control-card,
  .cash-summary-card {
    padding: 6px 8px;
  }

  .cash-matrix-panel {
    padding: 0;
  }

  .cash-matrix-table th,
  .cash-matrix-table td {
    height: auto;
  }

  .cash-cell-input,
  .cash-cell-button {
    min-height: 38px;
  }

  .cash-bottom-panel {
    grid-template-columns: minmax(0, 1fr) 78px;
    padding: 5px;
  }

  .cash-footer-button,
  .cash-mode-icon {
    height: 42px;
  }
}
</style>

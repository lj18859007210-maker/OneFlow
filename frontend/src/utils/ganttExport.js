const DAY_MS = 24 * 60 * 60 * 1000

const VIEW_MODE_LABELS = {
  week: '周',
  month: '月',
  quarter: '季'
}

const EXPORT_COLUMNS = [
  { label: '需求标题', value: req => req.title },
  { label: '平台', value: req => req.platform || '未分类' },
  { label: '能力', value: req => req.capability },
  { label: '提交人', value: req => req.submitter },
  { label: '开发人员', value: req => req.developer },
  { label: '状态', value: req => req.status },
  { label: '优先级', value: req => req.priority },
  { label: '评分', value: req => req.score },
  { label: '创建日期', value: req => formatDate(req.createdAt) },
  { label: '预计日期', value: req => formatDate(req.expectedDate) },
  { label: '实际日期', value: req => formatDate(req.actualDate) },
  { label: '工期(天)', value: req => getDurationDays(req) },
  { label: '是否逾期', value: (req, context) => isRequirementOverdue(req, context.now) ? '是' : '否' }
]

export function flattenGanttGroups(groups) {
  if (!Array.isArray(groups)) return []

  return groups.flatMap(group => Array.isArray(group?.items) ? group.items : [])
}

export function buildGanttCsv(groups, options = {}) {
  const now = options.now || new Date()
  const header = EXPORT_COLUMNS.map(column => escapeCsvCell(column.label)).join(',')
  const rows = buildRows(groups, { now }).map(row => row.map(escapeCsvCell).join(','))

  return `\ufeff${[header, ...rows].join('\r\n')}`
}

export function buildGanttExcelHtml(groups, options = {}) {
  const now = options.now || new Date()
  const headers = EXPORT_COLUMNS.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')
  const rows = buildRows(groups, { now })
    .map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    table { border-collapse: collapse; font-family: "Microsoft YaHei", sans-serif; font-size: 12px; }
    th { background: #e8f4ff; color: #1e3a5f; font-weight: 700; }
    th, td { border: 1px solid #d4e4f7; padding: 6px 10px; mso-number-format: "\\@"; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`
}

export function createGanttExportFileName({ extension, viewMode, filters = {}, date = new Date() }) {
  const segments = [
    '项目进度甘特图',
    VIEW_MODE_LABELS[viewMode] || viewMode,
    filters.platform,
    filters.status,
    filters.developer,
    formatDate(date)
  ]
    .filter(Boolean)
    .map(sanitizeFileNameSegment)

  return `${segments.join('_')}.${String(extension || 'csv').replace(/^\./, '')}`
}

export function downloadGanttExport(groups, { format, viewMode, filters, date = new Date() } = {}) {
  const rows = flattenGanttGroups(groups)
  if (rows.length === 0) {
    return { success: false, reason: 'empty' }
  }

  const normalizedFormat = format === 'excel' ? 'excel' : 'csv'
  const extension = normalizedFormat === 'excel' ? 'xls' : 'csv'
  const fileName = createGanttExportFileName({ extension, viewMode, filters, date })
  const content = normalizedFormat === 'excel'
    ? buildGanttExcelHtml(groups, { now: date })
    : buildGanttCsv(groups, { now: date })
  const mimeType = normalizedFormat === 'excel'
    ? 'application/vnd.ms-excel;charset=utf-8'
    : 'text/csv;charset=utf-8'

  downloadTextFile({ content, fileName, mimeType })

  return { success: true, fileName }
}

export function downloadTextFile({ content, fileName, mimeType }) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function buildRows(groups, context) {
  return flattenGanttGroups(groups).map(req => (
    EXPORT_COLUMNS.map(column => normalizeCell(column.value(req, context)))
  ))
}

function normalizeCell(value) {
  if (value === null || value === undefined) return ''
  const cell = String(value)

  return /^[=+\-@]/.test(cell) ? `'${cell}` : cell
}

function escapeCsvCell(value) {
  const cell = normalizeCell(value)

  if (/[",\r\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`
  }

  return cell
}

function escapeHtml(value) {
  return normalizeCell(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(value) {
  if (!value) return ''

  if (typeof value === 'string') {
    const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)
    if (dateOnly) return dateOnly[0]
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDurationDays(req) {
  const start = parseDate(req.createdAt)
  const end = parseDate(req.actualDate || req.expectedDate)

  if (!start || !end) return ''

  return Math.ceil((end - start) / DAY_MS)
}

function isRequirementOverdue(req, now) {
  const deadline = parseDate(req.actualDate || req.expectedDate)
  const today = startOfDay(now || new Date())

  return Boolean(deadline && startOfDay(deadline) < today && req.status !== '已发布')
}

function parseDate(value) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(value) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function sanitizeFileNameSegment(value) {
  return String(value)
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '')
}

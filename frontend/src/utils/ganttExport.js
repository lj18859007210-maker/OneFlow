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
  { label: '发布时间', value: req => formatDate(req.publishedAt) },
  { label: '实际工期(天)', value: req => getActualDurationDays(req) },
  { label: '开发状态', value: (req, context) => getRequirementDevelopmentStatus(req, context) }
]

export const DEVELOPMENT_STATUS_OPTIONS = ['提前完成', '及时完成', '逾期', '未审核', '待开发', '开发中', '测试中']

export function flattenGanttGroups(groups) {
  if (!Array.isArray(groups)) return []

  return groups.flatMap(group => Array.isArray(group?.items) ? group.items : [])
}

export function buildGanttCsv(groups, options = {}) {
  const exportGroups = filterGanttGroupsByExportOptions(groups, options)
  const header = EXPORT_COLUMNS.map(column => escapeCsvCell(column.label)).join(',')
  const rows = buildRows(exportGroups, options).map(row => row.map(escapeCsvCell).join(','))

  return `\ufeff${[header, ...rows].join('\r\n')}`
}

export function buildGanttExcelHtml(groups, options = {}) {
  const exportGroups = filterGanttGroupsByExportOptions(groups, options)
  const headers = EXPORT_COLUMNS.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')
  const rows = buildRows(exportGroups, options)
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
    filters.developmentStatus,
    filters.developer,
    formatDateRange(filters.createdAtStart, filters.createdAtEnd),
    formatDate(date)
  ]
    .filter(Boolean)
    .map(sanitizeFileNameSegment)

  return `${segments.join('_')}.${String(extension || 'csv').replace(/^\./, '')}`
}

export function downloadGanttExport(groups, { format, viewMode, filters, date = new Date() } = {}) {
  const exportOptions = {
    ...(filters || {}),
    now: date
  }
  const exportGroups = filterGanttGroupsByExportOptions(groups, exportOptions)
  const rows = flattenGanttGroups(exportGroups)
  if (rows.length === 0) {
    return { success: false, reason: 'empty' }
  }

  const normalizedFormat = format === 'excel' ? 'excel' : 'csv'
  const extension = normalizedFormat === 'excel' ? 'xls' : 'csv'
  const fileName = createGanttExportFileName({ extension, viewMode, filters, date })
  const content = normalizedFormat === 'excel'
    ? buildGanttExcelHtml(exportGroups, exportOptions)
    : buildGanttCsv(exportGroups, exportOptions)
  const mimeType = normalizedFormat === 'excel'
    ? 'application/vnd.ms-excel;charset=utf-8'
    : 'text/csv;charset=utf-8'

  downloadTextFile({ content, fileName, mimeType })

  return { success: true, fileName }
}

export function filterGanttGroupsByExportOptions(groups, options = {}) {
  if (!Array.isArray(groups)) return []

  return groups
    .map(group => {
      const items = Array.isArray(group?.items)
        ? group.items.filter(req => matchesCreatedDateRange(req, options) && matchesDevelopmentStatus(req, options))
        : []

      return {
        ...group,
        items,
        progress: calculateGroupProgress(items)
      }
    })
    .filter(group => group.items.length > 0)
}

export function getRequirementDevelopmentStatus(req = {}, options = {}) {
  const status = normalizeText(req.status)
  const actualDate = startOfDay(parseDate(req.actualDate))

  if (status === '已发布') {
    const publishedAt = startOfDay(parseDate(req.publishedAt))

    if (!actualDate || !publishedAt) return status
    if (publishedAt < actualDate) return '提前完成'
    if (publishedAt.getTime() === actualDate.getTime()) return '及时完成'
    return '逾期'
  }

  if (isUnreviewedRequirement(req, status)) return '未审核'

  const today = startOfDay(parseDate(options.now) || new Date())
  if (actualDate && today && actualDate < today) return '逾期'

  return status
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

function buildRows(groups, context = {}) {
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

function getActualDurationDays(req) {
  const start = parseDate(req.approvedAt)
  const end = parseDate(req.publishedAt)

  if (!start || !end) return ''

  return Math.ceil((end - start) / DAY_MS)
}

function parseDate(value) {
  if (!value) return null

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfDay(value) {
  if (!value) return null
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function matchesCreatedDateRange(req, options = {}) {
  const createdAt = startOfDay(parseDate(req.createdAt))
  const startDate = startOfDay(parseDate(options.createdAtStart))
  const endDate = startOfDay(parseDate(options.createdAtEnd))

  if ((startDate || endDate) && !createdAt) return false
  if (startDate && createdAt < startDate) return false
  if (endDate && createdAt > endDate) return false
  return true
}

function matchesDevelopmentStatus(req, options = {}) {
  const { developmentStatus } = options
  if (!developmentStatus) return true
  return getRequirementDevelopmentStatus(req, options) === developmentStatus
}

function calculateGroupProgress(items) {
  if (!items.length) return 0
  const completed = items.filter(req => req.status === '已发布').length
  return Math.round((completed / items.length) * 100)
}

function formatDateRange(start, end) {
  const startText = formatDate(start)
  const endText = formatDate(end)

  if (startText && endText) return `${startText}至${endText}`
  if (startText) return `${startText}起`
  if (endText) return `截至${endText}`
  return ''
}

function sanitizeFileNameSegment(value) {
  return String(value)
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '')
}

function normalizeText(value) {
  return String(value || '').trim()
}

function isUnreviewedRequirement(req, status) {
  const approvalStatus = normalizeText(req.approvalStatus)

  if (status === '待审批' || status === '待评审') return true
  if (!approvalStatus) return false
  return approvalStatus !== 'approved'
}

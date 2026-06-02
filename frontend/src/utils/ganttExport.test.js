import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGanttCsv,
  buildGanttExcelHtml,
  createGanttExportFileName,
  flattenGanttGroups
} from './ganttExport.js'

const sampleGroups = [
  {
    platform: '统一支付',
    progress: 0,
    items: [
      {
        id: 'REQ-001',
        title: '支付, "结算" <核心>',
        submitter: '张三',
        developer: '李四',
        platform: '统一支付',
        capability: '账务',
        expectedDate: '2026-06-01',
        actualDate: '',
        priority: '高',
        score: 8,
        status: '开发中',
        createdAt: '2026-05-27T10:00:00.000Z'
      }
    ]
  }
]

test('flattenGanttGroups keeps group order and item order', () => {
  assert.deepEqual(flattenGanttGroups(sampleGroups), sampleGroups[0].items)
})

test('buildGanttCsv exports escaped rows with UTF-8 BOM for Excel', () => {
  const csv = buildGanttCsv(sampleGroups, { now: new Date('2026-06-02T00:00:00.000Z') })

  assert.ok(csv.startsWith('\ufeff需求标题,平台,能力,提交人,开发人员,状态'))
  assert.match(csv, /"支付, ""结算"" <核心>"/)
  assert.match(csv, /统一支付,账务,张三,李四,开发中,高,8,2026-05-27,2026-06-01,,5,是/)
})

test('buildGanttCsv and buildGanttExcelHtml neutralize spreadsheet formulas', () => {
  const formulaGroups = [
    {
      platform: '平台',
      items: [
        {
          title: '=HYPERLINK("https://example.com")',
          platform: '平台',
          status: '开发中',
          createdAt: '2026-06-01',
          expectedDate: '2026-06-02'
        }
      ]
    }
  ]

  const csv = buildGanttCsv(formulaGroups, { now: new Date('2026-06-02T00:00:00.000Z') })
  const html = buildGanttExcelHtml(formulaGroups, { now: new Date('2026-06-02T00:00:00.000Z') })

  assert.match(csv, /'\=HYPERLINK/)
  assert.match(html, /&#39;=HYPERLINK/)
})

test('buildGanttCsv and buildGanttExcelHtml preserve each exported requirement status', () => {
  const statusGroups = [
    {
      platform: '平台A',
      items: [
        {
          title: '需求一',
          platform: '平台A',
          status: '开发中',
          createdAt: '2026-06-01',
          expectedDate: '2026-06-05'
        },
        {
          title: '需求二',
          platform: '平台A',
          status: '测试中',
          createdAt: '2026-06-01',
          expectedDate: '2026-06-06'
        },
        {
          title: '需求三',
          platform: '平台A',
          status: '已发布',
          createdAt: '2026-06-01',
          actualDate: '2026-06-03'
        }
      ]
    }
  ]

  const csv = buildGanttCsv(statusGroups, { now: new Date('2026-06-02T00:00:00.000Z') })
  const html = buildGanttExcelHtml(statusGroups, { now: new Date('2026-06-02T00:00:00.000Z') })

  assert.match(csv, /需求一,平台A,,,,开发中/)
  assert.match(csv, /需求二,平台A,,,,测试中/)
  assert.match(csv, /需求三,平台A,,,,已发布/)
  assert.match(html, /<td>开发中<\/td>/)
  assert.match(html, /<td>测试中<\/td>/)
  assert.match(html, /<td>已发布<\/td>/)
})

test('buildGanttExcelHtml exports an Excel-readable HTML table safely', () => {
  const html = buildGanttExcelHtml(sampleGroups, { now: new Date('2026-06-02T00:00:00.000Z') })

  assert.match(html, /<meta charset="utf-8">/)
  assert.match(html, /<th>需求标题<\/th>/)
  assert.match(html, /支付, &quot;结算&quot; &lt;核心&gt;/)
  assert.match(html, /<td>是<\/td>/)
})

test('createGanttExportFileName includes date, view mode, filters and extension', () => {
  const fileName = createGanttExportFileName({
    extension: 'csv',
    viewMode: 'month',
    filters: {
      platform: '统一支付',
      status: '开发中',
      developer: ''
    },
    date: new Date('2026-06-02T00:00:00.000Z')
  })

  assert.equal(fileName, '项目进度甘特图_月_统一支付_开发中_2026-06-02.csv')
})

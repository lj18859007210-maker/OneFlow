import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGanttCsv,
  buildGanttExcelHtml,
  createGanttExportFileName,
  filterGanttGroupsByExportOptions,
  flattenGanttGroups,
  getRequirementDevelopmentStatus
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
        actualDate: '2026-06-03',
        publishedAt: '2026-06-04',
        approvedAt: '2026-06-01',
        priority: '高',
        score: 8,
        status: '已发布',
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
  assert.ok(csv.split('\r\n')[0].endsWith(',开发状态'))
  assert.match(csv.split('\r\n')[0], /实际日期,发布时间,实际工期\(天\),开发状态$/)
  assert.match(csv, /"支付, ""结算"" <核心>"/)
  assert.match(csv, /统一支付,账务,张三,李四,已发布,高,8,2026-05-27,2026-06-01,2026-06-03,2026-06-04,3,逾期/)
})

test('getRequirementDevelopmentStatus compares published date against actual date for released items', () => {
  assert.equal(
    getRequirementDevelopmentStatus({ status: '已发布', actualDate: '2026-06-03', publishedAt: '2026-06-02' }),
    '提前完成'
  )
  assert.equal(
    getRequirementDevelopmentStatus({ status: '已发布', actualDate: '2026-06-03T12:00:00.000Z', publishedAt: '2026-06-03T00:00:00.000Z' }),
    '及时完成'
  )
  assert.equal(
    getRequirementDevelopmentStatus({ status: '已发布', actualDate: '2026-06-03', publishedAt: '2026-06-04' }),
    '逾期'
  )
  assert.equal(getRequirementDevelopmentStatus({ status: '开发中', actualDate: '2026-06-03' }, { now: new Date('2026-06-02T00:00:00.000Z') }), '开发中')
  assert.equal(getRequirementDevelopmentStatus({ status: '测试中', actualDate: '2026-06-03', publishedAt: '2026-06-02' }, { now: new Date('2026-06-02T00:00:00.000Z') }), '测试中')
  assert.equal(getRequirementDevelopmentStatus({ status: '已发布', actualDate: '2026-06-03' }), '已发布')
})

test('getRequirementDevelopmentStatus marks approved in-flight overdue but keeps unreviewed items separate', () => {
  const now = new Date('2026-06-04T08:00:00.000Z')

  assert.equal(
    getRequirementDevelopmentStatus({ status: '开发中', approvalStatus: 'approved', actualDate: '2026-06-03' }, { now }),
    '逾期'
  )
  assert.equal(
    getRequirementDevelopmentStatus({ status: '测试中', approvalStatus: 'approved', actualDate: '2026-06-04' }, { now }),
    '测试中'
  )
  assert.equal(
    getRequirementDevelopmentStatus({ status: '待开发', approvalStatus: 'approved', actualDate: '2026-06-02' }, { now }),
    '逾期'
  )
  assert.equal(
    getRequirementDevelopmentStatus({ status: '待审批', approvalStatus: 'pending', actualDate: '2026-06-01' }, { now }),
    '未审核'
  )
  assert.equal(
    getRequirementDevelopmentStatus({ status: '待评审', approvalStatus: 'pending', actualDate: '2026-06-01' }, { now }),
    '未审核'
  )
})

test('filterGanttGroupsByExportOptions filters by created date range and development status without dropping in-flight items', () => {
  const groups = [
    {
      platform: '平台A',
      progress: 0,
      items: [
        { title: '提前', platform: '平台A', status: '已发布', actualDate: '2026-06-05', publishedAt: '2026-06-04', createdAt: '2026-06-03' },
        { title: '及时', platform: '平台A', status: '已发布', actualDate: '2026-06-05', publishedAt: '2026-06-05', createdAt: '2026-06-04' },
        { title: '逾期', platform: '平台A', status: '已发布', actualDate: '2026-06-05', publishedAt: '2026-06-06', createdAt: '2026-06-05' },
        { title: '流程中', platform: '平台A', status: '开发中', actualDate: '2026-06-05', createdAt: '2026-06-05' },
        { title: '范围外', platform: '平台A', status: '测试中', actualDate: '2026-06-05', createdAt: '2026-06-08' }
      ]
    }
  ]

  const filtered = filterGanttGroupsByExportOptions(groups, {
    createdAtStart: '2026-06-05',
    createdAtEnd: '2026-06-06'
  })

  assert.deepEqual(filtered.map(group => group.items.map(item => item.title)), [['逾期', '流程中']])

  const inFlight = filterGanttGroupsByExportOptions(groups, {
    createdAtStart: '2026-06-01',
    createdAtEnd: '2026-06-06',
    developmentStatus: '开发中'
  })
  assert.deepEqual(inFlight.map(group => group.items.map(item => item.title)), [['流程中']])
})

test('filterGanttGroupsByExportOptions can filter overdue in-flight and unreviewed items', () => {
  const groups = [
    {
      platform: '平台A',
      progress: 0,
      items: [
        { title: '已发布逾期', platform: '平台A', status: '已发布', actualDate: '2026-06-02', publishedAt: '2026-06-03', approvalStatus: 'approved', createdAt: '2026-06-01' },
        { title: '开发中逾期', platform: '平台A', status: '开发中', actualDate: '2026-06-03', approvalStatus: 'approved', createdAt: '2026-06-01' },
        { title: '测试中未逾期', platform: '平台A', status: '测试中', actualDate: '2026-06-04', approvalStatus: 'approved', createdAt: '2026-06-01' },
        { title: '未审核过期', platform: '平台A', status: '待审批', actualDate: '2026-06-01', approvalStatus: 'pending', createdAt: '2026-06-01' }
      ]
    }
  ]

  const overdue = filterGanttGroupsByExportOptions(groups, {
    developmentStatus: '逾期',
    now: new Date('2026-06-04T08:00:00.000Z')
  })
  assert.deepEqual(overdue.map(group => group.items.map(item => item.title)), [['已发布逾期', '开发中逾期']])

  const unreviewed = filterGanttGroupsByExportOptions(groups, {
    developmentStatus: '未审核',
    now: new Date('2026-06-04T08:00:00.000Z')
  })
  assert.deepEqual(unreviewed.map(group => group.items.map(item => item.title)), [['未审核过期']])
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
          actualDate: '2026-06-03',
          publishedAt: '2026-06-03'
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
  assert.match(html, /<th>发布时间<\/th>/)
  assert.match(html, /<th>实际工期\(天\)<\/th>/)
  assert.match(html, /<th>开发状态<\/th>/)
  assert.match(html, /支付, &quot;结算&quot; &lt;核心&gt;/)
  assert.match(html, /<td>逾期<\/td>/)
})

test('createGanttExportFileName includes date, view mode, filters and extension', () => {
  const fileName = createGanttExportFileName({
    extension: 'csv',
    viewMode: 'month',
    filters: {
      platform: '统一支付',
      status: '开发中',
      developer: '',
      developmentStatus: '及时完成',
      createdAtStart: '2026-05-01',
      createdAtEnd: '2026-05-31'
    },
    date: new Date('2026-06-02T00:00:00.000Z')
  })

  assert.equal(fileName, '项目进度甘特图_月_统一支付_开发中_及时完成_2026-05-01至2026-05-31_2026-06-02.csv')
})

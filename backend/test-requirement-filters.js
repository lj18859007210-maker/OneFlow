const assert = require('assert');
const requirementModel = require('./models/requirement');
const requirementController = require('./controllers/requirementController');

function expectThrows(fn, message) {
  let thrown = null;
  try {
    fn();
  } catch (error) {
    thrown = error;
  }
  assert(thrown, 'Expected function to throw');
  assert.match(thrown.message, message);
}

function run() {
  const filters = requirementController.parseRequirementListQuery({
    page: '3',
    pageSize: '15',
    status: '开发中',
    platform: 'OneFlow',
    developer: '张三',
    priority: '高',
    dateStart: '2026-05-01',
    dateEnd: '2026-05-26',
    minScore: '0',
    maxScore: '100',
    isOverdue: 'true',
    keyword: '  OneFlow  '
  });

  assert.strictEqual(filters.page, 3);
  assert.strictEqual(filters.pageSize, 15);
  assert.strictEqual(filters.status, '开发中');
  assert.strictEqual(filters.platform, 'OneFlow');
  assert.strictEqual(filters.developer, '张三');
  assert.strictEqual(filters.priority, '高');
  assert.strictEqual(filters.minScore, 0);
  assert.strictEqual(filters.maxScore, 100);
  assert.strictEqual(filters.isOverdue, 'true');
  assert.strictEqual(filters.keyword, 'OneFlow');
  assert(filters.dateStart instanceof Date);
  assert(filters.dateEndExclusive instanceof Date);
  assert.strictEqual(filters.dateStart.toISOString(), '2026-05-01T00:00:00.000Z');
  assert.strictEqual(filters.dateEndExclusive.toISOString(), '2026-05-27T00:00:00.000Z');

  expectThrows(
    () => requirementController.parseRequirementListQuery({ minScore: '80', maxScore: '60' }),
    /minScore cannot be greater than maxScore/
  );

  expectThrows(
    () => requirementController.parseRequirementListQuery({ dateStart: '2026-05-26', dateEnd: '2026-05-01' }),
    /dateStart cannot be later than dateEnd/
  );

  const built = requirementModel.buildRequirementListFilters({
    status: '开发中',
    platform: 'OneFlow',
    developer: '张三',
    priority: '高',
    dateStart: new Date('2026-05-01T00:00:00.000Z'),
    dateEndExclusive: new Date('2026-05-27T00:00:00.000Z'),
    minScore: 0,
    maxScore: 100,
    isOverdue: 'true',
    keyword: 'OneFlow'
  });

  assert.match(built.whereClause, /WHERE isDraft = 0/);
  assert.match(built.whereClause, /status = :status/);
  assert.match(built.whereClause, /platform = :platform/);
  assert.match(built.whereClause, /developer = :developer/);
  assert.match(built.whereClause, /priority = :priority/);
  assert.match(built.whereClause, /createdAt >= :dateStart/);
  assert.match(built.whereClause, /createdAt < :dateEndExclusive/);
  assert.match(built.whereClause, /score >= :minScore/);
  assert.match(built.whereClause, /score <= :maxScore/);
  assert.match(built.whereClause, /expectedDate IS NOT NULL/);
  assert.match(built.whereClause, /expectedDate < TRUNC\(SYSDATE\)/);
  assert.match(built.whereClause, /status != :releasedStatus/);
  assert.match(built.whereClause, /LOWER\(title\) LIKE :keyword/);
  assert.match(built.whereClause, /LOWER\(submitter\) LIKE :keyword/);
  assert.match(built.whereClause, /LOWER\(developer\) LIKE :keyword/);
  assert.match(built.whereClause, /LOWER\(status\) LIKE :keyword/);
  assert.strictEqual(built.params.keyword, '%oneflow%');
  assert.strictEqual(built.params.releasedStatus, '已发布');

  const notOverdue = requirementModel.buildRequirementListFilters({ isOverdue: 'false' });
  assert.match(notOverdue.whereClause, /\(expectedDate IS NULL OR expectedDate >= TRUNC\(SYSDATE\) OR status = :releasedStatus\)/);

  const earlyFinishedQuery = requirementController.parseRequirementListQuery({ isOverdue: 'early' });
  assert.strictEqual(earlyFinishedQuery.isOverdue, 'early');

  const earlyFinished = requirementModel.buildRequirementListFilters({ isOverdue: 'early' });
  assert.match(earlyFinished.whereClause, /status = :earlyReleasedStatus/);
  assert.match(earlyFinished.whereClause, /expectedDate IS NOT NULL/);
  assert.match(earlyFinished.whereClause, /publishedAt IS NOT NULL/);
  assert.match(earlyFinished.whereClause, /TRUNC\(publishedAt\) < TRUNC\(expectedDate\)/);
  assert.strictEqual(earlyFinished.params.earlyReleasedStatus, '已发布');

  const summary = requirementModel.buildSummaryQueryParts({ platform: 'OneFlow' });
  assert.match(summary.whereClause, /platform = :platform/);
  assert.deepStrictEqual(summary.params, { platform: 'OneFlow' });

  console.log('requirement filter tests passed');
}

run();


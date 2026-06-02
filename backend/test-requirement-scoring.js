const assert = require('assert');
const {
  calculateRequirementScore,
  scoreCallVolume,
  scoreCapability,
  scoreCompletionTimeliness,
  scorePressureReduction
} = require('./utils/requirementScoring');
const requirementModel = require('./models/requirement');

function run() {
  assert.strictEqual(scoreCallVolume(360), 20);
  assert.strictEqual(scoreCallVolume(359), 18);
  assert.strictEqual(scoreCallVolume(180), 18);
  assert.strictEqual(scoreCallVolume(179), 16);
  assert.strictEqual(scoreCallVolume(120), 16);
  assert.strictEqual(scoreCallVolume(119), 14);
  assert.strictEqual(scoreCallVolume(24), 14);
  assert.strictEqual(scoreCallVolume(23), 10);

  assert.strictEqual(scoreCapability('一线支撑'), 20);
  assert.strictEqual(scoreCapability('内部支撑'), 16);
  assert.strictEqual(scoreCapability('集团迎检'), 10);
  assert.strictEqual(scoreCapability('未知能力'), 10);

  assert.strictEqual(scoreCompletionTimeliness({
    status: '已发布',
    updatedAt: '2026-06-01T10:00:00+08:00',
    actualDate: '2026-06-02'
  }), 15);
  assert.strictEqual(scoreCompletionTimeliness({
    status: '已发布',
    updatedAt: '2026-06-02T23:59:59+08:00',
    actualDate: '2026-06-02'
  }), 8);
  assert.strictEqual(scoreCompletionTimeliness({
    status: '已发布',
    updatedAt: '2026-06-03T00:00:00+08:00',
    actualDate: '2026-06-02'
  }), 0);
  assert.strictEqual(scoreCompletionTimeliness({
    publishedAt: '2026-06-01',
    expectedDate: '2026-06-02'
  }), 15);
  assert.strictEqual(scoreCompletionTimeliness({
    status: '开发中',
    updatedAt: '2026-06-01',
    actualDate: '2026-06-02'
  }), 0);

  assert.strictEqual(scorePressureReduction({ avgDevTime: null, postDevAvgTime: '1天' }), 5);
  assert.strictEqual(scorePressureReduction({ avgDevTime: '0天', postDevAvgTime: '1天' }), 5);
  assert.strictEqual(scorePressureReduction({ avgDevTime: '10天', postDevAvgTime: null }), 5);
  assert.strictEqual(scorePressureReduction({ avgDevTime: '10天', postDevAvgTime: '7天' }), 15);
  assert.strictEqual(scorePressureReduction({ avgDevTime: '10天', postDevAvgTime: '8.5天' }), 7.5);
  assert.strictEqual(scorePressureReduction({ avgDevTime: '10天', postDevAvgTime: '12天' }), 5);
  assert.strictEqual(scorePressureReduction({ avgDevTime: '2天', postDevAvgTime: '24小时' }), 15);

  assert.strictEqual(calculateRequirementScore({
    avgMonthlyCalls: 360,
    capability: '一线支撑',
    priority: '低',
    avgDevTime: '10天',
    postDevAvgTime: '6天',
    status: '已发布',
    updatedAt: '2026-06-01T10:00:00+08:00',
    actualDate: '2026-06-02'
  }), 100);

  const timelyScore = calculateRequirementScore({
    avgMonthlyCalls: 180,
    capability: '内部支撑',
    priority: '高',
    avgDevTime: '10天',
    postDevAvgTime: '8.5天',
    status: '已发布',
    updatedAt: '2026-06-02T23:59:59+08:00',
    actualDate: '2026-06-02'
  });
  assert.strictEqual(timelyScore, 79.5);
  assert.strictEqual(calculateRequirementScore({
    avgMonthlyCalls: 180,
    capability: '内部支撑',
    priority: '低',
    avgDevTime: '10天',
    postDevAvgTime: '8.5天',
    status: '已发布',
    updatedAt: '2026-06-02T23:59:59+08:00',
    actualDate: '2026-06-02'
  }), timelyScore);

  assert.strictEqual(requirementModel.resolveRequirementScore({
    avgMonthlyCalls: 360,
    capability: '一线支撑',
    priority: '高',
    avgDevTime: '10天',
    postDevAvgTime: '6天',
    status: '已发布',
    updatedAt: '2026-06-01T10:00:00+08:00',
    actualDate: '2026-06-02'
  }), 100);

  assert.strictEqual(requirementModel.resolveRequirementScore({ score: 66 }), 66);

  assert.strictEqual(requirementModel.resolveRequirementScore({
    isDraft: true,
    avgMonthlyCalls: 360,
    capability: '一线支撑',
    priority: '高',
    avgDevTime: '10天',
    postDevAvgTime: '6天',
    status: '已发布',
    updatedAt: '2026-06-01T10:00:00+08:00',
    actualDate: '2026-06-02'
  }), 0);

  assert.strictEqual(requirementModel.resolveRequirementScore(
    { avgMonthlyCalls: 180, postDevAvgTime: '8.5天' },
    {
      AVGMONTHLYCALLS: 24,
      CAPABILITY: '内部支撑',
      PRIORITY: '中',
      AVGDEVTIME: '10天',
      POSTDEVAVGTIME: '9天',
      STATUS: '已发布',
      UPDATEDAT: new Date('2026-06-02T23:59:59+08:00'),
      ACTUALDATE: new Date('2026-06-02')
    }
  ), 79.5);

  assert.strictEqual(requirementModel.resolveRequirementScore(
    { status: '已发布', updatedAt: '2026-06-01T10:00:00+08:00' },
    {
      ISDRAFT: 0,
      SCORE: 77,
      AVGMONTHLYCALLS: 360,
      CAPABILITY: '一线支撑',
      PRIORITY: '低',
      AVGDEVTIME: '10天',
      POSTDEVAVGTIME: '6天',
      STATUS: '测试中',
      ACTUALDATE: new Date('2026-06-02')
    }
  ), 100);

  assert.strictEqual(requirementModel.resolveRequirementScore(
    { status: '已发布', updatedAt: '2026-06-01T10:00:00+08:00' },
    {
      isDraft: 0,
      score: 77,
      avgMonthlyCalls: 360,
      capability: '一线支撑',
      priority: '低',
      avgDevTime: '10天',
      postDevAvgTime: '6天',
      status: '测试中',
      actualDate: new Date('2026-06-02')
    }
  ), 100);

  assert.strictEqual(requirementModel.resolveRequirementScore(
    { avgMonthlyCalls: 360, updatedAt: '2026-06-05T10:00:00+08:00' },
    {
      ISDRAFT: 0,
      SCORE: 77,
      AVGMONTHLYCALLS: 24,
      CAPABILITY: '一线支撑',
      AVGDEVTIME: '10天',
      POSTDEVAVGTIME: '6天',
      STATUS: '已发布',
      UPDATEDAT: new Date('2026-06-05T10:00:00+08:00'),
      PUBLISHEDAT: new Date('2026-06-01T10:00:00+08:00'),
      ACTUALDATE: new Date('2026-06-02')
    }
  ), 100);

  assert.strictEqual(requirementModel.resolveRequirementScore(
    { title: '只改标题' },
    {
      ISDRAFT: 0,
      SCORE: 77,
      AVGMONTHLYCALLS: 360,
      CAPABILITY: '一线支撑',
      PRIORITY: '高',
      AVGDEVTIME: '10天',
      POSTDEVAVGTIME: '6天'
    }
  ), 77);

  assert.strictEqual(requirementModel.resolveRequirementScore(
    { avgMonthlyCalls: 360 },
    {
      ISDRAFT: 1,
      SCORE: 0,
      AVGMONTHLYCALLS: 24,
      CAPABILITY: '内部支撑',
      PRIORITY: '中',
      AVGDEVTIME: '10天',
      POSTDEVAVGTIME: '9天'
    }
  ), 0);

  console.log('requirement scoring tests passed');
}

run();

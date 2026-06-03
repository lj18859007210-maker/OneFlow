const FIXED_SUCCESS_RATE_SCORE = 15;
const RELEASED_STATUS = '已发布';

function toNumber(value) {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseTimeToHours(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value * 24 : null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const amount = Number(match[0]);
  if (!Number.isFinite(amount)) return null;

  if (/小时|hour|hr|h/i.test(normalized)) return amount;
  if (/分钟|minute|min|m/i.test(normalized)) return amount / 60;
  return amount * 24;
}

function roundScore(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function getField(source = {}, ...names) {
  for (const name of names) {
    if (source[name] !== undefined && source[name] !== null && source[name] !== '') {
      return source[name];
    }
  }
  return null;
}

function getPublishTime(requirement = {}) {
  return getField(
    requirement,
    'publishedAt',
    'publishDate',
    'releaseAt',
    'releaseDate',
    'PUBLISHEDAT',
    'PUBLISHDATE',
    'RELEASEAT',
    'RELEASEDATE'
  );
}

function isReleased(requirement = {}) {
  return String(getField(requirement, 'status', 'STATUS') || '').trim() === RELEASED_STATUS;
}

function toCalendarDay(value) {
  if (value === undefined || value === null || value === '') return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const normalized = String(value).trim();
  const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return Date.UTC(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function scoreCallVolume(avgMonthlyCalls) {
  const calls = toNumber(avgMonthlyCalls);
  if (calls === null) return 10;
  if (calls >= 360) return 20;
  if (calls >= 180) return 18;
  if (calls >= 120) return 16;
  if (calls >= 24) return 14;
  return 10;
}

function scoreCapability(capability) {
  const map = {
    '一线支撑': 20,
    '内部支撑': 16,
    '集团迎检': 10
  };
  return map[String(capability || '').trim()] || 10;
}

function scorePriority(priority) {
  const map = {
    '低': 8,
    '中': 12,
    '高': 15
  };
  return map[String(priority || '').trim()] || 12;
}

function scoreCompletionTimeliness(requirement = {}) {
  const publishTime = getPublishTime(requirement);
  const deadline = getField(requirement, 'actualDate', 'ACTUALDATE', 'expectedDate', 'EXPECTEDDATE');
  const publishDay = toCalendarDay(publishTime);
  const deadlineDay = toCalendarDay(deadline);

  if (publishDay === null || deadlineDay === null) return 0;
  if (publishDay < deadlineDay) return 15;
  if (publishDay === deadlineDay) return 10;
  return 0;
}

function scorePressureReduction({ avgDevTime, postDevAvgTime } = {}) {
  const oldUseTime = parseTimeToHours(avgDevTime);
  const newUseTime = parseTimeToHours(postDevAvgTime);

  if (oldUseTime === null || oldUseTime <= 0 || newUseTime === null) return 5;

  const saveTime = oldUseTime - newUseTime;
  const ratio = saveTime / oldUseTime;

  if (ratio >= 0.3) return 15;
  if (ratio > 0 && ratio < 0.3) return roundScore(15 * (ratio / 0.3));
  return 5;
}

function calculateRequirementScore(requirement = {}) {
  if (!isReleased(requirement)) return 0;

  return roundScore(
    scoreCallVolume(requirement.avgMonthlyCalls) +
    scoreCapability(requirement.capability) +
    FIXED_SUCCESS_RATE_SCORE +
    scorePriority(requirement.priority) +
    scoreCompletionTimeliness(requirement) +
    scorePressureReduction({
      avgDevTime: requirement.avgDevTime,
      postDevAvgTime: requirement.postDevAvgTime
    })
  );
}

module.exports = {
  FIXED_SUCCESS_RATE_SCORE,
  calculateRequirementScore,
  scoreCallVolume,
  scoreCapability,
  scorePriority,
  scoreCompletionTimeliness,
  scorePressureReduction,
  parseTimeToHours
};

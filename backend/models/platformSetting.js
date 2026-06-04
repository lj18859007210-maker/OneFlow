const systemSettingModel = require('./systemSetting');

const PLATFORM_LIST_KEY = 'requirement.platforms';
const DEFAULT_PLATFORMS = [
  {
    name: '默认平台',
    children: [
      'CRM 系统',
      'BOSS 系统',
      'OA 办公系统',
      '网管支撑平台',
      '大数据分析平台',
      '掌上移动 APP'
    ]
  }
];

function normalizeLegacyPlatformList(platforms) {
  const seen = new Set();
  const children = [];

  platforms.forEach(platform => {
    const value = normalizePlatformName(platform);
    if (!value || seen.has(value)) return;
    seen.add(value);
    children.push(value);
  });

  if (children.length === 0) {
    throw new Error('至少保留一个平台');
  }

  return [{ name: '默认平台', children }];
}

function normalizePlatformName(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return String(value.name || value.label || value.value || '').trim();
  }
  return String(value || '').trim();
}

function normalizePlatforms(platforms) {
  if (!Array.isArray(platforms)) {
    throw new Error('platforms must be an array');
  }

  if (platforms.every(platform => typeof platform !== 'object' || platform === null || Array.isArray(platform))) {
    return normalizeLegacyPlatformList(platforms);
  }

  const seenGroups = new Set();
  const normalized = [];

  platforms.forEach(group => {
    const name = String(group?.name || '').trim();
    if (!name || seenGroups.has(name)) return;

    const seenChildren = new Set();
    const children = Array.isArray(group?.children)
      ? group.children.reduce((items, child) => {
        const value = normalizePlatformName(child);
        if (!value || seenChildren.has(value)) return items;
        seenChildren.add(value);
        items.push(value);
        return items;
      }, [])
      : [];

    seenGroups.add(name);
    normalized.push({ name, children });
  });

  if (normalized.length === 0) {
    throw new Error('至少保留一个平台');
  }

  return normalized;
}

function parseStoredPlatforms(stored) {
  if (!stored) return DEFAULT_PLATFORMS;

  try {
    const parsed = JSON.parse(stored);
    return normalizePlatforms(parsed);
  } catch (error) {
    return DEFAULT_PLATFORMS;
  }
}

async function getPlatforms() {
  const stored = await systemSettingModel.getValue(
    PLATFORM_LIST_KEY,
    JSON.stringify(DEFAULT_PLATFORMS)
  );
  return parseStoredPlatforms(stored);
}

async function updatePlatforms(platforms) {
  const normalized = normalizePlatforms(platforms);
  await systemSettingModel.setValue(PLATFORM_LIST_KEY, JSON.stringify(normalized));
  return normalized;
}

module.exports = {
  DEFAULT_PLATFORMS,
  getPlatforms,
  normalizePlatforms,
  updatePlatforms
};

import { platformApi } from '../api'

export const DEFAULT_PLATFORMS = [
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
]

function normalizeLegacyPlatformList(platforms) {
  const seen = new Set()
  const children = platforms.reduce((items, platform) => {
    const value = String(platform || '').trim()
    if (!value || seen.has(value)) return items
    seen.add(value)
    items.push(value)
    return items
  }, [])

  return children.length > 0 ? [{ name: '默认平台', children }] : [...DEFAULT_PLATFORMS]
}

function normalizePlatformName(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return String(value.name || value.label || value.value || '').trim()
  }
  return String(value || '').trim()
}

export function normalizePlatforms(platforms) {
  if (!Array.isArray(platforms)) return [...DEFAULT_PLATFORMS]
  if (platforms.every(platform => typeof platform !== 'object' || platform === null || Array.isArray(platform))) {
    return normalizeLegacyPlatformList(platforms)
  }

  const seenGroups = new Set()
  return platforms.reduce((items, platform) => {
    const name = String(platform?.name || '').trim()
    if (!name || seenGroups.has(name)) return items

    const seenChildren = new Set()
    const children = Array.isArray(platform?.children)
      ? platform.children.reduce((childItems, child) => {
        const value = normalizePlatformName(child)
        if (!value || seenChildren.has(value)) return childItems
        seenChildren.add(value)
        childItems.push(value)
        return childItems
      }, [])
      : []

    seenGroups.add(name)
    items.push({ name, children })
    return items
  }, [])
}

export function getPlatformOptionValue(groupName, childName = '') {
  const group = String(groupName || '').trim()
  const child = String(childName || '').trim()
  return child ? `${group} / ${child}` : group
}

export async function loadPlatformOptions() {
  try {
    const res = await platformApi.getAll()
    const platforms = normalizePlatforms(res.data?.data)
    return platforms.length > 0 ? platforms : [...DEFAULT_PLATFORMS]
  } catch (error) {
    return [...DEFAULT_PLATFORMS]
  }
}

export function parseDurationToHours(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  const unitPattern = /(-?\d+(?:\.\d+)?)\s*(天|小时|小時|分钟|分鐘|days?|d|hours?|hrs?|h|minutes?|mins?|m)/gi;
  let totalHours = 0;
  let matchedUnit = false;

  for (const match of normalized.matchAll(unitPattern)) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(amount)) continue;

    matchedUnit = true;
    if (unit === '天' || unit === 'd' || unit.startsWith('day')) {
      totalHours += amount * 24;
    } else if (unit === '分钟' || unit === '分鐘' || unit === 'm' || unit.startsWith('min')) {
      totalHours += amount / 60;
    } else {
      totalHours += amount;
    }
  }

  if (matchedUnit) return totalHours;

  const numericMatch = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!numericMatch) return null;

  const hours = Number(numericMatch[0]);
  return Number.isFinite(hours) ? hours : null;
}

export function formatDurationAsDaysHours(value) {
  const hours = parseDurationToHours(value);
  if (hours === null || hours < 0) return '-';

  const totalHours = hours > 0 && hours < 1 ? 1 : Math.round(hours);
  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  return `${days}天${remainingHours}小时`;
}

export function formatMonthlyDuration(avgTimePerCall, avgMonthlyCalls) {
  const hoursPerCall = parseDurationToHours(avgTimePerCall);
  const monthlyCalls = Number(avgMonthlyCalls);

  if (hoursPerCall === null || !Number.isFinite(monthlyCalls) || monthlyCalls < 0) {
    return '-';
  }

  return formatDurationAsDaysHours(hoursPerCall * monthlyCalls);
}

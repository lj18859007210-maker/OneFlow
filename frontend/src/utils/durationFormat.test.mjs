import assert from 'node:assert/strict';
import {
  formatDurationAsDaysHours,
  formatMonthlyDuration
} from './durationFormat.js';

assert.equal(formatDurationAsDaysHours(27), '1天3小时');
assert.equal(formatDurationAsDaysHours('4'), '0天4小时');
assert.equal(formatDurationAsDaysHours('3小时'), '0天3小时');
assert.equal(formatDurationAsDaysHours('2天5小时'), '2天5小时');
assert.equal(formatDurationAsDaysHours('2天'), '2天0小时');
assert.equal(formatDurationAsDaysHours(0.4), '0天1小时');
assert.equal(formatDurationAsDaysHours(''), '-');
assert.equal(formatMonthlyDuration(4, 157), '26天4小时');
assert.equal(formatMonthlyDuration('3', 157), '19天15小时');
assert.equal(formatMonthlyDuration('1天3小时', 2), '2天6小时');

console.log('duration format tests passed');

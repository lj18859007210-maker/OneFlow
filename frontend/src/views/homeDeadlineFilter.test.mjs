import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'Home.vue'), 'utf8');

assert.match(source, /全部时限状态/, 'deadline filter should use a broader deadline-status label');
assert.match(source, /<option value="true">仅逾期<\/option>/, 'deadline filter should keep overdue option');
assert.match(source, /<option value="early">提前完成<\/option>/, 'deadline filter should expose early completion option');
assert.match(source, /<option value="false">仅未逾期<\/option>/, 'deadline filter should keep not-overdue option');
assert.doesNotMatch(source, /全部逾期状态/, 'old overdue-only label should be removed');

console.log('home deadline filter tests passed');

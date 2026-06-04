import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'Detail.vue'), 'utf8');

assert.match(source, /ops-hero-card/, 'detail page should use a cockpit-style hero card');
assert.match(source, /<span>评分<\/span>/, 'summary strip should expose score label');
assert.match(source, /requirement\.score/, 'summary strip should bind the requirement score');
assert.match(source, /<span>计划日期<\/span><strong>{{ requirement\.actualDate \? formatDate\(requirement\.actualDate\) : '未设置' }}<\/strong>/, 'summary strip plan date should use actualDate');
assert.match(source, /formatDurationAsDaysHours\(requirement\.lifecycleTiming\?\.preDevelopmentHours\)/, 'pre-development time should be formatted from approval-to-testing lifecycle hours');
assert.match(source, /formatDurationAsDaysHours\(requirement\.lifecycleTiming\?\.postDevelopmentHours\)/, 'post-development time should be formatted from testing-to-release lifecycle hours');

console.log('detail hero summary tests passed');

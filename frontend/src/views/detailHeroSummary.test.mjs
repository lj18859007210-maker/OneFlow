import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'Detail.vue'), 'utf8');

assert.match(source, /ops-hero-card/, 'detail page should use a cockpit-style hero card');
assert.match(source, /<span>评分<\/span>/, 'summary strip should expose score label');
assert.match(source, /requirement\.score/, 'summary strip should bind the requirement score');
assert.match(source, /requirement\.actualDate/, 'summary strip plan date should use actualDate');
assert.doesNotMatch(source, /requirement\.expectedDate\s*\?\s*formatDate\(requirement\.expectedDate\)\s*:\s*"未设置"/, 'summary strip plan date should not use expectedDate');
assert.match(source, /formatDurationAsDaysHours/, 'summary strip durations should use duration formatting');
assert.match(source, /requirement\.lifecycleTiming\?\.preDevelopmentHours/, 'pre-development time should use approval-to-testing lifecycle hours');
assert.match(source, /requirement\.lifecycleTiming\?\.postDevelopmentHours/, 'post-development time should use testing-to-release lifecycle hours');

console.log('detail hero summary tests passed');

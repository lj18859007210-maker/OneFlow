import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'Detail.vue'), 'utf8');
const contactPanel = source.match(
  /<div class="ops-panel-head"><h2>联系方式<\/h2><\/div>[\s\S]*?<\/dl>/,
)?.[0] || '';

assert.ok(contactPanel, 'detail page should render a contact panel');
assert.match(contactPanel, /<dt>提交人<\/dt>/, 'contact panel should show submitter');
assert.match(contactPanel, /requirement\.submitter/, 'submitter should come from requirement details');
assert.match(contactPanel, /<dt>开发人员<\/dt>/, 'contact panel should show developer');
assert.match(contactPanel, /requirement\.developer/, 'developer should come from requirement details');
assert.match(contactPanel, /<dt>需求人邮箱<\/dt>/, 'contact panel should show the current requirement submitter email');
assert.match(contactPanel, /requirement\.submitterEmail/, 'submitter email should be resolved from this requirement submitter');
assert.match(contactPanel, /<dt>开发人员邮箱<\/dt>/, 'contact panel should show the current requirement developer emails');
assert.match(contactPanel, /formatContactEmails\(requirement\.developerEmails\)/, 'developer emails should be resolved from this requirement developers');
assert.doesNotMatch(contactPanel, /requirement\.senderEmail|requirement\.ccEmails/, 'contact panel should not use sender or cc email fields');
assert.doesNotMatch(contactPanel, /<dt>平台<\/dt>|<dt>能力<\/dt>|<dt>实时限额<\/dt>|<dt>创建时间<\/dt>/, 'contact panel should not show the old information fields');

console.log('detail contact panel tests passed');

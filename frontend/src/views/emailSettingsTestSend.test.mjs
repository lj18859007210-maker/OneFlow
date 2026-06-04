import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'EmailSettings.vue'), 'utf8');

assert.match(source, /测试发送/, 'EmailSettings should expose a test send panel');
assert.match(source, /v-model\.trim="testEmail\.to"/, 'EmailSettings should collect a test recipient');
assert.match(source, /sendTestEmail/, 'EmailSettings should define a test send action');
assert.match(source, /emailApi\.send/, 'EmailSettings should call the email send API for test delivery');
assert.match(source, /测试邮件发送成功/, 'EmailSettings should show a success toast after test delivery');
assert.match(source, /请填写测试收件人/, 'EmailSettings should validate the test recipient');
assert.match(source, /测试邮件/, 'EmailSettings should send a recognizable test subject/body');

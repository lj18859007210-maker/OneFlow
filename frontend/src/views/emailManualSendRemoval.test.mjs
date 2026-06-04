import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = [
  resolve(__dirname, 'Submit.vue'),
  resolve(__dirname, '../components/RequirementForm.vue'),
  resolve(__dirname, 'Approval.vue')
];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /emailApi\.send/, `${file} should not manually send emails from the browser`);
  assert.doesNotMatch(source, /admin@cmcc\.cn|submitter@cmcc\.cn/, `${file} should not hard-code email recipients`);
  assert.doesNotMatch(source, /邮件已发送|邮件发送中|邮件发送失败/, `${file} should not claim browser-side email delivery`);
}

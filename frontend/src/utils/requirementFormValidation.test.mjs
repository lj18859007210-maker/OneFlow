import assert from 'node:assert/strict';
import {
  validateRequirementForm,
  isDecimalNumberText,
  isIntegerNumberText
} from './requirementFormValidation.js';

const completeForm = {
  title: '投诉工单自动分派',
  submitter: '张伟',
  developer: '王五',
  platform: 'CRM 系统',
  capability: '一线支撑',
  expectedDate: '2026-06-30',
  avgDevTime: '0.8',
  postDevAvgTime: '0.2',
  avgMonthlyCalls: '500',
  priority: '中'
};

assert.equal(validateRequirementForm(completeForm), '');

assert.match(
  validateRequirementForm({ ...completeForm, platform: '' }),
  /对应平台/,
  'platform should be required'
);

assert.match(
  validateRequirementForm({ ...completeForm, avgDevTime: '1天' }),
  /开发前后平均用时只能填写数字/,
  'development time should reject unit text'
);

assert.match(
  validateRequirementForm({ ...completeForm, postDevAvgTime: '1e3' }),
  /开发前后平均用时只能填写数字/,
  'development time should reject exponential notation'
);

assert.match(
  validateRequirementForm({ ...completeForm, avgMonthlyCalls: '12.5' }),
  /平均预估每月调用量只能填写数字/,
  'monthly calls should be whole-number text'
);

assert.equal(isDecimalNumberText('0.8'), true);
assert.equal(isDecimalNumberText('10'), true);
assert.equal(isDecimalNumberText('10.25'), true);
assert.equal(isDecimalNumberText('1天'), false);
assert.equal(isDecimalNumberText('1e3'), false);
assert.equal(isIntegerNumberText('500'), true);
assert.equal(isIntegerNumberText('500.5'), false);

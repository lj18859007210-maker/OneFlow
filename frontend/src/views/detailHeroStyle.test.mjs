import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, 'Detail.vue'), 'utf8');

assert.match(source, /\.ops-hero-card\s*\{[\s\S]*linear-gradient\(135deg/, 'hero card should define the cockpit gradient');
assert.match(source, /\.ops-hero-card \.ops-summary-strip\s*\{[\s\S]*grid-template-columns:\s*repeat\(8,\s*minmax\(0,\s*1fr\)\)/, 'hero summary should render as an eight-column cockpit grid');
assert.match(source, /\.ops-hero-card \.score-card\s*\{[\s\S]*rgba\(255,\s*218,\s*137/, 'score card should keep the highlighted cockpit treatment');

console.log('detail hero style tests passed');

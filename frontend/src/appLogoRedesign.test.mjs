import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const appSource = fs.readFileSync(path.join(root, 'App.vue'), 'utf8')
const globalStyles = fs.readFileSync(path.join(root, 'styles', 'global.css'), 'utf8')

assert.match(
  appSource,
  /<div class="tech-logo-visual" aria-hidden="true">[\s\S]*<span class="tech-logo-chart[^"]*"/,
  'sidebar brand should use a visual image-like banner above the logo text'
)

assert.match(
  appSource,
  /<div class="tech-logo-brand-row">[\s\S]*<div class="tech-logo-mark"/,
  'sidebar brand should separate the image banner from the logo/text row'
)

assert.doesNotMatch(
  appSource,
  /class="tech-logo-icon"[\s\S]*<svg/,
  'sidebar brand should no longer be the old blue card with inline svg icon'
)

assert.match(
  globalStyles,
  /\.tech-logo-visual\s*\{[\s\S]*aspect-ratio:\s*16\s*\/\s*9/,
  'brand visual should have a stable image-like aspect ratio'
)

assert.match(
  globalStyles,
  /\.tech-logo-wrap\s*\{[\s\S]*display:\s*grid/,
  'brand card should stack visual and identity rows'
)

console.log('app logo redesign tests passed')

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const globalStyles = fs.readFileSync(path.join(root, 'styles', 'global.css'), 'utf8')

assert.match(
  globalStyles,
  /\.tech-sidebar\s*\{[\s\S]*height:\s*100vh/,
  'fixed sidebar should explicitly fill the viewport height'
)

assert.match(
  globalStyles,
  /\.tech-sidebar\s*\{[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/,
  'sidebar should lay out logo and navigation in a vertical flex stack'
)

assert.match(
  globalStyles,
  /\.tech-nav\s*\{[\s\S]*flex:\s*1[\s\S]*overflow-y:\s*auto/,
  'sidebar navigation should scroll when menu items exceed the viewport'
)

assert.match(
  globalStyles,
  /\.tech-logo-wrap\s*\{[\s\S]*flex:\s*0\s+0\s+auto/,
  'sidebar brand should keep its natural height while nav takes remaining space'
)

console.log('sidebar layout tests passed')

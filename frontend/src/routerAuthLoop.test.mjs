import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const mainSource = fs.readFileSync(path.join(root, 'main.js'), 'utf8')
const sessionSource = fs.readFileSync(path.join(root, 'utils', 'session.js'), 'utf8')

assert.match(
  sessionSource,
  /export function clearStoredSession\(\) \{[\s\S]*localStorage\.removeItem\('currentUser'\)[\s\S]*localStorage\.removeItem\('token'\)/,
  'session utilities should expose one helper that clears both user and token'
)

assert.match(
  mainSource,
  /const token = localStorage\.getItem\('token'\)[\s\S]*const currentUser = getStoredCurrentUser\(\)[\s\S]*const hasSession = Boolean\(token && currentUser\)/,
  'router guard should require both token and currentUser before treating a visitor as logged in'
)

assert.doesNotMatch(
  mainSource,
  /const user = localStorage\.getItem\('currentUser'\)/,
  'router guard should not treat stale currentUser alone as an authenticated session'
)

assert.match(
  mainSource,
  /catch \(error\) \{[\s\S]*clearStoredSession\(\)[\s\S]*next\('\/login'\)/,
  'router guard should clear stale session state before redirecting to login after auth refresh failure'
)

import assert from 'node:assert/strict'
import {
  clampFabPosition,
  getDefaultFabPosition,
  getViewportRect,
} from './aiChatPosition.js'

const fabSize = { width: 60, height: 72 }
const viewport = { left: 0, top: 0, width: 1440, height: 900 }
const mainRect = { left: 240, top: 0, right: 1440, bottom: 900, width: 1200, height: 900 }

assert.deepEqual(
  getDefaultFabPosition({ viewport, anchorRect: mainRect, fabSize, margin: 28 }),
  { x: 1352, y: 800 },
  'default fab position should anchor to the main content bottom-right'
)

assert.deepEqual(
  getDefaultFabPosition({
    viewport: { left: 0, top: 0, width: 1024, height: 768 },
    anchorRect: { left: 240, top: 0, right: 1024, bottom: 768, width: 784, height: 768 },
    fabSize,
    margin: 28,
  }),
  { x: 936, y: 668 },
  'default fab position should recalculate when the viewport changes'
)

assert.deepEqual(
  clampFabPosition({
    position: { x: -40, y: 900 },
    viewport,
    anchorRect: mainRect,
    fabSize,
    margin: 8,
  }),
  { x: 248, y: 820 },
  'dragged fab position should stay inside the main content viewport'
)

assert.deepEqual(
  getViewportRect({ innerWidth: 1200, innerHeight: 700 }),
  { left: 0, top: 0, width: 1200, height: 700, right: 1200, bottom: 700 },
  'viewport rect should expose the browser visible area'
)

console.log('ai chat position tests passed')

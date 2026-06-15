export function getViewportRect(win = window) {
  const visualViewport = win.visualViewport
  const left = Math.round(visualViewport?.offsetLeft || 0)
  const top = Math.round(visualViewport?.offsetTop || 0)
  const width = Math.round(visualViewport?.width || win.innerWidth)
  const height = Math.round(visualViewport?.height || win.innerHeight)

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  }
}

export function getDefaultFabPosition({ viewport, anchorRect, fabSize, margin }) {
  const bounds = getFabBounds({ viewport: normalizeRect(viewport), anchorRect: normalizeRect(anchorRect), fabSize, margin })
  return {
    x: bounds.maxX,
    y: bounds.maxY,
  }
}

export function clampFabPosition({ position, viewport, anchorRect, fabSize, margin }) {
  const bounds = getFabBounds({ viewport: normalizeRect(viewport), anchorRect: normalizeRect(anchorRect), fabSize, margin })
  return {
    x: Math.round(clamp(position.x, bounds.minX, bounds.maxX)),
    y: Math.round(clamp(position.y, bounds.minY, bounds.maxY)),
  }
}

function getFabBounds({ viewport, anchorRect, fabSize, margin }) {
  const visibleAnchor = intersectRects(viewport, anchorRect || viewport)
  const minX = visibleAnchor.left + margin
  const minY = visibleAnchor.top + margin
  const maxX = visibleAnchor.right - fabSize.width - margin
  const maxY = visibleAnchor.bottom - fabSize.height - margin

  return {
    minX: Math.round(Math.min(minX, maxX)),
    minY: Math.round(Math.min(minY, maxY)),
    maxX: Math.round(Math.max(minX, maxX)),
    maxY: Math.round(Math.max(minY, maxY)),
  }
}

function intersectRects(a, b) {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.right, b.right)
  const bottom = Math.min(a.bottom, b.bottom)

  if (right <= left || bottom <= top) {
    return a
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  }
}

function normalizeRect(rect) {
  if (!rect) return rect
  const left = Number(rect.left || 0)
  const top = Number(rect.top || 0)
  const width = Number(rect.width || 0)
  const height = Number(rect.height || 0)
  const right = Number.isFinite(rect.right) ? Number(rect.right) : left + width
  const bottom = Number.isFinite(rect.bottom) ? Number(rect.bottom) : top + height

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
    right,
    bottom,
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

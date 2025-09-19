import { LIGHT_GRID } from '@/lib/light-grid'

export type GridDimensions = {
  gridWidth: number
  gridHeight: number
  gridCellSize: number
  gridOffset: number
}

export type SafeBoundaries = {
  safeYMin: number
  safeYMax: number
  safeXMin: number
  safeXMax: number
  actualHeaderHeight: number
  footerHeight: number
  borderOffset: number
}

export type GameBoxDimensions = {
  gridCellSize: number
  gridOffset: number
  centerGridX: number
  squareGridSize: number
  squareSize: number
  borderLeft: number
  borderTop: number
  borderBottom: number
  borderWidth: number
  borderHeight: number
  centerX: number
  centerY: number
  safeYMin: number
  safeYMax: number
  safeXMin: number
}

export function getGridDimensions(windowWidth: number, windowHeight: number): GridDimensions {
  const gridCellSize = LIGHT_GRID.GRID_SIZE_PX
  const gridOffset = LIGHT_GRID.GRID_OFFSET_PX
  const width = windowWidth || (typeof window !== 'undefined' ? window.innerWidth : 0)
  const height = windowHeight || (typeof window !== 'undefined' ? window.innerHeight : 0)

  return {
    gridWidth: Math.floor(width / gridCellSize),
    gridHeight: Math.floor(height / gridCellSize),
    gridCellSize,
    gridOffset,
  }
}

export function getHeaderHeight(windowWidth: number, windowHeight: number): number {
  const { gridCellSize } = getGridDimensions(windowWidth, windowHeight)
  return Math.floor(80 / gridCellSize) * gridCellSize + 20
}

const BORDER_OFFSET = 40
const FOOTER_BASE_HEIGHT = 60

export function getSafeBoundaries(windowWidth: number, windowHeight: number): SafeBoundaries {
  const dimensions = getGridDimensions(windowWidth, windowHeight)
  const { gridCellSize, gridOffset, gridWidth, gridHeight } = dimensions
  const headerHeight = getHeaderHeight(windowWidth, windowHeight)
  const borderOffset = BORDER_OFFSET
  const actualHeaderHeight = headerHeight + borderOffset
  const footerHeight = Math.floor(FOOTER_BASE_HEIGHT / gridCellSize) * gridCellSize
  const width = gridWidth * gridCellSize
  const height = gridHeight * gridCellSize
  const baseYMin = Math.floor((actualHeaderHeight - gridOffset) / gridCellSize)
  const baseYMax = Math.floor((height - footerHeight - gridOffset) / gridCellSize) - 1

  const safeYMin = baseYMin + 1
  const safeYMax = baseYMax
  const safeXMin = 1

  const availableHeight = safeYMax - safeYMin + 1
  const maxWidth = Math.floor(width / gridCellSize) - 1
  const availableWidth = maxWidth - safeXMin + 1

  const squareSize = Math.min(availableWidth, availableHeight)
  const safeXMax = safeXMin + squareSize - 1
  const safeYMaxAdjusted = safeYMin + squareSize - 1

  return {
    safeYMin,
    safeYMax: safeYMaxAdjusted,
    safeXMin,
    safeXMax,
    actualHeaderHeight,
    footerHeight,
    borderOffset,
  }
}

export function getGameBoxDimensions(windowWidth: number, windowHeight: number): GameBoxDimensions {
  const { gridCellSize, gridOffset, gridWidth } = getGridDimensions(windowWidth, windowHeight)
  const { safeYMin, safeYMax, safeXMin } = getSafeBoundaries(windowWidth, windowHeight)
  const totalGridWidth = gridWidth
  const squareGridSize = safeYMax - safeYMin + 1
  const centerGridX = Math.floor((totalGridWidth - squareGridSize) / 2)

  const squareSize = (safeYMax - safeYMin + 1) * gridCellSize
  const borderLeft = centerGridX * gridCellSize + gridOffset
  const borderTop = safeYMin * gridCellSize + gridOffset
  const borderBottom = (safeYMax + 1) * gridCellSize + gridOffset
  const borderWidth = squareSize
  const borderHeight = borderBottom - borderTop

  const centerX = borderLeft + borderWidth / 2
  const centerY = borderTop + borderHeight / 2

  return {
    gridCellSize,
    gridOffset,
    centerGridX,
    squareGridSize,
    squareSize,
    borderLeft,
    borderTop,
    borderBottom,
    borderWidth,
    borderHeight,
    centerX,
    centerY,
    safeYMin,
    safeYMax,
    safeXMin,
  }
}

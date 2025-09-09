export interface LightGrid {
  GRID_SIZE_PX: number
  GRID_OFFSET_PX: number
  NUM_LIGHTS: number
  DURATION_SECONDS: number
  STAGGER_SECONDS: number
  DETOUR_PROBABILITY: number
  HORIZONTAL_PROBABILITY: number
  DOT_SIZE_PX: number
  COLOR_RGB: string
  GLOW_NEAR_PX: number
  GLOW_FAR_PX: number
}

export const LIGHT_GRID: LightGrid = {
  // layout
  GRID_SIZE_PX: 40,
  GRID_OFFSET_PX: -5,
  NUM_LIGHTS: 16,

  // motion
  DURATION_SECONDS: 20,
  STAGGER_SECONDS: 0,
  DETOUR_PROBABILITY: 0.1,
  HORIZONTAL_PROBABILITY: 0.5,

  // dot appearance
  DOT_SIZE_PX: 5,
  COLOR_RGB: '3,169,244',
  GLOW_NEAR_PX: 5,
  GLOW_FAR_PX: 10,
}

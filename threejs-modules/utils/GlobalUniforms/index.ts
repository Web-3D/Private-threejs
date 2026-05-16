import { uniform } from 'three/tsl'

// Shared TSL uniform nodes — import directly into any NodeMaterial node graph.
// Updating .value once per frame propagates to all materials referencing these nodes automatically.

export const uTime    = uniform(0)  // elapsed seconds, 0 → ∞
export const uWeather = uniform(0)  // 0 = clear/dry, 1 = storm/wet
export const uDamage  = uniform(0)  // 0 = intact, 1 = destroyed

/** Advance time. Call once at the start of each animation frame. */
export function updateTime(deltaTime: number): void {
  uTime.value += deltaTime
}

/** Set weather intensity. Clamped to [0, 1]. */
export function setWeather(value: number): void {
  uWeather.value = Math.max(0, Math.min(1, value))
}

/** Set damage level. Clamped to [0, 1]. */
export function setDamage(value: number): void {
  uDamage.value = Math.max(0, Math.min(1, value))
}

export type Pt = { x: number; y: number; visibility?: number }

/** b를 꼭짓점으로 하는 각 abc (도, 0~180) */
export function angleDeg(a: Pt, b: Pt, c: Pt): number {
  const v1x = a.x - b.x
  const v1y = a.y - b.y
  const v2x = c.x - b.x
  const v2y = c.y - b.y
  const cos = (v1x * v2x + v1y * v2y) / (Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y) || 1)
  return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI
}

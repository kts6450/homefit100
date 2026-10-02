export type Phase = 'down' | 'up'

/**
 * 관절 각도 기반 반복 카운터.
 * 각도가 downBelow 아래로 내려가면 'down', upAbove 위로 올라가면 'up'.
 * 두 임계값 사이(히스테리시스 구간)에서는 상태를 유지해 떨림으로 인한 중복 카운트를 막는다.
 * countOn 상태로 전이되는 순간 1회로 센다.
 */
export type RepCounterConfig = {
  downBelow: number
  upAbove: number
  startPhase: Phase
  countOn: Phase
  /** 지수이동평균 계수(1 = 평활화 없음) */
  alpha: number
}

export type RepState = { count: number; phase: Phase; smoothed: number | null }

export type RepCounter = {
  update(angle: number | null): RepState
  reset(): void
}

export function createRepCounter(cfg: RepCounterConfig): RepCounter {
  let count = 0
  let phase: Phase = cfg.startPhase
  let smoothed: number | null = null

  return {
    update(angle) {
      if (angle != null && Number.isFinite(angle)) {
        smoothed = smoothed == null ? angle : cfg.alpha * angle + (1 - cfg.alpha) * smoothed
        const next: Phase = smoothed < cfg.downBelow ? 'down' : smoothed > cfg.upAbove ? 'up' : phase
        if (next !== phase) {
          phase = next
          if (phase === cfg.countOn) count++
        }
      }
      return { count, phase, smoothed }
    },
    reset() {
      count = 0
      phase = cfg.startPhase
      smoothed = null
    },
  }
}

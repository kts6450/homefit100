import type { TestId } from './tests'

export type Sex = 'M' | 'F'
export type AgeNorm = { n: number; q: number[] }

export type NormTable = {
  updated: string
  sampleSize: number
  tests: Record<
    TestId,
    Record<
      Sex,
      {
        n: number
        /** 나이(정수) → 101개 분위값(±2세 창) */
        ages: Record<string, AgeNorm>
        /** 10세 연령대 → 등급별 해당 종목 중앙값 */
        grades: Record<string, Record<string, number>>
      }
    >
  >
}

/** 분위값 배열 q(0~100)에서 value의 백분위(0~100). 같은 값이 여러 분위에 걸치면 그 구간의 가운데. */
export function percentile(q: number[], value: number): number {
  if (value < q[0]) return 0
  if (value > q[q.length - 1]) return 100
  let lo = -1
  let hi = -1
  for (let i = 0; i < q.length; i++) {
    if (q[i] === value) {
      if (lo < 0) lo = i
      hi = i
    }
  }
  if (lo >= 0) return (lo + hi) / 2
  for (let i = 1; i < q.length; i++) {
    if (value < q[i]) return i - 1 + (value - q[i - 1]) / (q[i] - q[i - 1])
  }
  return 100
}

/** 중앙값(q[50])이 value와 가장 가까운 나이. 동률이면 실제 나이에 가까운 쪽. */
export function fitnessAge(ages: Record<string, AgeNorm>, value: number, realAge: number): number {
  let best = realAge
  let bestDiff = Infinity
  for (const [age, norm] of Object.entries(ages)) {
    const a = Number(age)
    const diff = Math.abs(norm.q[50] - value)
    if (diff < bestDiff - 1e-9 || (Math.abs(diff - bestDiff) < 1e-9 && Math.abs(a - realAge) < Math.abs(best - realAge))) {
      best = a
      bestDiff = diff
    }
  }
  return best
}

/** 등급별 중앙값과 비교해 이 종목 기준 도달 가능한 가장 높은 등급을 추정 */
export function estimateGrade(gradeMedians: Record<string, number>, value: number): string {
  const grades = Object.keys(gradeMedians).sort((a, b) => parseInt(a) - parseInt(b))
  for (const g of grades) {
    if (value >= gradeMedians[g]) return g
  }
  return '참가'
}

export function ageBand(age: number): string {
  return String(Math.min(80, Math.max(20, Math.floor(age / 10) * 10)))
}

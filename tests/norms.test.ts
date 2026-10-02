import { describe, it, expect } from 'vitest'
import { percentile, fitnessAge, estimateGrade, ageBand } from '../src/lib/norms'

const q = Array.from({ length: 101 }, (_, i) => i) // 값 = 분위

describe('percentile', () => {
  it('중간값', () => expect(percentile(q, 50)).toBeCloseTo(50))
  it('범위 밖', () => {
    expect(percentile(q, -5)).toBe(0)
    expect(percentile(q, 500)).toBe(100)
  })
  it('동일값이 많은 분포에서는 그 값 구간의 가운데', () => {
    const flat = Array.from({ length: 101 }, (_, i) => (i < 20 ? 0 : i < 80 ? 10 : 20))
    expect(percentile(flat, 10)).toBeCloseTo(49.5, 0)
  })
})

describe('fitnessAge', () => {
  const ages = {
    '30': { n: 100, q: q.map((v) => v + 30) },
    '40': { n: 100, q: q.map((v) => v + 20) },
    '50': { n: 100, q: q.map((v) => v + 10) },
  }
  it('중앙값이 가장 가까운 나이', () => expect(fitnessAge(ages, 70, 30)).toBe(40))
  it('가장 젊은 나이보다 좋으면 최소 나이', () => expect(fitnessAge(ages, 200, 45)).toBe(30))
})

describe('estimateGrade', () => {
  const g = { '1등급': 40, '2등급': 30, '3등급': 20 }
  it('경계 비교', () => {
    expect(estimateGrade(g, 45)).toBe('1등급')
    expect(estimateGrade(g, 31)).toBe('2등급')
    expect(estimateGrade(g, 20)).toBe('3등급')
    expect(estimateGrade(g, 5)).toBe('참가')
  })
})

describe('ageBand', () => {
  it('10세 단위, 20~80 제한 (청소년은 10)', () => {
    expect(ageBand(15)).toBe('10')
    expect(ageBand(19)).toBe('20')
    expect(ageBand(47)).toBe('40')
    expect(ageBand(93)).toBe('80')
  })
})

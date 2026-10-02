import { describe, it, expect } from 'vitest'
import { angleDeg, thighShinRatio } from '../src/lib/geometry'
import { createRepCounter } from '../src/lib/repCounter'
import { TESTS, testForAge } from '../src/lib/tests'

const feed = (c: ReturnType<typeof createRepCounter>, xs: (number | null)[]) => xs.map((x) => c.update(x)).at(-1)!

describe('angleDeg', () => {
  it('직각', () => expect(angleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90))
  it('일직선', () => expect(angleDeg({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(180))
})

describe('thighShinRatio', () => {
  it('서 있음 ≈ 100', () => expect(thighShinRatio({ x: 0, y: 0.5 }, { x: 0, y: 0.7 }, { x: 0, y: 0.9 })).toBeCloseTo(100))
  it('앉음(엉덩이가 무릎 높이) ≈ 0', () => expect(thighShinRatio({ x: 0, y: 0.7 }, { x: 0.2, y: 0.7 }, { x: 0.2, y: 0.9 })).toBeCloseTo(0))
})

describe('repCounter', () => {
  it('윗몸일으키기 3회', () => {
    const c = createRepCounter({ ...TESTS.situp.counter, alpha: 1 })
    expect(feed(c, [150, 40, 150, 40, 150, 40, 150]).count).toBe(3)
  })
  it('히스테리시스 구간 떨림은 세지 않음', () => {
    const c = createRepCounter({ ...TESTS.situp.counter, alpha: 1 })
    expect(feed(c, [150, 100, 110, 95, 115, 100]).count).toBe(0)
  })
  it('null 무시', () => {
    const c = createRepCounter({ ...TESTS.chairstand.counter, alpha: 1 })
    expect(feed(c, [50, null, 110, null, 50, 110]).count).toBe(2)
  })
  it('평활화(alpha<1)에서도 큰 동작은 셈', () => {
    const c = createRepCounter(TESTS.chairstand.counter)
    expect(feed(c, [50, 50, 50, 110, 110, 110, 50, 50, 50, 110, 110, 110]).count).toBe(2)
  })
  it('처음 관측된 자세는 세지 않음', () => {
    const c = createRepCounter({ ...TESTS.chairstand.counter, alpha: 1 })
    expect(feed(c, [110, 110, 50, 110]).count).toBe(1)
  })
  it('공식 영상 수준의 느린 반복(평활화 포함)', () => {
    const c = createRepCounter(TESTS.situp.counter)
    const wave = Array.from({ length: 300 }, (_, i) => 80 + 50 * Math.cos((i / 75) * 2 * Math.PI)) // 4주기
    expect(feed(c, wave).count).toBe(4)
  })
  it('reset', () => {
    const c = createRepCounter({ ...TESTS.chairstand.counter, alpha: 1 })
    feed(c, [50, 110])
    c.reset()
    expect(c.update(50).count).toBe(0)
  })
})

describe('testForAge', () => {
  it('18→curlup, 19→situp, 64→situp, 65→chairstand', () => {
    expect(testForAge(11)).toBe('curlup')
    expect(testForAge(18)).toBe('curlup')
    expect(testForAge(19)).toBe('situp')
    expect(testForAge(64)).toBe('situp')
    expect(testForAge(65)).toBe('chairstand')
  })
})

describe('윗몸말아올리기', () => {
  it('머리가 바닥에 닿을 때(누운 자세로 돌아올 때) 1회', () => {
    const c = createRepCounter({ ...TESTS.curlup.counter, alpha: 1 })
    expect(feed(c, [125, 55, 125, 55, 125, 55]).count).toBe(2)
  })
  it('3초 간격 신호음 방식', () => {
    expect(TESTS.curlup.cadence?.intervalSec).toBe(3)
  })
})

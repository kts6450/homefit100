import { describe, it, expect } from 'vitest'
import { angleDeg } from '../src/lib/geometry'
import { createRepCounter } from '../src/lib/repCounter'
import { TESTS, testForAge } from '../src/lib/tests'

const feed = (c: ReturnType<typeof createRepCounter>, xs: (number | null)[]) => xs.map((x) => c.update(x)).at(-1)!

describe('angleDeg', () => {
  it('직각', () => expect(angleDeg({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90))
  it('일직선', () => expect(angleDeg({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(180))
})

describe('repCounter', () => {
  it('윗몸일으키기 3회', () => {
    const c = createRepCounter({ ...TESTS.situp.counter, alpha: 1 })
    expect(feed(c, [150, 60, 150, 60, 150, 60, 150]).count).toBe(3)
  })
  it('히스테리시스 구간 떨림은 세지 않음', () => {
    const c = createRepCounter({ ...TESTS.situp.counter, alpha: 1 })
    expect(feed(c, [150, 100, 110, 95, 115, 100]).count).toBe(0)
  })
  it('null 무시', () => {
    const c = createRepCounter({ ...TESTS.chairstand.counter, alpha: 1 })
    expect(feed(c, [90, null, 170, null, 90, 170]).count).toBe(2)
  })
  it('평활화(alpha<1)에서도 큰 동작은 셈', () => {
    const c = createRepCounter(TESTS.chairstand.counter)
    expect(feed(c, [90, 90, 90, 175, 175, 175, 90, 90, 90, 175, 175, 175]).count).toBe(2)
  })
  it('reset', () => {
    const c = createRepCounter({ ...TESTS.chairstand.counter, alpha: 1 })
    feed(c, [90, 170])
    c.reset()
    expect(c.update(90).count).toBe(0)
  })
})

describe('testForAge', () => {
  it('64→situp, 65→chairstand', () => {
    expect(testForAge(64)).toBe('situp')
    expect(testForAge(65)).toBe('chairstand')
  })
})

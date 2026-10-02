import type { RepCounterConfig } from './repCounter'

export type TestId = 'situp' | 'chairstand'

/** MediaPipe Pose 랜드마크 인덱스 */
const L = { shoulder: 11, hip: 23, knee: 25, ankle: 27 }
const R = { shoulder: 12, hip: 24, knee: 26, ankle: 28 }

export type TestDef = {
  id: TestId
  name: string
  /** 국민체력100 측정결과 API 항목 */
  field: 'item_f019' | 'item_f023'
  target: string
  factor: string
  durationSec: number
  unit: '회'
  /** 각도를 잴 세 관절 [a, 꼭짓점, c] — 좌/우 후보 중 잘 보이는 쪽 사용 */
  joints: [number, number, number][]
  counter: RepCounterConfig
  guide: string[]
}

export const TESTS: Record<TestId, TestDef> = {
  situp: {
    id: 'situp',
    name: '교차윗몸일으키기',
    field: 'item_f019',
    target: '성인 (19~64세)',
    factor: '근지구력',
    durationSec: 60,
    unit: '회',
    joints: [
      [L.shoulder, L.hip, L.knee],
      [R.shoulder, R.hip, R.knee],
    ],
    // 누우면 어깨-엉덩이-무릎 각이 커지고(≈140°+), 일어나면 작아진다(≈70°-)
    counter: { downBelow: 75, upAbove: 120, startPhase: 'up', countOn: 'down', alpha: 0.5 },
    guide: [
      '휴대폰을 옆에서 몸 전체가 보이게 바닥에 세워 두세요',
      '무릎을 세우고 두 팔을 가슴 앞에서 X자로 교차하세요',
      '팔꿈치가 허벅지에 닿을 때까지 일어났다가 어깨가 바닥에 닿게 누우세요',
    ],
  },
  chairstand: {
    id: 'chairstand',
    name: '의자에앉았다일어서기',
    field: 'item_f023',
    target: '어르신 (65세 이상)',
    factor: '하지 근기능',
    durationSec: 30,
    unit: '회',
    joints: [
      [L.hip, L.knee, L.ankle],
      [R.hip, R.knee, R.ankle],
    ],
    // 앉으면 엉덩이-무릎-발목 각이 ≈90°, 서면 ≈170°
    counter: { downBelow: 115, upAbove: 155, startPhase: 'down', countOn: 'up', alpha: 0.5 },
    guide: [
      '휴대폰을 옆에서 몸 전체가 보이게 세워 두세요',
      '등받이 의자 가운데에 앉아 두 팔을 가슴 앞에서 X자로 교차하세요',
      '무릎을 완전히 펴고 일어섰다가 다시 완전히 앉으세요',
    ],
  },
}

export function testForAge(age: number): TestId {
  return age >= 65 ? 'chairstand' : 'situp'
}

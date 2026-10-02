import type { RepCounterConfig } from './repCounter'

export type TestId = 'curlup' | 'situp' | 'chairstand'

/** MediaPipe Pose 랜드마크 인덱스 */
const L = { shoulder: 11, hip: 23, knee: 25, ankle: 27 }
const R = { shoulder: 12, hip: 24, knee: 26, ankle: 28 }

export type TestDef = {
  id: TestId
  name: string
  /** 국민체력100 측정결과 API 항목 */
  field: 'item_f009' | 'item_f019' | 'item_f023'
  target: string
  factor: string
  durationSec: number
  unit: '회'
  /**
   * angle: 세 관절 [a, 꼭짓점, c]의 각도
   * thighShinRatio: [엉덩이, 무릎, 발목]의 허벅지/정강이 세로비
   */
  metric: 'angle' | 'thighShinRatio'
  /** 좌/우 후보 중 잘 보이는 쪽 사용 */
  joints: [number, number, number][]
  counter: RepCounterConfig
  /** 신호음 리듬에 맞춰 반복하다 놓치면 끝나는 종목 (durationSec은 최대 측정 시간) */
  cadence?: { intervalSec: number; idleStopSec: number }
  /** 꾸준히 하기 좋은 스포츠강좌이용권 종목(item_nm) */
  courseItems: string[]
  guide: string[]
}

export const TESTS: Record<TestId, TestDef> = {
  curlup: {
    id: 'curlup',
    name: '윗몸말아올리기',
    field: 'item_f009',
    target: '청소년 (11~18세)',
    factor: '근지구력',
    durationSec: 300,
    unit: '회',
    metric: 'angle',
    joints: [
      [L.shoulder, L.hip, L.knee],
      [R.shoulder, R.hip, R.knee],
    ],
    // 누우면 어깨-엉덩이-무릎 각 ≈120~127°, 말아 올리면 ≈50~55°. 머리가 바닥에 닿을 때(각이 커질 때) 1회
    counter: { downBelow: 75, upAbove: 110, startPhase: 'up', countOn: 'up', alpha: 0.5 },
    cadence: { intervalSec: 3, idleStopSec: 7.5 },
    courseItems: ['태권도', '줄넘기', '수영', '농구', '축구(풋살)', '클라이밍', '댄스(줌바 등)'],
    guide: [
      '휴대폰을 옆에서 몸 전체가 보이게 바닥에 세워 두세요',
      '무릎을 90°로 세우고 누워 손바닥을 허벅지 위에 올리세요',
      '높은 "삐" 소리에 손이 무릎에 닿도록 말아 올리고, 낮은 소리에 머리가 바닥에 닿게 내려오세요 (3초에 1회)',
      '리듬을 두 번 이상 놓치면 측정이 끝나요',
    ],
  },
  situp: {
    id: 'situp',
    name: '교차윗몸일으키기',
    field: 'item_f019',
    target: '성인 (19~64세)',
    factor: '근지구력',
    durationSec: 60,
    unit: '회',
    metric: 'angle',
    joints: [
      [L.shoulder, L.hip, L.knee],
      [R.shoulder, R.hip, R.knee],
    ],
    // 누우면 어깨-엉덩이-무릎 각 ≈125~135°, 일어나면 ≈30~40° (공단 측정방법 영상으로 보정)
    counter: { downBelow: 60, upAbove: 105, startPhase: 'up', countOn: 'down', alpha: 0.5 },
    courseItems: ['필라테스', '헬스', '요가', '수영', '크로스핏', '복싱'],
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
    metric: 'thighShinRatio',
    joints: [
      [L.hip, L.knee, L.ankle],
      [R.hip, R.knee, R.ankle],
    ],
    // 서면 허벅지/정강이 세로비 ≈105~115, 앉으면 ≈45~55 (공단 측정방법 영상으로 보정)
    counter: { downBelow: 70, upAbove: 95, startPhase: 'down', countOn: 'up', alpha: 0.5 },
    courseItems: ['요가', '수영', '에어로빅', '필라테스', '탁구', '댄스(줌바 등)'],
    guide: [
      '휴대폰을 정면 또는 옆에서 머리부터 발끝까지 보이게 세워 두세요',
      '등받이 의자 가운데에 앉아 두 팔을 가슴 앞에서 X자로 교차하세요',
      '무릎을 완전히 펴고 일어섰다가 다시 완전히 앉으세요',
    ],
  },
}

export function testForAge(age: number): TestId {
  if (age >= 65) return 'chairstand'
  if (age >= 19) return 'situp'
  return 'curlup'
}

import { FilesetResolver, PoseLandmarker, type NormalizedLandmark } from '@mediapipe/tasks-vision'
import { angleDeg, thighShinRatio } from './geometry'
import type { TestDef } from './tests'

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL = `${import.meta.env.BASE_URL}models/pose_landmarker_lite.task`

let cached: Promise<PoseLandmarker> | null = null

/** 브라우저 안에서만 동작하는 자세 추정 모델 (영상은 외부로 전송되지 않음) */
export function loadPose(): Promise<PoseLandmarker> {
  cached ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM)
    const create = (delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    try {
      return await create('GPU')
    } catch {
      return await create('CPU')
    }
  })()
  cached.catch(() => (cached = null))
  return cached
}

export const MIN_VISIBILITY = 0.5

/** 좌/우 후보 중 더 잘 보이는 쪽의 관절 3개 (세 관절 중 가장 안 보이는 관절 기준) */
export function pickJoints(lm: NormalizedLandmark[], test: TestDef) {
  let best: { idx: [number, number, number]; vis: number } | null = null
  for (const idx of test.joints) {
    const vis = Math.min(...idx.map((i) => lm[i]?.visibility ?? 0))
    if (!best || vis > best.vis) best = { idx, vis }
  }
  return best!
}

/** 종목별 측정 지표. 관절이 잘 안 보이면 null */
export function measureMetric(lm: NormalizedLandmark[] | undefined, test: TestDef): { value: number | null; joints: [number, number, number] | null } {
  if (!lm) return { value: null, joints: null }
  const { idx, vis } = pickJoints(lm, test)
  if (vis < MIN_VISIBILITY) return { value: null, joints: idx }
  const [a, b, c] = idx.map((i) => lm[i])
  const value = test.metric === 'angle' ? angleDeg(a, b, c) : thighShinRatio(a, b, c)
  return { value: Number.isFinite(value) ? value : null, joints: idx }
}

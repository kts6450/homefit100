import { useEffect, useRef, useState } from 'react'
import { DrawingUtils, PoseLandmarker } from '@mediapipe/tasks-vision'
import { loadPose, measureMetric } from '../lib/pose'
import { createRepCounter, type Phase } from '../lib/repCounter'
import type { TestDef } from '../lib/tests'

export type Source = { kind: 'camera' } | { kind: 'demo' } | { kind: 'file'; file: File }

type Props = {
  test: TestDef
  source: Source
  onDone: (count: number) => void
  onBack: () => void
  /** 카메라 대신 촬영해 둔 영상으로 분석 */
  onFile: (file: File) => void
}

type Status = 'loading' | 'ready' | 'countdown' | 'running' | 'done' | 'error'

const PHASE_LABEL: Record<TestDef['id'], Record<Phase, string>> = {
  situp: { up: '누움', down: '일어남' },
  chairstand: { up: '일어섬', down: '앉음' },
}

/** 공단 공식 측정방법 영상 (국민체력100 동영상 정보 API) */
export const OFFICIAL_VIDEO: Record<TestDef['id'], string> = {
  situp: 'https://openapi.kspo.or.kr/web/video/0AUDLJ08S_00028.mp4',
  chairstand: 'https://openapi.kspo.or.kr/web/video/0AUDLJ08S_00031.mp4',
}

const COUNTDOWN = 5

export default function MeasureScreen({ test, source, onDone, onBack, onFile }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const statusRef = useRef<Status>('loading')
  const countRef = useRef(0)
  const counterRef = useRef(createRepCounter(test.counter))
  const endAtRef = useRef(0)
  const soundRef = useRef(true)

  const [status, setStatusState] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [count, setCount] = useState(0)
  const [phase, setPhase] = useState<Phase>(test.counter.startPhase)
  const [visible, setVisible] = useState(false)
  const [remaining, setRemaining] = useState(test.durationSec)
  const [countdown, setCountdown] = useState(COUNTDOWN)
  const [progress, setProgress] = useState(0)
  const [sound, setSound] = useState(true)
  const [manual, setManual] = useState('')
  const [bump, setBump] = useState(0)

  const isCamera = source.kind === 'camera'
  const setStatus = (s: Status) => {
    statusRef.current = s
    setStatusState(s)
  }

  // 비디오 소스 + 모델 준비
  useEffect(() => {
    let stream: MediaStream | null = null
    let objectUrl = ''
    let cancelled = false
    const video = videoRef.current!

    async function setup() {
      try {
        const modelP = loadPose()
        if (source.kind === 'camera') {
          if (!navigator.mediaDevices?.getUserMedia) throw new Error('이 브라우저는 카메라를 지원하지 않아요')
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
          video.srcObject = stream
          await video.play()
        } else {
          const src = source.kind === 'demo' ? `${import.meta.env.BASE_URL}demo/${test.id}.mp4` : (objectUrl = URL.createObjectURL(source.file))
          video.src = src
          video.muted = true
          await new Promise<void>((res, rej) => {
            video.onloadeddata = () => res()
            video.onerror = () => rej(new Error('영상을 불러오지 못했어요'))
          })
        }
        await modelP
        if (!cancelled) setStatus('ready')
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : String(e)
        setError(
          /Permission|NotAllowed/i.test(msg)
            ? '카메라 권한이 거부되었어요. 브라우저 주소창의 카메라 권한을 허용하거나, 아래 방법으로 측정해 주세요.'
            : `준비 중 문제가 생겼어요: ${msg}`,
        )
        setStatus('error')
      }
    }
    setup()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      speechSynthesis?.cancel()
    }
  }, [source, test.id])

  // 추론·그리기 루프
  useEffect(() => {
    if (status === 'loading' || status === 'error') return
    let raf = 0
    let lastTime = -1
    let landmarker: PoseLandmarker | null = null
    let draw: DrawingUtils | null = null
    let lastVisible = false
    let lastPhase: Phase | null = null
    loadPose().then((l) => (landmarker = l))

    const finish = () => {
      if (statusRef.current !== 'running') return
      setStatus('done')
      speak(`측정 끝. ${countRef.current}회`)
      setTimeout(() => onDone(countRef.current), 1200)
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || !landmarker || video.readyState < 2) return

      if (statusRef.current === 'running') {
        if (isCamera) {
          const left = Math.max(0, Math.ceil((endAtRef.current - performance.now()) / 1000))
          setRemaining(left)
          if (left <= 0) finish()
        } else {
          setProgress(video.duration ? video.currentTime / video.duration : 0)
          if (video.ended) finish()
        }
      }

      if (video.currentTime === lastTime) return
      lastTime = video.currentTime

      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        draw = new DrawingUtils(canvas.getContext('2d')!)
      }
      const ctx = canvas.getContext('2d')!
      const result = landmarker.detectForVideo(video, performance.now())
      const lm = result.landmarks[0]
      const { value, joints } = measureMetric(lm, test)

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (lm && draw) {
        const lw = Math.max(2, canvas.width / 320)
        draw.drawConnectors(lm, PoseLandmarker.POSE_CONNECTIONS, { color: 'rgba(255,255,255,0.75)', lineWidth: lw })
        draw.drawLandmarks(lm, { color: '#0b5fff', fillColor: '#ffffff', radius: lw * 1.2, lineWidth: 1 })
        if (joints) {
          const pts = joints.map((i) => lm[i])
          draw.drawConnectors(pts, [{ start: 0, end: 1 }, { start: 1, end: 2 }], {
            color: value == null ? '#f59e0b' : '#00e0a4',
            lineWidth: lw * 2.5,
          })
          draw.drawLandmarks(pts, { color: '#00e0a4', fillColor: '#00e0a4', radius: lw * 2.2 })
        }
      }

      const vis = value != null
      if (vis !== lastVisible) setVisible((lastVisible = vis))

      if (statusRef.current === 'running') {
        const st = counterRef.current.update(value)
        if (st.phase !== lastPhase) setPhase((lastPhase = st.phase))
        if (st.count !== countRef.current) {
          countRef.current = st.count
          setCount(st.count)
          setBump((b) => b + 1)
          beep()
          speak(String(st.count))
        }
      }
    }

    const video = videoRef.current
    const onEnded = () => finish()
    video?.addEventListener('ended', onEnded)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      video?.removeEventListener('ended', onEnded)
    }
    // status가 loading→ready로 바뀔 때 한 번만 루프를 시작
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === 'loading' || status === 'error'])

  function speak(text: string) {
    if (!soundRef.current || !('speechSynthesis' in window)) return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ko-KR'
    u.rate = 1.2
    speechSynthesis.speak(u)
  }

  function beep() {
    if (!soundRef.current) return
    try {
      const ac = new AudioContext()
      const o = ac.createOscillator()
      const g = ac.createGain()
      o.frequency.value = 880
      g.gain.setValueAtTime(0.15, ac.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15)
      o.connect(g).connect(ac.destination)
      o.start()
      o.stop(ac.currentTime + 0.15)
      setTimeout(() => ac.close(), 300)
    } catch {
      /* 소리는 선택 사항 */
    }
  }

  function start() {
    counterRef.current.reset()
    countRef.current = 0
    setCount(0)
    if (isCamera) {
      setStatus('countdown')
      let n = COUNTDOWN
      setCountdown(n)
      speak(`${n}초 뒤 시작합니다. 자세를 잡아주세요`)
      const t = setInterval(() => {
        n -= 1
        setCountdown(n)
        if (n > 0) return
        clearInterval(t)
        endAtRef.current = performance.now() + test.durationSec * 1000
        setRemaining(test.durationSec)
        setStatus('running')
        speak('시작')
      }, 1000)
    } else {
      const v = videoRef.current!
      v.currentTime = 0
      setStatus('running')
      v.play()
    }
  }

  const toggleSound = () => {
    soundRef.current = !soundRef.current
    setSound(soundRef.current)
    if (!soundRef.current) speechSynthesis?.cancel()
  }

  const manualSubmit = () => {
    const n = Number(manual)
    if (Number.isFinite(n) && n >= 0 && n <= 200) onDone(Math.round(n))
  }

  const mirror = isCamera ? '-scale-x-100' : ''

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col bg-slate-950 text-white">
      <header className="flex items-center justify-between px-4 py-3">
        <button onClick={onBack} className="rounded-full px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10">
          ← 뒤로
        </button>
        <div className="text-center">
          <div className="text-xs text-slate-400">{source.kind === 'demo' ? '데모 · 공단 공식 측정방법 영상' : test.target}</div>
          <div className="font-bold">{test.name}</div>
        </div>
        <button onClick={toggleSound} className="rounded-full px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10" aria-label="소리 켜기/끄기">
          {sound ? '🔊' : '🔇'}
        </button>
      </header>

      <div className="relative mx-auto w-full overflow-hidden bg-black">
        <video ref={videoRef} playsInline muted className={`block h-auto max-h-[62dvh] w-full object-contain ${mirror}`} />
        <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full object-contain ${mirror}`} />

        {/* 상단 상태 배지 */}
        {status !== 'loading' && status !== 'error' && (
          <div className="absolute left-3 top-3 flex gap-2 text-xs font-semibold">
            <span className={`rounded-full px-2.5 py-1 ${visible ? 'bg-accent/90' : 'bg-amber-500/90'}`}>
              {visible ? '● 자세 인식 중' : '몸 전체가 보이게 해주세요'}
            </span>
            {status === 'running' && <span className="rounded-full bg-black/60 px-2.5 py-1">{PHASE_LABEL[test.id][phase]}</span>}
          </div>
        )}

        {/* 카운트 */}
        {(status === 'running' || status === 'done') && (
          <div className="absolute right-3 top-3 rounded-2xl bg-black/65 px-4 py-2 text-right backdrop-blur">
            <div key={bump} className="animate-[pop_.25s_ease-out] text-5xl font-black tabular-nums leading-none">{count}</div>
            <div className="mt-1 text-xs text-slate-300">
              {isCamera ? `남은 시간 ${remaining}초` : `${Math.round(progress * 100)}% 재생`}
            </div>
          </div>
        )}

        {status === 'countdown' && (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <div key={countdown} className="animate-[pop_.4s_ease-out] text-8xl font-black">{countdown}</div>
          </div>
        )}

        {status === 'done' && (
          <div className="absolute inset-0 grid place-items-center bg-black/55">
            <div className="text-center">
              <div className="text-lg text-slate-200">측정 완료</div>
              <div className="text-6xl font-black">{count}회</div>
            </div>
          </div>
        )}

        {status === 'loading' && (
          <div className="grid aspect-video place-items-center text-center text-slate-300">
            <div>
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
              <div className="text-sm">AI 자세 인식 모델을 불러오는 중…</div>
              <div className="mt-1 text-xs text-slate-500">영상은 이 기기 안에서만 분석되고 어디에도 전송되지 않아요</div>
            </div>
          </div>
        )}
      </div>

      {isCamera && status === 'running' && (
        <div className="h-1.5 bg-white/10">
          <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${(1 - remaining / test.durationSec) * 100}%` }} />
        </div>
      )}

      <section className="flex-1 px-5 py-5">
        {status === 'error' && <p className="mb-4 rounded-xl bg-amber-500/15 p-4 text-sm text-amber-200">{error}</p>}

        {(status === 'ready' || status === 'error') && (
          <>
            {status === 'ready' && (
              <>
                <ol className="space-y-2 text-sm text-slate-300">
                  {test.guide.map((g, i) => (
                    <li key={g} className="flex gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-xs">{i + 1}</span>
                      {g}
                    </li>
                  ))}
                  {isCamera && (
                    <li className="flex gap-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/10 text-xs">{test.guide.length + 1}</span>
                      시작을 누르면 {COUNTDOWN}초 뒤 {test.durationSec}초 동안 자동으로 셉니다
                    </li>
                  )}
                </ol>
                <button
                  onClick={start}
                  className="mt-5 w-full rounded-2xl bg-brand py-4 text-lg font-bold shadow-lg shadow-brand/30 hover:bg-brand-dark active:scale-[.99]"
                >
                  {isCamera ? `측정 시작 (${test.durationSec}초)` : 'AI 분석 시작 ▶'}
                </button>
                <a href={OFFICIAL_VIDEO[test.id]} target="_blank" rel="noreferrer" className="mt-3 block text-center text-sm text-slate-400 underline underline-offset-4">
                  국민체력100 공식 측정방법 영상 보기
                </a>
              </>
            )}

            <details className="mt-6 rounded-xl bg-white/5 p-4 text-sm text-slate-300" open={status === 'error'}>
              <summary className="cursor-pointer font-semibold text-slate-200">카메라 없이 측정하기</summary>
              <label className="mt-3 block">
                <span className="text-slate-400">촬영해 둔 영상으로 분석</span>
                <input
                  type="file"
                  accept="video/*"
                  className="mt-1 block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white/15 file:px-3 file:py-2 file:text-white"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onFile(f)
                  }}
                />
              </label>
              <div className="mt-4 text-slate-400">직접 센 횟수 입력</div>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={200}
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="예: 25"
                  className="w-full rounded-lg bg-white/10 px-3 py-2 text-white placeholder:text-slate-500"
                />
                <button onClick={manualSubmit} className="shrink-0 rounded-lg bg-white/15 px-4 font-semibold hover:bg-white/25">
                  결과 보기
                </button>
              </div>
            </details>
          </>
        )}

        {(status === 'running' || status === 'countdown') && (
          <p className="text-center text-sm text-slate-400">
            {source.kind === 'demo'
              ? '공단 공식 측정방법 영상을 AI가 실시간으로 분석하고 있어요. 초록색 선이 측정에 쓰는 관절이에요.'
              : '횟수는 소리로도 알려드려요. 화면을 보지 않아도 괜찮아요.'}
          </p>
        )}
      </section>
    </div>
  )
}

import type { TestId } from '../lib/tests'

const DEMOS: { id: TestId; who: string; name: string }[] = [
  { id: 'curlup', who: '청소년', name: '윗몸말아올리기' },
  { id: 'situp', who: '성인', name: '교차윗몸일으키기' },
  { id: 'chairstand', who: '어르신', name: '의자에앉았다일어서기' },
]

type Props = {
  sampleSize: number | null
  onStart: () => void
  onDemo: (test: TestId) => void
}

export default function Landing({ sampleSize, onStart, onDemo }: Props) {
  return (
    <div className="min-h-dvh">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand via-[#1a4fd8] to-[#062a7a] px-6 pb-14 pt-10 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative mx-auto max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-accent" /> 국민체력100 공공데이터 기반
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight">
            폰 카메라로
            <br />
            집에서 <span className="text-[#7cf5d0]">국민체력100</span>
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-white/85">
            AI가 카메라로 공식 측정 종목 횟수를 자동으로 세고, 실제 국민 측정 데이터와 비교해 <b>체력나이</b>와 <b>맞춤 운동처방</b>을
            알려드려요.
          </p>

          <div className="mt-7 grid gap-3">
            <button
              onClick={onStart}
              className="rounded-2xl bg-white py-4 text-lg font-extrabold text-brand shadow-xl shadow-black/20 transition hover:bg-slate-50 active:scale-[.99]"
            >
              내 체력나이 측정하기
            </button>
            <div className="text-center text-xs font-semibold text-white/70">▶ 운동 없이 AI 측정 체험하기 (공단 공식 영상)</div>
            <div className="grid grid-cols-3 gap-2">
              {DEMOS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onDemo(d.id)}
                  className="rounded-2xl border border-white/30 bg-white/10 px-2 py-3 text-sm font-semibold backdrop-blur hover:bg-white/20"
                >
                  {d.who}
                  <span className="mt-0.5 block text-[11px] font-normal leading-tight text-white/75">{d.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-7 max-w-md px-5">
        <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-2xl bg-white py-4 text-center shadow-lg shadow-slate-200/70">
          <Stat value={sampleSize ? `${Math.round(sampleSize / 10000)}만 건` : '…'} label="비교 측정 데이터" />
          <Stat value="3종목" label="국민체력100 공식" />
          <Stat value="0건" label="영상 외부 전송" />
        </div>
      </section>

      <section className="mx-auto max-w-md px-5 py-10">
        <h2 className="text-xl font-extrabold">이렇게 진행돼요</h2>
        <ol className="mt-5 space-y-4">
          <Step n={1} title="AI 셀프 측정" desc="휴대폰을 세워 두고 운동하면 AI가 관절을 인식해 횟수를 자동으로 세요. 11~18세는 윗몸말아올리기, 19~64세는 교차윗몸일으키기, 65세 이상은 의자에앉았다일어서기." />
          <Step n={2} title="체력나이 진단" desc="국민체력100 체력인증센터 실제 측정결과와 비교해 같은 성별·나이 중 내 위치, 체력나이, 예상 등급을 알려드려요." />
          <Step n={3} title="맞춤 처방·연결" desc="나와 비슷한 체력의 사람들이 실제로 받은 운동처방을 공식 영상과 함께 추천하고, 가까운 체력인증센터를 안내해요." />
        </ol>

        <div className="mt-8 rounded-2xl bg-slate-100 p-4 text-sm leading-relaxed text-slate-600">
          <b className="text-slate-800">🔒 영상은 내 폰 밖으로 나가지 않아요.</b> 자세 인식은 브라우저 안에서만 실행되고, 촬영 영상과 측정 기록은 서버로 전송·저장되지 않아요.
        </div>
      </section>

      <Footer />
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-2">
      <div className="text-xl font-black text-brand">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex gap-4">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 font-black text-brand">{n}</div>
      <div>
        <div className="font-bold">{title}</div>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{desc}</p>
      </div>
    </li>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-5 py-8 text-xs leading-relaxed text-slate-500">
      <div className="mx-auto max-w-md">
        <div className="font-bold text-slate-700">홈체력100</div>
        <p className="mt-2">
          활용 데이터: 서울올림픽기념국민체육진흥공단 국민체력100 체력인증센터 측정결과 정보 · 체력인증센터 측정건수 정보 · 국민체력100
          동영상 정보 (공공데이터포털)
        </p>
        <p className="mt-1">측정방법·운동처방 영상 출처: 국민체육진흥공단 국민체력100 (공공누리 제1유형)</p>
        <p className="mt-1">본 서비스의 결과는 참고용 자가 측정이며, 공식 체력인증은 국민체력100 체력인증센터에서 받을 수 있어요.</p>
      </div>
    </footer>
  )
}

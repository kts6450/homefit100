import { useMemo, useState } from 'react'
import type { AppData, Video } from '../lib/data'
import { ageBand, estimateGrade, fitnessAge, percentile } from '../lib/norms'
import type { TestDef } from '../lib/tests'
import { Footer } from './Landing'
import type { Profile } from './ProfileForm'

export type DemoInfo = { aiCount: number; truth: number }

type Props = {
  data: AppData
  test: TestDef
  profile: Profile
  count: number
  demo?: DemoInfo
  onRetry: () => void
  onHome: () => void
}

export default function ResultScreen({ data, test, profile, count, demo, onRetry, onHome }: Props) {
  const r = useMemo(() => analyze(data, test, profile, count), [data, test, profile, count])
  const [copied, setCopied] = useState(false)
  const sexLabel = profile.sex === 'M' ? '남성' : '여성'

  const share = async () => {
    const text = `국민체력100 ${test.name} ${count}회 → 내 체력나이는 ${r.fitAgeLabel}! 폰 카메라로 집에서 측정해 보세요.`
    const url = location.origin + location.pathname
    try {
      if (navigator.share) await navigator.share({ title: '홈체력100', text, url })
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setCopied(true)
      }
    } catch {
      /* 공유 취소 */
    }
  }

  return (
    <div className="min-h-dvh">
      <div className="bg-gradient-to-b from-[#062a7a] to-brand px-5 pb-20 pt-6 text-white">
        <div className="mx-auto max-w-md">
          <button onClick={onHome} className="-ml-2 rounded-full px-2 py-1 text-sm text-white/70 hover:bg-white/10">
            ← 처음으로
          </button>
          {demo && (
            <div className="mt-3 rounded-2xl bg-white/10 p-4 text-sm backdrop-blur">
              <div className="font-bold">✅ AI 데모 측정 정확도</div>
              <div className="mt-1 text-white/85">
                공단 공식 측정방법 영상에서 AI가 센 횟수 <b className="text-[#7cf5d0]">{demo.aiCount}회</b> · 영상 속 실제 횟수 <b>{demo.truth}회</b>
              </div>
              <div className="mt-2 text-xs text-white/60">
                아래는 예시 결과예요: {profile.age}세 {sexLabel}가 {test.durationSec}초 동안 {count}회 했다고 가정했어요.
              </div>
            </div>
          )}
          <div className="mt-5 text-sm text-white/70">
            {profile.age}세 {sexLabel} · {test.name} {test.durationSec}초
          </div>
          <div className="mt-1 text-5xl font-black">{count}회</div>
        </div>
      </div>

      <div className="mx-auto -mt-14 max-w-md space-y-5 px-5 pb-10">
        {/* 체력나이 */}
        <section className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/80">
          <div className="text-sm font-semibold text-slate-500">나의 {test.factor} 체력나이</div>
          <div className="mt-1 flex items-end gap-3">
            <div className="text-6xl font-black tracking-tight text-brand">{r.fitAgeLabel}</div>
            <div className={`mb-2 rounded-full px-3 py-1 text-sm font-bold ${r.delta < 0 ? 'bg-accent/10 text-accent' : r.delta > 0 ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
              {r.delta < 0 ? `실제보다 ${-r.delta}세 젊어요` : r.delta > 0 ? `실제보다 ${r.delta}세 많아요` : '나이에 딱 맞아요'}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">같은 성별·나이 100명 중</div>
              <div className="mt-1 text-2xl font-black">상위 {r.rank}등</div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs text-slate-500">이 종목만 보면</div>
              <div className="mt-1 text-2xl font-black">{r.grade === '참가' ? '참가 수준' : `${r.grade} 수준`}</div>
            </div>
          </div>

          <Distribution q={r.q} value={count} />

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            비교 대상: 국민체력100 체력인증센터 실제 측정자 중 {sexLabel} {r.normAge - 2}~{r.normAge + 2}세 {r.n.toLocaleString()}명 (
            {fmtYm(data.norms.range[0])}~{fmtYm(data.norms.range[1])}, 공공데이터포털). 등급은 국민체력100 등급별 측정자의 이 종목 중앙값과 비교한
            추정치예요.
          </p>
        </section>

        {/* 처방 */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="text-xs font-bold text-accent">맞춤 운동처방</div>
          <h2 className="mt-1 text-xl font-extrabold leading-snug">나와 비슷한 체력의 사람들이 실제로 처방받은 운동</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            같은 성별·연령대에서 체력 수준이 비슷한 {r.rxN.toLocaleString()}명이 체력인증센터 운동처방사에게 받은 처방 중 가장 많은 운동이에요.
          </p>
          <ul className="mt-5 space-y-3">
            {r.rx.map((e, i) => (
              <RxItem key={e.name} rank={i + 1} name={e.name} share={e.share} video={data.videos[e.name]} />
            ))}
          </ul>
        </section>

        {/* 인증센터 */}
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="text-xs font-bold text-brand">다음 단계</div>
          <h2 className="mt-1 text-xl font-extrabold leading-snug">가까운 체력인증센터에서 무료로 정식 인증받기</h2>
          <p className="mt-2 text-sm text-slate-500">
            {profile.sido} 지역 센터 · 최근 1년 측정 건수 순 (기준 {fmtYm(data.centers.updated)})
          </p>
          <ul className="mt-4 divide-y divide-slate-100">
            {r.centers.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="font-bold">{c.name}</div>
                  <div className="truncate text-xs text-slate-500">{c.addr}</div>
                  <div className="mt-0.5 text-xs text-slate-400">최근 1년 {c.recentCnt.toLocaleString()}명 측정</div>
                </div>
                <a
                  href={`https://map.naver.com/p/search/${encodeURIComponent(`${c.addr} ${c.addr2}`.trim())}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  지도
                </a>
              </li>
            ))}
            {r.centers.length === 0 && <li className="py-3 text-sm text-slate-500">이 지역에 등록된 센터 정보가 없어요.</li>}
          </ul>
          <a
            href="https://nfa.kspo.or.kr/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-2xl bg-brand py-3.5 text-center font-bold text-white hover:bg-brand-dark"
          >
            국민체력100 측정 예약하러 가기
          </a>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={share} className="rounded-2xl bg-slate-900 py-3.5 font-bold text-white hover:bg-slate-800">
            {copied ? '링크 복사됨' : '결과 공유하기'}
          </button>
          <button onClick={onRetry} className="rounded-2xl border-2 border-slate-200 bg-white py-3.5 font-bold text-slate-700 hover:bg-slate-50">
            다시 측정하기
          </button>
        </div>
      </div>
      <Footer />
    </div>
  )
}

function RxItem({ rank, name, share, video }: { rank: number; name: string; share: number; video?: Video }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="overflow-hidden rounded-2xl border border-slate-100">
      <button onClick={() => video && setOpen((o) => !o)} className="flex w-full items-center gap-3 p-3 text-left">
        <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {video?.thumb ? <img src={video.thumb} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xl">🏃</div>}
          {video && <div className="absolute inset-0 grid place-items-center bg-black/25 text-lg text-white">▶</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-slate-400">TOP {rank}</div>
          <div className="truncate font-bold">{name}</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, share)}%` }} />
            </div>
            <span className="shrink-0 text-xs text-slate-500">{share}%가 처방받음</span>
          </div>
        </div>
      </button>
      {open && video && (
        <div className="bg-black">
          <video src={video.url} poster={video.thumb} controls autoPlay playsInline muted className="aspect-video w-full" />
          <div className="bg-slate-50 px-3 py-2 text-xs text-slate-500">
            {video.desc || video.title}
            {video.tool && ` · 도구: ${video.tool}`} · 출처: 국민체력100 운동처방 동영상
          </div>
        </div>
      )}
    </li>
  )
}

function Distribution({ q, value }: { q: number[]; value: number }) {
  const lo = q[1]
  const hi = Math.max(q[99], value)
  const bins = 24
  const w = (hi - lo) / bins || 1
  const hist = Array.from({ length: bins }, (_, i) => {
    const a = lo + i * w
    const b = a + w
    let c = 0
    for (let p = 1; p < 100; p++) if (q[p] >= a && (q[p] < b || (i === bins - 1 && q[p] <= b))) c++
    return c
  })
  const max = Math.max(...hist, 1)
  const xOf = (v: number) => ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * 100
  return (
    <div className="mt-6">
      <div className="relative h-24">
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {hist.map((c, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t ${lo + (i + 1) * w <= value ? 'bg-brand/70' : 'bg-slate-200'}`}
              style={{ height: `${Math.max(4, (c / max) * 100)}%` }}
            />
          ))}
        </div>
        <div className="absolute bottom-0 top-0 w-0.5 bg-slate-900" style={{ left: `${xOf(value)}%` }}>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">나</div>
        </div>
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{Math.round(lo)}회</span>
        <span>중앙값 {Math.round(q[50])}회</span>
        <span>{Math.round(hi)}회</span>
      </div>
    </div>
  )
}

function fmtYm(ym: string) {
  return ym ? `${ym.slice(0, 4)}.${ym.slice(4, 6)}` : ''
}

function analyze(data: AppData, test: TestDef, profile: Profile, count: number) {
  const table = data.norms.tests[test.id][profile.sex]
  const ageKeys = Object.keys(table.ages).map(Number).sort((a, b) => a - b)
  const minAge = ageKeys[0]
  const maxAge = ageKeys[ageKeys.length - 1]
  const normAge = Math.min(maxAge, Math.max(minAge, profile.age))
  const norm = table.ages[normAge]
  const pct = percentile(norm.q, count)
  const fit = fitnessAge(table.ages, count, profile.age)
  const fitAgeLabel = fit <= minAge && norm.q[50] < count ? `${minAge}세 이하` : fit >= maxAge && count < table.ages[maxAge].q[50] ? `${maxAge}세 이상` : `${fit}세`
  const band = ageBand(normAge)
  const grade = estimateGrade(table.grades[band] ?? {}, count)

  const decile = Math.min(9, Math.floor(pct / 10))
  const bandRx = data.rx[test.id][profile.sex][band] ?? {}
  const near = [decile, decile - 1, decile + 1, decile - 2, decile + 2].map(String).find((d) => bandRx[d]?.top.length)
  const rxBucket = near ? bandRx[near] : { n: 0, top: [] }
  const rx = rxBucket.top.slice(0, 5)

  const centers = data.centers.list.filter((c) => c.sido === profile.sido).slice(0, 3)

  return {
    q: norm.q,
    n: norm.n,
    normAge,
    pct,
    rank: Math.max(1, Math.min(100, Math.round(100 - pct))),
    delta: fit - profile.age,
    fitAgeLabel,
    grade,
    rx,
    rxN: rxBucket.n,
    centers,
  }
}

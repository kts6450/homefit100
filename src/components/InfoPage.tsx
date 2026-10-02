import { useState } from 'react'
import { CHANGELOG, SITE } from '../lib/site'
import { Footer } from './Landing'

export type InfoTab = 'guide' | 'privacy' | 'changelog'

const TABS: { id: InfoTab; label: string }[] = [
  { id: 'guide', label: '이용안내' },
  { id: 'privacy', label: '개인정보처리방침' },
  { id: 'changelog', label: '업데이트 내역' },
]

export default function InfoPage({ tab, onTab, onHome }: { tab: InfoTab; onTab: (t: InfoTab) => void; onHome: () => void }) {
  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto max-w-md px-5 py-6">
        <button onClick={onHome} className="-ml-2 rounded-full px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">
          ← 처음으로
        </button>
        <h1 className="mt-3 text-2xl font-extrabold">{SITE.name}</h1>
        <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => onTab(t.id)} className={`flex-1 rounded-lg py-2 ${tab === t.id ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <article className="prose-sm mt-6 space-y-5 text-[15px] leading-relaxed text-slate-700">
          {tab === 'guide' && <Guide />}
          {tab === 'privacy' && <Privacy />}
          {tab === 'changelog' && <Changelog />}
        </article>
      </div>
      <Footer />
    </div>
  )
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 text-lg font-extrabold text-slate-900">{children}</h2>
}

function Guide() {
  return (
    <>
      <p>
        홈체력100은 스마트폰 카메라로 국민체력100 공식 측정 종목을 집에서 스스로 측정하고, 국민체육진흥공단 체력인증센터의 실제 측정 데이터와 비교해 내
        체력 수준과 맞춤 운동처방을 알려주는 무료 웹 서비스예요. 앱 설치나 회원가입이 필요 없어요.
      </p>
      <H>측정 종목</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <b>11~18세 · 윗몸말아올리기</b>: 3초 간격 신호음(높은 소리 ‘위로’, 낮은 소리 ‘아래로’)에 맞춰 반복, 리듬을 놓치면 종료
        </li>
        <li>
          <b>19~64세 · 교차윗몸일으키기</b>: 60초 동안 반복
        </li>
        <li>
          <b>65세 이상 · 의자에앉았다일어서기</b>: 30초 동안 반복
        </li>
      </ul>
      <H>잘 측정하는 방법</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>휴대폰을 몸 옆쪽 1.5~2m 거리에 세워 머리부터 발끝까지 화면에 들어오게 해 주세요. (의자 종목은 정면도 가능)</li>
        <li>밝은 곳에서, 몸과 배경 색이 비슷하지 않은 옷을 입으면 더 정확해요.</li>
        <li>화면 왼쪽 위 배지가 ‘자세 인식 중’(초록색)인지 확인한 뒤 시작하세요.</li>
        <li>카메라를 쓸 수 없으면 촬영해 둔 영상을 올리거나 직접 센 횟수를 입력해도 결과를 볼 수 있어요.</li>
      </ul>
      <H>결과 보는 법</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>백분위: 같은 성별·나이(±2세) 실제 측정자 100명 중 내 순위</li>
        <li>체력나이: 내 기록이 몇 살의 중앙값과 가장 비슷한지 (성인·어르신)</li>
        <li>예상 등급: 국민체력100 등급별 측정자의 이 종목 중앙값과 비교한 추정치</li>
        <li>운동처방: 나와 체력 수준이 비슷한 사람들이 센터 운동처방사에게 실제로 받은 처방 중 많은 순서</li>
      </ul>
      <p className="rounded-xl bg-slate-50 p-4 text-sm">
        결과는 참고용 자가 측정이에요. 공식 체력인증과 전문 운동처방은 가까운 국민체력100 체력인증센터에서 무료로 받을 수 있어요. 통증이나 지병이 있으면
        무리하지 마세요.
      </p>
      <H>데이터 출처</H>
      <p className="text-sm">
        서울올림픽기념국민체육진흥공단 국민체력100 체력인증센터 측정결과 정보 · 체력인증센터 측정건수 정보 · 국민체력100 동영상 정보 (공공데이터포털). 영상은
        공공누리 제1유형으로 출처를 표시해 사용해요.
      </p>
      <H>문의</H>
      <p className="text-sm">
        운영: {SITE.operator} ·{' '}
        <a className="text-brand underline" href={SITE.contactUrl} target="_blank" rel="noreferrer">
          문의·오류 신고 게시판
        </a>
      </p>
    </>
  )
}

function Privacy() {
  const [cleared, setCleared] = useState(false)
  return (
    <>
      <p className="text-sm text-slate-500">시행일 {SITE.openedAt}</p>
      <p>{SITE.operator}(이하 ‘운영자’)는 이용자의 개인정보를 수집하지 않는 것을 원칙으로 서비스를 설계했어요.</p>
      <H>1. 수집하는 개인정보</H>
      <p>
        <b>없음.</b> 입력하는 성별·나이·시도는 이 기기의 브라우저 안에서 비교 계산에만 쓰이고 서버로 전송되거나 저장되지 않아요. 회원가입·로그인이 없어요.
      </p>
      <H>2. 카메라 영상</H>
      <p>카메라 영상과 업로드한 영상은 브라우저 안의 AI가 실시간으로 분석한 뒤 바로 버려요. 촬영·저장·외부 전송을 하지 않아요.</p>
      <H>3. 측정 기록</H>
      <p>‘지난 측정과 비교’를 위한 기록(날짜, 종목, 횟수, 순위)은 이 기기의 브라우저 저장소에만 저장되며 운영자도 볼 수 없어요.</p>
      <button
        onClick={() => {
          try {
            localStorage.removeItem('homefit100:history')
          } catch {
            /* 저장소 접근 불가 */
          }
          setCleared(true)
        }}
        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
      >
        {cleared ? '내 측정 기록을 삭제했어요' : '이 기기의 내 측정 기록 삭제'}
      </button>
      <H>4. 익명 이용 통계</H>
      <p>
        서비스 운영 현황을 알기 위해 페이지 방문 수와 종목별 측정 완료 수만 외부 카운터(hits.sh)로 집계해요. 숫자를 1씩 올리는 요청만 보내며 쿠키를 쓰지
        않고, 측정값·입력 정보·영상은 포함되지 않아요.
      </p>
      <H>5. 외부 자원</H>
      <p>
        글꼴과 AI 엔진(jsDelivr), 공단 운동 영상(openapi.kspo.or.kr), 지도 링크(네이버 지도)를 불러와요. 이 과정에서 각 서비스에 일반적인 접속 정보(IP 등)가
        전달될 수 있어요.
      </p>
      <H>6. 문의</H>
      <p>
        <a className="text-brand underline" href={SITE.contactUrl} target="_blank" rel="noreferrer">
          문의·오류 신고 게시판
        </a>
      </p>
    </>
  )
}

function Changelog() {
  return (
    <ol className="space-y-5">
      {CHANGELOG.map((c) => (
        <li key={c.version} className="rounded-2xl border border-slate-100 p-4">
          <div className="flex items-center justify-between">
            <b className="text-brand">v{c.version}</b>
            <span className="text-sm text-slate-400">{c.date}</span>
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {c.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}

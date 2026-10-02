import { useEffect, useState } from 'react'
import InfoPage, { type InfoTab } from './components/InfoPage'
import Landing from './components/Landing'
import MeasureScreen, { type Source } from './components/MeasureScreen'
import ProfileForm, { type Profile } from './components/ProfileForm'
import ResultScreen, { type DemoInfo } from './components/ResultScreen'
import { loadData, type AppData } from './lib/data'
import { ping } from './lib/site'
import { TESTS, testForAge, type TestId } from './lib/tests'

type Step = 'landing' | 'profile' | 'measure' | 'result'

const INFO_TABS: InfoTab[] = ['guide', 'privacy', 'changelog']
const tabFromHash = (): InfoTab | null => {
  const t = location.hash.replace('#/', '') as InfoTab
  return INFO_TABS.includes(t) ? t : null
}

/** 데모 영상(공단 공식 측정방법 영상 구간)의 실제 반복 횟수와 예시 참가자 */
const DEMO: Record<TestId, { truth: number; profile: Profile; exampleCount: number }> = {
  curlup: { truth: 4, profile: { sex: 'M', age: 15, sido: '경기' }, exampleCount: 38 },
  situp: { truth: 8, profile: { sex: 'F', age: 45, sido: '서울' }, exampleCount: 28 },
  chairstand: { truth: 6, profile: { sex: 'F', age: 72, sido: '서울' }, exampleCount: 21 },
}

export default function App() {
  const [step, setStep] = useState<Step>('landing')
  const [data, setData] = useState<AppData | null>(null)
  const [dataError, setDataError] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [testId, setTestId] = useState<TestId>('situp')
  const [source, setSource] = useState<Source>({ kind: 'camera' })
  const [count, setCount] = useState(0)
  const [demo, setDemo] = useState<DemoInfo | undefined>()
  const [infoTab, setInfoTab] = useState<InfoTab | null>(tabFromHash)

  useEffect(() => {
    const onHash = () => setInfoTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    loadData().then(setData, (e) => setDataError(String(e)))
  }, [])

  // 최신 Chrome에서 scrollTo는 Promise를 반환하므로 effect 정리 함수로 반환되지 않게 감싼다
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step, infoTab])

  const test = TESTS[testId]

  if (infoTab)
    return (
      <InfoPage
        tab={infoTab}
        onTab={(t) => (location.hash = `#/${t}`)}
        onHome={() => {
          history.replaceState(null, '', location.pathname)
          setInfoTab(null)
          setStep('landing')
        }}
      />
    )

  if (step === 'landing')
    return (
      <Landing
        sampleSize={data?.norms.sampleSize ?? null}
        onStart={() => {
          setDemo(undefined)
          setStep('profile')
        }}
        onDemo={(id) => {
          setTestId(id)
          setProfile(DEMO[id].profile)
          setSource({ kind: 'demo' })
          setStep('measure')
        }}
      />
    )

  if (step === 'profile')
    return (
      <ProfileForm
        initial={profile && !demo ? profile : undefined}
        onBack={() => setStep('landing')}
        onSubmit={(p) => {
          setProfile(p)
          setTestId(testForAge(p.age))
          setSource({ kind: 'camera' })
          setDemo(undefined)
          setStep('measure')
        }}
      />
    )

  if (step === 'measure')
    return (
      <MeasureScreen
        key={`${testId}-${source.kind}-${source.kind === 'file' ? source.file.name : ''}`}
        test={test}
        source={source}
        onBack={() => setStep(source.kind === 'demo' ? 'landing' : 'profile')}
        onFile={(file) => setSource({ kind: 'file', file })}
        onDone={(n) => {
          ping(`${source.kind === 'demo' ? 'demo' : 'measure'}-${testId}`)
          if (source.kind === 'demo') {
            setDemo({ aiCount: n, truth: DEMO[testId].truth })
            setCount(DEMO[testId].exampleCount)
          } else {
            setDemo(undefined)
            setCount(n)
          }
          setStep('result')
        }}
      />
    )

  if (!data || !profile)
    return (
      <div className="grid min-h-dvh place-items-center p-6 text-center text-slate-500">
        {dataError ? `데이터를 불러오지 못했어요. 새로고침해 주세요. (${dataError})` : '측정 데이터를 불러오는 중…'}
      </div>
    )

  return (
    <ResultScreen
      data={data}
      test={test}
      profile={profile}
      count={count}
      demo={demo}
      onRetry={() => {
        if (demo) setSource({ kind: 'demo' })
        setStep(demo ? 'measure' : 'profile')
      }}
      onHome={() => setStep('landing')}
    />
  )
}

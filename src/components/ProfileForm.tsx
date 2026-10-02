import { useState } from 'react'
import { SIDO_LIST } from '../lib/data'
import type { Sex } from '../lib/norms'
import { TESTS, testForAge } from '../lib/tests'

export type Profile = { sex: Sex; age: number; sido: string }

type Props = { initial?: Profile; onSubmit: (p: Profile) => void; onBack: () => void }

export default function ProfileForm({ initial, onSubmit, onBack }: Props) {
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null)
  const [age, setAge] = useState(initial ? String(initial.age) : '')
  const [sido, setSido] = useState(initial?.sido ?? '')
  const ageNum = Number(age)
  const ageOk = Number.isInteger(ageNum) && ageNum >= 19 && ageNum <= 100
  const ok = sex && ageOk && sido
  const test = ageOk ? TESTS[testForAge(ageNum)] : null

  return (
    <div className="mx-auto min-h-dvh max-w-md px-5 py-6">
      <button onClick={onBack} className="-ml-2 rounded-full px-2 py-1 text-sm text-slate-500 hover:bg-slate-100">
        ← 처음으로
      </button>
      <h1 className="mt-4 text-2xl font-extrabold">기본 정보를 알려주세요</h1>
      <p className="mt-1 text-sm text-slate-500">같은 성별·나이의 실제 측정 데이터와 비교하는 데만 쓰여요.</p>

      <div className="mt-8 space-y-7">
        <Field label="성별">
          <div className="grid grid-cols-2 gap-3">
            {(['M', 'F'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className={`rounded-xl border-2 py-3 font-bold transition ${sex === s ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 bg-white text-slate-600'}`}
              >
                {s === 'M' ? '남성' : '여성'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="만 나이">
          <input
            type="number"
            inputMode="numeric"
            min={19}
            max={100}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="예: 42"
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-bold outline-none focus:border-brand"
          />
          {age && !ageOk && <p className="mt-2 text-sm text-amber-600">19세 이상만 측정할 수 있어요. (청소년 종목은 준비 중이에요)</p>}
        </Field>

        <Field label="사는 곳 (시·도)">
          <select
            value={sido}
            onChange={(e) => setSido(e.target.value)}
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-bold outline-none focus:border-brand"
          >
            <option value="">선택하세요</option>
            {SIDO_LIST.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">가까운 체력인증센터 안내에 쓰여요.</p>
        </Field>
      </div>

      {test && (
        <div className="mt-8 rounded-2xl bg-brand/5 p-4">
          <div className="text-xs font-semibold text-brand">{test.target} 측정 종목</div>
          <div className="mt-1 text-lg font-extrabold">
            {test.name} · {test.durationSec}초
          </div>
          <div className="mt-1 text-sm text-slate-600">국민체력100 {test.factor} 측정 종목이에요.</div>
        </div>
      )}

      <button
        disabled={!ok}
        onClick={() => ok && onSubmit({ sex: sex!, age: ageNum, sido })}
        className="mt-8 w-full rounded-2xl bg-brand py-4 text-lg font-bold text-white shadow-lg shadow-brand/25 transition enabled:hover:bg-brand-dark disabled:bg-slate-300 disabled:shadow-none"
      >
        다음: 카메라로 측정하기
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-bold text-slate-700">{label}</div>
      {children}
    </div>
  )
}

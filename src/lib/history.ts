import type { TestId } from './tests'

/** 측정 기록 (이 기기의 브라우저에만 저장, 서버 전송 없음) */
export type MeasureRecord = { at: number; test: TestId; count: number; age: number; sex: 'M' | 'F'; rank: number }

const KEY = 'homefit100:history'

export function loadHistory(): MeasureRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as MeasureRecord[]) : []
  } catch {
    return []
  }
}

/** 기록을 추가하고, 추가 전의 같은 종목 기록(최신순)을 돌려준다 */
export function saveRecord(rec: MeasureRecord): MeasureRecord[] {
  const all = loadHistory()
  const previous = previousOf(all, rec.test)
  try {
    localStorage.setItem(KEY, JSON.stringify([...all, rec].slice(-50)))
  } catch {
    /* 저장 불가(사생활 보호 모드 등)여도 결과는 그대로 보여준다 */
  }
  return previous
}

export function previousOf(all: MeasureRecord[], test: TestId): MeasureRecord[] {
  return all.filter((r) => r.test === test).sort((a, b) => b.at - a.at)
}

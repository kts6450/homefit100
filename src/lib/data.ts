import type { NormTable } from './norms'
import type { TestId } from './tests'

export type RxTable = Record<TestId, Record<string, Record<string, Record<string, { n: number; top: { name: string; share: number }[] }>>>>
export type Video = { name: string; title: string; url: string; thumb: string; desc: string; tool: string; place: string; age: string }
export type Center = { name: string; addr: string; addr2: string; latest: string; recentCnt: number; sido: string }
export type Course = { item: string; course: string; price: number; days: string; time: string; facil: string; sido: string; sigungu: string; addr: string }

export type AppData = {
  norms: NormTable
  rx: RxTable
  videos: Record<string, Video>
  centers: { updated: string; list: Center[] }
  courses: Course[]
}

let cached: Promise<AppData> | null = null

const get = <T,>(name: string): Promise<T> =>
  fetch(`${import.meta.env.BASE_URL}data/${name}.json`).then((r) => {
    if (!r.ok) throw new Error(`${name}.json ${r.status}`)
    return r.json() as Promise<T>
  })

export function loadData(): Promise<AppData> {
  cached ??= Promise.all([
    get<NormTable>('norms'),
    get<RxTable>('rx'),
    get<Record<string, Video>>('videos'),
    get<AppData['centers']>('centers'),
    get<Course[]>('courses').catch(() => []),
  ]).then(([norms, rx, videos, centers, courses]) => ({ norms, rx, videos, centers, courses }))
  cached.catch(() => (cached = null))
  return cached
}

export const SIDO_LIST = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

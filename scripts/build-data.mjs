// data-raw/*.json(공단 API 원본) → public/data/*.json(서비스용 집계)
// 사용: node scripts/build-data.mjs
import fs from 'node:fs'

const RAW = 'data-raw'
const OUT = 'public/data'
fs.mkdirSync(OUT, { recursive: true })

const read = (name) => (fs.existsSync(`${RAW}/${name}.json`) ? JSON.parse(fs.readFileSync(`${RAW}/${name}.json`, 'utf8')) : [])
const write = (name, data) => {
  fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data))
  console.log(`${OUT}/${name}.json ${(fs.statSync(`${OUT}/${name}.json`).size / 1024).toFixed(0)}KB`)
}
const round1 = (x) => Math.round(x * 10) / 10

const TESTS = {
  curlup: { field: 'item_f009', minAge: 11, maxAge: 18 },
  situp: { field: 'item_f019', minAge: 19, maxAge: 64 },
  chairstand: { field: 'item_f023', minAge: 65, maxAge: 90 },
}
const SEXES = ['M', 'F']
const MIN_N = 30

function quantiles(sorted) {
  const q = []
  for (let p = 0; p <= 100; p++) {
    const pos = (p / 100) * (sorted.length - 1)
    const lo = Math.floor(pos)
    const hi = Math.ceil(pos)
    q.push(round1(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)))
  }
  return q
}
const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : NaN
}
const ageBand = (age) => (age < 19 ? '10' : String(Math.min(80, Math.max(20, Math.floor(age / 10) * 10))))

function percentileOf(q, v) {
  if (v < q[0]) return 0
  if (v > q[100]) return 100
  let lo = -1
  let hi = -1
  for (let i = 0; i < q.length; i++) if (q[i] === v) { if (lo < 0) lo = i; hi = i }
  if (lo >= 0) return (lo + hi) / 2
  for (let i = 1; i < q.length; i++) if (v < q[i]) return i - 1 + (v - q[i - 1]) / (q[i] - q[i - 1])
  return 100
}

// pres_note "준비운동:a,b / 본운동:c,d / 정리운동:e" → 본운동 목록 (없으면 전체)
function mainExercises(note) {
  if (!note) return []
  const parts = note.split('/').map((s) => s.trim())
  const main = parts.find((p) => p.startsWith('본운동:'))
  const body = main ? main.slice(4) : parts.map((p) => p.replace(/^[^:]*:/, '')).join(',')
  return [...new Set(body.split(',').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean))]
}

// ---------- 1) 측정결과 → 규준표·등급·처방 ----------
const results = read('results')
const testYms = results.map((r) => r.test_ym).filter(Boolean).sort()
// 일부 과거 기록이 섞여 있어 기간은 하위 1% 지점부터 표기
const norms = { updated: testYms.at(-1) ?? '', sampleSize: results.length, range: [testYms[Math.floor(testYms.length * 0.01)], testYms.at(-1)], tests: {} }
const rx = {}

for (const [id, t] of Object.entries(TESTS)) {
  norms.tests[id] = {}
  rx[id] = {}
  for (const sex of SEXES) {
    const rows = results
      .filter((r) => r.test_sex === sex && r[t.field] !== undefined && r[t.field] !== '' && r[t.field] !== null)
      .map((r) => ({ age: Number(r.age_degree), v: Number(r[t.field]), grade: r.cert_gbn, note: r.pres_note }))
      .filter((r) => Number.isFinite(r.age) && Number.isFinite(r.v) && r.v >= 0 && r.age >= t.minAge - 2 && r.age <= t.maxAge + (id === 'curlup' ? 2 : 10))

    const byAge = new Map()
    for (const r of rows) {
      if (!byAge.has(r.age)) byAge.set(r.age, [])
      byAge.get(r.age).push(r.v)
    }
    const ages = {}
    for (let a = t.minAge; a <= t.maxAge; a++) {
      let w = 2
      let vals = []
      while (w <= 8) {
        vals = []
        for (let d = -w; d <= w; d++) vals.push(...(byAge.get(a + d) ?? []))
        if (vals.length >= MIN_N) break
        w += 2
      }
      if (vals.length >= MIN_N) ages[a] = { n: vals.length, q: quantiles(vals.sort((x, y) => x - y)) }
    }

    const grades = {}
    const byBand = new Map()
    for (const r of rows) {
      const b = ageBand(r.age)
      if (!byBand.has(b)) byBand.set(b, new Map())
      if (!/^\d등급$/.test(r.grade ?? '')) continue
      const m = byBand.get(b)
      if (!m.has(r.grade)) m.set(r.grade, [])
      m.get(r.grade).push(r.v)
    }
    for (const [b, m] of byBand) {
      grades[b] = {}
      // 등급은 종합 판정이라 종목 중앙값이 역전될 수 있음 → 높은 등급 기준이 항상 크거나 같도록 보정
      let floor = Infinity
      for (const [g, vals] of [...m].sort()) {
        if (vals.length < 20) continue
        floor = Math.min(floor, median(vals))
        grades[b][g] = floor
      }
    }

    // 처방: 같은 성별·연령대·백분위 10분위 그룹이 실제로 처방받은 본운동 빈도 상위
    const rxBuckets = {}
    for (const r of rows) {
      const norm = ages[Math.min(t.maxAge, Math.max(t.minAge, r.age))]
      if (!norm) continue
      const dec = String(Math.min(9, Math.floor(percentileOf(norm.q, r.v) / 10)))
      const b = ageBand(r.age)
      rxBuckets[b] ??= {}
      rxBuckets[b][dec] ??= { n: 0, cnt: new Map() }
      const bucket = rxBuckets[b][dec]
      const ex = mainExercises(r.note)
      if (!ex.length) continue
      bucket.n++
      for (const e of ex) bucket.cnt.set(e, (bucket.cnt.get(e) ?? 0) + 1)
    }
    rx[id][sex] = {}
    for (const [b, decs] of Object.entries(rxBuckets)) {
      rx[id][sex][b] = {}
      for (const [d, { n, cnt }] of Object.entries(decs)) {
        rx[id][sex][b][d] = {
          n,
          top: [...cnt].sort((x, y) => y[1] - x[1]).slice(0, 12).map(([name, c]) => ({ name, share: Math.round((c / n) * 100) })),
        }
      }
    }

    norms.tests[id][sex] = { n: rows.length, ages, grades }
    const mid = ages[t.minAge + Math.floor((t.maxAge - t.minAge) / 2)]
    console.log(`${id} ${sex}: n=${rows.length}, ages=${Object.keys(ages).length}, 중간나이 중앙값=${mid?.q[50]}, grades=${JSON.stringify(grades[ageBand(t.minAge + 10)])}`)
  }
}
write('norms', norms)
write('rx', rx)

// ---------- 2) 운동 영상 ----------
const norm = (s) => (s ?? '').replace(/\s+/g, '').replace(/[ⅠⅡⅢIV0-9]+$/u, '').replace(/[()\-_.·,]/g, '')
const videos = {}
for (const v of [...read('videos'), ...read('allvideos')]) {
  const name = (v.trng_nm || v.vdo_ttl_nm || '').trim()
  if (!name || !v.file_nm || v.data_type === '이미지') continue
  const key = norm(name)
  if (videos[key]) continue
  videos[key] = {
    name,
    title: v.vdo_ttl_nm,
    url: `${(v.file_url || '').replace('http://', 'https://')}${v.file_nm}`,
    thumb: v.img_file_nm ? `${(v.img_file_url || '').replace('http://', 'https://')}${v.img_file_nm}` : '',
    desc: v.vdo_desc ?? '',
    tool: v.tool_nm ?? '',
    place: v.trng_plc_nm ?? '',
    age: v.aggrp_nm ?? '',
  }
}
const allRx = new Set()
for (const t of Object.values(rx)) for (const s of Object.values(t)) for (const b of Object.values(s)) for (const d of Object.values(b)) for (const e of d.top) allRx.add(e.name)
// 처방에 등장하는 운동의 영상만 남김 (키: 처방 운동명 그대로)
const rxVideos = Object.fromEntries([...allRx].filter((n) => videos[norm(n)]).map((n) => [n, videos[norm(n)]]))
write('videos', rxVideos)
console.log(`처방 운동 ${allRx.size}종 중 영상 매칭 ${Object.keys(rxVideos).length}종`)

// ---------- 3) 체력인증센터 ----------
const SIDO = [
  ['서울', /^서울/], ['부산', /^부산/], ['대구', /^대구/], ['인천', /^인천/], ['광주', /^광주/], ['대전', /^대전/],
  ['울산', /^울산/], ['세종', /^세종/], ['경기', /^경기/], ['강원', /^강원/], ['충북', /^(충청북도|충북|청주)/],
  ['충남', /^(충청남도|충남)/], ['전북', /^(전라북도|전북)/], ['전남', /^(전라남도|전남)/], ['경북', /^(경상북도|경북)/],
  ['경남', /^(경상남도|경남)/], ['제주', /^제주/],
]
function sidoOf(addr) {
  if (/^전남광주통합특별시/.test(addr)) return /광주통합특별시\s*(동구|서구|남구|북구|광산구)/.test(addr) ? '광주' : '전남'
  return SIDO.find(([, re]) => re.test(addr))?.[0] ?? ''
}
const centerRows = read('centers').filter((c) => c.center_addr1)
const latestYm = centerRows.map((c) => c.test_ym).sort().at(-1)
const cut = String(Number(latestYm.slice(0, 4)) - 1) + latestYm.slice(4)
const centers = new Map()
for (const c of centerRows) {
  const key = c.center_nm
  const cur = centers.get(key) ?? { name: `${c.center_nm} 체력인증센터`.replace('체력인증센터 체력인증센터', '체력인증센터'), addr: '', addr2: '', latest: '', recentCnt: 0 }
  if (c.test_ym >= cur.latest) {
    cur.latest = c.test_ym
    cur.addr = c.center_addr1.trim()
    cur.addr2 = (c.center_addr2 ?? '').trim()
  }
  if (c.test_ym > cut) cur.recentCnt += Number(c.test_cnt) || 0
  centers.set(key, cur)
}
const centerList = [...centers.values()]
  .map((c) => ({ ...c, sido: sidoOf(c.addr) }))
  .filter((c) => c.latest >= cut.slice(0, 4) + '01' || c.recentCnt > 0)
  .sort((a, b) => b.recentCnt - a.recentCnt)
write('centers', { updated: latestYm, list: centerList })
console.log('센터 시도 미분류:', centerList.filter((c) => !c.sido).map((c) => c.addr))

// ---------- 4) 스포츠강좌이용권 강좌 (등록시설 정보가 있을 때 지역 연결) ----------
const facilities = new Map(read('facilities').map((f) => [`${f.brno}-${f.facil_sn}`, f]))
const courses = read('courses')
  .map((c) => {
    const f = facilities.get(`${c.brno}-${c.facil_sn}`)
    return {
      item: (c.item_nm ?? '').trim(),
      course: (c.course_nm ?? '').trim(),
      price: Number(c.settl_amt) || 0,
      days: c.lectr_weekday_val ?? '',
      time: c.start_tm && c.equip_tm ? `${c.start_tm}~${c.equip_tm}` : '',
      facil: f?.facil_nm ?? '',
      sido: f ? sidoOf(`${f.city_nm ?? ''} ${f.local_nm ?? ''}`) || (f.city_nm ?? '').slice(0, 2) : '',
      sigungu: f?.local_nm ?? '',
      addr: f ? `${f.road_addr ?? ''}`.trim() : '',
    }
  })
  .filter((c) => c.course && c.facil)
write('courses', courses)
console.log(`강좌 ${courses.length}건 (시설 연결됨)`)

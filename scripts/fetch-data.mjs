// 공공데이터포털(국민체육진흥공단) API 원본 수집 → data-raw/*.json
// 사용: node scripts/fetch-data.mjs   (.env 의 DATA_GO_KR_KEY 필요)
import fs from 'node:fs';
import path from 'node:path';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split(/\r?\n/).filter(Boolean).map((l) => l.split('=').map((s) => s.trim())),
);
const KEY = env.DATA_GO_KR_KEY;
const BASE = 'https://apis.data.go.kr/B551014';
const OUT = 'data-raw';
fs.mkdirSync(OUT, { recursive: true });

async function getPage(endpoint, pageNo, numOfRows = 1000, tries = 4) {
  const url = `${BASE}/${endpoint}?serviceKey=${KEY}&pageNo=${pageNo}&numOfRows=${numOfRows}&resultType=json`;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(90_000) });
      const text = await res.text();
      const body = JSON.parse(text).response?.body;
      if (!body) throw new Error(`unexpected response: ${text.slice(0, 200)}`);
      const items = body.items?.item ?? [];
      return { totalCount: body.totalCount, items: Array.isArray(items) ? items : [items] };
    } catch (e) {
      if (i === tries - 1) {
        console.warn(`SKIP ${endpoint} p${pageNo}: ${e.message}`);
        return { totalCount: 0, items: [] };
      }
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
}

async function pool(tasks, concurrency) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < tasks.length) {
        const idx = next++;
        results[idx] = await tasks[idx]();
      }
    }),
  );
  return results;
}

async function fetchAll(name, endpoint, { pages, concurrency = 6 } = {}) {
  const first = await getPage(endpoint, 1);
  const lastPage = Math.ceil(first.totalCount / 1000);
  const pageList = pages ? pages(lastPage) : Array.from({ length: lastPage }, (_, i) => i + 1);
  console.log(`[${name}] total=${first.totalCount} pages=${pageList.length}`);
  let done = 0;
  const chunks = await pool(
    pageList.map((p) => async () => {
      const r = p === 1 ? first : await getPage(endpoint, p);
      if (++done % 20 === 0) console.log(`[${name}] ${done}/${pageList.length}`);
      return r.items;
    }),
    concurrency,
  );
  const items = chunks.flat();
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(items));
  console.log(`[${name}] saved ${items.length}`);
}

const only = process.argv[2];
const jobs = {
  // 측정결과는 약 300만 건 → 최신(마지막) 200페이지(약 20만 건)만 수집
  results: () =>
    fetchAll('results', 'SRVC_NFA_TEST_RESULT/TODZ_NFA_TEST_RESULT_NEW', {
      pages: (last) => Array.from({ length: 200 }, (_, i) => last - i),
      concurrency: 6,
    }),
  centers: () => fetchAll('centers', 'SRVC_TODZ_NFA_TEST_CENTER_CNT/TODZ_NFA_TEST_CENTER_CNT'),
  videos: () => fetchAll('videos', 'SRVC_TODZ_VDO_PKG/TODZ_VDO_TRNG_VIDEO_I'),
  allvideos: () => fetchAll('allvideos', 'SRVC_TODZ_VDO_PKG/TODZ_VDO_VIEW_ALL_LIST_I', { concurrency: 2 }),
  courses: () => fetchAll('courses', 'SRVC_OD_API_FACIL_COURSE/todz_api_facil_course_i', { concurrency: 3 }),
  facilities: () => fetchAll('facilities', 'SRVC_OD_API_FACIL_MNG/todz_api_facil_mng_i', { concurrency: 3 }),
};
for (const [name, job] of Object.entries(jobs)) {
  if (only ? only.split(',').includes(name) : !fs.existsSync(path.join(OUT, `${name}.json`))) await job();
}

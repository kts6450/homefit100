/** 서비스 운영 정보 */
export const SITE = {
  name: '홈체력100',
  url: 'https://kts6450.github.io/homefit100/',
  operator: '김태성',
  contactUrl: 'https://github.com/kts6450/homefit100/issues',
  version: '1.2.0',
  openedAt: '2026-10-02',
}

export const CHANGELOG: { date: string; version: string; items: string[] }[] = [
  {
    date: '2026-10-02',
    version: '1.2.0',
    items: ['이용안내·개인정보처리방침·업데이트 내역 페이지', '익명 운영 통계(방문·측정 완료 횟수, 쿠키 미사용)'],
  },
  {
    date: '2026-10-02',
    version: '1.1.0',
    items: ['청소년 윗몸말아올리기(3초 신호음 리듬) 종목 추가', '지난 측정과 비교', '결과 카드 이미지 공유·링크 미리보기'],
  },
  {
    date: '2026-10-02',
    version: '1.0.0',
    items: ['서비스 오픈: 성인 교차윗몸일으키기·어르신 의자에앉았다일어서기 AI 측정', '체력나이·백분위·예상 등급, 실제 처방 TOP5, 체력인증센터 안내', '공단 공식 측정방법 영상 데모'],
  },
]

const COUNTER = 'https://hits.sh/kts6450.github.io/homefit100'

/** 익명 횟수 집계: 숫자만 1 올린다. 측정값·개인정보·쿠키 없음 */
export function ping(event: string) {
  try {
    new Image().src = `${COUNTER}/${event}.svg`
  } catch {
    /* 통계는 선택 사항 */
  }
}

/** 방문수 배지 (불러올 때 1회 집계) */
export const VISIT_BADGE = `${COUNTER}.svg?view=today-total&label=%EB%B0%A9%EB%AC%B8%20%EC%98%A4%EB%8A%98%2F%EB%88%84%EC%A0%81&color=0b5fff`

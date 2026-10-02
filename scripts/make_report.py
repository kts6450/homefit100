# 제출서류 생성: [붙임1] 활용사례 보고서, [붙임2] 증빙자료, [붙임3] 개인정보 동의서 → report/*.pdf
# 사용: python scripts/make_report.py
import base64, io, json, os, re, sys, urllib.request
import qrcode
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
CFG = json.load(open('report/config.json', encoding='utf-8'))
URL = 'https://kts6450.github.io/homefit100/'
REPO = 'https://github.com/kts6450/homefit100'
SHOTS = 'report/shots'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

norms = json.load(open('public/data/norms.json', encoding='utf-8'))
centers = json.load(open('public/data/centers.json', encoding='utf-8'))
videos = json.load(open('public/data/videos.json', encoding='utf-8'))
rx = json.load(open('public/data/rx.json', encoding='utf-8'))
courses = json.load(open('public/data/courses.json', encoding='utf-8'))
n_course_sido = len({c['sido'] for c in courses})
json_kb = sum(os.path.getsize(f'public/data/{f}') for f in os.listdir('public/data')) // 1024
rx_names = {e['name'] for t in rx.values() for s in t.values() for b in s.values() for d in b.values() for e in d['top']}
n_curl = sum(norms['tests']['curlup'][s]['n'] for s in 'MF')
n_situp = sum(norms['tests']['situp'][s]['n'] for s in 'MF')
n_chair = sum(norms['tests']['chairstand'][s]['n'] for s in 'MF')
n_center = len(centers['list'])
center_recent = sum(c['recentCnt'] for c in centers['list'])
ym = lambda s: f'{s[:4]}.{s[4:6]}'
RANGE = f"{ym(norms['range'][0])}~{ym(norms['range'][1])}"


LEDGER_PATH = 'report/counter_reads.json'


def counter(key):
    """hits.sh 익명 카운터 실제값. 읽기 요청도 1씩 올리므로, 이 스크립트가 지금까지 읽은 횟수를 장부에 기록해 뺀다."""
    path = 'kts6450.github.io/homefit100' + (f'/{key}' if key else '')
    ledger = json.load(open(LEDGER_PATH, encoding='utf-8')) if os.path.exists(LEDGER_PATH) else {}
    try:
        svg = urllib.request.urlopen(f'https://hits.sh/{path}.svg?view=total', timeout=20).read().decode()
    except Exception:
        return None
    ledger[key] = ledger.get(key, 0) + 1
    json.dump(ledger, open(LEDGER_PATH, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    nums = [int(n) for n in re.findall(r'>(\d+)<', svg)]
    return max(0, nums[-1] - ledger[key]) if nums else None


def pilot_html():
    demo = [counter(f'demo-{t}') for t in ('curlup', 'situp', 'chairstand')]
    stats = {
        '방문': counter(''),
        '측정 완료(청소년)': counter('measure-curlup'),
        '측정 완료(성인)': counter('measure-situp'),
        '측정 완료(어르신)': counter('measure-chairstand'),
        '데모 체험': sum(d for d in demo if d) if any(d is not None for d in demo) else None,
        '결과 카드 공유': counter('share'),
    }
    stats = {k: v for k, v in stats.items() if v}  # 0이거나 읽기 실패한 항목은 표시하지 않음
    pilot = CFG.get('pilot', {})
    testers = pilot.get('testers', [])
    rows = ''.join(
        f"<tr><td>{t.get('who','')}</td><td>{t.get('test','')}</td><td>{t.get('self','')}</td><td>{t.get('ai','')}</td><td>{t.get('comment','')}</td></tr>"
        for t in testers
    )
    diffs = [abs(int(t['ai']) - int(t['self'])) for t in testers if str(t.get('ai', '')).isdigit() and str(t.get('self', '')).isdigit()]
    acc = f"<p class='small'>실사용 {len(diffs)}건의 AI 카운트와 본인이 센 횟수의 평균 차이: <b>{sum(diffs)/len(diffs):.1f}회</b></p>" if diffs else ''
    stat_cells = ''.join(f"<div class='kpi'><b>{v:,}</b><span>{k}</span></div>" for k, v in stats.items())
    return f"""
<h3>ㅇ 시범 운영 결과 ({pilot.get('period', '2026. 10. 2.~')})</h3>
<p>서비스 공개 후 실제 이용 현황입니다. 운영 통계는 쿠키 없는 익명 카운터로 집계했으며(개발자 자동화 테스트 제외), 측정값·개인정보는 수집하지 않습니다.</p>
{f'<div class="grid3">{stat_cells}</div>' if stats else '<p class="small">공개 첫날로 집계 중입니다.</p>'}
{f'<table style="margin-top:8px"><tr><th>이용자</th><th>종목</th><th>직접 센 횟수</th><th>AI 카운트</th><th>후기</th></tr>{rows}</table>' if rows else ''}
{acc}
"""


def img(path, crop=None, width=None):
    im = Image.open(path).convert('RGB')
    if crop:
        im = im.crop(crop)
    if width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=85)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def qr(text):
    buf = io.BytesIO()
    qrcode.make(text, box_size=6, border=1).save(buf, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


CSS = """
@page { size: A4; margin: 16mm 15mm 16mm 15mm; }
* { box-sizing: border-box; }
body { font-family: 'Pretendard Variable', Pretendard, 'Malgun Gothic', sans-serif; font-size: 10pt; line-height: 1.6; color: #1e293b; margin: 0; }
h1 { font-size: 19pt; margin: 0 0 4px; color: #0b2a6f; letter-spacing: -0.5px; }
h2 { font-size: 13pt; margin: 22px 0 8px; padding: 6px 10px; background: #0b5fff; color: #fff; border-radius: 6px; }
h3 { font-size: 11pt; margin: 16px 0 6px; color: #0b2a6f; }
p { margin: 4px 0 8px; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; font-size: 9pt; }
th, td { border: 1px solid #cbd5e1; padding: 5px 7px; vertical-align: top; text-align: left; }
th { background: #eef4ff; color: #0b2a6f; white-space: nowrap; }
.tag { display: inline-block; font-size: 8pt; font-weight: 700; color: #0b5fff; background: #eef4ff; border-radius: 4px; padding: 1px 6px; margin-right: 4px; }
.lead { font-size: 10.5pt; background: #f8fafc; border-left: 4px solid #0b5fff; padding: 8px 12px; margin: 8px 0 12px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
figure { margin: 0; text-align: center; }
figure img { width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; }
figcaption { font-size: 8pt; color: #64748b; margin-top: 2px; }
.kpi { border: 1px solid #dbe4f3; border-radius: 8px; padding: 8px; text-align: center; }
.kpi b { display: block; font-size: 15pt; color: #0b5fff; }
.kpi span { font-size: 8pt; color: #64748b; }
.small { font-size: 8.5pt; color: #64748b; }
.flow { display: flex; align-items: stretch; gap: 4px; font-size: 8.5pt; margin: 8px 0; }
.flow div { flex: 1; border: 1px solid #c7d7fe; background: #f5f8ff; border-radius: 6px; padding: 6px; text-align: center; }
.flow i { align-self: center; font-style: normal; color: #0b5fff; font-weight: 700; }
.cover { border: 2px solid #0b5fff; border-radius: 10px; padding: 14px 16px; margin-bottom: 8px; }
.cover .sub { color: #475569; font-size: 10.5pt; }
.pb { page-break-before: always; }
h2, h3 { break-after: avoid; page-break-after: avoid; }
tr, figure, .kpi, .flow { break-inside: avoid; page-break-inside: avoid; }
tr:first-child { break-after: avoid; page-break-after: avoid; }
ul { margin: 4px 0 8px; padding-left: 18px; }
li { margin: 2px 0; }
.check { color: #00a37a; font-weight: 700; }
"""


def head(title):
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>{title}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>{CSS}</style></head><body>"""


def report_html():
    s = SHOTS
    landing = img(f'{s}/01_landing.png', width=700)
    run_situp = img(f'{s}/03_situp_running_3.png', crop=(0, 0, 824, 720), width=700)
    run_teen = img(f'{s}/08_curlup_camera_running.png', crop=(0, 0, 824, 900), width=700) if os.path.exists(f'{s}/08_curlup_camera_running.png') else None
    run_chair = img(f'{s}/08_chair_camera_running_2.png', crop=(0, 0, 824, 720), width=700) if os.path.exists(f'{s}/08_chair_camera_running_2.png') else run_situp
    ready = img(f'{s}/06_situp_camera_ready.png', crop=(0, 0, 824, 1500), width=700)
    profile = img(f'{s}/05_situp_profile.png', crop=(0, 0, 824, 1700), width=700)
    res_top = img(f'{s}/09_situp_sec0.png', width=700)
    res_rx = img(f'{s}/09_situp_sec1.png', width=700)
    res_course = img(f'{s}/09_situp_sec2.png', width=700) if courses else None
    res_center = img(f'{s}/09_situp_sec3.png' if courses else f'{s}/09_situp_sec2.png', width=700)
    team = ', '.join(CFG['team'])
    return head('활용사례 보고서') + f"""
<div class="cover">
  <div class="small">2026년 국민체육진흥공단 공공데이터 활용 경진대회 · ① 서비스(앱·웹) 개발 부문 · [붙임1] 활용사례 보고서</div>
  <h1>홈체력100 — 폰 카메라로 집에서 하는 국민체력100 AI 셀프 체력측정·운동처방 서비스</h1>
  <div class="sub">AI 자세인식으로 국민체력100 공식 종목을 셀프 측정하고, 공단 측정결과 데이터로 체력나이·맞춤 운동처방·체력인증센터 연계까지 제공하는 웹 서비스</div>
  <table style="margin-top:10px"><tr><th>서비스 URL</th><td><b>{URL}</b></td><td rowspan="3" style="width:86px;text-align:center"><img src="{qr(URL)}" style="width:74px"></td></tr>
  <tr><th>운영주체</th><td>{CFG['operator']} (참가자: {team})</td></tr>
  <tr><th>구축 완료일</th><td>2026. 10. 2. (GitHub Pages 배포, 소스 {REPO})</td></tr></table>
</div>

<h2>1) 활용 데이터명 및 URL</h2>
<table>
<tr><th>#</th><th>데이터명</th><th>URL</th><th>활용 규모</th></tr>
<tr><td>1</td><td>서울올림픽기념국민체육진흥공단_국민체력100 체력인증센터 측정결과 정보</td><td>https://www.data.go.kr/data/15108938/openapi.do</td><td>최신 {norms['sampleSize']:,}건 ({RANGE})</td></tr>
<tr><td>2</td><td>서울올림픽기념국민체육진흥공단_국민체력100 체력인증센터 측정건수 정보</td><td>https://www.data.go.kr/data/15114286/openapi.do</td><td>운영 센터 {n_center}곳, 최근 1년 측정 {center_recent:,}건</td></tr>
<tr><td>3</td><td>서울올림픽기념국민체육진흥공단_국민체력100 동영상 정보</td><td>https://www.data.go.kr/data/15108846/openapi.do</td><td>체력인증 측정방법 영상 · 운동처방 영상 {len(videos)}종</td></tr>
{f'''<tr><td>4</td><td>서울올림픽기념국민체육진흥공단_스포츠강좌이용권 등록강좌 정보</td><td>https://www.data.go.kr/data/15107784/openapi.do</td><td>강좌 67,012건 → 추천 종목 {len(courses):,}건</td></tr>
<tr><td>5</td><td>서울올림픽기념국민체육진흥공단_스포츠강좌이용권 등록시설 정보_GW</td><td>https://www.data.go.kr/data/15107783/openapi.do</td><td>시설 29,330곳 → 강좌에 시·도·시군구 연결</td></tr>''' if courses else ''}
</table>
<p class="small">※ {'5' if courses else '3'}종 모두 공공데이터포털 오픈API(서울올림픽기념국민체육진흥공단 제공)를 인증키로 직접 호출해 수집했습니다.</p>

<h2>2) 서비스 개요</h2>
<table>
<tr><th style="width:110px">서비스 구축(승인) 완료일</th><td>2026. 10. 2.</td></tr>
<tr><th>운영주체</th><td>{CFG['operator']}</td></tr>
<tr><th>서비스 URL</th><td>{URL} (모바일·PC 웹, 설치 불필요)</td></tr>
<tr><th>서비스 전체 개요</th><td>
스마트폰을 세워 두고 운동하면 브라우저 안에서 동작하는 AI가 관절을 인식해 국민체력100 공식 측정 종목(청소년 <b>윗몸말아올리기(3초 신호음 리듬)</b>, 성인 <b>교차윗몸일으키기 60초</b>, 어르신 <b>의자에앉았다일어서기 30초</b>)의 횟수를 자동으로 셉니다.
측정값은 공단 <b>체력인증센터 실제 측정결과 {norms['sampleSize']:,}건</b>으로 만든 성별·나이별 규준과 비교해 <b>백분위·체력나이·예상 등급</b>으로 보여주고,
나와 체력 수준이 비슷한 사람들이 <b>센터 운동처방사에게 실제로 받은 처방</b>을 공단 공식 운동 영상과 함께 추천한 뒤, 가까운 <b>체력인증센터 정식 측정</b>으로 연결합니다.
</td></tr>
</table>

<h3>ㅇ 서비스의 우수성 및 필요성</h3>
<div class="lead">국민체력100은 과학적 측정과 운동처방을 무료로 제공하는 국가 서비스지만, <b>센터에 가야만</b> 시작할 수 있습니다.</div>
<ul>
<li><b>접근성의 벽</b>: 체력인증센터는 2025년 82곳(2026년 101곳으로 확대 예정)이며 2025년 한 해 약 32만 명이 체력인증을 받았습니다(문체부 발표, 뉴데일리 2025.12.22). 공단 측정건수 데이터로 보면 최근 1년 측정은 {n_center}개 센터에서 {center_recent:,}건으로, 센터 한 곳당 연 {center_recent // n_center:,}건 수준입니다.</li>
<li><b>운동하지 않는 이유</b>: 2025 국민생활체육조사에서 규칙적으로 운동하지 않는 이유는 ‘시간 부족’ 61.3%, ‘관심 부족’ 50.8%, ‘시설 접근성 부족’ 31.3%였습니다(아시아경제 2026.1.19). 홈체력100은 <b>집에서 3분</b>(시간·접근성)과 <b>체력나이</b>라는 직관적 동기(관심)로 세 가지 이유를 함께 낮춥니다.</li>
<li><b>국가 기준 그대로</b>: 임의의 운동이 아니라 국민체력100 공식 종목과 측정 규칙을 사용하고, 결과도 국민 측정 데이터에 비교하므로 셀프 측정 결과가 센터 정식 측정으로 자연스럽게 이어집니다.</li>
<li><b>개인정보 걱정 없음</b>: 카메라 영상은 기기 밖으로 전송되지 않습니다. 서버가 없고, 측정값도 저장하지 않습니다.</li>
</ul>

<h3>ㅇ 국내외 시장 및 경쟁 현황</h3>
<p>2025년 생활체육 참여율은 62.9%(주 1회·30분 이상, 전년 대비 2.2%p 증가)로 생활체육 수요가 커지고 있으며, 체력인증센터도 확대되고 있습니다. 반면 기존 서비스는 ‘정확하지만 방문해야 하는’ 쪽과 ‘집에서 되지만 국가 기준이 없는’ 쪽으로 나뉘어 있습니다.</p>
<table>
<tr><th>구분</th><th>측정 장소</th><th>국가 기준 비교</th><th>실제 처방 기반 추천</th><th>공공 서비스 연계</th></tr>
<tr><td>국민체력100 체력인증센터</td><td>센터 방문</td><td>○</td><td>○ (운동처방사)</td><td>○</td></tr>
<tr><td>센터 측정 결과 기반 AI 체력진단</td><td>센터 측정 후</td><td>○</td><td>○</td><td>○</td></tr>
<tr><td>일반 홈트·AI 횟수 카운터 앱</td><td>집</td><td>×</td><td>×</td><td>×</td></tr>
<tr><td><b>홈체력100</b></td><td><b>집 (웹, 설치 불필요)</b></td><td><b>○ (측정결과 {norms['sampleSize']//10000}만 건)</b></td><td><b>○ (pres_note 빈도)</b></td><td><b>○ (센터·공식 영상)</b></td></tr>
</table>
<p class="small">차별점: 센터 서비스의 ‘앞단’을 집으로 넓히는 1차 측정 채널이며, 센터와 경쟁하지 않고 센터로 사용자를 보냅니다.</p>

<h3>ㅇ 서비스 내용 상세 (주요 기능 및 구현 이미지)</h3>
<div class="grid4">
  <figure><img src="{landing}"><figcaption>① 첫 화면 · 운동 없이 체험(데모)</figcaption></figure>
  <figure><img src="{profile}"><figcaption>② 성별·나이 → 종목 자동 선택</figcaption></figure>
  <figure><img src="{run_situp}"><figcaption>③ AI 관절 인식 · 자동 카운트</figcaption></figure>
  <figure><img src="{res_top}"><figcaption>④ 체력나이·백분위·등급</figcaption></figure>
</div>
<table style="margin-top:8px">
<tr><th style="width:120px">기능</th><th>내용</th></tr>
<tr><td>AI 셀프 측정</td><td>MediaPipe 자세추정 모델을 브라우저에서 실행해 33개 관절을 실시간 인식. 윗몸말아올리기·교차윗몸일으키기는 어깨–엉덩이–무릎 각도, 의자에앉았다일어서기는 허벅지/정강이 세로비로 판정하며, 임계값을 둘로 나눈(히스테리시스) 상태머신으로 떨림 중복 카운트를 막습니다. 관절이 가려지면 세지 않고 “몸 전체가 보이게” 안내합니다. 카운트는 소리·음성으로도 알려줍니다. 청소년 윗몸말아올리기는 공식 규칙대로 3초 간격 ‘위로/아래로’ 신호음을 내고, 리듬을 놓치면 자동 종료합니다.</td></tr>
<tr><td>운동 없이 체험(데모)</td><td>공단 <b>공식 측정방법 영상</b>을 같은 AI로 분석해 정확도를 바로 보여줍니다(AI가 센 횟수 vs 영상 속 실제 횟수).</td></tr>
<tr><td>체력나이 진단</td><td>같은 성별·나이(±2세) 측정자 분포에서 백분위, 연령별 중앙값 곡선에서 체력나이, 등급별 측정자 중앙값과 비교한 예상 등급을 계산합니다.</td></tr>
<tr><td>실제 처방 기반 추천</td><td>같은 성별·연령대·체력 10분위 그룹이 체력인증센터에서 받은 운동처방(pres_note) 빈도 TOP5를 공단 운동처방 영상과 함께 보여줍니다.</td></tr>
<tr><td>기록·공유</td><td>측정 기록을 기기 안에만 저장해 “지난 측정 대비 +N회”를 보여주고, 체력나이 결과를 이미지 카드로 저장·공유합니다(링크 미리보기 지원).</td></tr>
{'<tr><td>동네 강좌 추천</td><td>약한 체력요인을 꾸준히 키울 수 있는 종목(청소년 태권도·줄넘기, 성인 필라테스·헬스, 어르신 요가·수영 등)의 우리 시·도 스포츠강좌이용권 가맹 강좌를 수강료·요일·시간과 함께 추천합니다.</td></tr>' if courses else ''}
<tr><td>체력인증센터 연결</td><td>사용자 시·도의 센터를 최근 1년 측정건수 순으로 안내하고, 지도와 국민체력100 예약으로 연결합니다.</td></tr>
<tr><td>대체 경로</td><td>카메라 권한이 없으면 촬영해 둔 영상 파일 분석 또는 직접 횟수 입력으로도 결과·처방을 받을 수 있습니다.</td></tr>
</table>

<div class="grid3" style="margin-top:6px">
  <figure><img src="{res_rx}"><figcaption>⑤ 비슷한 체력군의 실제 처방 TOP5 + 공식 영상</figcaption></figure>
  {f'<figure><img src="{res_course}"><figcaption>⑥ 우리 동네 이용권 강좌 추천</figcaption></figure>' if res_course else ''}
  <figure><img src="{res_center}"><figcaption>⑦ 가까운 체력인증센터 · 예약 연결</figcaption></figure>
</div>
<div class="grid3" style="margin-top:6px">
  <figure><img src="{run_chair}"><figcaption>⑧ 어르신 종목(의자에앉았다일어서기)</figcaption></figure>
  {f'<figure><img src="{run_teen}"><figcaption>⑨ 청소년 윗몸말아올리기 · 신호음 리듬</figcaption></figure>' if run_teen else ''}
</div>

<h3>ㅇ AI 측정 정확도 검증</h3>
<table>
<tr><th>검증 방법</th><th>종목</th><th>실제 횟수</th><th>AI 카운트</th><th>결과</th></tr>
<tr><td>공단 측정방법 영상 구간(데모, 브라우저)</td><td>윗몸말아올리기</td><td>4회</td><td>4회</td><td class="check">일치</td></tr>
<tr><td>공단 측정방법 영상 구간(데모, 브라우저)</td><td>교차윗몸일으키기</td><td>8회</td><td>8회</td><td class="check">일치</td></tr>
<tr><td>공단 측정방법 영상 구간(데모, 브라우저)</td><td>의자에앉았다일어서기</td><td>6회</td><td>6회</td><td class="check">일치</td></tr>
<tr><td>가상 카메라에 영상 반복 주입, 실제 60초 측정 흐름</td><td>교차윗몸일으키기</td><td>24회</td><td>24회</td><td class="check">일치</td></tr>
</table>
<p class="small">※ 임계값은 공단 측정방법 영상에서 추출한 관절 지표 시계열로 보정했으며, 카운터·규준 로직은 단위 테스트 21건으로 검증했습니다.</p>

{pilot_html()}

<h3>ㅇ 기대효과(파급효과)</h3>
<div class="grid4">
  <div class="kpi"><b>3분</b><span>센터 방문 없이 집에서 1차 측정·결과·처방까지</span></div>
  <div class="kpi"><b>0원</b><span>서버 없는 온디바이스 AI · 사용자 수와 무관한 운영비</span></div>
  <div class="kpi"><b>0건</b><span>외부로 전송되는 영상·개인 측정 기록</span></div>
  <div class="kpi"><b>11~100세</b><span>청소년·성인·어르신 공식 3종목</span></div>
</div>
<table style="margin-top:8px">
<tr><th style="width:60px">정량</th><td>
<ul>
<li>측정 기회 확대: 센터 1곳당 연 {center_recent // n_center:,}건 수준의 대면 측정 용량과 달리, 스마트폰만 있으면 누구나 횟수 제한 없이 측정 가능</li>
<li>운영 목표(1년): 셀프 측정 10만 회, 결과 화면에서 체력인증센터 예약 연결 클릭률 10% 이상, 처방 영상 재생 3만 회</li>
<li>비용: 정적 호스팅 + 브라우저 내 AI로 서버·GPU 비용이 없어 공공기관 도입 시 추가 인프라 예산이 거의 들지 않음</li>
</ul></td></tr>
<tr><th>정성</th><td>
<ul>
<li>체력나이·백분위로 자기 체력을 직관적으로 이해 → 운동 시작 동기 부여 (관심 부족 해소)</li>
<li>셀프 측정 → 센터 정식 인증으로 이어지는 유입 경로를 만들어 국민체력100 참여 확대</li>
<li>어르신 하지 근기능(의자에앉았다일어서기)을 집에서 자주 점검해 낙상 위험 신호를 조기 발견</li>
<li>청소년은 학교 체육수업·방과후에 공식 규칙(신호음 리듬) 그대로 사전 측정 가능 → 학생건강체력평가 대비·체력 관리 습관</li>
<li>공단이 개방한 측정·처방·영상 데이터가 국민이 바로 쓰는 서비스로 환원되는 공공데이터 선순환 사례</li>
</ul></td></tr>
</table>

<h2>3) 국민체육진흥공단 데이터가 활용된 부분</h2>
<div class="flow"><div>공공데이터포털<br>오픈API {'5' if courses else '3'}종</div><i>→</i><div>수집 스크립트<br>(인증키, 페이지 병렬 수집)</div><i>→</i><div>집계<br>규준표·등급·처방·센터</div><i>→</i><div>정적 JSON<br>(약 {json_kb:,}KB)</div><i>→</i><div>브라우저<br>AI 측정 결과와 비교</div></div>
<table>
<tr><th>데이터</th><th>사용 항목</th><th>서비스에서 하는 일</th></tr>
<tr><td rowspan="4">측정결과 정보<br><span class="small">{norms['sampleSize']:,}건</span></td><td>item_f009 윗몸말아올리기(회), item_f019 교차윗몸일으키기(회), item_f023 의자에앉았다일어서기(회), test_sex, age_degree</td><td>성별 × 나이(±2세 창)별 101개 분위값 규준표 생성(윗몸말아올리기 {n_curl:,}건, 교차윗몸일으키기 {n_situp:,}건, 의자에앉았다일어서기 {n_chair:,}건) → <b>백분위·체력나이</b></td></tr>
<tr><td>cert_gbn 상장구분(1~6등급·참가)</td><td>연령대·등급별 해당 종목 중앙값 → <b>예상 등급</b></td></tr>
<tr><td>pres_note 운동처방내용</td><td>‘본운동’ 운동명을 분리해 성별·연령대·체력 10분위 그룹별 처방 빈도 집계 → <b>“비슷한 체력의 사람들이 실제로 받은 처방 TOP5”</b> ({len(rx_names)}종)</td></tr>
<tr><td>test_ym 측정연월</td><td>최신 데이터({RANGE}) 기준 비교임을 화면에 표기</td></tr>
<tr><td>측정건수 정보</td><td>center_nm, center_addr1·2, test_ym, test_cnt</td><td>센터별 최신 주소와 최근 12개월 측정건수 합계 → 시·도별 <b>가까운 체력인증센터</b> 안내(운영 {n_center}곳)</td></tr>
{f'<tr><td>스포츠강좌이용권 등록강좌 + 등록시설</td><td>item_nm, course_nm, settl_amt, lectr_weekday_val, start_tm·equip_tm / facil_nm, road_addr, city_nm, local_nm (brno+facil_sn으로 결합)</td><td>측정 종목별 추천 종목의 강좌를 시설 주소로 시·도·시군구에 연결해 <b>우리 동네 강좌</b> 추천 ({n_course_sido}개 시·도, 대표자명 등 개인 정보 제외)</td></tr>' if courses else ''}
<tr><td rowspan="2">동영상 정보</td><td>체력인증측정방법(TODZ_VDO_FTNS_CERT_I): 윗몸말아올리기·교차윗몸일으키기·30초 의자에 앉았다 일어서기 영상</td><td>① AI 카운터 임계값 보정용 학습·검증 영상 ② <b>운동 없이 체험(데모)</b> 영상 ③ 측정 화면의 공식 측정방법 안내</td></tr>
<tr><td>운동처방동영상·전체 동영상 목록: 운동명, 영상URL, 장면 이미지, 설명, 도구</td><td>처방 운동명과 영상 운동명을 정규화 매칭해 <b>처방 운동 {len(rx_names)}종 중 {len(videos)}종</b>에 공식 영상·썸네일 연결</td></tr>
</table>

<h2>4) 추가로 개방이 필요한 데이터</h2>
<table>
<tr><th>데이터</th><th>필요 이유</th></tr>
<tr><td>측정결과의 측정 센터(지역) 정보</td><td>지역별 규준과 “우리 동네 체력 지도”, 센터 수요 예측에 활용</td></tr>
<tr><td>재측정자 비식별 연결키</td><td>같은 사람의 체력 변화 추이 규준(“3개월 뒤 기대 향상치”) 제공</td></tr>
<tr><td>체력인증센터 예약 가능 시간 API</td><td>셀프 측정 직후 빈 시간대를 보여주고 바로 예약 연결</td></tr>
<tr><td>운동처방 운동명 표준 코드</td><td>처방(pres_note)과 영상 운동명 표기가 달라 {len(rx_names)}종 중 {len(rx_names) - len(videos)}종은 영상 매칭 불가 → 표준 코드로 100% 연결</td></tr>
<tr><td>스포츠강좌이용권 강좌 정원·잔여석 정보</td><td>추천 강좌의 수강 가능 여부를 바로 보여주고 신청으로 연결</td></tr>
</table>

<h2>5) 발전 가능성 · 사업화 계획</h2>
<table>
<tr><th style="width:120px">단계</th><th>내용</th></tr>
<tr><td>종목 확대</td><td>반복옆뛰기, 어르신 2분제자리걷기 등 측정결과 데이터에 있는 반복형 종목을 같은 엔진으로 추가해 체력요인별 종합 진단으로 확장</td></tr>
<tr><td>공공 연계 (B2G)</td><td>국민체력100 앱·홈페이지에 셀프 측정 모듈로 제공, 보건소·지자체 어르신 낙상예방 프로그램의 가정 내 점검 도구</td></tr>
<tr><td>학교·기업 (B2B)</td><td>학교 체육수업 사전 측정, 기업 임직원 체력 챌린지(부서별 체력나이 리그) — 단체 관리용 대시보드 구독형 과금</td></tr>
<tr><td>헬스케어 연계</td><td>건강증진형 보험·헬스케어 서비스에 객관적 체력 지표(국가 규준 기반 체력나이) 제공, 이용권 강좌 연계 중개</td></tr>
</table>
<p class="small">운영 원칙: 측정 영상은 계속 기기 안에서만 처리하고, 단체 서비스도 사용자가 동의한 결과 수치만 공유합니다.</p>
</body></html>"""


def evidence_html():
    s = SHOTS
    commits = img(f'{s}/90_github_commits.png', width=900) if os.path.exists(f'{s}/90_github_commits.png') else ''
    actions = img(f'{s}/91_github_actions.png', width=900) if os.path.exists(f'{s}/91_github_actions.png') else ''
    res_full = img(f'{s}/04_situp_result_full.png', crop=(0, 1100, 824, 1520), width=600)
    return head('증빙자료') + f"""
<h1>[붙임2] 증빙자료 — 홈체력100</h1>
<p><b>과제명</b>: 홈체력100 — 폰 카메라로 집에서 하는 국민체력100 AI 셀프 체력측정·운동처방 서비스</p>
<p class="small">2026년 국민체육진흥공단 공공데이터 활용 경진대회 · 서비스(앱·웹) 개발 부문</p>
<h2>1) 서비스 구축(승인) 완료일: 2026. 10. 2.</h2>
<p>소스 저장소 {REPO} 의 커밋 이력과 GitHub Actions 배포 기록으로 확인할 수 있습니다. 최초 배포와 최종 배포 모두 2026-10-02입니다.</p>
{f'<figure><img src="{commits}"><figcaption>GitHub 커밋 이력</figcaption></figure>' if commits else ''}
{f'<figure style="margin-top:8px"><img src="{actions}"><figcaption>GitHub Actions — GitHub Pages 배포 기록</figcaption></figure>' if actions else ''}
<h2>2) 운영주체</h2>
<table><tr><th>운영주체</th><td>{CFG['operator']}</td></tr><tr><th>참가자</th><td>{', '.join(CFG['team'])}</td></tr><tr><th>소스·배포 계정</th><td>GitHub kts6450 (저장소 {REPO})</td></tr>
<tr><th>운영 요소</th><td>이용안내 · 개인정보처리방침(시행일 2026-10-02) · 업데이트 내역(v1.0.0~v1.2.0) · 문의·오류 신고 게시판({REPO}/issues) · 익명 운영 통계</td></tr></table>
{f'<div class="grid2" style="margin-top:6px"><figure><img src="{img(SHOTS + "/10_privacy.png", crop=(0, 0, 824, 1600), width=600)}"><figcaption>개인정보처리방침</figcaption></figure><figure><img src="{img(SHOTS + "/11_changelog.png", crop=(0, 0, 824, 1600), width=600)}"><figcaption>업데이트 내역</figcaption></figure></div>' if os.path.exists(SHOTS + '/10_privacy.png') else ''}
<h2>3) 서비스 URL</h2>
<table><tr><td><b>{URL}</b><br><span class="small">모바일·PC 브라우저에서 바로 실행(설치 불필요). 첫 화면의 ‘운동 없이 체험’으로 카메라 없이도 AI 측정을 확인할 수 있습니다.</span></td><td style="width:110px;text-align:center"><img src="{qr(URL)}" style="width:96px"></td></tr></table>
<h2>4) 기대효과(파급효과)</h2>
<table>
<tr><th>정량</th><td>집에서 약 3분 만에 1차 측정·결과·처방 / 서버 비용 0원(온디바이스 AI·정적 호스팅) / 영상 외부 전송 0건 / 비교 기준 국민 측정 데이터 {norms['sampleSize']:,}건 / 1년 목표: 셀프 측정 10만 회, 센터 예약 연결 클릭률 10%</td></tr>
<tr><th>정성</th><td>체력나이로 운동 동기 부여, 셀프 측정 → 체력인증센터 정식 인증 유입 확대, 어르신 하지 근기능 가정 내 수시 점검, 공단 개방 데이터의 대국민 서비스 환원</td></tr>
</table>
<h2>5) 국민체육진흥공단 데이터가 활용된 부분</h2>
<table>
<tr><th>데이터</th><th>활용 부분</th><th>코드 위치</th></tr>
{'<tr><td>스포츠강좌이용권 등록강좌·등록시설 정보</td><td>시·도별 추천 종목 강좌(수강료·요일·시간)</td><td>scripts/build-data.mjs → public/data/courses.json</td></tr>' if courses else ''}
<tr><td>국민체력100 체력인증센터 측정결과 정보</td><td>규준표(백분위·체력나이), 등급 기준, 실제 처방 TOP5</td><td>scripts/build-data.mjs → public/data/norms.json, rx.json</td></tr>
<tr><td>국민체력100 체력인증센터 측정건수 정보</td><td>시·도별 체력인증센터 안내(최근 1년 측정건수)</td><td>scripts/build-data.mjs → public/data/centers.json</td></tr>
<tr><td>국민체력100 동영상 정보</td><td>AI 카운터 보정·데모 영상(측정방법), 처방 운동 영상 연결</td><td>public/demo/*.mp4, public/data/videos.json</td></tr>
</table>
<p class="small">수집: scripts/fetch-data.mjs (공공데이터포털 apis.data.go.kr/B551014/…) · 화면 표기: 결과 화면 하단 “비교 대상 … 공공데이터포털” 및 각 영상 출처 표기</p>
<figure style="margin-top:6px"><img src="{res_full}" style="width:60%"><figcaption>결과 화면의 데이터 출처 표기</figcaption></figure>
</body></html>"""


def consent_html():
    sig_path = 'report/signature_t.png'
    sig = ''
    if os.path.exists(sig_path):
        sig = 'data:image/png;base64,' + base64.b64encode(open(sig_path, 'rb').read()).decode()
    blocks = ''
    for name in CFG['team']:
        blocks += f"""
<div class="pb" style="page-break-before:{'avoid' if name == CFG['team'][0] else 'always'}">
<h1 style="font-size:15pt">[붙임3] 개인정보 수집·이용 동의서</h1>
<p class="small">※ 반드시 자필 서명 후 스캔(pdf) 또는 자필 서명 이미지를 삽입하여 제출 · 팀 참가 시 구성원 전원 제출</p>
<p>「개인정보 보호법」 제15조 및 제22조에 따라 개인정보를 수집·이용하는 경우 개인의 동의를 얻어야 합니다.</p>
<h3>가. 개인정보 수집·이용 목적</h3>
<p>① 「2026년 국민체육진흥공단 공공데이터 활용 경진대회」를 위한 접수, 자격확인 심사 및 운영관리<br>② 수상자 발표 및 결과 홍보(공단 홈페이지 및 보도자료 등 온라인 게재)<br>③ 수상작 후속지원을 받는 경우 안내 및 관련 연락<br>④ 상금지급 및 세무처리(기타소득 원천징수 신고 등)</p>
<h3>나. 개인정보 수집 항목</h3>
<p>◦ 공통 : 성명, 생년월일, E-Mail, 휴대전화, 소속/직위<br>◦ 상금지급 : 주민등록번호(원천징수용), 계좌정보 ※ 수상자에 한해 별도 수집</p>
<h3>다. 개인정보의 보유·이용기간</h3>
<p>① 운영관리 : 대회 결과발표일로부터 6개월<br>② 홍보게재 : 게재 목적 달성시까지(정보주체가 삭제 요청시 지체없이 파기)<br>③ 후속지원 : 후속지원 종료일로부터 6개월<br>④ 상금지원 : 관계 법령(국세기본법 등)에서 정한 기간</p>
<h3>라. 개인정보 수집·이용에 동의하지 않을 권리 및 동의하지 않을 경우의 불이익</h3>
<p>◦ 정보주체는 「2026년 국민체육진흥공단 공공데이터 활용 경진대회」에 개인정보 수집·이용의 동의를 거부할 권리가 있습니다.<br>◦ 개인정보 수집·이용에 동의하지 않을 경우, 본 대회에 참가신청이 불가합니다.</p>
<p style="margin-top:18px">본인은 「2026년 국민체육진흥공단 공공데이터 활용 경진대회」 에서 본인의 개인정보를 수집·이용하는 것에 동의합니다.</p>
<p style="text-align:center;font-size:12pt;margin:14px 0">(동의함 {'☑' if sig else '□'} / 동의하지 않음 □)</p>
<p style="text-align:center;font-size:12pt">2026년 10월 2일</p>
<div style="display:flex;justify-content:flex-end;align-items:center;gap:14px;font-size:12pt;margin-top:34px">
<span>신청인</span><b>{name}</b>
<span style="position:relative;display:inline-block;width:150px;height:60px;text-align:center;line-height:60px;color:#64748b">(서명){f'<img src="{sig}" style="position:absolute;left:8px;top:2px;height:56px">' if sig else ''}</span>
</div>
</div>"""
    return head('개인정보 수집·이용 동의서') + blocks + '</body></html>'


def capture_github(pg):
    pg.set_viewport_size({'width': 1100, 'height': 900})
    pg.goto(f'{REPO}/commits/feat/homefit100/', wait_until='networkidle')
    pg.screenshot(path=f'{SHOTS}/90_github_commits.png', clip={'x': 0, 'y': 0, 'width': 1100, 'height': 900})
    pg.goto(f'{REPO}/actions', wait_until='networkidle')
    pg.screenshot(path=f'{SHOTS}/91_github_actions.png', clip={'x': 0, 'y': 0, 'width': 1100, 'height': 800})


if __name__ == '__main__':
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, headless=True)
        pg = b.new_page()
        if '--github' in sys.argv:
            capture_github(pg)
        for name, html in [('[붙임1]_활용사례보고서_홈체력100', report_html()), ('[붙임2]_증빙자료_홈체력100', evidence_html()), ('[붙임3]_개인정보동의서_홈체력100', consent_html())]:
            path = os.path.abspath(f'report/{name}.html')
            open(path, 'w', encoding='utf-8').write(html)
            pg.goto('file:///' + path.replace('\\', '/'), wait_until='networkidle')
            pg.pdf(path=f'report/{name}.pdf', format='A4', print_background=True, margin={'top': '16mm', 'bottom': '16mm', 'left': '15mm', 'right': '15mm'})
            print('saved', name)
        b.close()

# 배포본 E2E: 데모 측정 → 결과까지 진행하며 스크린샷 저장 (보고서 증빙용)
import sys, time
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'https://kts6450.github.io/homefit100/'
TEST = sys.argv[2] if len(sys.argv) > 2 else 'situp'
OUT = 'report/shots'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True, args=['--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 412, 'height': 915}, device_scale_factor=2)
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
    pg.goto(URL, wait_until='networkidle')
    pg.screenshot(path=f'{OUT}/01_landing.png')
    pg.screenshot(path=f'{OUT}/01_landing_full.png', full_page=True)
    label = '윗몸일으키기 데모' if TEST == 'situp' else '어르신 의자 종목 데모'
    pg.get_by_text(label).click()
    pg.get_by_text('AI 분석 시작').wait_for(timeout=60000)
    time.sleep(1.5)
    pg.screenshot(path=f'{OUT}/02_{TEST}_ready.png')
    pg.get_by_text('AI 분석 시작').click()
    t0 = time.time()
    shot = 0
    while time.time() - t0 < 60:
        time.sleep(4)
        shot += 1
        pg.screenshot(path=f'{OUT}/03_{TEST}_running_{shot}.png')
        if pg.get_by_text('측정 완료').count() or pg.get_by_text('체력나이').count():
            break
    pg.get_by_text('체력나이').first.wait_for(timeout=30000)
    time.sleep(1.5)
    pg.screenshot(path=f'{OUT}/04_{TEST}_result.png')
    pg.screenshot(path=f'{OUT}/04_{TEST}_result_full.png', full_page=True)
    print('DEMO TEXT:', pg.locator('text=AI가 센 횟수').first.inner_text() if pg.locator('text=AI가 센 횟수').count() else pg.inner_text('body')[:400])
    print('ERRORS:', errs[:5])
    b.close()

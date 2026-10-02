# 청소년 종목 E2E: 데모 + 가상 카메라(신호음 리듬 모드) 측정 후 '측정 종료'
import sys, time, os
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
Y4M = os.path.abspath('data-raw/fake/curl.y4m')
OUT = 'report/shots'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True, args=[
        '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
        f'--use-file-for-fake-video-capture={Y4M}', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2, permissions=['camera'])
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='networkidle')
    pg.screenshot(path=f'{OUT}/01_landing.png')
    # 데모
    pg.locator('button', has_text='청소년').first.click()
    pg.get_by_text('AI 분석 시작').wait_for(timeout=60000)
    pg.get_by_text('AI 분석 시작').click()
    time.sleep(7)
    pg.screenshot(path=f'{OUT}/03_curlup_running.png')
    pg.get_by_text('체력인증센터에서').first.wait_for(timeout=60000)
    time.sleep(1)
    pg.screenshot(path=f'{OUT}/04_curlup_result_full.png', full_page=True)
    print('DEMO:', pg.locator('text=AI가 센 횟수').first.inner_text())
    # 카메라
    pg.get_by_text('← 처음으로').first.click()
    pg.get_by_text('내 체력나이 측정하기').click()
    pg.get_by_text('남성', exact=True).click()
    pg.get_by_placeholder('예: 42').fill('15')
    pg.locator('select').select_option('경기')
    pg.screenshot(path=f'{OUT}/05_curlup_profile.png')
    pg.get_by_text('다음: 카메라로 측정하기').click()
    pg.get_by_text('측정 시작 (신호음 리듬)').wait_for(timeout=60000)
    pg.get_by_text('측정 시작 (신호음 리듬)').click()
    time.sleep(14)
    pg.screenshot(path=f'{OUT}/08_curlup_camera_running.png')
    time.sleep(10)
    pg.get_by_text('측정 종료').click()
    pg.get_by_text('체력인증센터에서').first.wait_for(timeout=30000)
    time.sleep(1)
    pg.screenshot(path=f'{OUT}/09_curlup_camera_result_full.png', full_page=True)
    body = pg.inner_text('body')
    i = body.find('윗몸말아올리기')
    print('CAMERA:', body[i:i + 120].replace('\n', ' | '))
    print('ERRORS:', errs[:5])
    b.close()

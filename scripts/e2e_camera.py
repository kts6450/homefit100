# 배포본 E2E: 가상 카메라(공단 영상을 y4m으로 주입)로 실제 카메라 측정 흐름 검증 + 스크린샷
import sys, time, os
from playwright.sync_api import sync_playwright

URL, Y4M, SEX, AGE, TAG = sys.argv[1], os.path.abspath(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
OUT = 'report/shots'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True, args=[
        '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
        f'--use-file-for-fake-video-capture={Y4M}', '--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=2, permissions=['camera'])
    pg = ctx.new_page()
    pg.route('**/hits.sh/**', lambda r: r.abort())  # 자동화 테스트는 운영 통계에서 제외
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL, wait_until='networkidle')
    pg.get_by_text('내 체력나이 측정하기').click()
    pg.get_by_text('여성' if SEX == 'F' else '남성', exact=True).click()
    pg.get_by_placeholder('예: 42').fill(AGE)
    pg.locator('select').select_option('서울')
    time.sleep(0.5)
    pg.screenshot(path=f'{OUT}/05_{TAG}_profile.png')
    pg.get_by_text('다음: 카메라로 측정하기').click()
    start = pg.get_by_text('측정 시작')
    start.wait_for(timeout=60000)
    time.sleep(2)
    pg.screenshot(path=f'{OUT}/06_{TAG}_camera_ready.png')
    start.click()
    time.sleep(2.5)
    pg.screenshot(path=f'{OUT}/07_{TAG}_countdown.png')
    t0 = time.time(); n = 0
    while time.time() - t0 < 90:
        time.sleep(10); n += 1
        pg.screenshot(path=f'{OUT}/08_{TAG}_camera_running_{n}.png')
        if pg.get_by_text('체력나이').count(): break
    pg.get_by_text('체력나이').first.wait_for(timeout=60000)
    time.sleep(1.5)
    pg.screenshot(path=f'{OUT}/09_{TAG}_camera_result_full.png', full_page=True)
    for i in range(pg.locator('section').count()):
        pg.locator('section').nth(i).screenshot(path=f'{OUT}/09_{TAG}_sec{i}.png')
    body = pg.inner_text('body')
    i = body.find('회')
    print(TAG, 'RESULT HEAD:', body[max(0, i - 40):i + 80].replace('\n', ' | ').encode('utf-8', 'replace').decode('utf-8'))
    print(TAG, 'ERRORS:', errs[:5])
    b.close()

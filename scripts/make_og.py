# 링크 미리보기 이미지(public/og.png, 1200×630) 생성
import os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
HTML = """<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
body{margin:0;width:1200px;height:630px;font-family:'Pretendard Variable',sans-serif;color:#fff;
background:linear-gradient(135deg,#0b5fff,#1a4fd8 45%,#062a7a);position:relative;overflow:hidden}
.o{position:absolute;border-radius:50%;filter:blur(30px)}
.wrap{position:absolute;left:80px;top:70px;right:80px}
.chip{display:inline-block;background:rgba(255,255,255,.16);padding:10px 22px;border-radius:99px;font-size:26px;font-weight:700}
h1{font-size:84px;line-height:1.12;margin:30px 0 0;font-weight:900;letter-spacing:-2px}
h1 em{font-style:normal;color:#7cf5d0}
p{font-size:32px;margin:26px 0 0;color:rgba(255,255,255,.85)}
.stats{position:absolute;left:80px;bottom:60px;display:flex;gap:18px}
.s{background:#fff;color:#0b5fff;border-radius:20px;padding:14px 26px;font-size:28px;font-weight:800}
.s span{color:#64748b;font-weight:600;font-size:22px;margin-left:8px}
</style></head><body>
<div class="o" style="width:420px;height:420px;right:-120px;top:-140px;background:rgba(255,255,255,.12)"></div>
<div class="o" style="width:460px;height:460px;right:120px;bottom:-260px;background:rgba(0,224,164,.35)"></div>
<div class="wrap"><div class="chip">● 국민체력100 공공데이터 기반</div>
<h1>폰 카메라로<br>집에서 <em>국민체력100</em></h1>
<p>AI가 횟수를 세고, 국민 측정 데이터로 체력나이와 운동처방까지</p></div>
<div class="stats"><div class="s">20만 건<span>실제 측정 데이터</span></div><div class="s">3종목<span>청소년~어르신</span></div><div class="s">0건<span>영상 외부 전송</span></div></div>
</body></html>"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, headless=True)
    pg = b.new_page(viewport={'width': 1200, 'height': 630})
    pg.set_content(HTML, wait_until='networkidle')
    pg.screenshot(path=os.path.join(ROOT, 'public', 'og.png'))
    b.close()
print('public/og.png')

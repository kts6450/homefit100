/** 결과 공유용 이미지 카드 (1080×1350, 인스타그램 세로 비율) */
export type CardInfo = { headline: string; big: string; badge: string; lines: string[]; footer: string }

export async function drawShareCard(info: CardInfo): Promise<Blob> {
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  await document.fonts?.ready

  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0b5fff')
  bg.addColorStop(1, '#062a7a')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  g.fillStyle = 'rgba(0,224,164,0.25)'
  g.beginPath()
  g.arc(W - 80, 140, 260, 0, Math.PI * 2)
  g.fill()

  const font = (w: number, px: number) => `${w} ${px}px "Pretendard Variable", Pretendard, "Malgun Gothic", sans-serif`
  g.fillStyle = '#ffffff'
  g.font = font(800, 44)
  g.fillText('홈체력100', 80, 130)
  g.font = font(500, 32)
  g.fillStyle = 'rgba(255,255,255,0.75)'
  g.fillText('폰 카메라로 집에서 하는 국민체력100', 80, 182)

  g.fillStyle = '#ffffff'
  g.font = font(600, 46)
  g.fillText(info.headline, 80, 430)
  g.font = font(900, 220)
  g.fillText(info.big, 70, 650)

  g.font = font(800, 44)
  const bw = g.measureText(info.badge).width + 64
  g.fillStyle = '#00e0a4'
  roundRect(g, 80, 700, bw, 84, 42)
  g.fill()
  g.fillStyle = '#062a7a'
  g.fillText(info.badge, 112, 757)

  g.fillStyle = 'rgba(255,255,255,0.92)'
  g.font = font(600, 40)
  info.lines.forEach((l, i) => g.fillText(l, 80, 900 + i * 66))

  g.fillStyle = 'rgba(255,255,255,0.6)'
  g.font = font(500, 30)
  g.fillText(info.footer, 80, H - 120)
  g.fillText('kts6450.github.io/homefit100', 80, H - 72)

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('이미지 생성 실패'))), 'image/png'))
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

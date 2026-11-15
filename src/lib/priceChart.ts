import { cpi, CPI_LAST_YEAR } from '../data'

const Y0 = 1985
const Y1 = 2026
const BASE = cpi[1985]
const ANCHOR = 0.3 // the $1.50 line sits 30% up the plot, and never moves
const SPAN_START = 5
const SPAN_END = 0.0002

export const shouldBe = (year: number) => {
  const y = Math.min(year, CPI_LAST_YEAR)
  const a = Math.floor(y)
  const b = Math.min(a + 1, CPI_LAST_YEAR)
  const t = y - a
  const c = cpi[a] + (cpi[b] - cpi[a]) * t
  return (1.5 * c) / BASE
}

/** Hand-drawn canvas chart for the "WHAT IT SHOULD BE" panel. */
export class PriceChart {
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private ro: ResizeObserver
  year = Y0
  zoom = 0

  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.resize()
  }

  destroy() {
    this.ro.disconnect()
  }

  private resize() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    this.w = r.width
    this.h = r.height
    this.canvas.width = Math.round(r.width * this.dpr)
    this.canvas.height = Math.round(r.height * this.dpr)
    this.draw()
  }

  set(year: number, zoom = this.zoom) {
    this.year = year
    this.zoom = zoom
    this.draw()
  }

  draw() {
    const { ctx, w, h, dpr } = this
    if (!w || !h) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const padL = 44
    const padR = 10
    const padT = 12
    const padB = 20
    const pw = w - padL - padR
    const ph = h - padT - padB

    const span = SPAN_START * Math.pow(SPAN_END / SPAN_START, this.zoom)
    const lo = 1.5 - ANCHOR * span
    const hi = lo + span
    const x = (yr: number) => padL + ((yr - Y0) / (Y1 - Y0)) * pw
    const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * ph

    // grid
    ctx.lineWidth = 1
    ctx.strokeStyle = '#2c2a25'
    ctx.fillStyle = '#77737a'
    ctx.font = `10px 'Fragment Mono', monospace`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    const decimals = span >= 2 ? 2 : Math.max(2, Math.min(5, Math.ceil(-Math.log10(span / 4)) + 1))
    for (let i = 0; i <= 4; i++) {
      const gy = Math.round(padT + (i / 4) * ph) + 0.5
      ctx.beginPath()
      ctx.moveTo(padL, gy)
      ctx.lineTo(padL + pw, gy)
      ctx.stroke()
      const v = hi - (i / 4) * span
      ctx.fillText(v.toFixed(decimals), padL - 6, gy)
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    for (let yr = 1985; yr <= 2025; yr += 10) {
      const gx = Math.round(x(yr)) + 0.5
      ctx.beginPath()
      ctx.moveTo(gx, padT)
      ctx.lineTo(gx, padT + ph)
      ctx.stroke()
      ctx.fillText(String(yr), gx, h - 6)
    }

    const yearNow = Math.max(Y0, Math.min(Y1, this.year))

    // what it should cost, in ketchup
    ctx.save()
    ctx.beginPath()
    ctx.rect(padL, padT, pw, ph)
    ctx.clip()
    ctx.strokeStyle = '#d2392f'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const end = Math.min(yearNow, CPI_LAST_YEAR)
    let offAt: number | null = null
    for (let yr = Y0; yr <= end + 0.001; yr += 0.25) {
      const v = shouldBe(Math.min(yr, end))
      const px = x(Math.min(yr, end))
      const py = y(v)
      if (yr === Y0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
      if (offAt === null && py < padT) offAt = px
    }
    ctx.stroke()

    // what it does cost, in mustard: flat, forever
    ctx.strokeStyle = '#d9a11b'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(x(Y0), Math.round(y(1.5)) + 0.5)
    ctx.lineTo(x(yearNow), Math.round(y(1.5)) + 0.5)
    ctx.stroke()
    ctx.restore()

    // head dot on the flat line
    ctx.fillStyle = '#f3c12e'
    ctx.beginPath()
    ctx.arc(x(yearNow), Math.round(y(1.5)) + 0.5, 3, 0, Math.PI * 2)
    ctx.fill()

    if (offAt !== null && this.zoom > 0.05) {
      ctx.fillStyle = '#d2392f'
      ctx.textAlign = 'left'
      ctx.font = `10px 'Fragment Mono', monospace`
      const fx = Math.min(offAt + 4, padL + pw - 70)
      ctx.globalAlpha = Math.min(1, this.zoom * 3)
      ctx.fillText('OFF SCALE ▲', fx, padT + 11)
      ctx.globalAlpha = 1
    }
  }
}

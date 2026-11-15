type P = { x: number; y: number; vx: number; vy: number; r: number; c: string; life: number }

const MAX = 30
const COLORS = ['#8f8b83', '#b5b1a9', '#a29e96']

/** Plaster dust that shakes loose when the board takes a hit. Draws only while dust is airborne. */
export class Dust {
  private ctx: CanvasRenderingContext2D
  private ps: P[] = []
  private raf = 0
  private last = 0
  private dpr = 1

  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
  }

  private fit() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.round(r.width * this.dpr)
    const h = Math.round(r.height * this.dpr)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  /** Burst along a horizontal edge, in canvas CSS pixels. */
  burst(x0: number, x1: number, y: number, count = 14) {
    this.fit()
    for (let i = 0; i < count && this.ps.length < MAX; i++) {
      this.ps.push({
        x: x0 + Math.random() * (x1 - x0),
        y: y + Math.random() * 4,
        vx: (Math.random() - 0.5) * 60,
        vy: -20 - Math.random() * 60,
        r: 0.6 + Math.random() * 1.4,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        life: 0.9,
      })
    }
    if (!this.raf) {
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.tick)
    }
  }

  private tick = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const { ctx, dpr } = this
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ps = this.ps.filter((p) => (p.life -= dt) > 0)
    for (const p of this.ps) {
      p.vy += 900 * dt
      p.vx *= 0.985
      p.x += p.vx * dt
      p.y += p.vy * dt
      ctx.globalAlpha = Math.min(1, p.life * 2)
      ctx.fillStyle = p.c
      ctx.fillRect(p.x, p.y, p.r * 2, p.r * 2)
    }
    ctx.globalAlpha = 1
    this.raf = this.ps.length ? requestAnimationFrame(this.tick) : 0
    if (!this.raf) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
  }
}

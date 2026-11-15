import { gsap } from './scroll'

export type Pt = { x: number; y: number }

type Tag = {
  el: HTMLDivElement
  price: number
  year: number
  x: number
  y: number
  r: number
  live: boolean
}

const fmt = (p: number) => p.toFixed(2)

/**
 * Price-gun labels the market keeps throwing at the board. They live in the hero's
 * world layer (so the camera moves them too) and pile up on the floor once knocked off.
 * After the sequence, visitors can pull one back like a slingshot and fire it.
 */
export class PriceTags {
  private layer: HTMLDivElement
  private band: SVGLineElement
  private tags: Tag[] = []
  private scale: () => number
  private boardRect: () => DOMRect | { x: number; y: number; width: number; height: number }
  private onHit: (price: number) => void
  private slingOn = false
  private ticking = new Set<Tag>()
  private cleanup: (() => void)[] = []

  constructor(opts: {
    layer: HTMLDivElement
    band: SVGLineElement
    scale: () => number
    boardRect: () => { x: number; y: number; width: number; height: number }
    onHit: (price: number) => void
  }) {
    this.layer = opts.layer
    this.band = opts.band
    this.scale = opts.scale
    this.boardRect = opts.boardRect
    this.onHit = opts.onHit
  }

  get size() {
    return { w: this.layer.clientWidth, h: this.layer.clientHeight }
  }

  /** Floor spot for tag i: a loose heap under the board. */
  pile(i: number): Pt & { r: number } {
    const { w, h } = this.size
    const narrow = w < 760
    const span = narrow ? [0.12, 0.88] : [0.38, 0.8]
    const f = ((i * 0.618034) % 1) * 0.85 + (i / 9) * 0.15
    return {
      x: w * (span[0] + (span[1] - span[0]) * f) + (((i * 29) % 17) - 8),
      y: h * (narrow ? 0.79 : 0.755) + ((i * 37) % 5) * h * 0.014,
      r: ((i * 53) % 56) - 28,
    }
  }

  create(prices: { price: number; year: number }[]) {
    this.layer.querySelectorAll('.ptag').forEach((n) => n.remove())
    this.tags = prices.map(({ price, year }) => {
      const el = document.createElement('div')
      el.className = 'ptag'
      el.innerHTML = `<span class="ptag__k">NEW PRICE</span><span class="ptag__p">$${fmt(price)}</span><span class="ptag__y">EFF. ${year}</span>`
      el.style.visibility = 'hidden'
      this.layer.appendChild(el)
      gsap.set(el, { xPercent: -50, yPercent: -50 })
      return { el, price, year, x: 0, y: 0, r: 0, live: false }
    })
  }

  private put(t: Tag, x: number, y: number, r: number) {
    t.x = x
    t.y = y
    t.r = r
    gsap.set(t.el, { x, y, rotate: r })
  }

  /** Arc tag i in from off-screen and slap it onto the target. */
  fly(i: number, target: Pt) {
    const t = this.tags[i]
    const { w, h } = this.size
    const side = i % 3
    const start =
      side === 0
        ? { x: -160, y: h * (0.25 + (i % 2) * 0.2) }
        : side === 1
          ? { x: w + 160, y: h * (0.18 + (i % 2) * 0.25) }
          : { x: w * (0.3 + (i % 4) * 0.15), y: -140 }
    const ctrl = { x: (start.x + target.x) / 2, y: Math.min(start.y, target.y) - h * 0.22 }
    const spin = (side === 1 ? -1 : 1) * (360 + i * 40)
    const p = { t: 0 }
    t.el.style.visibility = 'visible'
    t.live = true
    const tl = gsap.timeline()
    tl.to(p, {
      t: 1,
      duration: 0.36,
      ease: 'power1.in',
      onUpdate: () => {
        const u = p.t
        const x = (1 - u) * (1 - u) * start.x + 2 * (1 - u) * u * ctrl.x + u * u * target.x
        const y = (1 - u) * (1 - u) * start.y + 2 * (1 - u) * u * ctrl.y + u * u * target.y
        this.put(t, x, y, spin * (1 - u) + (i % 2 ? -7 : 6))
      },
    })
    tl.fromTo(t.el, { scale: 1.3 }, { scale: 1, duration: 0.36, ease: 'power1.in' }, 0)
    return tl
  }

  /** Knock tag i off the board onto its floor spot. */
  knock(i: number) {
    const t = this.tags[i]
    const dest = this.pile(i)
    const tl = gsap.timeline()
    const fromX = t.x
    tl.to(t, {
      x: dest.x,
      duration: 0.75,
      ease: 'power1.out',
      onUpdate: () => gsap.set(t.el, { x: t.x }),
    })
    tl.to(t, { y: dest.y, duration: 0.75, ease: 'bounce.out', onUpdate: () => gsap.set(t.el, { y: t.y }) }, 0)
    tl.to(
      t,
      { r: dest.r + (dest.x > fromX ? 200 : -200), duration: 0.75, ease: 'power2.out', onUpdate: () => gsap.set(t.el, { rotate: t.r }) },
      0,
    )
    tl.add(() => this.put(t, dest.x, dest.y, dest.r))
    return tl
  }

  /** The stamp lands: every tag on the floor jumps and resettles. */
  scatter(origin: Pt) {
    this.tags.forEach((t, i) => {
      if (!t.live) return
      const dx = t.x - origin.x
      const push = Math.sign(dx || 1) * (30 + ((i * 17) % 40))
      const nx = t.x + push
      gsap
        .timeline()
        .to(t, { y: t.y - 40 - ((i * 13) % 30), duration: 0.18, ease: 'power2.out', onUpdate: () => gsap.set(t.el, { y: t.y }) })
        .to(t, { y: t.y, duration: 0.42, ease: 'bounce.out', onUpdate: () => gsap.set(t.el, { y: t.y }) })
      gsap.to(t, { x: nx, r: t.r + push * 0.8, duration: 0.6, ease: 'power2.out', onUpdate: () => gsap.set(t.el, { x: t.x, rotate: t.r }) })
    })
  }

  placeAll() {
    this.tags.forEach((t, i) => {
      const d = this.pile(i)
      t.el.style.visibility = 'visible'
      t.live = true
      this.put(t, d.x, d.y, d.r)
    })
  }

  hideAll() {
    this.tags.forEach((t) => {
      gsap.killTweensOf(t)
      gsap.killTweensOf(t.el)
      t.el.style.visibility = 'hidden'
      t.live = false
      this.ticking.delete(t)
    })
  }

  // ── Slingshot ────────────────────────────────────────────────────────
  enableSling(on: boolean) {
    if (on === this.slingOn) return
    this.slingOn = on
    this.layer.classList.toggle('tags--sling', on)
    this.cleanup.forEach((f) => f())
    this.cleanup = []
    if (!on) return
    for (const t of this.tags) {
      const down = (e: PointerEvent) => this.grab(t, e)
      t.el.addEventListener('pointerdown', down)
      this.cleanup.push(() => t.el.removeEventListener('pointerdown', down))
    }
  }

  private grab(t: Tag, e: PointerEvent) {
    if (!t.live || this.ticking.has(t)) return
    e.preventDefault()
    const el = t.el
    el.setPointerCapture(e.pointerId)
    const s = this.scale()
    const anchor = { x: t.x, y: t.y }
    const startPtr = { x: e.clientX, y: e.clientY }
    const MAX = 150
    el.classList.add('ptag--held')
    this.band.style.opacity = '1'
    const move = (ev: PointerEvent) => {
      let dx = (ev.clientX - startPtr.x) / s
      let dy = (ev.clientY - startPtr.y) / s
      const len = Math.hypot(dx, dy)
      if (len > MAX) {
        dx = (dx / len) * MAX
        dy = (dy / len) * MAX
      }
      this.put(t, anchor.x + dx, anchor.y + dy, Math.atan2(dy, dx) * 20)
      this.band.setAttribute('x1', String(anchor.x))
      this.band.setAttribute('y1', String(anchor.y))
      this.band.setAttribute('x2', String(t.x))
      this.band.setAttribute('y2', String(t.y))
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.classList.remove('ptag--held')
      this.band.style.opacity = '0'
      const dx = anchor.x - t.x
      const dy = anchor.y - t.y
      if (Math.hypot(dx, dy) < 18) {
        gsap.to(t, { x: anchor.x, y: anchor.y, duration: 0.25, onUpdate: () => gsap.set(t.el, { x: t.x, y: t.y }) })
        return
      }
      this.launch(t, dx * 11, dy * 11)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }

  private launch(t: Tag, vx: number, vy: number) {
    const { w, h } = this.size
    let hit = false
    let spin = vx * 0.6
    const floorY = this.pile(0).y + h * 0.02
    this.ticking.add(t)
    const step = () => {
      if (!this.ticking.has(t)) {
        gsap.ticker.remove(step)
        return
      }
      const dt = Math.min(0.033, gsap.ticker.deltaRatio() / 60)
      vy += 1500 * dt
      t.x += vx * dt
      t.y += vy * dt
      t.r += spin * dt
      if (!hit) {
        const b = this.boardRect()
        if (t.x > b.x && t.x < b.x + b.width && t.y > b.y && t.y < b.y + b.height && vy < 900) {
          hit = true
          vx *= -0.35
          vy = Math.abs(vy) * 0.2 + 80
          spin *= -1.4
          this.onHit(t.price)
        }
      }
      gsap.set(t.el, { x: t.x, y: t.y, rotate: t.r })
      const out = t.x < -240 || t.x > w + 240 || t.y > h + 160
      if ((vy > 0 && t.y >= floorY && t.x > 0 && t.x < w) || out) {
        gsap.ticker.remove(step)
        this.ticking.delete(t)
        const i = this.tags.indexOf(t)
        const d = this.pile(i)
        if (out) {
          this.put(t, d.x, d.y, d.r)
          gsap.fromTo(t.el, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.3 })
        } else {
          gsap.to(t, { y: floorY, r: d.r, duration: 0.3, ease: 'bounce.out', onUpdate: () => gsap.set(t.el, { y: t.y, rotate: t.r }) })
        }
      }
    }
    gsap.ticker.add(step)
  }

  destroy() {
    this.enableSling(false)
    this.ticking.clear()
  }
}

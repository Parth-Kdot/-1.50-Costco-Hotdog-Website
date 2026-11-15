import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/scroll'
import { isTouch, prefersReducedMotion, safeSession } from '../lib/env'
import { Odometer, type OdometerHandle } from './Odometer'
import { Flap, type FlapHandle } from './Flap'
import { PriceChart, shouldBe } from '../lib/priceChart'
import { Dust } from '../lib/dust'
import { PriceTags } from '../lib/priceTags'
import { pole } from '../lib/pole'
import { flight } from '../data'
import './hero.css'

const BEATS = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024]
const FINAL = 2026
// Scroll choreography, as fractions of the pin.
const PUSH_END = 0.12 // camera finishes pushing in
const YEAR_END = 0.84 // year drum reaches 2026
const PULL_START = 0.86 // camera starts pulling back

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))
const splitPrice = (p: number) => {
  const [d, c] = p.toFixed(2).split('.')
  return { d, c }
}

function Screw({ className }: { className: string }) {
  return (
    <svg className={`screw ${className}`} viewBox="0 0 12 12" aria-hidden>
      <circle cx="6" cy="6" r="5.2" fill="#3a3731" stroke="#0b0a08" strokeWidth="0.8" />
      <circle cx="6" cy="6" r="4.4" fill="none" stroke="#56524a" strokeWidth="0.6" />
      <path d="M6 3.2v5.6M3.2 6h5.6" stroke="#0b0a08" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function ComboArt() {
  return (
    <svg className="combo-art" viewBox="0 0 260 130" aria-hidden>
      <g transform="translate(176 6)">
        <rect x="27" y="-4" width="5" height="34" rx="1" fill="#b3261e" transform="rotate(12 30 10)" />
        <path d="M6 26h56l-2 7H8z" fill="#15130f" />
        <path
          d="M10 33h48l-6 86c-.3 3-2.6 5-5.6 5H21.6c-3 0-5.3-2-5.6-5z"
          fill="#fff4da"
          stroke="#15130f"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path d="M13.2 62h41.6l-1.6 24H14.8z" fill="#b3261e" />
        <path d="M18 74c6-5 10 5 16 0s10 5 16 0" stroke="#fff4da" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <g transform="translate(6 46)">
        <path d="M10 38c-6 0-10-5-9-11 1-5 6-8 11-8h128c6 0 11 3 11 9 0 6-5 10-11 10z" fill="#d9a11b" />
        <rect x="-2" y="12" width="162" height="22" rx="11" fill="#b3261e" />
        <path
          d="M8 23c7-8 12 8 19 0s12 8 19 0 12 8 19 0 12 8 19 0 12 8 19 0 12 8 19 0 12 8 19 0"
          stroke="#f3c12e"
          strokeWidth="3.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M6 40c0 18 10 26 26 26h96c16 0 26-8 26-26z" fill="#d9a11b" />
        <path d="M18 52c26 8 92 8 124 0" stroke="#b07f10" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".6" />
      </g>
    </svg>
  )
}

function Clamp({ boltRef }: { boltRef: React.RefObject<SVGGElement | null> }) {
  return (
    <svg className="clamp__svg" viewBox="0 0 300 26" preserveAspectRatio="none" aria-hidden>
      <rect x="0" y="4" width="300" height="16" rx="2" fill="#8f8b83" />
      <rect x="0" y="4" width="300" height="2" fill="#c9c5bc" />
      <rect x="0" y="18" width="300" height="2" fill="#5e5a53" />
      <g ref={boltRef}>
        {[22, 278].map((cx) => (
          <g key={cx} className="clamp__bolt" style={{ transformOrigin: `${cx}px 12px` }}>
            <polygon
              points={Array.from({ length: 6 }, (_, i) => {
                const a = (Math.PI / 3) * i + Math.PI / 6
                return `${cx + Math.cos(a) * 8},${12 + Math.sin(a) * 8}`
              }).join(' ')}
              fill="#6c6860"
              stroke="#3d3a34"
              strokeWidth="1"
            />
            <circle cx={cx} cy="12" r="3" fill="#4a463f" />
          </g>
        ))}
      </g>
    </svg>
  )
}

export function Hero() {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const shaker = useRef<HTMLDivElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const floorPaint = useRef<HTMLDivElement>(null)
  const sway = useRef<HTMLDivElement>(null)
  const board = useRef<HTMLDivElement>(null)
  const boardShake = useRef<HTMLDivElement>(null)
  const pricePanel = useRef<HTMLDivElement>(null)
  const clamp = useRef<HTMLDivElement>(null)
  const bolts = useRef<SVGGElement>(null)
  const stamp = useRef<HTMLDivElement>(null)
  const chartCanvas = useRef<HTMLCanvasElement>(null)
  const dustCanvas = useRef<HTMLCanvasElement>(null)
  const tagLayer = useRef<HTMLDivElement>(null)
  const band = useRef<SVGLineElement>(null)
  const yearOdo = useRef<OdometerHandle>(null)
  const shouldOdo = useRef<OdometerHandle>(null)
  const rejectOdo = useRef<OdometerHandle>(null)
  const cents = useRef<FlapHandle>(null)
  const dollar = useRef<FlapHandle>(null)
  const dollarSign = useRef<FlapHandle>(null)
  const dot = useRef<FlapHandle>(null)
  const replay = useRef<() => void>(() => {})
  const [done, setDone] = useState(false)
  const [delta, setDelta] = useState(false)

  useLayoutEffect(() => {
    const reduced = prefersReducedMotion()
    const touch = isTouch()
    const narrow = window.matchMedia('(max-width: 760px)').matches
    const ZOOM = narrow ? 1.28 : 1.5
    const chart = new PriceChart(chartCanvas.current!)
    const dust = new Dust(dustCanvas.current!)
    const el = root.current!
    const w = world.current!

    const state = { year: 1985, fired: new Set<number>(), finale: false, zoom: 0, busy: false, scale: 1, rejects: 0 }
    type Job = { kind: 'beat'; i: number } | { kind: 'finale' } | { kind: 'sling'; price: number }
    const queue: Job[] = []

    // World-local geometry (unaffected by the camera transform).
    const local = (node: Element) => {
      const r = node.getBoundingClientRect()
      const wr = w.getBoundingClientRect()
      const s = state.scale
      return { x: (r.left - wr.left) / s, y: (r.top - wr.top) / s, width: r.width / s, height: r.height / s }
    }
    let focus = { x: 0, y: 0 }
    let target = { x: 0, y: 0 }
    const measure = () => {
      const p = local(pricePanel.current!)
      focus = { x: p.x + p.width / 2, y: p.y + p.height * 0.55 }
      const c = local(cents.current!.flap!.parentElement!)
      target = { x: c.x + c.width / 2, y: c.y + c.height * 0.62 }
    }

    const tags = new PriceTags({
      layer: tagLayer.current!,
      band: band.current!,
      scale: () => state.scale,
      boardRect: () => local(board.current!),
      onHit: (price) => {
        queue.push({ kind: 'sling', price })
        pump()
      },
    })
    tags.create(BEATS.map((year) => ({ year, price: Math.round(shouldBe(year) * 100) / 100 })))

    const render = (year: number) => {
      state.year = year
      yearOdo.current?.set(year)
      shouldOdo.current?.set(Math.round(shouldBe(year) * 100) / 100)
      chart.set(year, state.zoom)
    }

    let lastCam = { k: 0, p: 0 }
    const camera = (k: number, p: number) => {
      lastCam = { k, p }
      const s = 1 + (ZOOM - 1) * k
      state.scale = s
      const W = w.clientWidth
      const H = w.clientHeight
      gsap.set(w, {
        transformOrigin: `${focus.x}px ${focus.y}px`,
        x: (W / 2 - focus.x) * k,
        y: (H * 0.47 - focus.y) * k,
        scale: s,
      })
      if (floorPaint.current) floorPaint.current.style.setProperty('--walk', `${p * 900}px`)
    }

    const shake = (target: HTMLElement, amp: number, dur: number) =>
      gsap.fromTo(
        target,
        { x: 0, y: 0 },
        {
          keyframes: [
            { x: amp, y: -amp * 0.5 },
            { x: -amp * 0.75, y: amp * 0.4 },
            { x: amp * 0.45, y: -amp * 0.2 },
            { x: -amp * 0.2, y: amp * 0.1 },
            { x: 0, y: 0 },
          ],
          duration: dur,
          ease: 'none',
        },
      )

    const panels = () => el.querySelectorAll<HTMLElement>('.panel--lit')

    const bumpRejects = () => {
      state.rejects += 1
      const r = { v: state.rejects - 1 }
      gsap.to(r, { v: state.rejects, duration: 0.3, onUpdate: () => rejectOdo.current?.set(r.v) })
    }

    // One rejected price change: the flaps lift toward the new price, the clamp slams them back.
    const attempt = (price: number, strain: number) => {
      const tl = gsap.timeline()
      const { d, c } = splitPrice(price)
      const leaf = cents.current!.flap!
      cents.current!.peek(c)
      const tryDollar = d !== '1'
      if (tryDollar) dollar.current!.peek(d)
      const leaves = tryDollar ? [leaf, dollar.current!.flap!] : [leaf]
      tl.to(leaves, { rotateX: -78, duration: 0.12, ease: 'power2.in' })
        .to(clamp.current, { y: 16, duration: 0.06, ease: 'power4.in' }, 0.06)
        .to(leaves, { rotateX: 0, duration: 0.26, ease: 'back.out(3)' }, 0.13)
        .to(clamp.current, { y: 0, duration: 0.3, ease: 'back.out(2.4)' }, 0.15)
        .add(() => {
          shake(boardShake.current!, 5, 0.22)
          gsap.fromTo(shaker.current, { scale: 1.035 }, { scale: 1, duration: 0.4, ease: 'power3.out' })
          gsap.fromTo(panels(), { opacity: 0.5 }, { opacity: 1, duration: 0.09, ease: 'steps(2)' })
          const b = board.current!.getBoundingClientRect()
          const dd = dustCanvas.current!.getBoundingClientRect()
          const cr = clamp.current!.getBoundingClientRect()
          dust.burst(cr.left - dd.left, cr.right - dd.left, b.top - dd.top + 2, 10)
          dust.burst(b.left - dd.left + 20, b.right - dd.left - 20, b.top - dd.top, 6)
          bumpRejects()
        }, 0.15)
        .to(board.current, { scale: 1 + 0.004 * Math.min(strain, 10), duration: 0.2, ease: 'power2.out' }, 0.15)
        .to(bolts.current!.querySelectorAll('.clamp__bolt'), { rotate: 6 * strain, duration: 0.12 }, 0.15)
        .add(() => {
          cents.current!.peek('50')
          dollar.current!.peek('1')
        }, 0.42)
      return tl
    }

    const beat = (i: number) => {
      const price = Math.round(shouldBe(BEATS[i]) * 100) / 100
      const tl = gsap.timeline()
      tl.add(tags.fly(i, target))
      tl.add(attempt(price, i + 1))
      // the label falls on its own clock so the next one can already be in the air
      tl.add(() => void tags.knock(i), '-=0.32')
      return tl
    }

    const finale = () => {
      const tl = gsap.timeline()
      tl.to({}, { duration: 0.16 })
        .set(stamp.current, { display: 'block' })
        .fromTo(stamp.current, { scale: 2.6, opacity: 0, rotate: -16 }, { scale: 1, opacity: 0.94, rotate: -8, duration: 0.14, ease: 'expo.in' })
        .add(() => {
          shake(shaker.current!, touch ? 7 : 12, 0.3)
          gsap.fromTo(shaker.current, { scale: 1.06 }, { scale: 1, duration: 0.6, ease: 'power3.out' })
          gsap.fromTo(board.current, { filter: 'brightness(0.92)' }, { filter: 'brightness(1)', duration: 0.3 })
          const rows = el.querySelectorAll<HTMLElement>('.tube-row')
          gsap.fromTo(rows, { opacity: 0.2 }, { opacity: 1, duration: 0.24, ease: 'steps(3)', stagger: 0.05 })
          const b = local(board.current!)
          tags.scatter({ x: b.x + b.width / 2, y: b.y + b.height })
        })
        .fromTo(stamp.current, { '--ink': '96%' }, { '--ink': '100%', duration: 0.3, ease: 'power2.out' }, '<')
        .to(
          state,
          {
            zoom: 1,
            duration: 0.9,
            ease: 'power2.inOut',
            onUpdate: () => chart.set(state.year, state.zoom),
            onComplete: () => setDelta(true),
          },
          '+=0.1',
        )
        .add(() => {
          setDone(true)
          if (!reduced) tags.enableSling(true)
        })
      return tl
    }

    const pump = () => {
      if (state.busy || !queue.length) return
      const job = queue.shift()!
      state.busy = true
      const tl = job.kind === 'beat' ? beat(job.i) : job.kind === 'finale' ? finale() : attempt(job.price, 10)
      tl.timeScale(1 + Math.min(queue.length, 4) * 0.45)
      tl.eventCallback('onComplete', () => {
        state.busy = false
        gsap.delayedCall(queue.length ? 0.12 : 0, pump)
      })
    }

    const checkBeats = (year: number) => {
      BEATS.forEach((b, i) => {
        if (year >= b && !state.fired.has(b)) {
          state.fired.add(b)
          queue.push({ kind: 'beat', i })
        }
      })
      if (year >= FINAL - 0.2 && !state.finale) {
        state.finale = true
        queue.push({ kind: 'finale' })
      }
      pump()
    }

    const finalState = () => {
      state.zoom = 1
      render(FINAL)
      tags.placeAll()
      state.rejects = BEATS.length
      rejectOdo.current?.set(BEATS.length)
      gsap.set(stamp.current, { display: 'block', scale: 1, opacity: 0.94, rotate: -8, '--ink': '100%' })
      setDelta(true)
      setDone(true)
    }

    measure()
    const ctxCleanup: (() => void)[] = []

    const ctx = gsap.context(() => {
      if (reduced) {
        finalState()
        el.dataset.lit = 'true'
        pole.set({ aisle: 0 })
        return
      }

      // ── Intro: fluorescent strike-on ────────────────────────────────────────
      const seen = safeSession('lights-on') === '1'
      const rows = gsap.utils.toArray<HTMLElement>('.tube-row', el)
      const bands = gsap.utils.toArray<HTMLElement>('.dark-band', el)
      const intro = gsap.timeline({
        paused: true,
        onComplete: () => {
          el.dataset.lit = 'true'
          safeSession('lights-on', '1')
          teardownSkip()
        },
      })
      const strike = (target: HTMLElement | NodeListOf<HTMLElement>, at: number, seed: number) => {
        let t = at
        const toggles = 2 + (seed % 3)
        for (let i = 0; i < toggles; i++) {
          intro.set(target, { opacity: 1 }, t)
          t += 0.04 + ((seed * (i + 3) * 37) % 70) / 1000
          intro.set(target, { opacity: 0.08 }, t)
          t += 0.04 + ((seed * (i + 7) * 53) % 70) / 1000
        }
        intro.set(target, { opacity: 1 }, t)
        return t
      }
      gsap.set(rows, { opacity: 0 })
      gsap.set('.board-hang', { opacity: 0, y: -8 })
      gsap.set('.hero__floor, .floor-stripe', { opacity: 0 })
      rows.forEach((row, i) => {
        const latched = strike(row, i * 0.26, i * 5 + 3)
        intro.to(bands[i], { opacity: 0, duration: 0.22, ease: 'power1.out' }, latched)
      })
      intro.to('.board-hang', { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }, 0.82)
      strike(panels(), 0.9, 4)
      const riffle = (h: FlapHandle | null, final: string, at: number) => {
        const chars = '0123456789$.'
        for (let i = 0; i < 3; i++) {
          intro.add(() => h?.show(chars[((i * 5 + final.length * 3 + at * 100) % chars.length) | 0]), at + i * 0.06)
          intro.fromTo(h!.flap, { rotateX: -80 }, { rotateX: 0, duration: 0.06, ease: 'none' }, at + i * 0.06)
        }
        intro.add(() => h?.show(final), at + 0.18)
      }
      riffle(dollarSign.current, '$', 1.05)
      riffle(dollar.current, '1', 1.12)
      riffle(dot.current, '.', 1.19)
      riffle(cents.current, '50', 1.26)
      intro.to('.hero__floor, .floor-stripe', { opacity: 1, duration: 0.3 }, 1.2)
      intro.add(() => pole.set({ aisle: 0 }), 1.3)

      const skip = () => intro.progress(1)
      const evts = ['pointerdown', 'wheel', 'keydown', 'touchmove'] as const
      const teardownSkip = () => evts.forEach((e) => window.removeEventListener(e, skip))
      if (seen || window.scrollY > 40) {
        intro.progress(1)
      } else {
        evts.forEach((e) => window.addEventListener(e, skip, { passive: true }))
        intro.play()
      }

      // ── Scroll: push in, roll the years, take the hits, pull back ──────────
      const proxy = { p: 0 }
      let replaying = false
      gsap.to(proxy, {
        p: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: touch ? '+=220%' : '+=300%',
          pin: stage.current,
          scrub: 0.5,
          anticipatePin: 1,
          onRefresh: () => {
            const s = state.scale
            state.scale = 1
            gsap.set(w, { clearProps: 'transform' })
            measure()
            state.scale = s
            camera(lastCam.k, lastCam.p)
          },
        },
        onUpdate: () => {
          const p = proxy.p
          const k = p < PUSH_END ? ease(p / PUSH_END) : p < PULL_START ? 1 : 1 - ease(clamp01((p - PULL_START) / (1 - PULL_START)))
          camera(k, p)
          gsap.set('.hero__floor, .floor-stripe', { opacity: 1 - k })
          if (replaying) return
          const raw = 1985 + (FINAL - 1985) * clamp01((p - PUSH_END) / (YEAR_END - PUSH_END))
          const year = raw > FINAL - 0.2 ? FINAL : raw
          render(year)
          checkBeats(year)
        },
      })

      // Board leans toward the pointer, hung on its cables.
      if (!touch) {
        const ry = gsap.quickTo(sway.current, 'rotationY', { duration: 0.9, ease: 'power3.out' })
        const rx = gsap.quickTo(sway.current, 'rotationX', { duration: 0.9, ease: 'power3.out' })
        const mv = (e: PointerEvent) => {
          const r = stage.current!.getBoundingClientRect()
          if (e.clientY > r.bottom || e.clientY < r.top) return
          ry(((e.clientX - r.left) / r.width - 0.5) * 7)
          rx(-((e.clientY - r.top) / r.height - 0.5) * 4)
        }
        window.addEventListener('pointermove', mv, { passive: true })
        ctxCleanup.push(() => window.removeEventListener('pointermove', mv))
      }

      replay.current = () => {
        if (replaying) return
        replaying = true
        state.fired.clear()
        state.finale = false
        state.zoom = 0
        state.rejects = 0
        rejectOdo.current?.set(0)
        tags.enableSling(false)
        tags.hideAll()
        setDelta(false)
        setDone(false)
        gsap.set(stamp.current, { display: 'none' })
        gsap.set(board.current, { scale: 1 })
        gsap.set(bolts.current!.querySelectorAll('.clamp__bolt'), { rotate: 0 })
        const run = { y: 1985 }
        gsap.to(run, {
          y: FINAL,
          duration: 5.5,
          ease: 'power1.inOut',
          onUpdate: () => {
            render(run.y)
            checkBeats(run.y)
          },
          onComplete: () => {
            replaying = false
          },
        })
      }
    }, el)

    render(reduced ? FINAL : 1985)

    return () => {
      ctxCleanup.forEach((f) => f())
      ctx.revert()
      chart.destroy()
      dust.destroy()
      tags.destroy()
      ScrollTrigger.refresh()
    }
  }, [])

  return (
    <section className="hero" ref={root} id="aisle-0" aria-label="The price holds">
      <div className="hero__stage" ref={stage}>
        <div className="hero__shake" ref={shaker}>
          <div className="hero__world" ref={world}>
            <div className="wall-base" aria-hidden />
            <div className="floor" aria-hidden>
              <div className="floor__plane">
                <div className="floor__paint" ref={floorPaint}>
                  <span className="floor__stencil floor__stencil--a wide">LANE 07</span>
                  <span className="floor__stencil floor__stencil--b wide">$1.50</span>
                  <span className="floor__stencil floor__stencil--c wide">SINCE 1985</span>
                  <span className="floor__stencil floor__stencil--d wide">ONE PRICE</span>
                </div>
              </div>
            </div>

            <div className="ceiling" aria-hidden>
              {[0, 1, 2].map((r) => (
                <div className={`tube-row tube-row--${r}`} key={r}>
                  <span className="tube" />
                  <span className="tube" />
                  <span className="tube tube--far" />
                </div>
              ))}
            </div>

            <div className="board-hang">
              <i className="cable cable--l" aria-hidden />
              <i className="cable cable--r" aria-hidden />
              <div className="board-sway" ref={sway}>
                <div className="board-shake" ref={boardShake}>
                  <div className="board" ref={board}>
                    <Screw className="screw--tl" />
                    <Screw className="screw--tr" />
                    <Screw className="screw--bl" />
                    <Screw className="screw--br" />

                    <div className="panel panel--lit panel--item">
                      <ComboArt />
                      <div className="item-name">HOT DOG + SODA</div>
                      <div className="item-sub mono">COMBO · LIMIT: ONE FAMILY</div>
                    </div>

                    <div className="panel panel--lit panel--price" ref={pricePanel}>
                      <div className="price-row">
                        <span className="micro mono">YEAR</span>
                        <Odometer ref={yearOdo} digits={4} initial={1985} size={34} className="odo--year" label="Year" />
                      </div>
                      <div className="price-tiles">
                        <div className="clamp" ref={clamp}>
                          <Clamp boltRef={bolts} />
                        </div>
                        <Flap ref={dollarSign} value="$" small />
                        <Flap ref={dollar} value="1" />
                        <Flap ref={dot} value="." small />
                        <Flap ref={cents} value="50" wide />
                      </div>
                      <p className="sr-only">Price: one dollar fifty. Still.</p>
                      <div className="stamp" ref={stamp} aria-hidden>
                        <span>STILL $1.50</span>
                      </div>
                    </div>

                    <div className="panel panel--display">
                      <div className="display-head mono">
                        <span>WHAT IT SHOULD BE</span>
                        <span className="display-readout">
                          <Odometer ref={shouldOdo} digits={3} decimals={2} initial={1.5} size={18} />
                        </span>
                      </div>
                      <div className="display-chart">
                        <canvas
                          ref={chartCanvas}
                          aria-label="Chart: the combo price stays flat at 1.50 while inflation-adjusted price climbs to about 4.37"
                        />
                      </div>
                      <div className="display-foot mono">
                        <span>1985 DOLLARS · CPI-U · BLS</span>
                        <span className={`delta${delta ? ' delta--on' : ''}`}>Δ 41Y: 0.00%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="tags" ref={tagLayer}>
              <svg className="tags__band" aria-hidden>
                <line ref={band} />
              </svg>
            </div>

            <div className="dark-bands" aria-hidden>
              <div className="dark-band" />
              <div className="dark-band" />
              <div className="dark-band" />
            </div>
          </div>

          <canvas className="dust" ref={dustCanvas} aria-hidden />

          <div className="hero__floor">
            <div>
              <p className="floor-copy">Six members. One price. Est. 1985 (the price, not us).</p>
              <p className="floor-meta mono">
                MOONSHOT MISSION {flight.mission} · {flight.task.toUpperCase()} · {flight.pts} PTS
              </p>
            </div>
            <div className={`hero__after${done ? ' hero__after--on' : ''}`} aria-hidden={!done}>
              <div className="rejects">
                <span className="mono">PRICE CHANGES
                  <br />
                  REJECTED</span>
                <Odometer ref={rejectOdo} digits={2} initial={0} size={24} label="Price changes rejected" />
              </div>
              <p className="sling-hint mono">PULL A TAG BACK, LET GO</p>
              <button className="key run-key" onClick={() => replay.current()} tabIndex={done ? 0 : -1}>
                Run it again
              </button>
            </div>
          </div>

          <div className="floor-stripe" aria-hidden>
            <span className="wide">AISLE 01 →</span>
          </div>
        </div>
      </div>
    </section>
  )
}

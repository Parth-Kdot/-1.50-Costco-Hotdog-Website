import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/scroll'
import { isTouch, prefersReducedMotion, safeSession } from '../lib/env'
import { Odometer, type OdometerHandle } from './Odometer'
import { Flap, type FlapHandle } from './Flap'
import { PriceChart, shouldBe } from '../lib/priceChart'
import { Dust } from '../lib/dust'
import { pole } from '../lib/pole'
import { flight } from '../data'
import './hero.css'

const BEATS = [1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024]
const CENT_TRIES = ['55', '65', '75', '89', '95', '99', '49', '99']
const DOLLAR_TRIES = ['', '', '', '', '2', '3', '4', '4']
const FINAL = 2026

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
      {/* soda: lidded cup with straw */}
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
      {/* hot dog */}
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
  const board = useRef<HTMLDivElement>(null)
  const boardShake = useRef<HTMLDivElement>(null)
  const clamp = useRef<HTMLDivElement>(null)
  const bolts = useRef<SVGGElement>(null)
  const stamp = useRef<HTMLDivElement>(null)
  const chartCanvas = useRef<HTMLCanvasElement>(null)
  const dustCanvas = useRef<HTMLCanvasElement>(null)
  const yearOdo = useRef<OdometerHandle>(null)
  const shouldOdo = useRef<OdometerHandle>(null)
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
    const chart = new PriceChart(chartCanvas.current!)
    const dust = new Dust(dustCanvas.current!)
    const el = root.current!

    const state = {
      year: 1985,
      fired: new Set<number>(),
      finale: false,
      zoom: 0,
      busy: false,
    }
    const queue: number[] = []
    if (import.meta.env.DEV) (window as unknown as { __hero: object }).__hero = { state, queue }

    const render = (year: number) => {
      state.year = year
      yearOdo.current?.set(year)
      shouldOdo.current?.set(Math.round(shouldBe(year) * 100) / 100)
      chart.set(year, state.zoom)
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

    const attempt = (n: number) => {
      const tl = gsap.timeline()
      const leaf = cents.current!.flap!
      const tryDollar = DOLLAR_TRIES[n]
      cents.current!.peek(CENT_TRIES[n])
      if (tryDollar) dollar.current!.peek(tryDollar)
      const leaves = tryDollar ? [leaf, dollar.current!.flap!] : [leaf]
      tl.to(leaves, { rotateX: -70, duration: 0.12, ease: 'power2.in' })
        .to(clamp.current, { y: 14, duration: 0.06, ease: 'power4.in' }, 0.06)
        .to(leaves, { rotateX: 0, duration: 0.26, ease: 'back.out(3)' }, 0.12)
        .to(clamp.current, { y: 0, duration: 0.3, ease: 'back.out(2.4)' }, 0.14)
        .add(() => {
          shake(boardShake.current!, 4, 0.2)
          gsap.fromTo(panels(), { opacity: 0.55 }, { opacity: 1, duration: 0.09, ease: 'steps(2)' })
          const b = board.current!.getBoundingClientRect()
          const d = dustCanvas.current!.getBoundingClientRect()
          const c = clamp.current!.getBoundingClientRect()
          dust.burst(c.left - d.left, c.right - d.left, b.top - d.top + 2, 10)
          dust.burst(b.left - d.left + 20, b.right - d.left - 20, b.top - d.top, 6)
        }, 0.14)
        .to(board.current, { scale: 1 + 0.004 * (n + 1), duration: 0.2, ease: 'power2.out' }, 0.14)
        .to(bolts.current!.querySelectorAll('.clamp__bolt'), { rotate: 6 * (n + 1), duration: 0.12 }, 0.14)
        .add(() => {
          cents.current!.peek('50')
          dollar.current!.peek('1')
        }, 0.4)
        .to({}, { duration: 0.12 })
      return tl
    }

    const finale = () => {
      const tl = gsap.timeline()
      tl.to({}, { duration: 0.16 })
        .set(stamp.current, { display: 'block' })
        .fromTo(
          stamp.current,
          { scale: 2.4, opacity: 0, rotate: -14 },
          {
            scale: 1,
            opacity: 0.92,
            rotate: -8,
            duration: 0.14,
            ease: 'expo.in',
          },
        )
        .add(() => {
          shake(shaker.current!, touch ? 6 : 10, 0.26)
          gsap.fromTo(board.current, { filter: 'brightness(0.94)' }, { filter: 'brightness(1)', duration: 0.3 })
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
        .add(() => setDone(true))
      return tl
    }

    const pump = () => {
      if (state.busy || !queue.length) return
      const n = queue.shift()!
      state.busy = true
      const tl = n === -1 ? finale() : attempt(n)
      tl.timeScale(queue.length > 1 ? 1.6 : 1)
      tl.eventCallback('onComplete', () => {
        state.busy = false
        gsap.delayedCall(queue.length ? 0.18 : 0, pump)
      })
    }

    const checkBeats = (year: number) => {
      BEATS.forEach((b, i) => {
        if (year >= b && !state.fired.has(b)) {
          state.fired.add(b)
          queue.push(i)
        }
      })
      if (year >= FINAL - 0.2 && !state.finale) {
        state.finale = true
        queue.push(-1)
      }
      pump()
    }

    const finalState = () => {
      state.zoom = 1
      render(FINAL)
      gsap.set(stamp.current, {
        display: 'block',
        scale: 1,
        opacity: 0.92,
        rotate: -8,
        '--ink': '100%',
      })
      setDelta(true)
    }

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
      const strike = (target: HTMLElement | NodeListOf<HTMLElement>, at: number, seed: number, latch = 1) => {
        let t = at
        const toggles = 2 + (seed % 3)
        for (let i = 0; i < toggles; i++) {
          const on = 0.04 + ((seed * (i + 3) * 37) % 70) / 1000
          intro.set(target, { opacity: latch }, t)
          t += on
          intro.set(target, { opacity: 0.08 }, t)
          t += 0.04 + ((seed * (i + 7) * 53) % 70) / 1000
        }
        intro.set(target, { opacity: latch }, t)
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

      // ── The price holds: scrubbed year, triggered beats ────────────────────
      const proxy = { p: 0 }
      let replaying = false
      gsap.to(proxy, {
        p: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: touch ? '+=150%' : '+=200%',
          pin: stage.current,
          scrub: 0.4,
          anticipatePin: 1,
        },
        onUpdate: () => {
          if (replaying) return
          const raw = 1985 + (FINAL - 1985) * proxy.p
          // the last fraction of the pin settles the drum on 2026
          const year = raw > FINAL - 0.2 ? FINAL : raw
          render(year)
          checkBeats(year)
        },
      })

      replay.current = () => {
        if (replaying) return
        replaying = true
        state.fired.clear()
        state.finale = false
        state.zoom = 0
        setDelta(false)
        gsap.set(stamp.current, { display: 'none' })
        gsap.set(board.current, { scale: 1 })
        gsap.set(bolts.current!.querySelectorAll('.clamp__bolt'), {
          rotate: 0,
        })
        const run = { y: 1985 }
        gsap.to(run, {
          y: FINAL,
          duration: 4.5,
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
      ctx.revert()
      chart.destroy()
      dust.destroy()
      ScrollTrigger.refresh()
    }
  }, [])

  return (
    <section className="hero" ref={root} id="aisle-0" aria-label="The price holds">
      <div className="hero__stage" ref={stage}>
        <div className="hero__shake" ref={shaker}>
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

                <div className="panel panel--lit panel--price">
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

          <canvas className="dust" ref={dustCanvas} aria-hidden />

          <div className="hero__floor">
            <div>
              <p className="floor-copy">Six members. One price. Est. 1985 (the price, not us).</p>
              <p className="floor-meta mono">
                MOONSHOT MISSION {flight.mission} · {flight.task.toUpperCase()} · {flight.pts} PTS
              </p>
            </div>
            <button
              className={`key run-key${done ? ' run-key--on' : ''}`}
              onClick={() => replay.current()}
              tabIndex={done ? 0 : -1}
              aria-hidden={!done}
            >
              Run it again
            </button>
          </div>

          <div className="floor-stripe" aria-hidden>
            <span className="wide">AISLE 01 →</span>
          </div>

          <div className="dark-bands" aria-hidden>
            <div className="dark-band" />
            <div className="dark-band" />
            <div className="dark-band" />
          </div>
        </div>
      </div>
    </section>
  )
}

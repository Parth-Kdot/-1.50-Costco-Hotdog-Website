import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { gsap } from '../lib/scroll'
import { byId, members, photoSpots, type Member } from '../data'
import { prefersReducedMotion, useNarrow } from '../lib/env'
import { pole } from '../lib/pole'
import { sound } from '../lib/sound'
import { AisleMarker } from './AisleMarker'
import { Odometer, type OdometerHandle } from './Odometer'
import './scanner.css'

const DURATION = 3.4
const JAY_AT = byId.jay.beam * 100
const SCREEN = photoSpots.screen
const STEPS = ['/gen/screen-16.png', '/gen/screen-8.png', '/gen/screen-4.png', '/gen/screen-sharp.png']

// Rung up left to right. Parth and Jay share a beat: one holds the other.
const RING = [...members].sort((a, b) => a.beam - b.beam)
const PHOTO_ORDER = ['max', 'cal', 'parth', 'jay', 'zeke', 'paritosh']

function Sticker({ m, narrow, open, onOpen }: { m: Member; narrow: boolean; open: boolean; onOpen: (id: string | null) => void }) {
  const tilt = ((m.id.charCodeAt(0) * 7 + m.id.length * 13) % 13) - 8
  return (
    <motion.div
      className={`sticker${m.remote ? ' sticker--remote' : ''}`}
      style={{ left: `${m.sticker.x}%`, top: `${m.sticker.y}%` }}
      initial={{ scale: 1.4, rotate: -20, opacity: 0 }}
      animate={{ scale: 1, rotate: tilt, opacity: 1, y: open ? -4 : 0 }}
      transition={{ type: 'spring', stiffness: 600, damping: 18 }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onOpen(m.id)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && onOpen(null)}
      onClick={() => onOpen(open ? null : m.id)}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={`${m.name}, ${m.role}`}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(open ? null : m.id)}
    >
      <span className="sticker__name">{m.short.toUpperCase()}</span>
      {!narrow && <span className="sticker__meta">{m.remote ? 'MENTOR · VIA LAPTOP' : m.role.toUpperCase()}</span>}
      <span className="sticker__price">0.25</span>
      {!narrow && (
        <AnimatePresence>
          {open && (
            <motion.div
              className="tag"
              initial={{ rotate: -80, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -40, opacity: 0, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 10 }}
            >
              <TagBody m={m} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  )
}

function TagBody({ m }: { m: Member }) {
  return (
    <>
      <i className="tag__hole" />
      <strong>{m.name.toUpperCase()}</strong>
      <span>{m.handle ? `@${m.handle}` : 'NO HANDLE ON FILE'}</span>
      <span>{m.role === 'mentor' ? 'MENTOR' : 'MENTEE'}</span>
      <span className="tag__pos">{m.frame}</span>
    </>
  )
}

export function Scanner() {
  const narrow = useNarrow()
  const narrowRef = useRef(narrow)
  narrowRef.current = narrow
  const section = useRef<HTMLElement>(null)
  const glass = useRef<HTMLDivElement>(null)
  const bed = useRef<HTMLDivElement>(null)
  const beam = useRef<HTMLDivElement>(null)
  const arrow = useRef<SVGPathElement>(null)
  const subtotal = useRef<OdometerHandle>(null)
  const tl = useRef<gsap.core.Timeline | null>(null)
  const xRef = useRef(0)
  const totalRef = useRef({ v: 0 })
  const [rung, setRung] = useState<string[]>([])
  const [step, setStep] = useState(-1)
  const [phase, setPhase] = useState<'idle' | 'scan' | 'hold' | 'done'>('idle')
  const [open, setOpen] = useState<string | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const [loupe, setLoupe] = useState<{ x: number; y: number; onScreen: boolean } | null>(null)
  const [loupeMode, setLoupeMode] = useState(false)

  const setX = useCallback((x: number) => {
    xRef.current = x
    bed.current?.style.setProperty('--x', `${x}%`)
  }, [])

  const rollTo = useCallback((count: number) => {
    gsap.to(totalRef.current, {
      v: count * 0.25,
      duration: 0.35,
      ease: 'power2.out',
      onUpdate: () => subtotal.current?.set(Math.round(totalRef.current.v * 100) / 100),
    })
  }, [])

  // Ring up whoever the beam has crossed.
  const sync = useCallback(
    (x: number, viaTimeline: boolean) => {
      setRung((prev) => {
        const next = RING.filter((m) => m.beam * 100 <= x && (viaTimeline ? m.id !== 'jay' || prev.includes('jay') : true)).map((m) => m.id)
        if (next.length !== prev.length) {
          if (next.length > prev.length) sound.beep()
          rollTo(next.length)
        }
        return next.length === prev.length ? prev : next
      })
    },
    [rollTo],
  )

  const finalState = useCallback(() => {
    setX(100)
    setRung(RING.map((m) => m.id))
    setStep(3)
    setPhase('done')
    subtotal.current?.set(1.5)
    totalRef.current.v = 1.5
    if (arrow.current) arrow.current.style.strokeDashoffset = '0'
  }, [setX])

  const run = useCallback(() => {
    tl.current?.kill()
    setRung([])
    setStep(0)
    setPhase('scan')
    setOpen(null)
    rollTo(0)
    setX(0)
    if (arrow.current) arrow.current.style.strokeDashoffset = '1'
    const p = { x: 0 }
    const t = gsap.timeline({ onComplete: () => setPhase('done') })
    const upd = () => {
      setX(p.x)
      sync(p.x, true)
    }
    t.to(p, { x: JAY_AT, duration: (DURATION * JAY_AT) / 100, ease: 'none', onUpdate: upd })
    // The beam hesitates at the laptop. The page never holds; only the timeline does.
    t.add(() => {
      setPhase('hold')
      pole.set({ alert: narrowRef.current ? 'UNEXPECTED ITEM' : 'UNEXPECTED ITEM IN BAGGING AREA' })
      sound.beep(620, 160)
    })
    for (let i = 1; i < STEPS.length; i++) t.add(() => setStep(i), `+=${i === 1 ? 0.2 : 0.14}`)
    t.add(() => {
      pole.set({ alert: narrowRef.current ? '1 MENTOR (REMOTE)' : 'ITEM CONTAINS 1 MENTOR (REMOTE)' })
      setRung((prev) => (prev.includes('jay') ? prev : [...prev, 'jay']))
      rollTo(RING.filter((m) => m.beam * 100 <= JAY_AT).length)
      sound.beep()
    })
    t.to(arrow.current, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, '<')
    t.to({}, { duration: 0.55 })
    t.add(() => setPhase('scan'))
    t.to(p, { x: 100, duration: (DURATION * (100 - JAY_AT)) / 100, ease: 'none', onUpdate: upd })
    t.add(() => {
      sound.beep(2200, 120)
      gsap.delayedCall(1.4, () => pole.set({ alert: null }))
    })
    tl.current = t
  }, [rollTo, setX, sync])

  // Start once the scanner is mostly in view.
  useEffect(() => {
    if (prefersReducedMotion()) {
      finalState()
      return
    }
    let started = false
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started) {
          started = true
          run()
        }
      },
      { threshold: 0.55 },
    )
    io.observe(glass.current!)
    return () => {
      io.disconnect()
      tl.current?.kill()
      pole.set({ alert: null })
    }
  }, [finalState, run])

  // ── Hand scrub on the top rail ───────────────────────────────────────
  const rail = useRef<HTMLDivElement>(null)
  const scrub = (e: React.PointerEvent) => {
    const r = rail.current!.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))
    tl.current?.kill()
    pole.set({ alert: null })
    setX(x)
    sync(x, false)
    setStep(x >= JAY_AT ? 3 : 0)
    if (arrow.current) arrow.current.style.strokeDashoffset = x >= JAY_AT ? '0' : '1'
    setPhase(x >= 100 ? 'done' : 'scan')
  }

  // ── Loupe ────────────────────────────────────────────────────────────
  const holdTimer = useRef<number>(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const lookAt = (clientX: number, clientY: number) => {
    const r = glass.current!.getBoundingClientRect()
    let x = (clientX - r.left) / r.width
    let y = (clientY - r.top) / r.height
    const cx = (SCREEN.x + SCREEN.w / 2) / 100
    const cy = (SCREEN.y + SCREEN.h / 2) / 100
    const onScreen = Math.abs(x - cx) < SCREEN.w / 200 + 0.02 && Math.abs(y - cy) < SCREEN.h / 200 + 0.03
    if (onScreen) {
      // nudge toward the laptop
      const pull = 8 / r.width
      x += Math.sign(cx - x) * Math.min(Math.abs(cx - x), pull)
      y += Math.sign(cy - y) * Math.min(Math.abs(cy - y), pull * (r.width / r.height))
    }
    setLoupe({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)), onScreen })
  }
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.sticker')) return
    start.current = { x: e.clientX, y: e.clientY }
    if (loupeMode || e.altKey) {
      lookAt(e.clientX, e.clientY)
      return
    }
    window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => start.current && lookAt(start.current.x, start.current.y), 260)
  }
  const onMove = (e: React.PointerEvent) => {
    if (loupe || (loupeMode && e.pointerType === 'mouse') || (e.altKey && e.pointerType === 'mouse')) {
      lookAt(e.clientX, e.clientY)
      return
    }
    if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 8) {
      window.clearTimeout(holdTimer.current)
      start.current = null
    }
  }
  const onUp = () => {
    window.clearTimeout(holdTimer.current)
    start.current = null
    if (!loupeMode) setLoupe(null)
  }
  // While the loupe is out on a touch screen, the finger moves the loupe, not the page.
  useEffect(() => {
    const el = glass.current
    if (!el) return
    const block = (e: TouchEvent) => loupe && e.cancelable && e.preventDefault()
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [loupe])

  const loupeSize = narrow ? 110 : 150
  const done = phase === 'done'
  const openMember = open ? byId[open] : null

  return (
    <section className="photo" id="aisle-2" ref={section} aria-labelledby="photo-title">
      <div className="photo__head">
        <AisleMarker n={2} title={'PHOTO\nCENTER'} color="var(--mustard)" ink="var(--board)" />
        <h2 id="photo-title" className="sr-only">
          Photo center: the group photo
        </h2>
        <p className="form-line">FORM 02 · 1 PRINT · 5 IN FRAME · 1 ON SCREEN</p>
      </div>

      <div className="photo__floor">
        <div className={`scanner scanner--${phase}`} ref={bed} style={{ ['--x' as string]: '0%' }}>
          <div className="scanner__top">
            <span className={`scanner__led scanner__led--${phase}`} aria-hidden />
            <div className="scanner__rail" ref={rail} aria-hidden>
              <div
                className="scanner__handle"
                style={{ left: `var(--x)` }}
                onPointerDown={(e) => {
                  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                  scrub(e)
                }}
                onPointerMove={(e) => e.buttons && scrub(e)}
              />
            </div>
            <div className="scanner__keys">
              <button className="key key--dark" data-pressed={soundOn} onClick={() => setSoundOn(sound.toggle())} aria-pressed={soundOn}>
                Sound {soundOn ? 'on' : 'off'}
              </button>
              <button
                className="key key--dark"
                data-pressed={loupeMode}
                aria-pressed={loupeMode}
                onClick={() => {
                  setLoupeMode((v) => !v)
                  setLoupe(null)
                }}
              >
                Loupe
              </button>
              <button className="key key--dark" onClick={run}>
                Rescan
              </button>
            </div>
          </div>

          <div
            className={`scanner__glass${loupeMode ? ' scanner__glass--loupe' : ''}`}
            ref={glass}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onPointerLeave={() => !loupeMode && onUp()}
          >
            <img
              className="scanner__color"
              src="/gen/family-1396.webp"
              srcSet="/gen/family-900.webp 900w, /gen/family-1396.webp 1396w"
              sizes="(max-width: 760px) 100vw, 1100px"
              width={1396}
              height={960}
              alt="The family against a lime-green wall. Left to right: Max, Cal, Parth holding an open laptop with Jay on the screen, Zeke pointing at the laptop, and Paritosh. Two people are giving bunny ears."
              draggable={false}
            />
            <img className="scanner__dither" src="/gen/family-dither.png" alt="" aria-hidden draggable={false} />

            {step >= 0 && (
              <img
                className="scanner__screen"
                src={STEPS[step]}
                alt=""
                aria-hidden
                style={{ left: `${SCREEN.x}%`, top: `${SCREEN.y}%`, width: `${SCREEN.w}%`, height: `${SCREEN.h}%` }}
              />
            )}

            <svg className="scanner__ink" viewBox="0 0 1396 960" aria-hidden>
              <path ref={arrow} className="hl-arrow" pathLength={1} d="M872 506 C 905 440, 880 392, 812 420" />
              <path className="hl-head" d="M826 404 L 808 421 L 832 431" style={{ opacity: step >= 3 ? 1 : 0 }} />
            </svg>

            <div className="scanner__beam" ref={beam} aria-hidden />

            {members.map((m) =>
              rung.includes(m.id) ? <Sticker key={m.id} m={m} narrow={narrow} open={open === m.id} onOpen={setOpen} /> : null,
            )}

            {done && (
              <div className="ears" style={{ left: `${photoSpots.ears[1].x}%`, top: `${photoSpots.ears[1].y}%` }}>
                <span>ACCESSORIES: 2 PAIRS (UNATTRIBUTED)</span>
              </div>
            )}

            {loupe && (
              <div
                className="loupe"
                style={{
                  width: loupeSize,
                  height: loupeSize,
                  left: `${loupe.x * 100}%`,
                  top: `${loupe.y * 100}%`,
                  marginTop: narrow ? -loupeSize / 2 - 60 : -loupeSize / 2,
                  marginLeft: -loupeSize / 2,
                  backgroundSize: `${(glass.current?.clientWidth ?? 1000) * 2.5}px auto`,
                  backgroundPosition: `${loupe.x * 100}% ${loupe.y * 100}%`,
                }}
                aria-hidden
              >
                {loupe.onScreen && <span className="loupe__tag">JAY YU / ON THE SCREEN / HELD BY PARTH / POINTED AT BY ZEKE</span>}
              </div>
            )}
          </div>
        </div>

        <aside className="register">
          <div className="register__label mono">SUBTOTAL</div>
          <Odometer ref={subtotal} digits={3} decimals={2} initial={0} size={narrow ? 34 : 42} label="Subtotal" />
          <ol className="register__lines mono">
            {PHOTO_ORDER.map((id) => {
              const m = byId[id]
              const on = rung.includes(id)
              return (
                <li key={id} className={on ? 'on' : ''}>
                  <span>
                    {m.short.toUpperCase()}
                    {m.remote ? ' (LAPTOP)' : ''}
                  </span>
                  <span>{on ? '0.25' : '----'}</span>
                </li>
              )
            })}
          </ol>
          <p className={`register__print mono${done ? ' register__print--on' : ''}`}>6 @ 0.25 = 1.50. PRICE UNCHANGED.</p>
          <p className="register__hint mono">
            {narrow ? 'HOLD THE PHOTO FOR A LOUPE · TAP A STICKER' : 'HOVER A STICKER · HOLD OR ALT FOR LOUPE · DRAG THE RAIL'}
          </p>
        </aside>
      </div>

      {narrow && (
        <AnimatePresence>
          {openMember && (
            <motion.div className="tag-strip mono" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}>
              <TagBody m={openMember} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  )
}

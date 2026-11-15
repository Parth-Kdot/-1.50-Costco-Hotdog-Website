import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, type PanInfo } from 'motion/react'
import { members, type Member } from '../data'
import { useNarrow, useReducedMotion } from '../lib/env'
import { AisleMarker } from './AisleMarker'
import { Barcode } from './Barcode'
import './members.css'

const JITTER = [0, 1.4, 3.1, 2.2, 4, 2.8]

// Hot dog in a laurel, as a mask for the foil patch.
const EMBLEM = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><g fill='#000'>
    <rect x='15' y='27' width='34' height='10' rx='5'/>
    <path d='M13 35c0 6 4 9 10 9h18c6 0 10-3 10-9z'/>
    <path d='M13 30c0-3 3-5 6-5h26c3 0 6 2 6 5z' opacity='.9'/>
    ${Array.from({ length: 7 }, (_, i) => {
      const a = Math.PI * (0.62 + i * 0.13)
      const x = 32 + Math.cos(a) * 26
      const y = 32 + Math.sin(a) * 26
      const x2 = 64 - x
      return `<ellipse cx='${x.toFixed(1)}' cy='${y.toFixed(1)}' rx='2.4' ry='5' transform='rotate(${((a * 180) / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})'/><ellipse cx='${x2.toFixed(1)}' cy='${y.toFixed(1)}' rx='2.4' ry='5' transform='rotate(${(-(a * 180) / Math.PI - 90).toFixed(0)} ${x2.toFixed(1)} ${y.toFixed(1)})'/>`
    }).join('')}
  </g></svg>`,
)}")`

function CardFront({ m, no }: { m: Member; no: number }) {
  return (
    <div className="card__face card__front">
      <div className={`card__tier card__tier--${m.role}`}>
        <span className="wide">{m.role === 'mentor' ? 'MENTOR' : 'MENTEE'}</span>
        <span className="card__tier-note mono">{m.remote ? 'REMOTE MEMBER' : 'FAMILY MEMBER'}</span>
      </div>
      <div className="card__body">
        <div className={`card__photo${m.remote ? ' card__photo--remote' : ''}`}>
          <img src={`/gen/portrait-${m.id}.png`} alt={`${m.name}, from the group photo`} draggable={false} />
        </div>
        <div className="card__id">
          <div className="card__name emboss">{m.name.toUpperCase()}</div>
          <div className="card__short emboss">{m.short.toUpperCase()}</div>
          <div className="card__no emboss mono">MBR 1985 0150 000{no}</div>
        </div>
        <div className="card__foil" style={{ maskImage: EMBLEM, WebkitMaskImage: EMBLEM }} aria-hidden />
      </div>
      <div className="card__code">
        <Barcode value={m.handle ?? 'JAY YU'} height={28} width={1.3} className="card__barcode" />
        <span className="mono">{m.handle ?? 'NO HANDLE ON FILE'}</span>
      </div>
    </div>
  )
}

function CardBack({ m, active }: { m: Member; active: boolean }) {
  const sig = m.handle ?? m.short.toLowerCase()
  return (
    <div className="card__face card__back">
      <div className="card__stripe" />
      <div className="card__sig">
        <svg viewBox="0 0 300 54" aria-label={`Signed: ${sig}`}>
          <text x="10" y="38" className={`sig${active ? ' sig--go' : ''}`}>
            {sig}
          </text>
        </svg>
        <span className="card__sig-label mono">AUTHORIZED SIGNATURE</span>
      </div>
      <p className="card__fine">
        Valid for one (1) hot dog + soda at the 1985 price. Non-transferable. Card remains property of the family.
        {m.remote && <span className="mono card__link">LINK: LAPTOP, +0.6s</span>}
      </p>
    </div>
  )
}

function Card({
  m,
  no,
  depth,
  flipped,
  onFlip,
  onFling,
  narrow,
  reduced,
}: {
  m: Member
  no: number
  depth: number
  flipped: boolean
  onFlip: () => void
  onFling: () => void
  narrow: boolean
  reduced: boolean
}) {
  const top = depth === 0
  const [out, setOut] = useState<{ x: number; y: number } | null>(null)
  const tiltX = useSpring(0, { stiffness: 200, damping: 20 })
  const tiltY = useSpring(0, { stiffness: 200, damping: 20 })
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const foilPos = useTransform([px, py], ([x, y]: number[]) => `${x * 100}% ${y * 100}%`)
  const sheen = useTransform([px, py], ([x, y]: number[]) => `${(x as number) * 100}% ${(y as number) * 100}%`)

  const point = (e: React.PointerEvent) => {
    if (!top || reduced) return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    px.set(x)
    py.set(y)
    tiltY.set((x - 0.5) * 16)
    tiltX.set(-(y - 0.5) * 16)
  }
  const leave = () => {
    tiltX.set(0)
    tiltY.set(0)
    px.set(0.5)
    py.set(0.5)
  }

  const slot = narrow
    ? { x: 0, y: depth * 12, rotate: depth * 2 * (depth % 2 ? 1 : -1), scale: 1 - depth * 0.03 }
    : { x: depth * 18, y: -depth * 6, rotate: depth * 2.5 + JITTER[depth] - depth * 1.2, scale: 1 }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info
    const far = Math.hypot(offset.x, offset.y) > 120
    const fast = Math.hypot(velocity.x, velocity.y) > 600
    if (far || fast) {
      const len = Math.hypot(offset.x, offset.y) || 1
      setOut({ x: (offset.x / len) * 520, y: (offset.y / len) * 260 })
    }
  }

  return (
    <motion.div
      className={`card${top ? ' card--top' : ''}`}
      style={{ zIndex: 10 - depth, ['--foil' as string]: foilPos, ['--sheen' as string]: sheen }}
      initial={false}
      animate={out ? { x: out.x, y: out.y, rotate: out.x > 0 ? 18 : -18, opacity: 1 } : { ...slot, opacity: depth > 3 && narrow ? 0 : 1 }}
      transition={
        out ? { duration: 0.28, ease: [0.3, 0.6, 0.4, 1] } : reduced ? { duration: 0.15 } : { type: 'spring', stiffness: 260, damping: 24 }
      }
      onAnimationComplete={() => {
        if (out) {
          setOut(null)
          onFling()
        }
      }}
      drag={top && !reduced ? (narrow ? 'x' : true) : false}
      dragSnapToOrigin
      dragElastic={0.6}
      onDragEnd={onDragEnd}
      onTap={() => top && onFlip()}
      onPointerMove={point}
      onPointerLeave={leave}
      aria-hidden={!top}
    >
      <motion.div className="card__tilt" style={{ rotateX: tiltX, rotateY: tiltY }}>
        <motion.div
          className="card__flipper"
          animate={{ rotateY: flipped && top ? 180 : 0 }}
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 20 }}
        >
          <CardFront m={m} no={no} />
          <CardBack m={m} active={flipped && top} />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export function Members() {
  const [order, setOrder] = useState(() => members.map((_, i) => i))
  const [flipped, setFlipped] = useState<string | null>(null)
  const narrow = useNarrow()
  const reduced = useReducedMotion()
  const stack = useRef<HTMLDivElement>(null)

  const advance = useCallback((dir = 1) => {
    setFlipped(null)
    setOrder((o) => (dir > 0 ? [...o.slice(1), o[0]] : [o[o.length - 1], ...o.slice(0, -1)]))
  }, [])

  const goTo = (idx: number) => {
    setFlipped(null)
    setOrder((o) => {
      const at = o.indexOf(idx)
      return [...o.slice(at), ...o.slice(0, at)]
    })
  }

  const topMember = members[order[0]]

  useEffect(() => {
    const el = stack.current
    if (!el) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') advance(1)
      else if (e.key === 'ArrowLeft') advance(-1)
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setFlipped((f) => (f === topMember.id ? null : topMember.id))
      } else return
    }
    el.addEventListener('keydown', key)
    return () => el.removeEventListener('keydown', key)
  }, [advance, topMember.id])

  return (
    <div className="members-wrap">
      <section className="members" id="aisle-1" aria-labelledby="members-title">
        <div className="members__head">
          <AisleMarker n={1} title={'MEMBER-\nSHIP'} color="var(--rack)" />
          <h2 id="members-title" className="sr-only">
            Membership: six members
          </h2>
          <p className="form-line">FORM 01 · CARDS ON FILE: 6 · MENTORS 3 / MENTEES 3</p>
        </div>

        <div className="members__floor">
          <ol className="members__index" aria-label="Cards on file">
            {members.map((m, i) => (
              <li key={m.id}>
                <button onClick={() => goTo(i)} aria-current={order[0] === i}>
                  {order[0] === i && (
                    <motion.span
                      layoutId="index-pill"
                      className="members__pill"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <span className="members__idx mono">0{i + 1}</span>
                  <span className="members__nm mono">{m.short.toUpperCase()}</span>
                  <span className="members__role mono">{m.role === 'mentor' ? 'MTR' : 'MTE'}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="desk">
            <div
              className="stack"
              ref={stack}
              tabIndex={0}
              role="group"
              aria-roledescription="card stack"
              aria-label={`${topMember.name}, ${topMember.role}. Arrow keys change card, Enter flips.`}
            >
              {members.map((m, i) => (
                <Card
                  key={m.id}
                  m={m}
                  no={i + 1}
                  depth={order.indexOf(i)}
                  flipped={flipped === m.id}
                  onFlip={() => setFlipped((f) => (f === m.id ? null : m.id))}
                  onFling={() => advance(1)}
                  narrow={narrow}
                  reduced={reduced}
                />
              ))}
            </div>
            <div className="counter" aria-hidden />
            <p className="desk__hint mono">{narrow ? 'SWIPE TO NEXT CARD · TAP TO FLIP' : 'DRAG TO FILE · CLICK TO FLIP · ← → KEYS'}</p>
          </div>
        </div>
      </section>
    </div>
  )
}

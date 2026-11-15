import { AnimatePresence, motion } from 'motion/react'
import { usePole, pole } from '../lib/pole'
import { scrollToTarget } from '../lib/scroll'
import { useEffect } from 'react'
import { useNarrow } from '../lib/env'
import './pole.css'

const AISLES = [
  { n: 1, name: 'MEMBERSHIP' },
  { n: 2, name: 'PHOTO CENTER' },
  { n: 3, name: 'RECEIPT' },
]

/** The dot-matrix lane sign. Doubles as the nav, and as the scanner's alert screen. */
export function PoleDisplay() {
  const { aisle, alert, closed } = usePole()
  const narrow = useNarrow()

  useEffect(() => {
    const els = AISLES.map((a) => document.getElementById(`aisle-${a.n}`)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) pole.set({ aisle: Number(e.target.id.split('-')[1]) })
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach((el) => io.observe(el))
    const top = document.getElementById('aisle-0')
    const io2 = new IntersectionObserver(([e]) => e.isIntersecting && pole.set({ aisle: 0 }), { rootMargin: '0px 0px -60% 0px' })
    if (top) io2.observe(top)
    return () => {
      io.disconnect()
      io2.disconnect()
    }
  }, [])

  const current = AISLES.find((a) => a.n === aisle)
  const text = alert
    ? alert
    : closed
      ? 'LANE 7 CLOSED'
      : current
        ? narrow
          ? `LANE 7 · ${String(current.n).padStart(2, '0')}`
          : `AISLE ${String(current.n).padStart(2, '0')} · ${current.name}`
        : 'LANE 7 OPEN'

  return (
    <nav className={`pole${alert ? ' pole--alert' : ''}`} aria-label="Aisles">
      <motion.div className="pole__screen" layout transition={{ type: 'spring', stiffness: 380, damping: 32 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={text}
            className="pole__text"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'linear' }}
          >
            {text}
          </motion.span>
        </AnimatePresence>
      </motion.div>
      <div className="pole__segs">
        {AISLES.map((a) => (
          <button key={a.n} className="pole__seg" onClick={() => scrollToTarget(`#aisle-${a.n}`)} aria-label={`Aisle ${a.n}: ${a.name.toLowerCase()}`}>
            {aisle === a.n && <motion.span layoutId="pole-pill" className="pole__pill" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
            <span className="pole__num">{String(a.n).padStart(2, '0')}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

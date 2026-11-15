import { useEffect, useRef } from 'react'
import { motion, useSpring } from 'motion/react'
import { gsap, scrollVelocity } from '../lib/scroll'
import { prefersReducedMotion } from '../lib/env'
import './aisle.css'

type Props = { n: number; title: string; color: string; ink?: string }

/** Double-sided hanging aisle sign. It swings on its chains when you scroll past fast. */
export function AisleMarker({ n, title, color, ink = 'var(--backlight)' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const rotate = useSpring(0, { stiffness: 120, damping: 9 })

  useEffect(() => {
    if (prefersReducedMotion()) return
    let visible = false
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(ref.current!)
    const tick = () => {
      if (!visible) return
      const v = scrollVelocity()
      rotate.set(Math.max(-6, Math.min(6, -v * 0.012)))
    }
    gsap.ticker.add(tick)
    return () => {
      io.disconnect()
      gsap.ticker.remove(tick)
    }
  }, [rotate])

  return (
    <div className="aisle" ref={ref}>
      <svg className="aisle__chains" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden>
        <line x1="34" y1="0" x2="34" y2="60" />
        <line x1="166" y1="0" x2="166" y2="60" />
      </svg>
      <motion.div className="aisle__sign" style={{ rotate, background: color, color: ink }}>
        <i className="aisle__hook aisle__hook--l" />
        <i className="aisle__hook aisle__hook--r" />
        <span className="aisle__label mono">AISLE</span>
        <span className="aisle__num wide">{String(n).padStart(2, '0')}</span>
        <span className="aisle__title wide">{title}</span>
      </motion.div>
    </div>
  )
}

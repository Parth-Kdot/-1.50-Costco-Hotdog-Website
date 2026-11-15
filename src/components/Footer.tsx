import { useEffect, useRef } from 'react'
import { gsap, scrollToTarget, scrollVelocity } from '../lib/scroll'
import { pole } from '../lib/pole'
import { prefersReducedMotion } from '../lib/env'
import { flight } from '../data'
import './footer.css'

const STRIPE = Array.from({ length: 8 }, () => 'END OF AISLE 03').join('   ///   ')

export function Footer() {
  const ref = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current!
    const io = new IntersectionObserver(([e]) => pole.set({ closed: e.isIntersecting }), { threshold: 0.4 })
    io.observe(el)
    if (prefersReducedMotion()) return () => io.disconnect()
    // The stencil only creeps while the page is moving.
    let x = 0
    const tick = () => {
      const v = scrollVelocity()
      if (!v || !track.current) return
      x -= Math.abs(v) * 0.3 * (gsap.ticker.deltaRatio() / 60)
      const w = track.current.scrollWidth / 2
      if (-x > w) x += w
      track.current.style.transform = `translateX(${x}px)`
    }
    gsap.ticker.add(tick)
    return () => {
      io.disconnect()
      gsap.ticker.remove(tick)
    }
  }, [])

  return (
    <footer className="foot" ref={ref}>
      <div className="foot__stripe" aria-hidden>
        <div className="foot__track wide" ref={track}>
          <span>{STRIPE}</span>
          <span>{STRIPE}</span>
        </div>
      </div>
      <div className="foot__body">
        <div className="foot__lines">
          <p>$1.50 Costco Hotdog. A Launchpad mentorship family: 3 mentors, 3 mentees.</p>
          <p>
            {flight.name} {flight.mission} · {flight.task} · {flight.pts} pts.
          </p>
        </div>
        <nav className="foot__nav mono" aria-label="Back to an aisle">
          {[1, 2, 3].map((n) => (
            <a
              key={n}
              href={`#aisle-${n}`}
              onClick={(e) => {
                e.preventDefault()
                scrollToTarget(`#aisle-${n}`)
              }}
            >
              AISLE {String(n).padStart(2, '0')}
            </a>
          ))}
          <a
            href="#aisle-0"
            onClick={(e) => {
              e.preventDefault()
              scrollToTarget('#aisle-0')
            }}
          >
            THE PRICE
          </a>
        </nav>
      </div>
    </footer>
  )
}

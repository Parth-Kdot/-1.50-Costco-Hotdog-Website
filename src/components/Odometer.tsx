import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef } from 'react'
import './odometer.css'

export type OdometerHandle = { set: (value: number) => void }

type Props = {
  /** Number of digit wheels. Decimal point position counted from the right. */
  digits: number
  decimals?: number
  initial?: number
  /** Face height in px; the drum radius follows from it. */
  size?: number
  className?: string
  label?: string
}

const FACES = Array.from({ length: 10 }, (_, i) => i)

/**
 * Mechanical drum counter. Each wheel is a ten-sided prism; the rotation is the
 * continuous digit value, so lower wheels push higher ones over like a real odometer.
 */
export const Odometer = forwardRef<OdometerHandle, Props>(function Odometer(
  { digits, decimals = 0, initial = 0, size = 44, className = '', label },
  ref,
) {
  const wheels = useRef<(HTMLDivElement | null)[]>([])
  const live = useRef<HTMLSpanElement>(null)
  const radius = (size / 2) / Math.tan(Math.PI / 10)

  const set = useCallback(
    (value: number) => {
      const scaled = Math.max(0, value * 10 ** decimals)
      for (let k = 0; k < digits; k++) {
        const place = 10 ** k
        const base = Math.floor(scaled / place) % 10
        // A wheel only turns while every wheel to its right is rolling from 9 to 0.
        const below = scaled % place
        const carry = k === 0 ? scaled % 1 : Math.max(0, Math.min(1, below - (place - 1)))
        const v = k === 0 ? (scaled % 10) : base + carry
        const el = wheels.current[digits - 1 - k]
        if (el) el.style.transform = `translateZ(${-radius}px) rotateX(${v * 36}deg)`
      }
      if (live.current) live.current.textContent = (Math.round(scaled) / 10 ** decimals).toFixed(decimals)
    },
    [digits, decimals, radius],
  )

  useImperativeHandle(ref, () => ({ set }), [set])
  useLayoutEffect(() => set(initial), [set, initial])

  return (
    <div className={`odo ${className}`} style={{ ['--h' as string]: `${size}px` }} aria-label={label}>
      <span className="sr-only" ref={live} />
      {Array.from({ length: digits }, (_, i) => (
        <span key={i} className="odo__slot-wrap">
          {decimals > 0 && i === digits - decimals && <span className="odo__dot">.</span>}
          <span className="odo__slot" aria-hidden>
            <div className="odo__wheel" ref={(el) => void (wheels.current[i] = el)}>
              {FACES.map((f) => (
                <span key={f} className="odo__face" style={{ transform: `rotateX(${-f * 36}deg) translateZ(${radius}px)` }}>
                  {f}
                </span>
              ))}
            </div>
          </span>
        </span>
      ))}
    </div>
  )
})

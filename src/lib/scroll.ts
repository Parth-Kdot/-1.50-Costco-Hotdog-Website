import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { isTouch, prefersReducedMotion } from './env'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load', ignoreMobileResize: true })

type LenisLike = { velocity: number; scrollTo: (t: number | string | HTMLElement, o?: object) => void; raf: (t: number) => void; on: (e: string, f: () => void) => void }
let lenis: LenisLike | null = null

export async function startSmoothScroll() {
  if (isTouch() || prefersReducedMotion() || lenis) return
  const { default: Lenis } = await import('lenis')
  const l = new Lenis({ lerp: 0.12, wheelMultiplier: 0.9 }) as unknown as LenisLike
  lenis = l
  l.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((t) => l.raf(t * 1000))
  gsap.ticker.lagSmoothing(0)
}

/** Scroll velocity in px/s, from Lenis on desktop, ScrollTrigger elsewhere. */
let lastY = 0
let lastT = 0
let nativeV = 0
if (typeof window !== 'undefined') {
  window.addEventListener(
    'scroll',
    () => {
      const t = performance.now()
      const dt = Math.max(1, t - lastT)
      nativeV = ((window.scrollY - lastY) / dt) * 1000
      lastY = window.scrollY
      lastT = t
    },
    { passive: true },
  )
}

export function scrollVelocity() {
  if (lenis) return lenis.velocity * 60
  // decay to zero when scrolling stops
  return performance.now() - lastT > 120 ? 0 : nativeV
}

export function scrollToTarget(target: string | HTMLElement) {
  if (lenis) return lenis.scrollTo(target, { offset: -8, duration: 1.4 })
  const el = typeof target === 'string' ? document.querySelector(target) : target
  el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

export { gsap, ScrollTrigger }

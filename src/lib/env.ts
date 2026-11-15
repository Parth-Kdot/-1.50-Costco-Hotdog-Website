import { useEffect, useState } from 'react'

const mq = (q: string) => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null)

export const prefersReducedMotion = () => !!mq('(prefers-reduced-motion: reduce)')?.matches
export const isTouch = () => !!mq('(pointer: coarse)')?.matches || !mq('(pointer: fine)')?.matches

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => !!mq(query)?.matches)
  useEffect(() => {
    const m = mq(query)
    if (!m) return
    const on = () => setMatch(m.matches)
    on()
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)')
export const useNarrow = () => useMedia('(max-width: 760px)')

export function safeSession(key: string, value?: string) {
  try {
    if (value === undefined) return window.sessionStorage.getItem(key)
    window.sessionStorage.setItem(key, value)
  } catch {
    /* storage blocked: behave as a first visit */
  }
  return null
}

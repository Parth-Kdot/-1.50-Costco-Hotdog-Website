import { useSyncExternalStore } from 'react'

// The dot-matrix pole display is a shared surface: the nav owns it at rest,
// the scanner borrows it for alerts.
type PoleState = { aisle: number; alert: string | null; closed: boolean }

let state: PoleState = { aisle: 0, alert: null, closed: false }
const subs = new Set<() => void>()

export const pole = {
  get: () => state,
  set(patch: Partial<PoleState>) {
    state = { ...state, ...patch }
    subs.forEach((f) => f())
  },
  subscribe(f: () => void) {
    subs.add(f)
    return () => subs.delete(f)
  },
}

export const usePole = () => useSyncExternalStore(pole.subscribe, pole.get, pole.get)

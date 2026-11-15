import { forwardRef, useImperativeHandle, useRef } from 'react'

export type FlapHandle = {
  /** Elements the hero timeline animates directly. */
  flap: HTMLDivElement | null
  /** Show `next` behind the lifted flap (the value it is trying to become). */
  peek: (next: string) => void
  /** Hard-set the face to a character. */
  show: (ch: string) => void
}

type Props = { value: string; wide?: boolean; small?: boolean }

/**
 * A split-flap tile. The upper flap hinges on the centre line; lifting it reveals
 * the top half of whatever is queued behind it.
 */
export const Flap = forwardRef<FlapHandle, Props>(function Flap({ value, wide, small }, ref) {
  const flap = useRef<HTMLDivElement>(null)
  const top = useRef<HTMLSpanElement>(null)
  const bottom = useRef<HTMLSpanElement>(null)
  const flapText = useRef<HTMLSpanElement>(null)

  useImperativeHandle(ref, () => ({
    get flap() {
      return flap.current
    },
    peek(next) {
      if (top.current) top.current.textContent = next
    },
    show(ch) {
      for (const r of [top, bottom, flapText]) if (r.current) r.current.textContent = ch
    },
  }))

  return (
    <div className={`flap${wide ? ' flap--wide' : ''}${small ? ' flap--small' : ''}`} aria-hidden>
      <div className="flap__half flap__half--top">
        <span ref={top}>{value}</span>
      </div>
      <div className="flap__half flap__half--bottom">
        <span ref={bottom}>{value}</span>
      </div>
      <div className="flap__leaf" ref={flap}>
        <div className="flap__half flap__half--top">
          <span ref={flapText}>{value}</span>
        </div>
      </div>
      <i className="flap__pin flap__pin--l" />
      <i className="flap__pin flap__pin--r" />
    </div>
  )
})

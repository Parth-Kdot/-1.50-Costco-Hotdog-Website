import { useLayoutEffect, useRef, useState } from 'react'
import { gsap, ScrollTrigger } from '../lib/scroll'
import { prefersReducedMotion } from '../lib/env'
import { flight, members } from '../data'
import { AisleMarker } from './AisleMarker'
import { Barcode } from './Barcode'
import './receipt.css'

type Line =
  | { kind: 'text'; text: string; align?: 'center'; strong?: boolean; faded?: boolean; id?: string }
  | { kind: 'pair'; left: string; right: string; indent?: boolean; id?: string; strong?: boolean }
  | { kind: 'rule'; char: string }
  | { kind: 'gap' }

const short = (name: string) => {
  const [first, ...rest] = name.split(' ')
  const last = rest.join(' ')
  return `${first} ${last}`.toUpperCase()
}

const mentors = members.filter((m) => m.role === 'mentor')
const mentees = members.filter((m) => m.role === 'mentee')

const LINES: Line[] = [
  { kind: 'text', text: 'HOT DOG + SODA FAMILY', align: 'center', strong: true },
  { kind: 'text', text: '$1.50 SINCE 1985', align: 'center' },
  { kind: 'text', text: 'REG 01  LANE 07  TRANS 0007', align: 'center', faded: true },
  { kind: 'rule', char: '-' },
  { kind: 'text', text: 'MEMBERS', strong: true },
  { kind: 'pair', left: 'MENTORS', right: '3' },
  ...mentors.map((m) => ({
    kind: 'pair' as const,
    left: m.id === 'zeke' ? 'ZEKE LINARES' : m.id === 'max' ? 'MAX MEYTIN' : `${short(m.name)}${m.remote ? ' (REMOTE)' : ''}`,
    right: '0.25',
    indent: true,
  })),
  { kind: 'pair', left: 'MENTEES', right: '3' },
  ...mentees.map((m) => ({ kind: 'pair' as const, left: short(m.name), right: '0.25', indent: true })),
  { kind: 'pair', left: '6 @ 0.25', right: '1.50', strong: true },
  { kind: 'rule', char: '-' },
  { kind: 'pair', left: 'GROUP PHOTO', right: 'QTY 1' },
  { kind: 'text', text: '  5 IN FRAME, 1 VIA LAPTOP', faded: true },
  { kind: 'rule', char: '-' },
  { kind: 'text', text: `MISSION ${flight.mission} ${flight.task.toUpperCase()}`, strong: true },
  { kind: 'pair', left: flight.name.split(' ')[0].toUpperCase(), right: `${flight.pts} PTS`, indent: true },
  { kind: 'pair', left: 'STATUS', right: 'IN PROGRESS', indent: true, id: 'status' },
  { kind: 'pair', left: 'SHIPPED', right: flight.url, indent: true, id: 'shipped' },
  { kind: 'rule', char: '*' },
  { kind: 'pair', left: 'SUBTOTAL', right: `${flight.pts} PTS` },
  { kind: 'pair', left: 'ITEMS', right: '6' },
  { kind: 'pair', left: 'INFLATION ADJ', right: '0.00' },
  { kind: 'pair', left: 'TOTAL', right: '$1.50', id: 'total', strong: true },
  { kind: 'rule', char: '-' },
  { kind: 'text', text: 'THANK YOU · PRICE STILL 1.50', align: 'center' },
  { kind: 'text', text: 'NO RETURNS ON FAMILY MEMBERS', align: 'center' },
]

function layout(line: Line, cols: number) {
  switch (line.kind) {
    case 'text':
      return line.align === 'center' ? line.text.padStart(Math.floor((cols + line.text.length) / 2)).padEnd(cols) : line.text
    case 'pair': {
      const left = (line.indent ? '  ' : '') + line.left + ' '
      const right = ' ' + line.right
      const dots = Math.max(1, cols - left.length - right.length)
      return left + '.'.repeat(dots) + right
    }
    case 'rule':
      return line.char.repeat(cols)
    default:
      return ' '
  }
}

export function Receipt() {
  const root = useRef<HTMLElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLSpanElement>(null)
  const [cols, setCols] = useState(36)

  // Fit the column count to the paper so no line ever wraps.
  useLayoutEffect(() => {
    const fit = () => {
      const p = paper.current
      const c = probe.current
      if (!p || !c) return
      const inner = p.clientWidth - parseFloat(getComputedStyle(p).paddingLeft) * 2
      const cw = c.getBoundingClientRect().width / 10
      setCols(Math.max(28, Math.min(36, Math.floor(inner / cw))))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(paper.current!)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = paper.current!
    const lines = Array.from(el.querySelectorAll<HTMLElement>('[data-line]'))
    const status = el.querySelector<HTMLElement>('[data-id="status"]')
    const shipped = el.querySelector<HTMLElement>('[data-id="shipped"]')
    const total = el.querySelector<HTMLElement>('[data-id="total"]')

    const printAll = () => {
      el.style.setProperty('--fed', '100%')
      lines.forEach((l) => l.classList.add('is-printed'))
      status?.classList.add('is-struck')
      shipped?.classList.add('is-live')
      total?.classList.add('is-checked')
    }

    if (prefersReducedMotion()) {
      printAll()
      return
    }

    let struck = false
    const timers: number[] = []
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 78%',
      end: 'bottom 72%',
      scrub: 0.3,
      onUpdate: (self) => {
        const h = el.scrollHeight
        const fed = self.progress * h
        el.style.setProperty('--fed', `${fed}px`)
        for (const l of lines) {
          if (l.classList.contains('is-printed')) continue
          if (l.offsetTop + l.offsetHeight <= fed + 2) {
            l.classList.add('is-printed')
            if (l === status && !struck) {
              struck = true
              timers.push(window.setTimeout(() => status!.classList.add('is-struck'), 400))
              timers.push(window.setTimeout(() => shipped?.classList.add('is-live'), 700))
            }
            if (l === total) total.classList.add('is-checked')
          }
        }
      },
    })
    gsap.set(el, { '--fed': '0px' })
    return () => {
      st.kill()
      timers.forEach(clearTimeout)
    }
  }, [cols])

  return (
    <section className="receipt-aisle" id="aisle-3" ref={root} aria-labelledby="receipt-title">
      <div className="receipt-aisle__side">
        <AisleMarker n={3} title="RECEIPT" color="var(--ketchup)" />
        <h2 id="receipt-title" className="sr-only">
          Mission log, printed as a receipt
        </h2>
        <p className="form-line">FORM 03 · MISSION LOG · 1 COPY · KEEP FOR YOUR RECORDS</p>
      </div>

      <div className="receipt-col">
        <div className="printer" aria-hidden>
          <span className="printer__led" />
          <span className="printer__brand mono">THERMAL 80</span>
          <span className="printer__slot" />
        </div>
        <div className="paper" ref={paper} style={{ ['--cols' as string]: cols }}>
          <span className="probe mono" ref={probe} aria-hidden>
            0000000000
          </span>
          <div className="paper__lines mono">
            {LINES.map((l, i) => {
              const text = layout(l, cols)
              const cls = [
                'ln',
                'strong' in l && l.strong ? 'ln--strong' : '',
                'faded' in l && l.faded ? 'ln--faded' : '',
                l.kind === 'gap' ? 'ln--gap' : '',
              ].join(' ')
              const id = 'id' in l ? l.id : undefined
              return (
                <span key={i} className={cls} data-line data-id={id}>
                  {id === 'status' ? (
                    <>
                      <span className="ln__text">{text}</span>
                      <i className="strike" />
                    </>
                  ) : id === 'total' ? (
                    <>
                      <span className="ln__text">{text}</span>
                      <svg className="hl" viewBox="0 0 300 24" preserveAspectRatio="none" aria-hidden>
                        <path d="M2 14 C 60 10, 120 17, 180 12 S 270 15, 298 11" pathLength={1} />
                      </svg>
                      <svg className="check" viewBox="0 0 30 30" aria-hidden>
                        <path d="M5 16 L 12 23 L 26 5" pathLength={1} />
                      </svg>
                    </>
                  ) : (
                    text
                  )}
                </span>
              )
            })}
          </div>
          <div className="paper__code ln" data-line>
            <Barcode value="150COSTCOHOTDOG" height={40} width={1.5} color="#2C2B33" className="paper__barcode" />
            <span className="mono">TC# 0007 1985 0150</span>
          </div>
        </div>
      </div>
    </section>
  )
}

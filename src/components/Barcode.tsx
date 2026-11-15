import { useLayoutEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

type Props = { value: string; height?: number; width?: number; color?: string; className?: string }

/** A real Code 128 barcode. Point a phone at it. */
export function Barcode({ value, height = 34, width = 1.4, color = '#15130F', className }: Props) {
  const ref = useRef<SVGSVGElement>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    JsBarcode(ref.current, value, {
      format: 'CODE128',
      displayValue: false,
      height,
      width,
      margin: 0,
      background: 'transparent',
      lineColor: color,
    })
    const w = parseFloat(ref.current.getAttribute('width') || '0')
    const h = parseFloat(ref.current.getAttribute('height') || '0')
    if (!ref.current.getAttribute('viewBox') && w && h) ref.current.setAttribute('viewBox', `0 0 ${w} ${h}`)
    ref.current.removeAttribute('width')
    ref.current.removeAttribute('height')
    ref.current.setAttribute('preserveAspectRatio', 'none')
  }, [value, height, width, color])
  return <svg ref={ref} className={className} role="img" aria-label={`Barcode: ${value}`} />
}

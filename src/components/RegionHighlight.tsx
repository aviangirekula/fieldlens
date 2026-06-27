import { useLayoutEffect, useRef, useState } from 'react'

type Tone = 'safe_to_inspect' | 'caution' | 'do_not_touch' | 'unknown'

interface RegionHighlightProps {
  naturalW: number
  naturalH: number
  box: { x: number; y: number; w: number; h: number } | null
  /** 'cover' = fill+crop; 'contain' (default) = whole image letterboxed. Must
   *  match the frozen image's object-fit so the box stays aligned. */
  fit?: 'cover' | 'contain'
  /** Safety verdict — sets the box border + tag color so the hazard reads
   *  directly on the equipment. The accent blue is never used here. */
  tone?: Tone
}

// Status colors (match the design tokens). Green only ever means safe; amber
// uses dark label text, the others use white. Mirrors the prototype box.
const TONE: Record<Tone, { color: string; label: string; dark: boolean }> = {
  do_not_touch: { color: '#e5484d', label: 'DO-NOT-TOUCH', dark: false },
  caution: { color: '#f2a93b', label: 'CAUTION', dark: true },
  unknown: { color: '#f2a93b', label: 'CAUTION', dark: true },
  safe_to_inspect: { color: '#2fb866', label: 'SAFE', dark: false },
}

export function RegionHighlight({
  naturalW,
  naturalH,
  box,
  fit = 'contain',
  tone = 'unknown',
}: RegionHighlightProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // Measure the overlay so we can place the box over the (letterboxed) image.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const t = TONE[tone]
  const { w: cw, h: ch } = size

  let rect: { left: number; top: number; width: number; height: number } | null = null
  if (box && naturalW && naturalH && cw && ch) {
    // Where the image actually sits inside the overlay (object-fit aware).
    const ia = naturalW / naturalH
    const ca = cw / ch
    let dispW = cw
    let dispH = ch
    let offX = 0
    let offY = 0
    const wider = ca > ia
    if (fit === 'contain' ? wider : !wider) {
      dispH = ch
      dispW = ch * ia
      offX = (cw - dispW) / 2
    } else {
      dispW = cw
      dispH = cw / ia
      offY = (ch - dispH) / 2
    }
    rect = {
      left: offX + box.x * dispW,
      top: offY + box.y * dispH,
      width: box.w * dispW,
      height: box.h * dispH,
    }
  }

  return (
    <div className="region" ref={ref} aria-hidden role="img" aria-label="Highlight on the current inspection area">
      {rect && (
        <div
          // Remount per position so the scale-in entrance replays each step.
          key={`${tone}-${Math.round(rect.left)}-${Math.round(rect.top)}`}
          className="region__box"
          style={{
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            borderColor: t.color,
          }}
        >
          <span
            className="region__tag"
            style={{ background: t.color, color: t.dark ? '#0b0c0e' : '#fff' }}
          >
            {t.label}
          </span>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'

type Tone = 'safe_to_inspect' | 'caution' | 'do_not_touch' | 'unknown'

interface RegionHighlightProps {
  naturalW: number
  naturalH: number
  box: { x: number; y: number; w: number; h: number } | null
  /** 'cover' = fill+crop (default); 'contain' = whole image letterboxed. Must
   *  match the frozen image's object-fit so the box stays aligned. */
  fit?: 'cover' | 'contain'
  /** Safety verdict of the component — the box is drawn in the matching STATUS
   *  color so the hazard reads directly on the equipment. */
  tone?: Tone
}

// Status colors (match the design tokens). The accent blue is deliberately NOT
// used here — the box always means a safety state, never a neutral UI element.
const TONE_COLOR: Record<Tone, string> = {
  do_not_touch: '#e5484d', // red
  caution: '#e89a26', // amber
  unknown: '#e89a26', // treat unknown as caution
  safe_to_inspect: '#2fb866', // green
}

export function RegionHighlight({ naturalW, naturalH, box, fit = 'cover', tone = 'unknown' }: RegionHighlightProps) {
  // NOTE: all hooks must run unconditionally — early returns go BELOW them.
  const [displayBox, setDisplayBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const prevBoxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    if (!box) {
      setDisplayBox(null)
      return
    }

    const prev = prevBoxRef.current
    prevBoxRef.current = box

    if (!prev) {
      setDisplayBox(box)
      return
    }

    const duration = 450
    const start = performance.now()

    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      setDisplayBox({
        x: prev.x + (box.x - prev.x) * eased,
        y: prev.y + (box.y - prev.y) * eased,
        w: prev.w + (box.w - prev.w) * eased,
        h: prev.h + (box.h - prev.h) * eased,
      })

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [box, naturalW, naturalH])

  if (!naturalW || !naturalH || !displayBox) return null

  const color = TONE_COLOR[tone]
  const x = displayBox.x * naturalW
  const y = displayBox.y * naturalH
  const w = displayBox.w * naturalW
  const h = displayBox.h * naturalH
  const maskId = 'region-cutout'

  return (
    <svg
      className="region"
      viewBox={`0 0 ${naturalW} ${naturalH}`}
      preserveAspectRatio={fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'}
      aria-hidden
      role="img"
      aria-label="Highlight on the current inspection area"
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width={naturalW} height={naturalH} fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={8} fill="black" />
        </mask>
      </defs>

      {/* Scrim: dim the rest of the photo so the highlighted part stands out
          and any card text over the photo stays legible. */}
      <rect
        x="0"
        y="0"
        width={naturalW}
        height={naturalH}
        fill="rgba(8,9,12,0.58)"
        mask={`url(#${maskId})`}
      />

      {/* The box itself, in the safety-status color. Solid, calm — no neon glow
          or marching ants. */}
      <rect
        className="region__border"
        x={x}
        y={y}
        width={w}
        height={h}
        rx={8}
        fill="none"
        stroke={color}
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

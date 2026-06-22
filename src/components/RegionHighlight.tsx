import { useEffect, useRef, useState } from 'react'

interface RegionHighlightProps {
  naturalW: number
  naturalH: number
  box: { x: number; y: number; w: number; h: number } | null
  /** 'cover' = fill+crop (default); 'contain' = whole image letterboxed. Must
   *  match the frozen image's object-fit so the box stays aligned. */
  fit?: 'cover' | 'contain'
}

export function RegionHighlight({ naturalW, naturalH, box, fit = 'cover' }: RegionHighlightProps) {
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

  const x = displayBox.x * naturalW
  const y = displayBox.y * naturalH
  const w = displayBox.w * naturalW
  const h = displayBox.h * naturalH
  const maskId = 'region-cutout'
  const cx = x + w / 2
  const cy = y + h / 2

  return (
    <svg
      className="region"
      viewBox={`0 0 ${naturalW} ${naturalH}`}
      preserveAspectRatio={fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'}
      aria-hidden
      role="img"
      aria-label="Spotlight highlighting the current inspection area"
    >
      <defs>
        <filter id="spotlight-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <mask id={maskId}>
          <rect x="0" y="0" width={naturalW} height={naturalH} fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={10} fill="black" />
        </mask>

        <radialGradient id="spotlight-cone" cx={cx / naturalW} cy={cy / naturalH} r="0.25">
          <stop offset="0%" stopColor="rgba(34,224,107,0.15)" />
          <stop offset="50%" stopColor="rgba(34,224,107,0.06)" />
          <stop offset="100%" stopColor="rgba(34,224,107,0)" />
        </radialGradient>
      </defs>

      <rect
        x="0"
        y="0"
        width={naturalW}
        height={naturalH}
        fill="rgba(0,0,0,0.68)"
        mask={`url(#${maskId})`}
      />

      <ellipse cx={cx} cy={cy} rx={w * 0.95} ry={h * 0.95} fill="url(#spotlight-cone)" />

      <rect
        className="region__border"
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        fill="none"
        stroke="#22e06b"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
        filter="url(#spotlight-glow)"
      />

      <circle
        className="region__pulse"
        cx={cx}
        cy={cy}
        r={0}
        fill="none"
        stroke="rgba(34,224,107,0.4)"
        strokeWidth={2.5}
        vectorEffect="non-scaling-stroke"
      />

      <circle
        className="region__pulse region__pulse--secondary"
        cx={cx}
        cy={cy}
        r={0}
        fill="none"
        stroke="rgba(34,224,107,0.25)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        style={{ animationDelay: '0.8s' }}
      />
    </svg>
  )
}
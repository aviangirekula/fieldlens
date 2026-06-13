import type { Box } from '../training/types.ts'

interface RegionHighlightProps {
  /** Natural pixel size of the frozen image (for the SVG viewBox). */
  naturalW: number
  naturalH: number
  /** Region to highlight, normalized 0–1, or null to show no highlight. */
  box: Box | null
}

/**
 * Draws a "look here" spotlight over the frozen frame: everything dims except
 * the highlighted region, which gets a bright outline.
 *
 * The SVG uses the image's natural size as its viewBox with
 * preserveAspectRatio="xMidYMid slice" — the exact equivalent of the image's
 * `object-fit: cover` — so the highlight lines up with what's on screen.
 */
export function RegionHighlight({
  naturalW,
  naturalH,
  box,
}: RegionHighlightProps) {
  if (!naturalW || !naturalH || !box) return null

  const x = box.x * naturalW
  const y = box.y * naturalH
  const w = box.w * naturalW
  const h = box.h * naturalH
  const r = Math.min(w, h) * 0.06
  const maskId = 'region-cutout'

  return (
    <svg
      className="region"
      viewBox={`0 0 ${naturalW} ${naturalH}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width={naturalW} height={naturalH} fill="white" />
          <rect x={x} y={y} width={w} height={h} rx={r} fill="black" />
        </mask>
      </defs>

      {/* Dim everything except the highlighted region. */}
      <rect
        x="0"
        y="0"
        width={naturalW}
        height={naturalH}
        fill="rgba(0,0,0,0.5)"
        mask={`url(#${maskId})`}
      />

      {/* Bright outline around the region. */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        fill="none"
        stroke="#22e06b"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

interface RegionHighlightProps {
  naturalW: number
  naturalH: number
  box: { x: number; y: number; w: number; h: number } | null
}

export function RegionHighlight({ naturalW, naturalH, box }: RegionHighlightProps) {
  if (!naturalW || !naturalH || !box) return null

  const x = box.x * naturalW
  const y = box.y * naturalH
  const w = box.w * naturalW
  const h = box.h * naturalH
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
          <rect x={x} y={y} width={w} height={h} rx={6} fill="black" />
        </mask>
      </defs>

      {/* Dim everything outside the highlighted region */}
      <rect
        x="0"
        y="0"
        width={naturalW}
        height={naturalH}
        fill="rgba(0,0,0,0.45)"
        mask={`url(#${maskId})`}
      />

      {/* Bright green border around the region */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill="none"
        stroke="#22e06b"
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

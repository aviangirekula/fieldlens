import { useEffect, useRef, useState } from 'react'
import {
  loadDetector,
  MIN_SCORE,
  TARGET_CLASS,
  type Detection,
} from './detector.ts'

export type ModelStatus = 'loading' | 'ready' | 'error'

interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface UseDetectorArgs {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  /** only run while the camera is actually streaming */
  active: boolean
  /** draw the raw detection rectangle on the canvas (off during a walkthrough) */
  showBox?: boolean
}

/** A box in stage-normalized coordinates (0–1 of the canvas/stage). */
export interface NormBox {
  x: number
  y: number
  w: number
  h: number
}

interface UseDetectorResult {
  modelStatus: ModelStatus
  /** model inferences per second (the number that matters for "real-time") */
  fps: number
  /** confidence of the currently-tracked object, 0–1, or null if none */
  confidence: number | null
  /** true while a target is being tracked */
  tracking: boolean
  /**
   * Live, smoothed box of the currently-tracked object in stage-normalized
   * coords (or null when nothing is tracked). Read each frame to anchor an
   * overlay to the object. It's already temporally smoothed, so reading it is
   * stable, not jittery.
   */
  boxRef: React.RefObject<NormBox | null>
}

// ─────────────────────────────────────────────────────────────────────────────
// Tuning knobs — adjust these to trade stability vs. responsiveness.
// ─────────────────────────────────────────────────────────────────────────────
export const TRACKING = {
  /** Score required to FIRST lock onto an object. */
  acquireScore: MIN_SCORE, // 0.45
  /**
   * Lower score tolerated to KEEP an object already locked (hysteresis). Once
   * we're tracking, a momentary confidence dip (motion blur, odd angle) down to
   * this level still counts as the same object — so the box doesn't drop out
   * right at the acquire boundary.
   */
  keepScore: 0.2,
  /**
   * Keep showing the last known box this long after detections momentarily stop
   * (ms), instead of hiding it instantly. ~200–300ms covers a few skipped
   * frames without the box lingering after the object truly leaves.
   */
  graceMs: 300,
  /**
   * How aggressively the drawn box glides toward the latest detection each
   * rendered frame (0–1). Lower = smoother but laggier; higher = snappier but
   * jitterier.
   */
  smoothing: 0.3,
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Pick the best target-class detection above `threshold`, preferring the one
 *  nearest the box we were already tracking so we don't hop between instances. */
function pickTarget(
  dets: Detection[],
  prev: Box | null,
  threshold: number,
): Detection | null {
  const candidates = dets.filter(
    (d) => d.label === TARGET_CLASS && d.score >= threshold,
  )
  if (candidates.length === 0) return null
  if (!prev) {
    return candidates.reduce((a, b) => (b.score > a.score ? b : a))
  }
  const prevCx = prev.x + prev.w / 2
  const prevCy = prev.y + prev.h / 2
  return candidates.reduce((best, d) => {
    const cx = d.bbox[0] + d.bbox[2] / 2
    const cy = d.bbox[1] + d.bbox[3] / 2
    const dist = (cx - prevCx) ** 2 + (cy - prevCy) ** 2
    const bestCx = best.bbox[0] + best.bbox[2] / 2
    const bestCy = best.bbox[1] + best.bbox[3] / 2
    const bestDist = (bestCx - prevCx) ** 2 + (bestCy - prevCy) ** 2
    return dist < bestDist ? d : best
  })
}

export function useDetector({
  videoRef,
  canvasRef,
  active,
  showBox = true,
}: UseDetectorArgs): UseDetectorResult {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading')
  const [fps, setFps] = useState(0)
  const [confidence, setConfidence] = useState<number | null>(null)
  const [tracking, setTracking] = useState(false)

  // Shared between the two loops without forcing React re-renders.
  const targetRef = useRef<{ box: Box; score: number; t: number } | null>(null)
  const displayRef = useRef<Box | null>(null)
  // Smoothed tracked box in stage-normalized coords, for overlay anchoring.
  const boxRef = useRef<NormBox | null>(null)
  // Keep the draw loop reading the latest showBox without resubscribing.
  const showBoxRef = useRef(showBox)
  showBoxRef.current = showBox

  // ── Detection loop: runs as fast as the model allows ──────────────────────
  useEffect(() => {
    if (!active) return
    let cancelled = false
    let raf = 0
    let detector: Awaited<ReturnType<typeof loadDetector>> | null = null

    // EMA of inference time → a stable FPS readout. State is pushed at most a
    // few times a second to avoid re-render churn.
    let emaMs = 0
    let lastStatePush = 0

    async function run() {
      try {
        detector = await loadDetector()
        if (cancelled) return
        setModelStatus('ready')
      } catch {
        if (!cancelled) setModelStatus('error')
        return
      }

      let lastTs = performance.now()

      const step = async () => {
        if (cancelled) return
        const video = videoRef.current
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          const dets = await detector!.detect(video)
          if (cancelled) return

          const now = performance.now()
          const prev = targetRef.current?.box ?? null

          // Hysteresis: if we're still within the grace window of a previous
          // detection we're in "keep" mode and tolerate a much lower score;
          // otherwise we need the full acquire score to lock on fresh.
          const haveFresh =
            !!targetRef.current && now - targetRef.current.t < TRACKING.graceMs
          const threshold = haveFresh
            ? TRACKING.keepScore
            : TRACKING.acquireScore
          const target = pickTarget(dets, prev, threshold)

          if (target) {
            const [x, y, w, h] = target.bbox
            targetRef.current = { box: { x, y, w, h }, score: target.score, t: now }
          }

          // FPS from smoothed frame interval.
          const dt = now - lastTs
          lastTs = now
          emaMs = emaMs === 0 ? dt : emaMs * 0.8 + dt * 0.2
          if (now - lastStatePush > 250) {
            lastStatePush = now
            setFps(Math.round(1000 / emaMs))
            const fresh =
              targetRef.current && now - targetRef.current.t < TRACKING.graceMs
            setConfidence(fresh ? (targetRef.current!.score ?? null) : null)
            setTracking(!!fresh)
          }
        }
        raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    run()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [active, videoRef])

  // ── Render loop: 60fps, interpolates + draws the box over the video ───────
  useEffect(() => {
    if (!active) return
    let raf = 0

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const canvas = canvasRef.current
      const video = videoRef.current
      if (!canvas || !video) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Match the canvas backing store to its displayed size (× DPR for crisp
      // lines on retina / mobile screens).
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight
      if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
        canvas.width = cw * dpr
        canvas.height = ch * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cw, ch)

      const vw = video.videoWidth
      const vh = video.videoHeight
      if (!vw || !vh) return

      // Replicate the video's `object-fit: cover` geometry so boxes line up
      // exactly with what's on screen. This same mapping is what the overlay-
      // anchoring layer will reuse to place guidance on real parts.
      const scale = Math.max(cw / vw, ch / vh)
      const offX = (cw - vw * scale) / 2
      const offY = (ch - vh * scale) / 2

      const target = targetRef.current
      const fresh = target && performance.now() - target.t < TRACKING.graceMs
      if (!fresh) {
        displayRef.current = null
        boxRef.current = null
        return
      }

      // Smoothly chase the latest detection.
      const tb = target!.box
      const prev = displayRef.current
      const next: Box = prev
        ? {
            x: lerp(prev.x, tb.x, TRACKING.smoothing),
            y: lerp(prev.y, tb.y, TRACKING.smoothing),
            w: lerp(prev.w, tb.w, TRACKING.smoothing),
            h: lerp(prev.h, tb.h, TRACKING.smoothing),
          }
        : { ...tb }
      displayRef.current = next

      const x = next.x * scale + offX
      const y = next.y * scale + offY
      const w = next.w * scale
      const h = next.h * scale

      // Publish the smoothed box in stage-normalized coords for overlay anchoring.
      boxRef.current = { x: x / cw, y: y / ch, w: w / cw, h: h / ch }

      // The raw rectangle is hidden during a walkthrough (showBox=false) to keep
      // the overlay clean, but boxRef above keeps updating so the anchored
      // marker can still follow the object.
      if (!showBoxRef.current) return

      // Box
      ctx.lineWidth = 3
      ctx.strokeStyle = '#22e06b'
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = 6
      ctx.strokeRect(x, y, w, h)
      ctx.shadowBlur = 0

      // Label chip
      const label = `${TARGET_CLASS} ${(target!.score * 100).toFixed(0)}%`
      ctx.font = '600 15px system-ui, sans-serif'
      const padX = 8
      const tw = ctx.measureText(label).width + padX * 2
      const th = 24
      const ly = y - th < 0 ? y : y - th
      ctx.fillStyle = '#22e06b'
      ctx.fillRect(x - 1.5, ly, tw, th)
      ctx.fillStyle = '#04210f'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, x - 1.5 + padX, ly + th / 2 + 1)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      // Clear any lingering box when the loop stops (e.g. detection paused for a
      // walkthrough), so a frozen rectangle never sits over the live feed.
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      boxRef.current = null
    }
  }, [active, videoRef, canvasRef])

  return { modelStatus, fps, confidence, tracking, boxRef }
}

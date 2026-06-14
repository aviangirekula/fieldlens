import type { ModelStatus } from '../detection/useDetector.ts'
import { TARGET_CLASS } from '../detection/detector.ts'

interface HudProps {
  modelStatus: ModelStatus
  fps: number
  confidence: number | null
  tracking: boolean
}

export function Hud({ modelStatus, fps, confidence, tracking }: HudProps) {
  return (
    <div className="hud">
      <div className="hud__row">
        <span className="hud__label">FPS</span>
        <span className="hud__value">
          {modelStatus === 'ready' ? fps : '—'}
        </span>
      </div>
      <div className="hud__row">
        <span className="hud__label">conf</span>
        <span className="hud__value">
          {confidence != null ? `${(confidence * 100).toFixed(0)}%` : '—'}
        </span>
      </div>
      <div className="hud__row">
        <span
          className={`hud__dot ${tracking ? 'hud__dot--on' : ''}`}
          aria-hidden
        />
        <span className="hud__status">
          {modelStatus === 'loading'
            ? 'loading model…'
            : modelStatus === 'error'
              ? 'model failed'
              : tracking
                ? `tracking ${TARGET_CLASS}`
                : `point at a ${TARGET_CLASS}`}
        </span>
      </div>
    </div>
  )
}
import { useRef, useState } from 'react'
import { useCamera } from './hooks/useCamera.ts'
import { StartScreen } from './components/StartScreen.tsx'
import { TrainingWalkthrough } from './components/TrainingWalkthrough.tsx'
import { RegionHighlight } from './components/RegionHighlight.tsx'
import { captureFrame, imageFileToFrame, type CapturedFrame } from './ai/captureFrame.ts'
import { generateWalkthrough, fetchVerdict } from './ai/generateWalkthrough.ts'
import { getStats, recordScan } from './services/scanStats.ts'
import type { WalkthroughData, VerdictPreview } from './training/types.ts'

const VERDICT_PREVIEW_COPY: Record<
  VerdictPreview['safetyVerdict'],
  { label: string; tone: string }
> = {
  safe_to_inspect: { label: 'Safe to Inspect', tone: 'safe' },
  caution: { label: 'Caution Required', tone: 'caution' },
  do_not_touch: { label: 'Do Not Touch', tone: 'danger' },
  unknown: { label: 'Safety Unknown', tone: 'unknown' },
}
import './App.css'

type GenStatus = 'idle' | 'loading' | 'ready' | 'error'

export default function App() {
  const { videoRef, status, error, canSwitch, start, stop, switchCamera, retry } =
    useCamera()
  const lastFrameRef = useRef<CapturedFrame | null>(null)

  // 'intro' = landing screen; 'live' = camera + capture + walkthrough flow.
  const [phase, setPhase] = useState<'intro' | 'live'>('intro')
  const streaming = status === 'streaming'

  // AI generation session.
  const [genStatus, setGenStatus] = useState<GenStatus>('idle')
  const [walkthrough, setWalkthrough] = useState<WalkthroughData | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  // Fast verdict shown during loading (before the full drill is ready).
  const [verdictPreview, setVerdictPreview] = useState<VerdictPreview | null>(null)
  const genIdRef = useRef(0)

  // The captured/uploaded frame is frozen here and guided over. Cleared (back
  // to live) when the session ends.
  const [frozenUrl, setFrozenUrl] = useState<string | null>(null)
  const [frozenDims, setFrozenDims] = useState<{ w: number; h: number } | null>(
    null,
  )

  // Walkthrough progress.
  const [stepIndex, setStepIndex] = useState(0)
  const [completed, setCompleted] = useState(false)

  const enterLive = () => {
    setPhase('live')
    start()
  }

  // Send a frame (camera OR upload) to Gemini and drive the session state.
  const runGeneration = async (frame: CapturedFrame) => {
    const genId = ++genIdRef.current
    lastFrameRef.current = frame
    setFrozenUrl(frame.dataUrl)
    setGenStatus('loading')
    setGenError(null)
    setWalkthrough(null)
    setVerdictPreview(null)
    setStepIndex(0)
    setCompleted(false)

    // Phase 1 (fast, parallel): show the safety verdict the moment it's ready,
    // while the full drill keeps loading. Best-effort — ignore if it fails.
    void fetchVerdict(frame)
      .then((v) => {
        if (genIdRef.current === genId) setVerdictPreview(v)
      })
      .catch(() => {})

    try {
      const data = await generateWalkthrough(frame)
      if (genIdRef.current !== genId) return
      if (data.steps.length === 0) {
        setGenStatus('error')
        setGenError(
          `Couldn't identify a serviceable component${
            data.component && data.component !== 'Unknown'
              ? ` (saw: ${data.component})`
              : ''
          }. Point directly at a component and try again.`,
        )
        return
      }
      // Record scan on server for real-time stats
      void fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component: data.component }),
      }).catch(() => {})
      // Store in localStorage as fallback
      recordScan(data.component)
      setWalkthrough(data)
      setGenStatus('ready')
    } catch (err) {
      setGenStatus('error')
      setGenError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const captureFromCamera = () => {
    const video = videoRef.current
    if (!video) return
    const frame = captureFrame(video)
    if (!frame) {
      setGenStatus('error')
      setGenError('Could not read the camera frame. Try again.')
      return
    }
    void runGeneration(frame)
  }

  const openPicker = () => fileInputRef.current?.click()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (phase !== 'live') setPhase('live')
    setGenStatus('loading')
    setGenError(null)
    setWalkthrough(null)
    setStepIndex(0)
    setCompleted(false)
    try {
      const frame = await imageFileToFrame(file)
      await runGeneration(frame)
    } catch (err) {
      setGenStatus('error')
      setGenError(err instanceof Error ? err.message : 'Could not read that image.')
    }
  }

  // Tapping the live feed captures + identifies. Ignored once a frame is frozen.
  const handleTap = () => {
    if (frozenUrl || genStatus === 'loading') return
    captureFromCamera()
  }

  const endSession = () => {
    genIdRef.current++
    setFrozenUrl(null)
    setFrozenDims(null)
    setGenStatus('idle')
    setWalkthrough(null)
    setGenError(null)
    setVerdictPreview(null)
    setStepIndex(0)
    setCompleted(false)
  }

  const goHome = () => {
    endSession()
    stop()
    setPhase('intro')
  }

  const total = walkthrough?.steps.length ?? 0
  const goNext = () =>
    stepIndex >= total - 1 ? setCompleted(true) : setStepIndex((i) => i + 1)
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1))
  const restart = () => {
    setStepIndex(0)
    setCompleted(false)
  }

  // Which region to highlight: current step's box, falling back to overall
  // component box on completion.
  const activeBox = !walkthrough
    ? null
    : completed
      ? walkthrough.box
      : (walkthrough.steps[stepIndex]?.box ?? walkthrough.box)

  const showSidebar = genStatus === 'ready'

  return (
    <div className={`stage${showSidebar ? ' stage--sidebar' : ''}`}>
      <video ref={videoRef} className="feed" autoPlay muted playsInline />

      {/* Frozen captured/uploaded frame we guide over. */}
      {frozenUrl && (
        <img
          className="frozen"
          src={frozenUrl}
          alt=""
          onLoad={(e) =>
            setFrozenDims({
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
            })
          }
        />
      )}

      {/* Per-step highlight over the frozen frame. */}
      {genStatus === 'ready' && frozenDims && (
        <RegionHighlight
          naturalW={frozenDims.w}
          naturalH={frozenDims.h}
          box={activeBox}
        />
      )}

      {/* Hidden picker for the upload path. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {/* Tap surface: tap a component to capture + identify. */}
      {streaming && !frozenUrl && (
        <div className="tap-layer" onClick={handleTap} />
      )}

      {/* Home / back to start. */}
      {phase === 'live' && (
        <button
          className="home"
          onClick={goHome}
          aria-label="Back to start"
          title="Back to start"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
          </svg>
        </button>
      )}

      {genStatus === 'idle' && streaming && !frozenUrl && (
        <div className="hint">Tap a component, or upload a photo</div>
      )}

      {/* Upload a photo (works with or without the camera running). */}
      {phase === 'live' && genStatus === 'idle' && !frozenUrl && (
        <button
          className="upload-btn"
          onClick={openPicker}
          aria-label="Upload a photo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
          </svg>
          <span>Upload photo</span>
        </button>
      )}

      {status === 'requesting' && (
        <div className="overlay overlay--center">
          <div className="spinner" />
          <p>Starting camera…</p>
        </div>
      )}

      {status === 'error' && error && (
        <div className="overlay overlay--center">
          <div className="card">
            <h1 className="card__title">Camera unavailable</h1>
            <p className="card__body">{error.message}</p>
            {error.kind !== 'unsupported' && error.kind !== 'insecure' && (
              <button className="btn" onClick={retry}>
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {status === 'streaming' && canSwitch && genStatus === 'idle' && !frozenUrl && (
        <div className="controls">
          <button
            className="btn btn--icon"
            onClick={switchCamera}
            aria-label="Switch camera"
            title="Switch camera"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3l2-3h6l1 1.5" />
              <path d="M14.5 4H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3" />
              <path d="M18 22l3-3-3-3" />
              <circle cx="9" cy="12" r="3" />
            </svg>
          </button>
        </div>
      )}

      {/* ═══ SCANNING ANIMATION — The Wow Moment ═══ */}
      {genStatus === 'loading' && (
        <div className="gen">
          {verdictPreview ? (
            <div
              className={`gen__verdict gen__verdict--${VERDICT_PREVIEW_COPY[verdictPreview.safetyVerdict].tone}`}
            >
              <span className="gen__verdict-tag">
                {VERDICT_PREVIEW_COPY[verdictPreview.safetyVerdict].label}
              </span>
              <span className="gen__verdict-component">
                {verdictPreview.component}
              </span>
              <span className="gen__verdict-summary">
                {verdictPreview.safetySummary}
              </span>
              <div className="gen__info gen__info--compact">
                <div className="gen__scan-icon" />
                <span className="gen__sub">Building your inspection drill…</span>
              </div>
            </div>
          ) : (
            <div className="gen__info">
              <div className="gen__scan-icon" />
              <div>
                <p className="gen__text">
                  Analyzing<span className="gen__dots"></span>
                </p>
                <span className="gen__sub">Identifying the component…</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI generation: graceful error / no-component state. */}
      {genStatus === 'error' && (
        <div className="gen gen--error">
          <div className="card">
            <h1 className="card__title">Couldn't generate guidance</h1>
            <p className="card__body">{genError}</p>
            <div className="gen__actions">
              <button className="btn btn--ghost" onClick={endSession}>
                Close
              </button>
              <button
                className="btn"
                onClick={() =>
                  lastFrameRef.current && void runGeneration(lastFrameRef.current)
                }
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Running walkthrough. */}
      {genStatus === 'ready' && walkthrough && (
        <TrainingWalkthrough
          module={walkthrough}
          index={stepIndex}
          completed={completed}
          onNext={goNext}
          onBack={goBack}
          onRestart={restart}
          onClose={endSession}
          scanStats={getStats(walkthrough.component)}
        />
      )}

      {/* Landing screen — overlays the (idle) stage so the <video> stays mounted
          and is ready the instant the camera starts. */}
      {phase === 'intro' && (
        <StartScreen onStart={enterLive} onUpload={openPicker} />
      )}
    </div>
  )
}

interface StartScreenProps {
  onStart: () => void
  onUpload: () => void
}

const STEPS = [
  { n: 1, label: 'Point at equipment' },
  { n: 2, label: 'See the safety verdict' },
  { n: 3, label: 'Follow the drill' },
]

const BADGES = [
  { icon: '/', text: 'Safety-First' },
  { icon: '/', text: 'No App Install' },
  { icon: '/', text: '2s Identification' },
]

export function StartScreen({ onStart, onUpload }: StartScreenProps) {
  return (
    <div className="start">
      <main className="start__inner" role="main">
        <header className="start__header">
          <div className="start__brand">
            <span className="start__logo" aria-hidden>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7" />
                <circle cx="12" cy="12.5" r="3.2" />
              </svg>
            </span>
            <h1 className="start__name">FieldLens</h1>
          </div>
          <p className="start__hero">
            Your <span className="start__hero-accent">senior tech</span>, in your pocket
          </p>
        </header>

        <p className="start__tagline">
          Point your camera at any HVAC component. Get an instant safety verdict and a step-by-step inspection walkthrough — right on the real equipment.
        </p>

        <nav className="start__how" aria-label="How it works">
          {STEPS.map((s, i) => (
            <div className="start__step" key={s.n}>
              <span className="start__step-num">{s.n}</span>
              <span className="start__step-label">{s.label}</span>
              {i < STEPS.length - 1 && <span className="start__arrow" aria-hidden>{'>'}</span>}
            </div>
          ))}
        </nav>

        <div className="start__badges" role="list" aria-label="Key features">
          {BADGES.map((b) => (
            <span className="start__badge" key={b.text} role="listitem">
              <span className="start__badge-icon" aria-hidden>{b.icon}</span>
              {b.text}
            </span>
          ))}
        </div>

        <div className="start__cta-group">
          <button className="start__cta" onClick={onStart} type="button">
            <span className="start__cta-text">Start Scanning</span>
            <span className="start__cta-shimmer" aria-hidden />
          </button>
          <button className="start__secondary" onClick={onUpload} type="button">
            Upload a photo instead
          </button>
        </div>

        <div className="start__trust" role="contentinfo">
          <span className="start__trust-icon" aria-hidden>*</span>
          <span>AI-generated guidance — always verify with equipment documentation and a qualified supervisor.</span>
        </div>

        <p className="start__note">
          Works on any phone or laptop browser. No download needed.
          FieldLens identifies the component, calls out visible risks, and walks you through the inspection like a trainer standing beside you.
        </p>
      </main>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────
// Field knowledge + a REAL local inspection counter.
//
// HONESTY: this file contains NO fabricated traction. There are no global scan
// counts, no "verified by N technicians", no accuracy %, and no "across N
// states" — none of that exists, so we don't claim it.
//
//   • `timesInspected` is a genuine counter for THIS browser only (starts at 0).
//   • `tips` / `seniorTechQuote` are GENERAL field guidance commonly shared in
//     HVAC technician communities and service manuals — not FieldLens data, and
//     always to be verified against the unit's documentation.
// ─────────────────────────────────────────────────────────────────────────────

export interface ComponentStats {
  component: string
  /** Real inspections on THIS device only (no global/fabricated numbers). */
  timesInspected: number
  /** General field guidance — verify against documentation. */
  tips: string[]
  latestTip: string
  seniorTechQuote: string
}

interface Knowledge {
  tips: string[]
  quote: string
}

const KNOWLEDGE: Record<string, Knowledge> = {
  capacitor: {
    tips: [
      'Failing capacitors often show terminal corrosion before they fail completely.',
      'A bulging or domed top is the earliest visible sign of failure.',
      'Some have hidden cracks only visible under direct LED light.',
    ],
    quote: "If the top looks like a fat tomato, it's done. Replace it.",
  },
  contactor: {
    tips: [
      'Welded contacts are a leading cause of "no cool" calls.',
      'Coil burnout is more common in older units.',
      'Pitted contacts are easy to miss on a quick visual check.',
    ],
    quote: 'No click? Check coil voltage. Click but no cooling? Suspect welded contacts.',
  },
  relay: {
    tips: [
      'Carbon tracking on the PCB can appear before total failure.',
      'A chattering relay overheats much faster than a quiet one.',
      'Welded contacts are easy to miss on a visual inspection alone.',
    ],
    quote: 'A good coil typically reads a few hundred ohms. No continuity means a faulty relay.',
  },
  control_board: {
    tips: [
      'Swollen board capacitors can show weeks before the board fails.',
      'LED error codes are easy to misread — match them to the manual.',
      'Burnt traces are often caused by a failed relay, not the board itself.',
    ],
    quote: "Match the blink pattern to the manual — every manufacturer is different. Don't guess.",
  },
  fan_motor: {
    tips: [
      'Dirty filters are a common cause of motor-related calls.',
      'Bearing noise tracks with age more than runtime hours.',
      'Winding shorts can cause a hot-metal smell before failure.',
    ],
    quote: "Grinding means metal-on-metal. If you hear it, the bearing is likely gone.",
  },
  compressor: {
    tips: [
      'A hard-start kit can revive a marginal compressor — a cheap fix to try first.',
      'Locked-rotor amps (LRA) are easy to mismeasure — double-check.',
      'Run-capacitor failure is often misdiagnosed as compressor failure.',
    ],
    quote: "Check the run capacitor and hard-start kit before condemning the compressor.",
  },
  thermostat: {
    tips: [
      'Dead batteries are a very common cause of "broken thermostat" calls.',
      'Wire mislabeling during replacement is a common mistake.',
      'WiFi thermostats throw more false "low battery" alerts — verify with a meter.',
    ],
    quote: "Check the obvious first — dead batteries fix more 'broken' thermostats than anything.",
  },
  circuit_breaker: {
    tips: [
      'Repeatedly resetting without finding the cause is a real fire risk.',
      'Measure amp draw before replacing — many replacements are unnecessary.',
      'Burned lugs are hidden until the panel cover is removed.',
    ],
    quote: "Measure amp draw before replacing the breaker. If you're not measuring, you're guessing.",
  },
}

const FALLBACK: Knowledge = {
  tips: [
    'Higher-resolution images and consistent lighting improve identification.',
    'Including the manufacturer label helps identify the part.',
    'Early visual inspection catches many problems before they become emergencies.',
  ],
  quote: "Slow down and read the unit before you reach for anything. Most of the job is seeing what is actually in front of you.",
}

const STORAGE_KEY = 'fieldlens_inspection_counts'

function keyOf(component: string): string {
  return component.trim().toLowerCase().replace(/[\s_-]+/g, '_')
}

function loadCounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore (e.g. private mode) */
  }
  return {}
}

function saveCounts(counts: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts))
  } catch {
    /* ignore */
  }
}

/** Field knowledge + this device's real inspection count for a component. */
export function getStats(component: string): ComponentStats {
  const key = keyOf(component)
  const k = KNOWLEDGE[key] ?? FALLBACK
  const timesInspected = loadCounts()[key] ?? 0
  const latestTip = k.tips[timesInspected % k.tips.length] ?? k.tips[0] ?? ''
  return {
    component: component || 'Unknown',
    timesInspected,
    tips: k.tips,
    latestTip,
    seniorTechQuote: k.quote,
  }
}

/** Increment this device's real inspection count for a component. */
export function recordScan(component: string): ComponentStats {
  const key = keyOf(component)
  const counts = loadCounts()
  counts[key] = (counts[key] ?? 0) + 1
  saveCounts(counts)
  return getStats(component)
}

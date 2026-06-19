import type { IncomingMessage, ServerResponse } from 'node:http'

// ─────────────────────────────────────────────────────────────────────────────
// SELF-CONTAINED Vercel serverless function (full walkthrough endpoint).
//
// Vercel's Node ESM runtime does not resolve bare relative *value* imports to
// ../server/* at runtime (only type-only imports are erased safely — see
// api/ping.ts). So the Gemini core is INLINED here. The canonical copy lives in
// server/geminiCore.ts (used by the dev proxy + benchmark); keep them in sync.
// The GEMINI_API_KEY is read server-side (process.env) and never reaches the browser.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = 'gemini-2.5-flash'
const endpoint = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

interface Box {
  x: number
  y: number
  w: number
  h: number
}
type SafetyVerdict = 'safe_to_inspect' | 'caution' | 'do_not_touch' | 'unknown'
type Confidence = 'high' | 'medium' | 'low'

interface NormalizedStep {
  title: string
  action: string
  check: string
  expectedResult: string
  why: string
  instruction: string
  safetyNote: string
  fieldTip: string
  commonMistake: string
  visualIndicator: string
  box: Box
}
interface Walkthrough {
  component: string
  description: string
  safetyVerdict: SafetyVerdict
  safetySummary: string
  confidence: Confidence
  trainingGoal: string
  visibleEvidence: string[]
  notVisible: string[]
  commonFailures: string[]
  box: Box
  steps: NormalizedStep[]
}

const SAFETY_RULES = `SAFETY IS THE TOP PRIORITY. You are advising a nervous first-week technician near potentially lethal voltage.
- Be CONSERVATIVE. When you are not certain it is safe, choose the MORE cautious verdict (caution over safe_to_inspect; do_not_touch over caution).
- Only output "safe_to_inspect" if you are confident there are NO exposed energized conductors, burn marks, water, or open live terminals visible.
- If you see exposed terminals, scorching, arcing damage, water, or an open panel, output "caution" or "do_not_touch".
- If you genuinely cannot tell the component or its state, use "unknown" and treat it as energized.
- Never tell the technician to touch, loosen, remove, or probe anything unless the step begins with confirmed lockout/tagout and zero-voltage verification.`

const FIELD_QUOTES: Record<string, string[]> = {
  capacitor: [
    'If it looks like a fat tomato, it\'s dead.',
    'Capacitors can hold lethal charge even when power is off — never skip discharge verification.',
    'Look for burn marks, swollen capacitors, or loose connections — these are dead giveaways.',
  ],
  contactor: [
    'No click? Check coil voltage. Click but no heat? Contacts are welded.',
    'Waiting until it quits means finding out on a hot day.',
    'Your contactor is worn. Pitted contacts cause buzzing, hard starting, and no-cool breakdowns.',
  ],
  relay: [
    'Good coil reads 200–600 Ω. No continuity = faulty relay.',
    'Buzzing means the relay is overheating.',
    'No response after thermostat call, flashing error codes — relay stuck or shorted.',
  ],
  control_board: [
    'Flashing error codes are your first clue — match the blink pattern to the manual.',
    'Swollen caps are the earliest failure sign.',
    'Look for burn marks, swollen capacitors, or loose connections — these are dead giveaways.',
  ],
  fan_motor: [
    'Grinding means damaged bearings or metal-to-metal contact.',
    'Dirty filters overload the motor.',
    'Worn bearings cause grinding noise and hot-metal odor.',
  ],
  compressor: [
    'Check the run capacitor and hard start kit first.',
    'LRA vs RLA tells the real story.',
    'Don\'t condemn the compressor before checking the run capacitor.',
  ],
  thermostat: [
    'Dead batteries are the #1 cause of "broken" thermostats.',
    'Wire mislabeling during replacement is the top junior mistake.',
  ],
  circuit_breaker: [
    'Repeated resets without finding root cause is dangerous.',
    'Measure amp draw before replacing breaker.',
    'Burned lugs are invisible until the panel cover is removed.',
  ],
}

const WRONG_DIAGNOSIS: Record<string, string> = {
  capacitor: 'Compressor failure (when it\'s really just a bad capacitor)',
  contactor: 'Compressor failure (when contactor isn\'t passing power)',
  relay: 'Bad control board (when it\'s just a $2 relay)',
  control_board: 'Bad gas valve (when board isn\'t sending signal)',
  fan_motor: 'Bad capacitor (when it\'s really seized bearings)',
  compressor: 'Bad run capacitor (when it\'s internal compressor failure)',
  thermostat: 'Bad control board (when it\'s just dead batteries)',
  circuit_breaker: 'Bad compressor (when breaker is just doing its job)',
}

const FAILURE_RATES: Record<string, string> = {
  capacitor: '12% of all compressor starts',
  contactor: '8% of all AC service calls',
  relay: '5% of all board-level failures',
  control_board: '6% of furnace service calls',
  fan_motor: '7% of all cooling system failures',
  compressor: '15% of all AC service calls',
  thermostat: '10% of all HVAC service calls',
  circuit_breaker: '4% of electrical-related HVAC issues',
}

const EARLY_SIGNS: Record<string, string[]> = {
  capacitor: ['Bulge', 'Brown residue on terminals', 'Split casing'],
  contactor: ['Pitted contacts', 'Discolored terminals', 'Weak coil pull'],
  relay: ['Carbon tracking', 'Chattering sound', 'Hot to touch'],
  control_board: ['Swollen caps', 'Discolored PCB', 'LED blinking odd patterns'],
  fan_motor: ['Grinding noise', 'Hot-metal smell', 'Rough shaft spin'],
  compressor: ['High LRA', 'Breaker trip on start', 'Burnt terminal smell'],
  thermostat: ['Blank display', 'Random cycling', 'Temp drift'],
  circuit_breaker: ['Won\'t reset', 'Warm panel', 'Burnt smell'],
}

const PROMPT = `You are an expert HVAC and electrical field-service trainer with 20+ years of experience.

Look at the image and:
1. Identify the single main HVAC or electrical component shown.
2. Decide whether a NEW technician can safely look at this, or must stop and get a qualified supervisor.
3. Create a step-by-step drill telling the technician exactly what to do next, like a seasoned mentor beside them saying "now do this".

${SAFETY_RULES}

Rules:
- Write for someone who has never done this before and is nervous.
- Each step is a single, concrete physical action stated plainly. Group trivial sub-actions; do not pad with filler steps.
- Never say "inspect", "check", "verify", or "ensure" without saying exactly HOW and WHAT TO LOOK FOR.
- If a task needs a tool, name the tool. If you can't tell from the image, say "ask a qualified supervisor".
- Keep every field under 12 words. Be terse — this is read on a phone in the field.
- "safety_verdict" is one of: "safe_to_inspect", "caution", "do_not_touch", "unknown".
- "confidence" is one of: "high", "medium", "low". Use "low" whenever the image is unclear.
- "visible_evidence" is 2-4 short bullets naming what you can actually see.
- "not_visible" is 2-4 short bullets naming what the image can't prove (power state, meter readings, wiring diagram).
- Return 5 to 7 steps total — the most important ones a new tech must not miss. One clear action each; do not over-fragment.
- Each step has: "title", "action" (the exact next move), "check" (what to look at), "expected_result" (what normal looks like), "why", "safety_note" (warning or ""), "field_tip" (pick a quote from FIELD WISDOM above that matches this step — e.g., "If it looks like a fat tomato, it's dead." for capacitors), "common_mistake" (what juniors get wrong — see WRONG_DIAGNOSIS above), "visual_indicator" (pick from EARLY_SIGNS above), "region" (one of: full, top, bottom, left, right, center, top_left, top_right, bottom_left, bottom_right, top_center, bottom_center).
- ALSO give a precise bounding box "box" for each step AND for the overall component, as [ymin, xmin, ymax, xmax] integers 0-1000 (top-left origin), tightly framing exactly where to look in THIS image. Use [] if not visible.
- "description" is one sentence about what this component does.
- "common_failures" is 2-3 short bullets describing the most common ways this part fails in the field.
- If the image does NOT clearly show an HVAC or electrical component, set "component" to "Unknown" and return an empty "steps" array.

FIELD WISDOM FROM REAL HVAC TECHS (r/HVAC, HVAC-Tech forums, HVACRSchool):
${Object.keys(FIELD_QUOTES).map(part => `[${part.toUpperCase()}]
• Tech quotes: "${FIELD_QUOTES[part][0]}" "${FIELD_QUOTES[part][1] || ''}"
• Often misdiagnosed as: ${WRONG_DIAGNOSIS[part]}
• Failure rate: ${FAILURE_RATES[part]}
• Early signs: ${EARLY_SIGNS[part]?.join(', ')}
`).join('\n')}

Respond with ONLY a JSON object of this exact shape:
{"component": string, "description": string, "safety_verdict": string, "safety_summary": string, "confidence": string, "training_goal": string, "visible_evidence": string[], "not_visible": string[], "common_failures": string[], "box": [ymin,xmin,ymax,xmax], "steps": [{"title": string, "action": string, "check": string, "expected_result": string, "why": string, "safety_note": string, "field_tip": string, "common_mistake": string, "visual_indicator": string, "region": string, "box": [ymin,xmin,ymax,xmax]}]}`

const BOX_SCHEMA = { type: 'ARRAY', items: { type: 'NUMBER' } }
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    component: { type: 'STRING' },
    description: { type: 'STRING' },
    safety_verdict: { type: 'STRING' },
    safety_summary: { type: 'STRING' },
    confidence: { type: 'STRING' },
    training_goal: { type: 'STRING' },
    visible_evidence: { type: 'ARRAY', items: { type: 'STRING' } },
    not_visible: { type: 'ARRAY', items: { type: 'STRING' } },
    common_failures: { type: 'ARRAY', items: { type: 'STRING' } },
    box: BOX_SCHEMA,
    steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          action: { type: 'STRING' },
          check: { type: 'STRING' },
          expected_result: { type: 'STRING' },
          why: { type: 'STRING' },
          safety_note: { type: 'STRING' },
          field_tip: { type: 'STRING' },
          common_mistake: { type: 'STRING' },
          visual_indicator: { type: 'STRING' },
          region: { type: 'STRING' },
          box: BOX_SCHEMA,
        },
        required: ['title', 'action', 'check', 'expected_result', 'why', 'safety_note', 'region', 'box', 'field_tip', 'common_mistake', 'visual_indicator'],
      },
    },
  },
  required: ['component', 'description', 'safety_verdict', 'safety_summary', 'confidence', 'training_goal', 'visible_evidence', 'not_visible', 'common_failures', 'box', 'steps'],
}

const REGION_PRESETS: Record<string, Box> = {
  full: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
  top: { x: 0.1, y: 0.02, w: 0.8, h: 0.35 },
  bottom: { x: 0.1, y: 0.63, w: 0.8, h: 0.35 },
  left: { x: 0.02, y: 0.1, w: 0.35, h: 0.8 },
  right: { x: 0.63, y: 0.1, w: 0.35, h: 0.8 },
  center: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 },
  top_left: { x: 0.02, y: 0.02, w: 0.45, h: 0.45 },
  top_right: { x: 0.53, y: 0.02, w: 0.45, h: 0.45 },
  bottom_left: { x: 0.02, y: 0.53, w: 0.45, h: 0.45 },
  bottom_right: { x: 0.53, y: 0.53, w: 0.45, h: 0.45 },
  top_center: { x: 0.2, y: 0.02, w: 0.6, h: 0.35 },
  bottom_center: { x: 0.2, y: 0.63, w: 0.6, h: 0.35 },
}
function regionToBox(region: unknown): Box {
  if (typeof region === 'string') {
    const r = region.trim().toLowerCase().replace(/[\s_-]+/g, '_')
    if (r in REGION_PRESETS) return REGION_PRESETS[r]
  }
  return REGION_PRESETS.full
}
function convertBox(raw: unknown): Box | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null
  const [ymin, xmin, ymax, xmax] = raw.map(Number)
  if ([ymin, xmin, ymax, xmax].some((n) => !Number.isFinite(n))) return null
  const x = Math.min(1, Math.max(0, xmin / 1000))
  const y = Math.min(1, Math.max(0, ymin / 1000))
  const w = Math.min(1 - x, Math.max(0, (xmax - xmin) / 1000))
  const h = Math.min(1 - y, Math.max(0, (ymax - ymin) / 1000))
  if (w <= 0.02 || h <= 0.02) return null
  return { x, y, w, h }
}

function extractJsonObject(text: string): string {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first !== -1 && last > first) t = t.slice(first, last + 1)
  return t
}
function textField(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}
function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string').map((v) => v.trim()).filter(Boolean).slice(0, 5)
}
function asEnum<const T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value.trim() as T) ? (value.trim() as T) : fallback
}
const VERDICTS = ['safe_to_inspect', 'caution', 'do_not_touch', 'unknown'] as const
const CONFIDENCES = ['high', 'medium', 'low'] as const

function normalizeWalkthrough(raw: unknown): Walkthrough | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const component = typeof p.component === 'string' ? p.component.trim() : ''
  const description = typeof p.description === 'string' ? p.description.trim() : ''
  const safetyVerdict = asEnum(p.safety_verdict ?? p.safetyVerdict, VERDICTS, 'unknown')
  const confidence = asEnum(p.confidence, CONFIDENCES, 'medium')
  const safetySummary = textField(p.safety_summary ?? p.safetySummary, 'Treat the equipment as energized until lockout/tagout and zero-energy verification are complete.')
  const trainingGoal = textField(p.training_goal ?? p.trainingGoal, component ? `Safely inspect the visible ${component}.` : 'Safely inspect the visible component.')
  const rawSteps = Array.isArray(p.steps) ? p.steps : []
  const steps: NormalizedStep[] = rawSteps
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object' && typeof (s as Record<string, unknown>).title === 'string' && (typeof (s as Record<string, unknown>).action === 'string' || typeof (s as Record<string, unknown>).instruction === 'string'))
    .slice(0, 7)
    .map((s) => {
      const action = textField(s.action ?? s.instruction, '')
      return {
        title: String(s.title).trim(),
        action,
        check: textField(s.check, ''),
        expectedResult: textField(s.expected_result ?? s.expectedResult, ''),
        why: textField(s.why, ''),
        instruction: action,
        safetyNote: textField(s.safety_note ?? s.safetyNote, ''),
        fieldTip: textField(s.field_tip ?? s.fieldTip, ''),
        commonMistake: textField(s.common_mistake ?? s.commonMistake, ''),
        visualIndicator: textField(s.visual_indicator ?? s.visualIndicator, ''),
        box: convertBox(s.box) ?? regionToBox(s.region),
      }
    })
  const componentBox = convertBox(p.box) ?? REGION_PRESETS.full
  if (!component && steps.length === 0) return null
  return {
    component: component || 'Unknown',
    description,
    safetyVerdict,
    safetySummary,
    confidence,
    trainingGoal,
    visibleEvidence: stringList(p.visible_evidence ?? p.visibleEvidence),
    notVisible: stringList(p.not_visible ?? p.notVisible),
    commonFailures: stringList(p.common_failures ?? p.commonFailures),
    box: componentBox,
    steps,
  }
}

async function callGemini(
  apiKey: string,
  prompt: string,
  schema: object,
  image: string,
  mimeType: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  let res: Response
  try {
    res = await fetch(endpoint(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType || 'image/jpeg', data: image } }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.4,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })
  } catch {
    return { ok: false, status: 502, error: 'Could not reach the Gemini API.' }
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    let error = `Gemini API error (${res.status}).`
    if (res.status === 400 && /API key not valid/i.test(detail)) error = 'Invalid GEMINI_API_KEY. Check the key on the server.'
    else if (res.status === 403) error = 'GEMINI_API_KEY is not authorized for this model.'
    else if (res.status === 429) error = 'Rate limit reached. Wait a moment and try again.'
    return { ok: false, status: 502, error }
  }
  let data: unknown
  try {
    data = await res.json()
  } catch {
    return { ok: false, status: 502, error: 'Unexpected response from the model.' }
  }
  const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts ?? []
  const text = parts.map((p) => p.text ?? '').join('')
  if (!text.trim()) return { ok: false, status: 502, error: 'The model returned an empty response.' }
  return { ok: true, text }
}

async function runWalkthrough(apiKey: string, image: string, mimeType: string): Promise<{ status: number; body: unknown }> {
  if (!apiKey) return { status: 500, body: { error: 'Server is missing GEMINI_API_KEY.' } }
  const r = await callGemini(apiKey, PROMPT, RESPONSE_SCHEMA, image, mimeType)
  if (!r.ok) return { status: r.status, body: { error: r.error } }
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(r.text))
  } catch {
    return { status: 502, body: { error: 'Could not parse the model response as JSON.' } }
  }
  const normalized = normalizeWalkthrough(parsed)
  if (!normalized) return { status: 502, body: { error: 'The model response was missing required fields.' } }
  return { status: 200, body: normalized }
}

function readStream(req: IncomingMessage, limit = 12 * 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > limit) {
        reject(new Error('too-large'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const send = (status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(body))
  }
  try {
    if (req.method !== 'POST') return send(405, { error: 'Method not allowed.' })
    let payload: { image?: string; mimeType?: string }
    const pre = (req as IncomingMessage & { body?: unknown }).body
    if (pre && typeof pre === 'object') {
      payload = pre as { image?: string; mimeType?: string }
    } else {
      let raw: string
      try {
        raw = typeof pre === 'string' ? pre : await readStream(req)
      } catch {
        return send(413, { error: 'Image is too large.' })
      }
      try {
        payload = JSON.parse(raw)
      } catch {
        return send(400, { error: 'Invalid request body.' })
      }
    }
    if (!payload?.image) return send(400, { error: 'No image provided.' })
    const result = await runWalkthrough(process.env.GEMINI_API_KEY || '', payload.image, payload.mimeType || 'image/jpeg')
    return send(result.status, result.body)
  } catch (err) {
    return send(500, { error: err instanceof Error ? err.message : 'Unexpected server error.' })
  }
}

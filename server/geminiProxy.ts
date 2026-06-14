import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

// ─────────────────────────────────────────────────────────────────────────────
// Server-side Gemini proxy.
//
// Runs inside the Vite dev/preview server (Node). The GEMINI_API_KEY is read
// here, server-side, and attached only to the outbound Gemini request — it is
// never sent to the browser or included in the client bundle. The frontend
// POSTs a captured frame to /api/generate-walkthrough; we forward it to Gemini
// and return strict, normalized JSON.
//
// For production hosting, lift `handleRequest` into a serverless function
// (Vercel/Netlify/Cloudflare) at the same path — the client code is unchanged.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = 'gemini-2.5-flash'
const endpoint = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`

const PROMPT = `You are an expert HVAC and electrical field-service trainer.

Look at the image and:
1. Identify the single main HVAC or electrical component shown.
2. Decide whether a NEW technician can safely look at this, or whether they must stop and get a qualified supervisor.
3. Create a step-by-step drill that tells the technician exactly what to do next — like a friend standing beside them saying "now do this".

Rules:
- Write for someone who has never done this before and is nervous.
- EVERY step must be a single, concrete physical action. Break everything down into the smallest possible actions. Do not combine multiple actions into one step.
- Example of correct granularity: "Step 1: Look at the top of the contactor. Find the screw terminal labeled L1." "Step 2: Look at the wire connected to L1. Check if the wire is fully seated in the terminal." "Step 3: Look for discoloration or burn marks around the L1 terminal."
- Example of WRONG (not granular enough): "Inspect the L1, L2, L3 terminals." Instead split into individual steps for each terminal.
- Never say "inspect", "check", "verify", or "ensure" without saying exactly HOW and WHAT TO LOOK FOR.
- Never tell the technician to touch, loosen, remove, or probe anything unless the step starts with confirmed lockout/tagout and zero-voltage verification.
- If a task needs a tool, name the tool and where to put it. If you can't tell from the image, say "ask a qualified supervisor".
- Keep every field under 20 words.
- Start with safety. If you see energized conductors, exposed terminals, burn marks, or water, say "caution" or "do_not_touch".
- "safety_verdict" must be one of: "safe_to_inspect", "caution", "do_not_touch", "unknown".
- "confidence" must be one of: "high", "medium", "low".
- "visible_evidence" is 2-4 short bullets naming what you can actually see.
- "not_visible" is 2-4 short bullets naming things the image can't prove (power state, meter readings, wiring diagram).
- Return 8-14 steps. Be extremely granular. Each step should cover ONE look, ONE check, or ONE action. Do not skip any detail.
- Each step has: "title" (what this step is about), "action" (the exact next move), "check" (what to look at), "expected_result" (what normal looks like), "why" (why it matters), "safety_note" (warning or empty string ""), "region" (where in the image to look - one of: "full" for the whole component, "top" for the top area, "bottom" for bottom area, "left" for left side, "right" for right side, "center" for the middle, "top_left" for top-left, "top_right" for top-right, "bottom_left" for bottom-left, "bottom_right" for bottom-right, "top_center" for top-center, "bottom_center" for bottom-center). Choose the region that best matches where this step's action happens in the image.
- A good step reads like: "action": "Look at the top of the contactor. Find the terminal labeled L1.", "check": "The L1 terminal area.", "expected_result": "Wire is fully seated, no burn marks, no discoloration.", "why": "Loose L1 connections cause overheating and equipment failure.", "region": "top"
- "description" is one sentence about what this component does.
- If the image does NOT clearly show an HVAC or electrical component, set "component" to "Unknown" and return an empty "steps" array.

Respond with ONLY a JSON object of this exact shape:
{"component": string, "description": string, "safety_verdict": string, "safety_summary": string, "confidence": string, "training_goal": string, "visible_evidence": string[], "not_visible": string[], "steps": [{"title": string, "action": string, "check": string, "expected_result": string, "why": string, "safety_note": string, "region": string}]}`

// Forces Gemini to emit JSON matching this shape (uppercase enum types per the
// Gemini schema spec). Belt-and-suspenders with the text-stripping parser below.

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
          region: { type: 'STRING' },
        },
        required: [
          'title',
          'action',
          'check',
          'expected_result',
          'why',
          'safety_note',
          'region',
        ],
      },
    },
  },
  required: [
    'component',
    'description',
    'safety_verdict',
    'safety_summary',
    'confidence',
    'training_goal',
    'visible_evidence',
    'not_visible',
    'steps',
  ],
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}
interface NormalizedStep {
  title: string
  action: string
  check: string
  expectedResult: string
  why: string
  instruction: string
  safetyNote: string
  box: Box
}
interface Normalized {
  component: string
  description: string
  safetyVerdict: 'safe_to_inspect' | 'caution' | 'do_not_touch' | 'unknown'
  safetySummary: string
  confidence: 'high' | 'medium' | 'low'
  trainingGoal: string
  visibleEvidence: string[]
  notVisible: string[]
  box: Box
  steps: NormalizedStep[]
}

const REGION_PRESETS: Record<string, Box> = {
  full:            { x: 0.1,  y: 0.1,  w: 0.8,  h: 0.8 },
  top:             { x: 0.1,  y: 0.02, w: 0.8,  h: 0.35 },
  bottom:          { x: 0.1,  y: 0.63, w: 0.8,  h: 0.35 },
  left:            { x: 0.02, y: 0.1,  w: 0.35, h: 0.8 },
  right:           { x: 0.63, y: 0.1,  w: 0.35, h: 0.8 },
  center:          { x: 0.25, y: 0.25, w: 0.5,  h: 0.5 },
  top_left:        { x: 0.02, y: 0.02, w: 0.45, h: 0.45 },
  top_right:       { x: 0.53, y: 0.02, w: 0.45, h: 0.45 },
  bottom_left:     { x: 0.02, y: 0.53, w: 0.45, h: 0.45 },
  bottom_right:    { x: 0.53, y: 0.53, w: 0.45, h: 0.45 },
  top_center:      { x: 0.2,  y: 0.02, w: 0.6,  h: 0.35 },
  bottom_center:   { x: 0.2,  y: 0.63, w: 0.6,  h: 0.35 },
}

function regionToBox(region: unknown): Box {
  if (typeof region === 'string') {
    const r = region.trim().toLowerCase().replace(/[\s_-]+/g, '_')
    if (r in REGION_PRESETS) return REGION_PRESETS[r]
  }
  return REGION_PRESETS.full
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage, limit = 12 * 1024 * 1024): Promise<string> {
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

// Robustly pull a JSON object out of the model's text: strip ```json fences,
// then fall back to the outermost { ... } span if there's extra prose.
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
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 5)
}

function normalizeEnum<const T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && allowed.includes(value.trim() as T)
    ? (value.trim() as T)
    : fallback
}

function normalize(raw: unknown): Normalized | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const component = typeof p.component === 'string' ? p.component.trim() : ''
  const description = typeof p.description === 'string' ? p.description.trim() : ''
  const safetyVerdict = normalizeEnum(
    p.safety_verdict ?? p.safetyVerdict,
    ['safe_to_inspect', 'caution', 'do_not_touch', 'unknown'],
    'unknown',
  )
  const confidence = normalizeEnum(p.confidence, ['high', 'medium', 'low'], 'medium')
  const safetySummary = textField(
    p.safety_summary ?? p.safetySummary,
    'Treat the equipment as energized until lockout/tagout and zero-energy verification are complete.',
  )
  const trainingGoal = textField(
    p.training_goal ?? p.trainingGoal,
    component
      ? `Safely inspect and understand the visible ${component}.`
      : 'Safely inspect and understand the visible component.',
  )
  const visibleEvidence = stringList(p.visible_evidence ?? p.visibleEvidence)
  const notVisible = stringList(p.not_visible ?? p.notVisible)
  const rawSteps = Array.isArray(p.steps) ? p.steps : []
  const steps: NormalizedStep[] = rawSteps
    .filter(
      (s): s is Record<string, unknown> =>
        !!s &&
        typeof s === 'object' &&
        typeof (s as Record<string, unknown>).title === 'string' &&
        (typeof (s as Record<string, unknown>).action === 'string' ||
          typeof (s as Record<string, unknown>).instruction === 'string'),
    )
    .slice(0, 16)
    .map((s) => {
      const note = s.safety_note ?? s.safetyNote
      const action = textField(s.action ?? s.instruction, '')
      const check = textField(s.check, '')
      const expectedResult = textField(s.expected_result ?? s.expectedResult, '')
      const why = textField(s.why, '')
      return {
        title: String(s.title).trim(),
        action,
        check,
        expectedResult,
        why,
        instruction: action,
        safetyNote: typeof note === 'string' ? note.trim() : '',
        box: regionToBox(s.region),
      }
    })
  const componentBox = REGION_PRESETS.full
  if (!component && steps.length === 0) return null
  return {
    component: component || 'Unknown',
    description,
    safetyVerdict,
    safetySummary,
    confidence,
    trainingGoal,
    visibleEvidence,
    notVisible,
    box: componentBox,
    steps: steps.map((s) => ({
      ...s,
      box: s.box ?? componentBox,
    })),
  }
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  apiKey: string,
) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed.' })
  if (!apiKey) {
    return send(res, 500, {
      error:
        'Server is missing GEMINI_API_KEY. Add it to a .env file at the project root and restart the dev server.',
    })
  }

  let rawBody: string
  try {
    rawBody = await readBody(req)
  } catch {
    return send(res, 413, { error: 'Image is too large.' })
  }

  let payload: { image?: string; mimeType?: string }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return send(res, 400, { error: 'Invalid request body.' })
  }
  if (!payload.image) return send(res, 400, { error: 'No image provided.' })

  let geminiRes: Response
  try {
    geminiRes = await fetch(endpoint(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              {
                inline_data: {
                  mime_type: payload.mimeType || 'image/jpeg',
                  data: payload.image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.4,
        },
      }),
    })
  } catch {
    return send(res, 502, { error: 'Could not reach the Gemini API.' })
  }

  if (!geminiRes.ok) {
    const detail = await geminiRes.text().catch(() => '')
    let message = `Gemini API error (${geminiRes.status}).`
    if (geminiRes.status === 400 && /API key not valid/i.test(detail))
      message = 'Invalid GEMINI_API_KEY. Check the key in your .env file.'
    else if (geminiRes.status === 403)
      message = 'GEMINI_API_KEY is not authorized for this model.'
    else if (geminiRes.status === 429)
      message = 'Rate limit reached. Wait a moment and try again.'
    return send(res, 502, { error: message })
  }

  let data: unknown
  try {
    data = await geminiRes.json()
  } catch {
    return send(res, 502, { error: 'Unexpected response from the model.' })
  }

  const parts =
    (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
      ?.candidates?.[0]?.content?.parts ?? []
  const text = parts.map((p) => p.text ?? '').join('')
  if (!text.trim()) return send(res, 502, { error: 'The model returned an empty response.' })

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(text))
  } catch {
    return send(res, 502, { error: 'Could not parse the model response as JSON.' })
  }

  const normalized = normalize(parsed)
  if (!normalized)
    return send(res, 502, { error: 'The model response was missing required fields.' })

  return send(res, 200, normalized)
}

export function geminiProxy(): Plugin {
  let apiKey = ''
  const mount = (use: (path: string, fn: typeof handler) => void) =>
    use('/api/generate-walkthrough', handler)
  const handler = (req: IncomingMessage, res: ServerResponse) => {
    void handleRequest(req, res, apiKey)
  }
  return {
    name: 'gemini-proxy',
    config(_config, { mode }) {
      // '' prefix loads ALL env vars (incl. process.env), not just VITE_* ones,
      // so GEMINI_API_KEY stays server-only and out of the client bundle.
      const env = loadEnv(mode, process.cwd(), '')
      apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
    },
    configureServer(server) {
      mount((path, fn) => server.middlewares.use(path, fn))
    },
    configurePreviewServer(server) {
      mount((path, fn) => server.middlewares.use(path, fn))
    },
  }
}

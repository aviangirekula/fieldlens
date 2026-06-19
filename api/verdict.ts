import type { IncomingMessage, ServerResponse } from 'node:http'

// ─────────────────────────────────────────────────────────────────────────────
// SELF-CONTAINED Vercel serverless function (fast verdict-only endpoint).
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

type SafetyVerdict = 'safe_to_inspect' | 'caution' | 'do_not_touch' | 'unknown'
type Confidence = 'high' | 'medium' | 'low'
interface Verdict {
  component: string
  safetyVerdict: SafetyVerdict
  safetySummary: string
  confidence: Confidence
}

const SAFETY_RULES = `SAFETY IS THE TOP PRIORITY. You are advising a nervous first-week technician near potentially lethal voltage.
- Be CONSERVATIVE. When you are not certain it is safe, choose the MORE cautious verdict (caution over safe_to_inspect; do_not_touch over caution).
- Only output "safe_to_inspect" if you are confident there are NO exposed energized conductors, burn marks, water, or open live terminals visible.
- If you see exposed terminals, scorching, arcing damage, water, or an open panel, output "caution" or "do_not_touch".
- If you genuinely cannot tell the component or its state, use "unknown" and treat it as energized.
- Never tell the technician to touch, loosen, remove, or probe anything unless the step begins with confirmed lockout/tagout and zero-voltage verification.`

const VERDICT_PROMPT = `You are an HVAC and electrical field-safety expert advising a nervous first-week technician.
Identify the single main component in the image and give a safety verdict.

${SAFETY_RULES}

Respond with ONLY a JSON object:
{"component": string, "safety_verdict": "safe_to_inspect"|"caution"|"do_not_touch"|"unknown", "safety_summary": string (<= 16 words), "confidence": "high"|"medium"|"low"}`

const VERDICT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    component: { type: 'STRING' },
    safety_verdict: { type: 'STRING' },
    safety_summary: { type: 'STRING' },
    confidence: { type: 'STRING' },
  },
  required: ['component', 'safety_verdict', 'safety_summary', 'confidence'],
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
function asEnum<const T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value.trim() as T) ? (value.trim() as T) : fallback
}
const VERDICTS = ['safe_to_inspect', 'caution', 'do_not_touch', 'unknown'] as const
const CONFIDENCES = ['high', 'medium', 'low'] as const

function normalizeVerdict(raw: unknown): Verdict | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const component = typeof p.component === 'string' ? p.component.trim() : ''
  if (!component) return null
  return {
    component,
    safetyVerdict: asEnum(p.safety_verdict ?? p.safetyVerdict, VERDICTS, 'unknown'),
    safetySummary: textField(p.safety_summary ?? p.safetySummary, 'Treat as energized until verified by a qualified supervisor.'),
    confidence: asEnum(p.confidence, CONFIDENCES, 'low'),
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

async function runVerdict(apiKey: string, image: string, mimeType: string): Promise<{ status: number; body: unknown }> {
  if (!apiKey) return { status: 500, body: { error: 'Server is missing GEMINI_API_KEY.' } }
  const r = await callGemini(apiKey, VERDICT_PROMPT, VERDICT_SCHEMA, image, mimeType)
  if (!r.ok) return { status: r.status, body: { error: r.error } }
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(r.text))
  } catch {
    return { status: 502, body: { error: 'Could not parse the model response as JSON.' } }
  }
  const normalized = normalizeVerdict(parsed)
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
    const result = await runVerdict(process.env.GEMINI_API_KEY || '', payload.image, payload.mimeType || 'image/jpeg')
    return send(result.status, result.body)
  } catch (err) {
    return send(500, { error: err instanceof Error ? err.message : 'Unexpected server error.' })
  }
}

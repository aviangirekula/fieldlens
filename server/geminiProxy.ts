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
2. Create a concise step-by-step training walkthrough for a NEW technician learning to inspect and service that component safely.

Rules:
- Return between 4 and 7 steps.
- Keep each "instruction" concise (one or two sentences) and action-oriented.
- Put any safety-critical warning for a step in "safety_note". If a step has no safety concern, use an empty string "".
- Include de-energizing / lockout-tagout guidance wherever it is electrically relevant.
- "description" is one or two sentences describing the component.
- For the overall component AND for each step, include a bounding box "box" locating the EXACT region in THIS image the technician should look at, formatted as [ymin, xmin, ymax, xmax] using integers from 0 to 1000 (origin at the top-left). If a step's region is not visible in the image, use an empty array [].
- If the image does NOT clearly show an HVAC or electrical component, set "component" to "Unknown" and return an empty "steps" array.

Respond with ONLY a JSON object of this exact shape:
{"component": string, "description": string, "box": [ymin,xmin,ymax,xmax], "steps": [{"title": string, "instruction": string, "safety_note": string, "box": [ymin,xmin,ymax,xmax]}]}`

// Forces Gemini to emit JSON matching this shape (uppercase enum types per the
// Gemini schema spec). Belt-and-suspenders with the text-stripping parser below.
const BOX_SCHEMA = { type: 'ARRAY', items: { type: 'NUMBER' } }

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    component: { type: 'STRING' },
    description: { type: 'STRING' },
    box: BOX_SCHEMA,
    steps: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          instruction: { type: 'STRING' },
          safety_note: { type: 'STRING' },
          box: BOX_SCHEMA,
        },
        required: ['title', 'instruction', 'safety_note', 'box'],
      },
    },
  },
  required: ['component', 'description', 'box', 'steps'],
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}
interface NormalizedStep {
  title: string
  instruction: string
  safetyNote: string
  box: Box | null
}
interface Normalized {
  component: string
  description: string
  box: Box | null
  steps: NormalizedStep[]
}

// Gemini returns boxes as [ymin, xmin, ymax, xmax] scaled 0–1000. Convert to a
// normalized { x, y, w, h } in 0–1, or null if absent / degenerate.
function convertBox(raw: unknown): Box | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null
  const [ymin, xmin, ymax, xmax] = raw.map(Number)
  if ([ymin, xmin, ymax, xmax].some((n) => !Number.isFinite(n))) return null
  const x = Math.min(1, Math.max(0, xmin / 1000))
  const y = Math.min(1, Math.max(0, ymin / 1000))
  const w = Math.min(1 - x, Math.max(0, (xmax - xmin) / 1000))
  const h = Math.min(1 - y, Math.max(0, (ymax - ymin) / 1000))
  if (w <= 0.01 || h <= 0.01) return null
  return { x, y, w, h }
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

function normalize(raw: unknown): Normalized | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const component = typeof p.component === 'string' ? p.component.trim() : ''
  const description = typeof p.description === 'string' ? p.description.trim() : ''
  const rawSteps = Array.isArray(p.steps) ? p.steps : []
  const steps: NormalizedStep[] = rawSteps
    .filter(
      (s): s is Record<string, unknown> =>
        !!s &&
        typeof s === 'object' &&
        typeof (s as Record<string, unknown>).title === 'string' &&
        typeof (s as Record<string, unknown>).instruction === 'string',
    )
    .slice(0, 7)
    .map((s) => {
      const note = s.safety_note ?? s.safetyNote
      return {
        title: String(s.title).trim(),
        instruction: String(s.instruction).trim(),
        safetyNote: typeof note === 'string' ? note.trim() : '',
        box: convertBox(s.box),
      }
    })
  if (!component && steps.length === 0) return null
  return {
    component: component || 'Unknown',
    description,
    box: convertBox(p.box),
    steps,
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

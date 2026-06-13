#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Gemini auto-labeler — bootstrap a YOLO training dataset from raw photos.
//
// Point it at a folder of images; for each one it asks Gemini to find the HVAC /
// electrical parts and their bounding boxes, then writes YOLO-format labels +
// a data.yaml you can train on directly (Ultralytics YOLOv8) or import into
// Roboflow. This turns "hand-draw thousands of boxes" into "review and fix".
//
// Usage:
//   node scripts/autolabel.mjs <input-image-folder> [output-folder]
//
// The GEMINI_API_KEY is read from your existing .env (or the environment).
// Output structure (Ultralytics-compatible):
//   <output>/images/*.jpg      copied images
//   <output>/labels/*.txt      YOLO labels: "<class_id> <cx> <cy> <w> <h>" (0–1)
//   <output>/classes.txt
//   <output>/data.yaml
//
// IMPORTANT: Gemini's labels are a strong starting point, NOT ground truth.
// Review them (Roboflow makes this fast) before training a model you'll rely on.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, readdirSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, extname, basename } from 'node:path'

const MODEL = 'gemini-2.5-flash'

// The part classes to detect. Edit this list to match what you want to train.
// Gemini is told to use ONLY these names; anything else it sees is ignored.
const CLASSES = [
  'capacitor',
  'contactor',
  'fan_motor',
  'transformer',
  'relay',
  'circuit_breaker',
  'terminal_block',
  'compressor',
  'condenser_coil',
  'control_board',
]

// Map common phrasings Gemini might return onto our canonical class names.
const SYNONYMS = {
  'dual run capacitor': 'capacitor',
  'run capacitor': 'capacitor',
  'start capacitor': 'capacitor',
  'motor capacitor': 'capacitor',
  'ac contactor': 'contactor',
  'compressor contactor': 'contactor',
  'condenser fan motor': 'fan_motor',
  'fan motor': 'fan_motor',
  'blower motor': 'fan_motor',
  'breaker': 'circuit_breaker',
  'circuit breaker': 'circuit_breaker',
  'terminal': 'terminal_block',
  'terminals': 'terminal_block',
  'control relay': 'relay',
  'control board': 'control_board',
  'circuit board': 'control_board',
}

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function loadApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY
  try {
    const env = readFileSync('.env', 'utf8')
    const m = env.match(/^\s*GEMINI_API_KEY\s*=\s*(.+)\s*$/m)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  } catch {
    /* no .env */
  }
  return ''
}

function mimeOf(file) {
  const e = extname(file).toLowerCase()
  if (e === '.png') return 'image/png'
  if (e === '.webp') return 'image/webp'
  return 'image/jpeg'
}

function canonicalClass(label) {
  const key = String(label || '').trim().toLowerCase()
  const norm = key.replace(/[\s-]+/g, '_')
  if (CLASSES.includes(norm)) return norm
  if (SYNONYMS[key]) return SYNONYMS[key]
  if (SYNONYMS[norm.replace(/_/g, ' ')]) return SYNONYMS[norm.replace(/_/g, ' ')]
  return null
}

const PROMPT = `Detect every distinct HVAC or electrical component in this image.
Use ONLY these class names: ${CLASSES.join(', ')}.
Ignore anything that does not fit one of those classes.
For each detected part return its class and a bounding box "box" as
[ymin, xmin, ymax, xmax] using integers 0–1000 (origin top-left).
Return an empty array if no listed part is present.`

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      label: { type: 'STRING' },
      box: { type: 'ARRAY', items: { type: 'NUMBER' } },
    },
    required: ['label', 'box'],
  },
}

async function detect(apiKey, base64, mime) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: base64 } }] },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
    },
  )
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '[]'
  return JSON.parse(text)
}

// [ymin,xmin,ymax,xmax] 0–1000 → YOLO "cx cy w h" normalized, or null if degenerate.
function toYolo(box) {
  if (!Array.isArray(box) || box.length !== 4) return null
  const [ymin, xmin, ymax, xmax] = box.map(Number)
  if ([ymin, xmin, ymax, xmax].some((n) => !Number.isFinite(n))) return null
  const cx = ((xmin + xmax) / 2 / 1000)
  const cy = ((ymin + ymax) / 2 / 1000)
  const w = (xmax - xmin) / 1000
  const h = (ymax - ymin) / 1000
  if (w <= 0.01 || h <= 0.01) return null
  const clamp = (v) => Math.min(1, Math.max(0, v))
  return [clamp(cx), clamp(cy), clamp(w), clamp(h)]
}

async function main() {
  const [, , inputDir, outputDir = 'dataset'] = process.argv
  if (!inputDir) {
    console.error('Usage: node scripts/autolabel.mjs <input-image-folder> [output-folder]')
    process.exit(1)
  }
  const apiKey = loadApiKey()
  if (!apiKey) {
    console.error('No GEMINI_API_KEY found (checked env and .env).')
    process.exit(1)
  }

  const files = readdirSync(inputDir).filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
  if (files.length === 0) {
    console.error(`No images (${[...IMAGE_EXTS].join(', ')}) found in ${inputDir}`)
    process.exit(1)
  }

  const imagesOut = join(outputDir, 'images')
  const labelsOut = join(outputDir, 'labels')
  mkdirSync(imagesOut, { recursive: true })
  mkdirSync(labelsOut, { recursive: true })

  let labeled = 0
  let boxes = 0
  let skipped = 0
  const perClass = Object.fromEntries(CLASSES.map((c) => [c, 0]))

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const path = join(inputDir, file)
    process.stdout.write(`[${i + 1}/${files.length}] ${file} … `)
    try {
      const base64 = readFileSync(path).toString('base64')
      const dets = await detect(apiKey, base64, mimeOf(file))
      const lines = []
      for (const d of dets) {
        const cls = canonicalClass(d.label)
        const yolo = toYolo(d.box)
        if (cls == null || !yolo) {
          skipped++
          continue
        }
        lines.push(`${CLASSES.indexOf(cls)} ${yolo.map((n) => n.toFixed(6)).join(' ')}`)
        perClass[cls]++
        boxes++
      }
      copyFileSync(path, join(imagesOut, file))
      const stem = basename(file, extname(file))
      writeFileSync(join(labelsOut, `${stem}.txt`), lines.join('\n') + (lines.length ? '\n' : ''))
      labeled++
      console.log(`${lines.length} box(es)`)
    } catch (err) {
      console.log(`ERROR: ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 200)) // be gentle on rate limits
  }

  writeFileSync(join(outputDir, 'classes.txt'), CLASSES.join('\n') + '\n')
  const namesYaml = CLASSES.map((c, i) => `  ${i}: ${c}`).join('\n')
  writeFileSync(
    join(outputDir, 'data.yaml'),
    `# Auto-generated by scripts/autolabel.mjs — REVIEW before training.\n` +
      `path: .\ntrain: images\nval: images\nnc: ${CLASSES.length}\nnames:\n${namesYaml}\n`,
  )

  console.log('\n── Done ──')
  console.log(`images labeled: ${labeled}/${files.length}`)
  console.log(`boxes written:  ${boxes}   (skipped non-class detections: ${skipped})`)
  console.log('per class:', Object.entries(perClass).filter(([, n]) => n).map(([c, n]) => `${c}:${n}`).join('  ') || '(none)')
  console.log(`\nDataset → ${outputDir}/  (images/, labels/, data.yaml)`)
  console.log('Next: review labels in Roboflow, then train YOLOv8 on data.yaml.')
}

main()

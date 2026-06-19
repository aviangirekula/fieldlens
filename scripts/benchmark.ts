// ─────────────────────────────────────────────────────────────────────────────
// Benchmark harness — measures the MVP against its quality bar.
//
// Runs a labeled test set through the SAME core the app uses and reports:
//   • component-ID accuracy (%)
//   • the dangerous-marked-safe (false-safe) rate — the critical safety number
//   • verdict-appropriateness (model is at least as cautious as the label)
//   • latency p50 / p95 for the fast verdict call AND the full walkthrough
//
// Run:  node --experimental-strip-types scripts/benchmark.ts [benchmark-dir]
// Needs GEMINI_API_KEY (read from env or .env). Uses one verdict + one full
// call per image.
//
// test-set.json: [{ "file": "contactor.jpg", "component": "contactor",
//                   "expected": "safe" | "caution" | "danger" | "unknown" }]
// Images live in <dir>/images/.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { join, extname } from 'node:path'
import { runWalkthrough, runVerdict, type SafetyVerdict } from '../server/geminiCore.ts'

function loadKey(): string {
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

type Expected = 'safe' | 'caution' | 'danger' | 'unknown'
interface Entry {
  file: string
  component: string
  expected: Expected
}

const VERDICT_SEVERITY: Record<SafetyVerdict, number> = {
  safe_to_inspect: 0,
  caution: 1,
  unknown: 1,
  do_not_touch: 2,
}
const EXPECTED_SEVERITY: Record<Expected, number> = {
  safe: 0,
  caution: 1,
  unknown: 1,
  danger: 2,
}

function idMatch(expected: string, got: string): boolean {
  const norm = (s: string) =>
    String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const e = norm(expected)
  const g = norm(got)
  if (!e || !g) return false
  if (e === g || g.includes(e) || e.includes(g)) return true
  const et = new Set(e.split(' '))
  return g.split(' ').some((t) => et.has(t))
}

function pctile(arr: number[], p: number): number {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]
}
const mean = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0)
const mimeOf = (f: string) => (extname(f).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Free-tier Gemini rate-limits aggressively. Throttle between calls and retry on
// transient rate-limit / overload so the numbers reflect the MODEL, not the quota.
const DELAY_MS = Number(process.env.BENCH_DELAY_MS || 4000) // between images
const GAP_MS = Number(process.env.BENCH_GAP_MS || 2500) // between the 2 calls
// Walkthrough alone returns component + safetyVerdict (all we score), so skipping
// the separate verdict call halves API load — critical under tight free-tier quota.
const SKIP_VERDICT = process.env.BENCH_SKIP_VERDICT === '1'
// If BENCH_URL is set, run through the DEPLOYED endpoint (which holds the Vercel
// GEMINI_API_KEY) instead of calling Gemini locally — so the key lives in exactly
// one place. The endpoint returns the same normalized walkthrough shape.
const REMOTE = process.env.BENCH_URL // e.g. https://fieldlens-eosin.vercel.app
async function remoteWalkthrough(_k: string, image: string, mime: string): Promise<{ status: number; body: unknown }> {
  try {
    const res = await fetch(`${REMOTE}/api/generate-walkthrough`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, mimeType: mime }),
    })
    const body = await res.json().catch(() => ({ error: 'Non-JSON response from endpoint.' }))
    return { status: res.status, body }
  } catch {
    return { status: 502, body: { error: 'Could not reach the deployed endpoint.' } }
  }
}
const isTransient = (body: unknown) =>
  typeof body === 'object' && body !== null && 'error' in body &&
  /rate limit|429|overload|503|temporar|unavailable|reach the gemini/i.test(
    String((body as { error?: unknown }).error ?? ''),
  )

type Run = (k: string, img: string, mime: string) => Promise<{ status: number; body: unknown }>
// Returns the successful call's duration (excludes time lost to retries/backoff).
async function callWithRetry(run: Run, key: string, img: string, mime: string) {
  const backoff = [30000, 45000, 60000, 90000]
  for (let attempt = 0; ; attempt++) {
    const t0 = Date.now()
    const r = await run(key, img, mime)
    const ms = Date.now() - t0
    if (!(r.status >= 500 && isTransient(r.body)) || attempt >= backoff.length) return { r, ms }
    const wait = backoff[attempt]
    process.stdout.write(`  (rate-limited, waiting ${wait / 1000}s…) `)
    await sleep(wait)
  }
}

async function main() {
  const key = loadKey()
  if (!key && !REMOTE) {
    console.error('No GEMINI_API_KEY (checked env and .env). Or set BENCH_URL to run remotely.')
    process.exit(1)
  }
  if (REMOTE) console.log(`Remote mode → ${REMOTE}/api/generate-walkthrough`)
  const dir = process.argv[2] || 'benchmark'
  const testSet: Entry[] = JSON.parse(readFileSync(join(dir, 'test-set.json'), 'utf8'))

  let idCorrect = 0
  let falseSafe = 0
  let verdictAppropriate = 0
  let errors = 0
  const verdictMs: number[] = []
  const fullMs: number[] = []
  const falseSafeFiles: string[] = []

  console.log(`\nRunning ${testSet.length} test images (throttled ${DELAY_MS / 1000}s/img)…\n`)
  console.log(
    'image'.padEnd(26) + 'ID'.padEnd(5) + 'expect'.padEnd(9) + 'verdict'.padEnd(16) + 'safe?  full(ms)',
  )
  console.log('-'.repeat(78))

  let first = true
  for (const t of testSet) {
    if (!first) await sleep(DELAY_MS)
    first = false
    const img = readFileSync(join(dir, 'images', t.file)).toString('base64')
    const mime = mimeOf(t.file)

    let vr: { status: number; body: unknown } = { status: 0, body: {} }
    if (!SKIP_VERDICT && !REMOTE) {
      const v = await callWithRetry(runVerdict, key, img, mime)
      vr = v.r
      if (vr.status === 200) verdictMs.push(v.ms)
      await sleep(GAP_MS)
    }

    const f = await callWithRetry(REMOTE ? remoteWalkthrough : runWalkthrough, key, img, mime)
    const fr = f.r
    if (fr.status === 200) fullMs.push(f.ms)

    const got =
      fr.status === 200 && 'component' in fr.body
        ? (fr.body as { component: string; safetyVerdict: SafetyVerdict })
        : null
    const verdict: SafetyVerdict =
      got?.safetyVerdict ??
      (vr.status === 200 && 'safetyVerdict' in vr.body
        ? (vr.body as { safetyVerdict: SafetyVerdict }).safetyVerdict
        : 'unknown')
    const component = got?.component ?? '(error)'
    const isError = fr.status !== 200 && vr.status !== 200
    if (isError) errors++

    const idOk = !isError && idMatch(t.component, component)
    if (idOk) idCorrect++
    const appropriate = VERDICT_SEVERITY[verdict] >= EXPECTED_SEVERITY[t.expected]
    if (!isError && appropriate) verdictAppropriate++
    const isFalseSafe = EXPECTED_SEVERITY[t.expected] >= 1 && verdict === 'safe_to_inspect'
    if (isFalseSafe) {
      falseSafe++
      falseSafeFiles.push(t.file)
    }

    console.log(
      t.file.slice(0, 24).padEnd(26) +
        (isError ? 'ERR' : idOk ? 'OK ' : 'X  ').padEnd(5) +
        t.expected.padEnd(9) +
        verdict.padEnd(16) +
        (isFalseSafe ? 'FALSE-SAFE' : 'ok').padEnd(7) +
        String(fr.status === 200 ? f.ms : '-'),
    )
  }

  const n = testSet.length
  const scored = n - errors
  console.log('\n' + '═'.repeat(44))
  console.log('RESULTS  (n = ' + n + ', scored = ' + scored + ', errors = ' + errors + ')')
  console.log('═'.repeat(44))
  console.log(`Component ID accuracy:      ${scored ? Math.round((idCorrect / scored) * 100) : 0}%  (${idCorrect}/${scored})`)
  console.log(`Verdict appropriate:        ${scored ? Math.round((verdictAppropriate / scored) * 100) : 0}%  (model >= label severity)`)
  console.log(`DANGEROUS-MARKED-SAFE:      ${falseSafe}  (target: 0)  ${falseSafe === 0 ? 'PASS' : 'FAIL'}`)
  if (falseSafeFiles.length) console.log(`  false-safe files: ${falseSafeFiles.join(', ')}`)
  console.log(`Verdict latency  p50/p95:   ${pctile(verdictMs, 50)} / ${pctile(verdictMs, 95)} ms  (mean ${mean(verdictMs)}, n=${verdictMs.length})`)
  console.log(`Full drill latency p50/p95: ${pctile(fullMs, 50)} / ${pctile(fullMs, 95)} ms  (mean ${mean(fullMs)}, n=${fullMs.length})`)
  console.log('═'.repeat(44))
  console.log('Bar: ID >=90%, false-safe = 0, verdict latency <3s.\n')
}

main()

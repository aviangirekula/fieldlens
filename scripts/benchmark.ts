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

async function main() {
  const key = loadKey()
  if (!key) {
    console.error('No GEMINI_API_KEY (checked env and .env).')
    process.exit(1)
  }
  const dir = process.argv[2] || 'benchmark'
  const testSet: Entry[] = JSON.parse(readFileSync(join(dir, 'test-set.json'), 'utf8'))

  let idCorrect = 0
  let falseSafe = 0
  let verdictAppropriate = 0
  const verdictMs: number[] = []
  const fullMs: number[] = []

  console.log(`\nRunning ${testSet.length} test images…\n`)
  console.log(
    'image'.padEnd(26) + 'ID'.padEnd(5) + 'expect'.padEnd(9) + 'verdict'.padEnd(16) + 'safe?  full(ms)',
  )
  console.log('-'.repeat(78))

  for (const t of testSet) {
    const img = readFileSync(join(dir, 'images', t.file)).toString('base64')
    const mime = mimeOf(t.file)

    const v0 = Date.now()
    const vr = await runVerdict(key, img, mime)
    verdictMs.push(Date.now() - v0)

    const f0 = Date.now()
    const fr = await runWalkthrough(key, img, mime)
    fullMs.push(Date.now() - f0)

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

    const idOk = idMatch(t.component, component)
    if (idOk) idCorrect++
    const appropriate = VERDICT_SEVERITY[verdict] >= EXPECTED_SEVERITY[t.expected]
    if (appropriate) verdictAppropriate++
    const isFalseSafe = EXPECTED_SEVERITY[t.expected] >= 1 && verdict === 'safe_to_inspect'
    if (isFalseSafe) falseSafe++

    console.log(
      t.file.slice(0, 24).padEnd(26) +
        (idOk ? 'OK ' : 'X  ').padEnd(5) +
        t.expected.padEnd(9) +
        verdict.padEnd(16) +
        (isFalseSafe ? 'FALSE-SAFE' : 'ok').padEnd(7) +
        String(fullMs[fullMs.length - 1]),
    )
  }

  const n = testSet.length
  console.log('\n' + '═'.repeat(40))
  console.log('RESULTS  (n = ' + n + ')')
  console.log('═'.repeat(40))
  console.log(`Component ID accuracy:     ${Math.round((idCorrect / n) * 100)}%  (${idCorrect}/${n})`)
  console.log(`Verdict appropriate:       ${Math.round((verdictAppropriate / n) * 100)}%  (>= label severity)`)
  console.log(`DANGEROUS-MARKED-SAFE:     ${falseSafe}  (target: 0)  ${falseSafe === 0 ? 'PASS' : 'FAIL'}`)
  console.log(`Verdict latency  p50/p95:  ${pctile(verdictMs, 50)} / ${pctile(verdictMs, 95)} ms  (mean ${mean(verdictMs)})`)
  console.log(`Full drill latency p50/p95: ${pctile(fullMs, 50)} / ${pctile(fullMs, 95)} ms  (mean ${mean(fullMs)})`)
  console.log('═'.repeat(40))
  console.log('Bar: ID >=90%, false-safe = 0, verdict latency <3s.\n')
}

main()

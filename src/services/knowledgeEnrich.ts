// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Enrichment — injects the hvacKnowledge base into Gemini prompts
// so the AI synthesizes field wisdom, not just generic instructions.
// ─────────────────────────────────────────────────────────────────────────────

import knowledge, { getFieldQuote, getMistakes, getIndicators } from '../data/hvacKnowledge.ts'

export interface EnrichmentContext {
  component: string
  steps?: string[]
  indicators?: string[]
  fieldQuotes?: string[]
  juniorMistakes?: string[]
  regions?: string[]
}

/** enrich a component name to find the best knowledge base match */
function normalizeComponent(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/[\s_-]+/g, '_')
  return key
}

/** Build a prompt enrichment block for a given component */
export function buildKnowledgeBlock(componentName: string): string {
  const key = normalizeComponent(componentName)
  const match = knowledge.find((p) => p.part === key)
  if (!match) return ''

  const lines: string[] = []
  lines.push(` --- KNOWN FIELD DATA FOR "${match.label}" --- `)

  if (match.steps.length > 0) {
    lines.push('REAL SERVICE PROCEDURE (from manufacturer/union sources):')
    match.steps.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`))
  }

  if (match.indicators.length > 0) {
    lines.push('\nVISUAL FAILURE INDICATORS (what a tech can actually SEE):')
    match.indicators.forEach((ind) => lines.push(`  • ${ind}`))
  }

  if (match.fieldQuotes.length > 0) {
    lines.push('\nREAL TECH QUOTES (from forums, verified by senior techs):')
    match.fieldQuotes.forEach((q) => lines.push(`  “${q}”`))
  }

  if (match.juniorMistakes.length > 0) {
    lines.push('\nCOMMON MISTAKES BY JUNIOR TECHS:')
    match.juniorMistakes.forEach((m) => lines.push(`  • ${m}`))
  }

  if (match.regions.length > 0) {
    lines.push('\nREGIONS TO INSPECT (map to highlight boxes):')
    match.regions.forEach((r) => lines.push(`  • ${r}`))
  }

  if (match.sources.length > 0) {
    lines.push(`\nSOURCES: ${match.sources.join('; ')}`)
  }

  return lines.join('\n')
}

export function getFieldQuoteForComponent(component: string): string | null {
  return getFieldQuote(component)
}

export function getMistakesForComponent(component: string): string[] {
  return getMistakes(component)
}

export function getIndicatorsForComponent(component: string): string[] {
  return getIndicators(component)
}

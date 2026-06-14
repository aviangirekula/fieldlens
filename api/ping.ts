import type { IncomingMessage, ServerResponse } from 'node:http'

// Diagnostic only: no external imports. If this returns 200 but the other
// endpoints 500, the problem is bundling the ../server import. If this 404s,
// builds aren't deploying. If this 500s, it's a fundamental function-runtime issue.
export default function handler(_req: IncomingMessage, res: ServerResponse): void {
  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ ok: true, runtime: 'node', ts: 'self-contained' }))
}

# Deploying FieldLens (a live link investors can try)

The app is a static Vite site + two serverless functions (`api/generate-walkthrough`,
`api/verdict`) that hold the Gemini key server-side. Vercel hosts both with one
real HTTPS domain — so the **camera works on any phone with no certificate
warning**, and anyone can try it from a link.

## Option A — Vercel dashboard (easiest)

1. Go to **https://vercel.com**, sign in with GitHub.
2. **Add New → Project → Import** the `fieldlens` repo.
3. Vercel auto-detects **Vite** (build `npm run build`, output `dist`). Leave defaults.
4. Expand **Environment Variables** and add:
   - **Name:** `GEMINI_API_KEY`  **Value:** your key (the same one from `.env`)
   - Apply to Production, Preview, and Development.
5. Click **Deploy**. You'll get a URL like `https://fieldlens.vercel.app`.

Open it on your phone → tap Start → it just works (real HTTPS, no warning).

## Option B — CLI

```bash
npm i -g vercel
vercel                       # link the project (accept Vite defaults)
vercel env add GEMINI_API_KEY   # paste your key, choose all environments
vercel --prod                # deploy
```

## Notes

- **The key is never exposed.** `GEMINI_API_KEY` lives only in Vercel's env (and
  your local `.env`); it's read inside the serverless functions, never in the
  browser bundle.
- **Auto-deploys:** once linked, every push to `main` redeploys. Pushes to other
  branches get preview URLs (handy for sharing WIP).
- **Free tier** is plenty for a demo (the functions are tiny; cost is one Gemini
  call per use).
- If Vercel's build ever complains about `.ts` import extensions in `api/`, the
  one-line fix is to drop the `.ts` from the import in `api/*.ts`
  (`'../server/geminiCore'`). It builds as-is on current Vercel.

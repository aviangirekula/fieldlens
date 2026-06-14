# FieldLens

**An AI-powered, camera-based training assistant for HVAC technicians.** Point a
phone or laptop at a component, identify it instantly, and get a step-by-step,
safety-aware service walkthrough — with the exact region to look at highlighted
for each step. Runs entirely in the browser; no app install.

---

## Quick start (for a new developer)

You need **Node.js 20+** and a **Google Gemini API key** (free from
[Google AI Studio](https://aistudio.google.com/apikey)).

```bash
# 1. Clone and install
git clone <this-repo-url>
cd arfullproject
npm install

# 2. Add your Gemini key (this file is git-ignored — never commit it)
cp .env.example .env
#   then edit .env and set:  GEMINI_API_KEY=AIza...your-key

# 3. Run
npm run dev
```

Open the **Local** URL it prints (e.g. `https://localhost:5173`). It uses a
self-signed cert, so the browser shows a "Your connection is not private"
warning the first time — click **Advanced → Proceed to localhost** (Chrome) or
**Show Details → visit this website** (Safari). Allow the camera, tap **Start**,
then tap a component (or **Upload a photo**).

> Each developer uses **their own** Gemini key in their **own** `.env`. The key
> is never committed and never shipped to the browser (see *Security* below).

---

## What it does

1. **Landing screen** → **Start** opens a full-screen live camera feed (rear
   camera by default on phones).
2. **Tap a component** (or upload a photo) → the frame is captured and frozen.
3. The frame is sent to **Gemini 2.5 Flash**, which returns the component name,
   a safety verdict, visible evidence, blind spots, a training goal, and a
   **4–7 step inspection drill**.
4. The walkthrough plays over the frozen frame: **Step X of Y**, progress bar,
   Next/Back, safety notes, completion screen, optional region highlighting, and
   concrete **Do / Check / Normal / Why** guidance for each step.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite 7 + TypeScript |
| Camera | raw `getUserMedia` / `MediaStream` + `<video>` |
| On-device CV | TensorFlow.js + COCO-SSD (WebGL) |
| AI vision + generation | Google Gemini 2.5 Flash (REST) |
| Backend / key proxy | Vite server middleware (Node), pure `fetch` |
| Local HTTPS | `@vitejs/plugin-basic-ssl` (needed for camera on phones) |

## Security (important)

The Gemini API key lives **only** in `.env`, server-side. It has **no `VITE_`
prefix**, so Vite never bundles it into client code. The browser only ever calls
`/api/generate-walkthrough` on our own server ([`server/geminiProxy.ts`](server/geminiProxy.ts)),
which attaches the key when calling Google. **`.env` is git-ignored — never
commit it.**

> **Production:** the proxy runs inside the Vite dev/preview server. To deploy,
> move `handleRequest` from `server/geminiProxy.ts` into a serverless function
> (Vercel/Netlify/Cloudflare) at the same `/api/generate-walkthrough` path — the
> frontend is unchanged.

## Test on your phone

Phone and laptop on the **same Wi-Fi**. Run `npm run dev`; it prints a
**Network** URL like `https://192.168.1.42:5173/`. Open that on the phone, accept
the cert warning, allow the camera. (Find the IP manually with
`ipconfig getifaddr en0` on macOS.)

## Project structure

```
src/
  main.tsx                   React entry
  App.tsx                    app shell: phases, capture/upload, session state
  App.css / index.css        styling + global reset / safe-area handling
  hooks/useCamera.ts         camera permissions, rear-cam default, switching
  detection/
    detector.ts              COCO-SSD loader behind a generic Detection interface
    useDetector.ts           real-time detection loop, smoothing, box export
  ai/
    captureFrame.ts          grab + downscale a video frame OR an uploaded image
    generateWalkthrough.ts   POST the frame to the proxy, return parsed result
  training/types.ts          WalkthroughData / Box types
  components/
    StartScreen.tsx          landing screen
    Hud.tsx                  FPS / confidence readout
    TrainingWalkthrough.tsx  step-by-step overlay (progress, Next/Back, safety)
    RegionHighlight.tsx      per-step "look here" spotlight (SVG)
server/geminiProxy.ts        Vite middleware: holds the key, calls Gemini, normalizes JSON
scripts/autolabel.mjs        Gemini auto-labeler → YOLO training dataset (see below)
```

## Custom-model path (roadmap)

Today the highlight is anchored to a **frozen captured frame**. Real-time,
glued-to-the-part tracking needs a **custom on-device detector trained on HVAC
parts**. To bootstrap that dataset without hand-labeling thousands of boxes:

```bash
node scripts/autolabel.mjs ./photos ./dataset
```

It runs your photos through Gemini and writes a YOLO-format dataset
(`images/`, `labels/`, `data.yaml`) ready to review in Roboflow and train with
YOLOv8. Edit the `CLASSES` list at the top of the script to set the parts you
care about.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the HTTPS dev server (camera + proxy) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build |

## Status & honesty

- **Working today:** camera → identify → AI walkthrough → per-step region
  highlighting, on phone and laptop.
- **Not yet:** real-time tracking of HVAC parts (snapshot-anchored for now);
  a custom-trained model; accounts/persistence. AI guidance is labeled as such
  and should be verified against equipment documentation.

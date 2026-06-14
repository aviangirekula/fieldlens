# Benchmark set

Measures the MVP against its quality bar (ID accuracy, false-safe rate, latency).

## Run

```bash
node --experimental-strip-types scripts/benchmark.ts
```

(Reads `GEMINI_API_KEY` from `.env`. Makes one verdict + one full call per image.)

## Add your own test images (do this to get real numbers)

1. Drop labeled photos in `benchmark/images/`.
2. Add an entry per image to `test-set.json`:
   ```json
   { "file": "my-capacitor.jpg", "component": "dual run capacitor", "expected": "caution" }
   ```
   - `component`: what it should be identified as (loose token match).
   - `expected`: the *minimum* safety level the model must reach —
     `safe` | `caution` | `danger` | `unknown`. The model is allowed to be **more**
     cautious, never less. A `caution`/`danger` image returned as `safe_to_inspect`
     counts as a **FALSE-SAFE** (the number that must be 0).

Aim for **30–50 images** across your real target components and conditions
(good light, bad light, multiple brands, some genuinely dangerous ones).

> The two seed images here are public-domain examples — replace them with photos
> of the equipment you actually care about.

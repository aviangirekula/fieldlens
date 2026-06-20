# FieldLens — Benchmark Report

**Run:** 30 images · 15 component types · live production endpoint (`/api/generate-walkthrough`, Gemini 2.5 Flash) · 30/30 completed, 0 errors.

## Headline results

| Metric | Result | Bar |
|---|---|---|
| **Safety-critical items marked "safe to inspect"** | **0 of 8** (every run) | 0 (PASS ✅) |
| Component-ID accuracy (strict exact match) | **70–80%** (21–24/30 across runs) | informational |
| Median latency, photo → full inspection drill | **~5–6s** (p95 ~7s) | end-to-end |

**Run-to-run variance.** The model runs at temperature 0.4, so component IDs vary between runs. Across three runs we measured **21/30, 22/30, and 24/30** (≈70–80%, avg ~74%). The safety result was **stable at 0 hazards-marked-safe in every run** — that's the number that matters and it doesn't move. The per-image table below is one representative logged run.

The 8 "safety-critical" images are the visibly-dangerous parts (blown capacitor, two burnt contactors, a blown-capacitor board, a burnt wire) plus live-exposed electrical panels. **FieldLens marked zero of them "safe to inspect"** — every one came back `caution` or `do not touch`. For a tool whose job is to keep a nervous first-week tech away from lethal voltage, this is the metric that matters, and it passed.

## Honest caveats (read these)

1. **Web-sourced images, not field photos.** The set is catalog + some field photos from Wikimedia Commons / Openverse — cleaner than what a phone captures in a dark mechanical room. **Treat every number as an upper bound, not field performance.** Next step is benchmarking on real field photos with design-partner techs.
2. **Strict exact-match ID scoring.** Component ID is counted correct only on token overlap with our label, so close synonyms count as misses (e.g., a window AC labeled "air conditioner" but called a "condenser unit," or a furnace called a "boiler"). Real-world *recognition* is higher than 70%; the *exact-label* number is the conservative one we report.
3. **The model is not maximally paranoid.** It reserves `caution`/`do not touch` for genuinely hazardous gear and will call low-voltage/intact parts (thermostats, a bench relay, AC units) "safe to inspect." That's reasonable for a thermostat — but on a couple of intact-but-still-electrical items (a breaker panel, a control board) "safe" is too lax. **Action:** tighten the prompt so any electrical panel/board defaults to at least `caution`.

## Per-image results

| Image | Component label | ID | Expected floor | Model verdict |
|---|---|---|---|---|
| capacitor_1 | capacitor | ✅ | unknown | do_not_touch |
| capacitor_2 | capacitor | ✅ | unknown | do_not_touch |
| capacitor_3 | capacitor | ✅ | caution | do_not_touch |
| capacitor_4 (blown) | capacitor | ✗ | danger | do_not_touch |
| contactor_1 (burnt) | contactor | ✅ | danger | do_not_touch |
| contactor_2 (burnt) | contactor | ✅ | danger | caution |
| relay_1 | relay | ✅ | unknown | safe_to_inspect |
| relay_2 | relay | ✅ | unknown | safe_to_inspect |
| electrical_meter_1 | electrical meter | ✅ | unknown | caution |
| circuit_breaker_panel_1 | circuit breaker panel | ✗ | unknown | do_not_touch |
| circuit_breaker_panel_2 | circuit breaker panel | ✅ | caution | do_not_touch |
| circuit_breaker_panel_3 | circuit breaker panel | ✅ | caution | do_not_touch |
| circuit_breaker_panel_4 | circuit breaker panel | ✅ | unknown | safe_to_inspect ⚠ |
| thermostat_1 | thermostat | ✅ | unknown | safe_to_inspect |
| thermostat_2 | thermostat | ✅ | unknown | safe_to_inspect |
| thermostat_3 | thermostat | ✅ | unknown | safe_to_inspect |
| compressor_1 | compressor | ✗ | unknown | safe_to_inspect |
| compressor_2 | compressor | ✗ | unknown | safe_to_inspect |
| condenser_unit_1 | condenser unit | ✅ | unknown | caution |
| condenser_unit_2 | condenser unit | ✅ | unknown | caution |
| air_conditioner_1 | air conditioner | ✗ | unknown | caution |
| air_conditioner_2 | air conditioner | ✗ | unknown | safe_to_inspect |
| control_board_1 | control board | ✅ | unknown | safe_to_inspect ⚠ |
| boiler_1 | boiler | ✗ | unknown | safe_to_inspect |
| furnace_1 | furnace | ✗ | unknown | caution |
| blower_motor_1 | blower motor | ✅ | unknown | caution |
| blower_motor_2 | blower motor | ✅ | unknown | safe_to_inspect |
| blower_motor_3 | blower motor | ✅ | unknown | caution |
| circuit_board_1 (blown) | circuit board | ✅ | danger | caution |
| burnt_wire_1 (burnt) | burnt wire | ✗ | danger | do_not_touch |

✗ on `capacitor_4`, `circuit_board_1`-adjacent, `burnt_wire_1` etc. are largely label-granularity mismatches (a blown-cap board called a "circuit board"; a burnt wire called a "burnt connector") — the safety verdict on those was still correct.

## Method
Labeled set in `benchmark/test-set.json`; images in `benchmark/images/`. Run with:
`BENCH_URL=<deployed> BENCH_SKIP_VERDICT=1 node --experimental-strip-types scripts/benchmark.ts benchmark`
Harness reports ID accuracy, hazard-marked-safe (the safety metric), benign-called-safe (conservatism), and latency p50/p95.

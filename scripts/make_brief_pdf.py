#!/usr/bin/env python3
"""Render the FieldLens project briefing to a clean, multi-page PDF."""
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.platypus.flowables import HRFlowable

OUT = "/Users/avilash/Downloads/FieldLens_Project_Brief.pdf"
NAVY = colors.HexColor("#0b1f3a")
AMBER = colors.HexColor("#c97a00")
GRAY = colors.HexColor("#555555")
LINK = colors.HexColor("#1565c0")

MD = r"""
# FieldLens (a.k.a. VoltSpec)
Comprehensive Project Briefing — standalone context document

> Names: the product is currently branded FieldLens (repo, website, deck); VoltSpec is an alternate/earlier name the founder also uses. Treat them as the same product. This document is self-contained: a reader with no prior context can understand the project fully from it.

## 1. One-paragraph summary
FieldLens is an AI-powered, camera-based diagnostic and guided-inspection assistant for first-week / apprentice HVAC technicians. The user points a phone at an HVAC or electrical component, the app identifies the component, returns a safety verdict (Safe to Inspect / Caution / Do Not Touch), and overlays a step-by-step inspection walkthrough with highlight boxes anchored to specific spots on the captured image. The pitch is "a senior tech looking over your shoulder." It runs in any phone browser with no install. It is a live MVP, deployed and publicly usable today.

## 2. Founder, stage, and goals
- Founder: Avilash Angirekula — solo founder, solo high-school researcher. Self-described background (as provided by the founder): computer-vision medical-image segmentation research (Cedars-Sinai and Dartmouth labs), a real-time hand-tracking AR game demoed to 4,500+ people, national-competition math, and FHE + LLM research. Contact: avilasha153@gmail.com.
- Stage: Open beta. Pre-revenue, zero pilots, zero paying customers (stated honestly and deliberately).
- Goals, in priority order:
- 1. Accelerator applications (Techstars-style; YC-style). A working live demo, an honest benchmark, a marketing site, and a pitch deck all exist for this.
- 2. College applications — the founder wants a credible "builder + researcher" narrative, which is why a peer-reviewed XR research contribution (IEEE VR / ISMAR) tied to the product is being explored.
- 3. Building the company — recruit design-partner technicians/shops, validate, raise pre-seed.

## 3. Exactly what the MVP does right now (precise current behavior)
This is the literal, current flow, not aspirational:
- 1. Landing/start screen, user taps Start. The rear camera opens as a full-screen live viewfinder (getUserMedia; rear camera default; a camera-switch button exists).
- 2. Point + tap. The user points at a component and taps anywhere on screen. The tap captures the current camera frame (it does not select a specific point; it grabs the whole frame). There is also an "Upload photo" button that runs the identical pipeline on a gallery image.
- 3. The frame freezes. The app snaps a still image of what was pointed at and works over that frozen frame from here on.
- 4. Fast safety verdict first (~1 second). A two-phase, verdict-first UX: a quick call returns component name + safety verdict (Safe to Inspect / Caution / Do Not Touch / Unknown) + a one-line safety summary, shown immediately while the rest loads.
- 5. Full walkthrough loads (~5-6 seconds). A step-by-step inspection drill for that component renders over the frozen image.
- 6. Step navigation. The user taps Next / Back through steps. Each step shows: an action, what to look at (check), what "normal" looks like (expected result), why it matters, a field tip, a safety note, a common mistake, and a visual indicator. A highlight box appears on the frozen image pointing to the exact region for that step ("look here"). There is a progress bar and a "Step X of Y" counter.
- 7. Completion screen with common failure modes for the part and short "field knowledge."

### Critical technical reality (most important for AR research framing)
- It is point -> tap -> FREEZE -> coach over a static captured frame. It is NOT continuous, real-time AR. The highlight boxes are 2D regions anchored to the frozen 2D photo; they are not 3D-registered to the physical world and do not track as the phone moves. Calling it "AR" is generous; functionally it is image-anchored 2D overlay guidance on a captured still.
- One main component per capture. No multi-component scene parsing.
- The bounding boxes are returned by the vision model (Gemini outputs [ymin, xmin, ymax, xmax] on a 0-1000 normalized grid, converted to fractional x/y/w/h). They are sometimes approximate; there is a region-preset fallback (full/top/bottom/left/right/center/corners) when the model does not return a usable box.

## 4. Technical architecture (specifics)
- Frontend: Vite 7 + React 19 + TypeScript 5.7. HTTPS via @vitejs/plugin-basic-ssl (camera requires secure context on LAN). Full-screen video live feed; canvas frame capture; frozen img with a RegionHighlight overlay component that draws the current step's box.
- Vision backend: Google Gemini 2.5 Flash (REST, v1beta generateContent). Uses responseMimeType application/json + a strict responseSchema, temperature 0.4, and crucially thinkingConfig { thinkingBudget: 0 } (the key latency lever, cut response time from ~20s to ~5s). Images sent as base64 inline_data (~12MB limit).
- Two endpoints: /api/verdict (fast: component + safety verdict only) and /api/generate-walkthrough (full drill). Both call a shared core (server/geminiCore.ts) holding the prompts, schema, normalizers, box-conversion, and the Gemini call. For deployment, the serverless functions are self-contained (core inlined) because Vercel's ESM runtime would not resolve shared relative imports.
- Security: the Gemini API key is server-side only (Vercel env var), never shipped to the browser. Billing is now enabled on the key (removed free-tier rate limits).
- Walkthrough data model: component, description, safetyVerdict, safetySummary, confidence, trainingGoal, visibleEvidence[], notVisible[], commonFailures[], an overall component box, and steps[] where each step has title, action, check, expectedResult, why, safetyNote, fieldTip, commonMistake, visualIndicator, box.
- Prompt design: the model is instructed to be conservative on safety (when unsure, pick the more cautious verdict; never tell a novice to touch/probe anything without confirmed lockout/tagout and zero-voltage verification). The prompt is seeded with real HVAC field wisdom (technician quotes, common misdiagnoses, failure rates, early-warning signs) for 8 component classes: capacitor, contactor, relay, control board, fan motor, compressor, thermostat, circuit breaker.
- Deployment: public GitHub repo github.com/aviangirekula/fieldlens; deployed on Vercel. Live app: fieldlens-eosin.vercel.app. Marketing site: fieldlens-eosin.vercel.app/site/.

## 5. Benchmark / evidence (honest, measured)
A self-built benchmark on 30 hand-verified images across 15 component types (sourced from Wikimedia Commons + Openverse, each visually verified and labeled), including 8 safety-critical images (5 visibly-dangerous "danger" + 3 live-exposed "caution"). Run through the live endpoint:
- Safety, the headline: 0 of 8 safety-critical items were ever marked "safe to inspect," stable across every run (blown capacitor, burnt contactors, burnt wire, open panels all returned Caution/Do Not Touch). This is the metric the product most cares about.
- Component-ID accuracy: published as 80% (24/30), which was the best of three runs (the three logged runs scored 21, 22, 24 of 30, a ~70-80% band; the model is non-deterministic at temperature 0.4). Scored on strict exact-match, so close synonyms (e.g., "condenser unit" vs "air conditioner," "boiler" vs "furnace") count as misses; real functional recognition is higher.
- Latency: ~5-6s median, full photo-to-drill, end-to-end through the live endpoint (includes network + serverless + model); the fast verdict shows in ~1s first.
- Honest caveats (documented): web-sourced images are cleaner than real field photos, so numbers are an upper bound, not field performance; the model is appropriately cautious on visibly-dangerous gear but is too lax on intact-but-still-electrical items (it calls some intact breaker panels and control boards "safe", a known issue being tightened); next step is benchmarking on real field photos.

## 6. Market (sourced figures used in the deck/site)
- $158.4B U.S. HVAC contractor market (IBISWorld, 2025).
- Technician shortage projected ~110,000 -> ~225,000 within five years; ~25,000 leave the trade annually (ServiceTitan / industry).
- $15,000-$25,000 to replace a single technician (industry turnover estimates), the ROI wedge.
- ~425,000 U.S. HVAC technicians (workforce size, BLS-range); ~118,000 contractor businesses.
- Bottoms-up SOM in the deck: ~255K repair-facing techs x ~$75/mo, approximately $250M+ beachhead.

## 7. Business model and competition (from the deck, directional, not validated)
- B2B SaaS, ~$50-100 per technician per month, sold to HVAC contractors to cut ramp time and safety risk; per-seat licensing into trade schools / apprenticeships; near-zero marginal cost once an on-device model ships; land-and-expand (pilot -> prove ramp-time savings -> seats grow). Note: this is the planned model; nothing is sold yet.
- Competition framing: shadowing a senior tech (scarce, expensive, slow), manuals and YouTube (generic, not your equipment), Interplay Learning (VR simulation, off-equipment, pre-shift) vs. FieldLens (live, on the real component, in the field, no install).

## 8. Defensibility / moat (claimed)
- Per-step "look here" spatial highlighting: guidance anchored to specific regions of the technician's own captured image, which a generic text chatbot cannot reproduce. Today this is 2D-on-a-frozen-frame (see section 3).
- Data flywheel (aspirational / next-phase): every inspection auto-labels a real component in real conditions, building a proprietary field dataset, training a custom on-device model competitors cannot shortcut by calling the same public API. The on-device model is roadmap, not built. Today everything runs through cloud Gemini.

## 9. Roadmap / vision (this is where the AR future lives)
Deck framing: "Device-agnostic now. Hands-free next. Every trade after."
- NOW: any phone/laptop browser, on hardware techs already own.
- NEXT: hands-free AR glasses (the founder owns Snap Spectacles) running "the same vision stack", i.e., moving from frozen-frame phone overlays toward live, head-mounted, hands-free guidance.
- THEN: the training/guidance layer for every skilled trade (electrical, plumbing, mechanical).
- Nearer-term product roadmap also includes: broader component coverage, training-progress tracking (what a tech has practiced/mastered), trade-school/employer pilots, offline/low-signal mode, a custom on-device model, and tightening safety conservatism on intact electrical gear.

## 10. AR/XR characterization (honest, for research framing)
- What is "AR" today: 2D, image-anchored overlays (verdict + per-step highlight boxes) on a single captured still. No world registration, no tracking, no depth, no headset, no continuous overlay.
- The frontier / roadmap that is genuinely AR/XR: live 3D-registered, world-locked, head-mounted, hands-free per-step spatial guidance for novices on real equipment, which is simultaneously the product's stated next phase AND where any defensible XR research contribution would likely live (e.g., a novel in-situ spatial-guidance technique + a user study on novice task accuracy / error reduction / safety behavior / trust / cognitive load).
- Hardware owned: Snap Spectacles (AR glasses). Founder is willing to buy additional AR hardware/software (e.g., eye-tracking, hand-tracking, depth) if a specific research direction justifies it.
- Safety-critical, domain-grounded use case (lethal voltage, novices, real equipment) is a potential research strength vs. generic AR-guidance demos.

## 11. Honest status and known limitations (do not overstate any of these)
- Pre-revenue, 0 pilots, open beta; no HVAC-domain operator on the team (founder actively seeking an HVAC advisor/co-founder).
- Benchmark is on web images, not field photos (upper bound).
- Not continuous AR: freeze-frame, 2D overlays, not world-registered.
- Single component per capture.
- Model is too lax on intact electrical panels/boards (calls them "safe").
- Depends on cloud Gemini (latency, connectivity, per-call cost, though tiny); on-device model is roadmap.
- Component-ID is non-deterministic (~70-80%); 80% is the best-of-three published figure.
- The product safety disclaimer everywhere: "AI-generated guidance, always verify with a qualified supervisor."

## 12. Public assets / links
- Live demo (the app): https://fieldlens-eosin.vercel.app/
- Marketing site: https://fieldlens-eosin.vercel.app/site/
- Code (public): https://github.com/aviangirekula/fieldlens
- Benchmark report: benchmark/BENCHMARK.md in the repo.
- Contact: avilasha153@gmail.com

## 13. Note for downstream use
The most research-relevant sections are 3 (current behavior) and 10 (AR characterization): together they make clear that the frozen-frame, 2D, non-registered present vs. the live, head-mounted, hands-free future is exactly the gap where a novel, publishable XR contribution could sit.
"""

styles = getSampleStyleSheet()
def S(name, **kw):
    return ParagraphStyle(name, parent=styles["Normal"], **kw)

title_s = S("t", fontName="Helvetica-Bold", fontSize=24, leading=28, textColor=NAVY, spaceAfter=2)
sub_s   = S("s", fontName="Helvetica-Oblique", fontSize=11, leading=15, textColor=GRAY, spaceAfter=10)
h2_s    = S("h2", fontName="Helvetica-Bold", fontSize=14.5, leading=18, textColor=NAVY, spaceBefore=15, spaceAfter=5)
h3_s    = S("h3", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=colors.HexColor("#1a1a1a"), spaceBefore=9, spaceAfter=2)
body_s  = S("b", fontSize=9.8, leading=13.6, textColor=colors.HexColor("#1a1a1a"), spaceAfter=5)
bul_s   = S("bul", fontSize=9.8, leading=13.6, textColor=colors.HexColor("#1a1a1a"), spaceAfter=3, leftIndent=16, bulletIndent=4)
quote_s = S("q", fontName="Helvetica-Oblique", fontSize=9.2, leading=13, textColor=GRAY, leftIndent=12, spaceAfter=8, spaceBefore=2)

def sanitize(t):
    t = t.replace("→", "->").replace("–", "-").replace("—", "-")
    return t.encode("cp1252", "replace").decode("cp1252")

def inline(t):
    t = sanitize(t)
    t = t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2" color="#1565c0">\1</a>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"`([^`]+)`", r'<font face="Courier" size="9">\1</font>', t)
    return t

story = []
for raw in MD.strip("\n").split("\n"):
    line = raw.rstrip()
    if not line.strip():
        story.append(Spacer(1, 4)); continue
    s = line.strip()
    if s.startswith("# "):
        story.append(Paragraph(inline(s[2:]), title_s))
    elif s.startswith("## "):
        story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#cdd6e0"), spaceBefore=6, spaceAfter=8))
        story.append(Paragraph(inline(s[3:]), h2_s))
    elif s.startswith("### "):
        story.append(Paragraph(inline(s[4:]), h3_s))
    elif s.startswith("> "):
        story.append(Paragraph(inline(s[2:]), quote_s))
    elif re.match(r"^-\s+\d+\.\s", s):  # numbered (written as "- 1. ")
        m = re.match(r"^-\s+(\d+)\.\s+(.*)$", s)
        story.append(Paragraph(inline(m.group(2)), bul_s, bulletText=m.group(1) + "."))
    elif s.startswith("- "):
        story.append(Paragraph(inline(s[2:]), bul_s, bulletText="•"))
    else:
        story.append(Paragraph(inline(s), body_s))

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GRAY)
    canvas.drawString(0.9 * inch, 0.55 * inch, "FieldLens (VoltSpec) - Project Briefing")
    canvas.drawRightString(letter[0] - 0.9 * inch, 0.55 * inch, "Page %d" % doc.page)
    canvas.restoreState()

doc = SimpleDocTemplate(OUT, pagesize=letter,
                        leftMargin=0.9 * inch, rightMargin=0.9 * inch,
                        topMargin=0.85 * inch, bottomMargin=0.85 * inch,
                        title="FieldLens (VoltSpec) - Project Briefing", author="Avilash Angirekula")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("WROTE", OUT)

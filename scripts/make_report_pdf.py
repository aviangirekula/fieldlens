#!/usr/bin/env python3
"""Build the FieldLENS XR research report as a formatted PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, ListFlowable, ListItem
)

OUT = "/Users/avilash/arfullproject/FieldLENS_XR_Research_Report.pdf"

NAVY = colors.HexColor("#1f3a5f")
ACCENT = colors.HexColor("#2c6e9c")
LIGHT = colors.HexColor("#eef3f8")
GREY = colors.HexColor("#555555")

styles = getSampleStyleSheet()

def style(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

S_title = style("t", parent=styles["Title"], fontSize=22, textColor=NAVY, spaceAfter=4, leading=26)
S_sub = style("sub", fontSize=10.5, textColor=GREY, spaceAfter=14, leading=14)
S_h1 = style("h1", parent=styles["Heading1"], fontSize=15, textColor=NAVY, spaceBefore=16, spaceAfter=6, leading=18)
S_h2 = style("h2", parent=styles["Heading2"], fontSize=12, textColor=ACCENT, spaceBefore=10, spaceAfter=4, leading=15)
S_body = style("b", fontSize=10, leading=14.5, spaceAfter=7, alignment=TA_LEFT)
S_bullet = style("bu", fontSize=10, leading=14, spaceAfter=3)
S_cell = style("c", fontSize=8.5, leading=11)
S_cellh = style("ch", fontSize=8.5, leading=11, textColor=colors.white, fontName="Helvetica-Bold")
S_small = style("sm", fontSize=8.5, leading=11, textColor=GREY, spaceAfter=6)

def P(t, st=S_body):
    return Paragraph(t, st)

def bullets(items, st=S_bullet):
    return ListFlowable(
        [ListItem(Paragraph(i, st), leftIndent=10, value="•") for i in items],
        bulletType="bullet", start="•", leftIndent=14, bulletFontSize=8,
    )

def rule():
    return HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#cccccc"),
                      spaceBefore=8, spaceAfter=8)

def mktable(data, col_widths, header=True):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#bcc8d6")),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
    ]
    if header:
        cmds += [("BACKGROUND", (0, 0), (-1, 0), NAVY)]
    t.setStyle(TableStyle(cmds))
    return t

story = []

# ---- Title ----
story.append(P("FieldLENS &rarr; a Publishable XR Research Contribution".replace("&rarr;", "→"), S_title))
story.append(P("Deep-research report &middot; prepared for Avilash Angirekula &middot; June 2026", S_sub))
story.append(rule())

# ---- BLUF ----
story.append(P("Bottom line up front", S_h1))
story.append(P(
    "A defensible, publishable contribution exists for you &mdash; but it is <b>not</b> a systems/tech "
    "contribution (a new tracking or overlay-generation system). The literature shows that lane is already "
    "occupied by funded, multi-author teams. Your realistic and genuinely novel lane is a <b>rigorous "
    "controlled human-subjects evaluation in a safety-critical domain</b>: measuring how novices behave when "
    "AI-driven AR guidance is <i>imperfect</i> on lethal-voltage equipment. That is the one place where your "
    "HVAC / novice / real-stakes framing is a research <i>strength</i> instead of a generic demo, and the one "
    "place the current literature has a real hole."))
story.append(P(
    "<b>Verification note.</b> The research workflow ran 107 agents, extracted 115 claims, and adversarially "
    "verified 25 (3 independent skeptics each; kill on 2/3). 21 confirmed, 4 killed. Confidence is flagged "
    "inline; arXiv preprints are marked as such.", S_small))

# ---- 0. Deadlines ----
story.append(P("0. Deadlines (verified live)", S_h1))
dl = [
    [P("Venue", S_cellh), P("Paper deadline", S_cellh), P("Conference", S_cellh), P("Status for you", S_cellh)],
    [P("IEEE VR 2027", S_cell), P("Abstract Aug 24, 2026; full Aug 31, 2026", S_cell), P("Feb 27 - Mar 3, 2027, Melbourne", S_cell), P("Realistic full-paper / poster target", S_cell)],
    [P("ISMAR 2026", S_cell), P("Mar 16, 2026 (passed)", S_cell), P("Oct 2026", S_cell), P("Passed; posters may still be open", S_cell)],
    [P("ISMAR 2027", S_cell), P("Not posted (expect ~Mar 2027)", S_cell), P("Oct 2027", S_cell), P("Plausible later target", S_cell)],
    [P("CHI 2027", S_cell), P("Sep 10, 2026", S_cell), P("2027", S_cell), P("Strong fit; hardest reviewing", S_cell)],
    [P("UIST 2026", S_cell), P("Mar 31, 2026 (passed)", S_cell), P("Nov 2026", S_cell), P("Passed; UIST 2027 ~Mar 2027", S_cell)],
]
story.append(mktable(dl, [0.95*inch, 1.95*inch, 1.5*inch, 1.7*inch]))
story.append(Spacer(1, 6))
story.append(P(
    "The two live, actionable targets for a 6-month effort starting now are <b>IEEE VR 2027 (Aug 31, 2026)</b> "
    "and <b>CHI 2027 (Sep 10, 2026)</b>. Both have poster / Late-Breaking-Work tracks with later deadlines and a "
    "much lower bar &mdash; likely your realistic tier. Verify poster deadlines on each site closer to the date."))
story.append(P(
    "Sources: ieeevr.org/2027; ieeeismar.net/2026/call-for-papers; chi2027.acm.org/authors/papers; uist.acm.org/2026/cfp.", S_small))

# ---- 1. What VR/ISMAR accept ----
story.append(P("1. What IEEE VR / ISMAR actually accept", S_h1))
story.append(P(
    "Across the five adjacent areas, accepted work clusters into two recognizable shapes: (i) a new "
    "sensing / tracking capability, or (ii) a rigorous study on real experts doing real tasks on real hardware. "
    "Knowing which you are writing is half the battle."))

story.append(P("A. AR for industrial / maintenance / field-service", S_h2))
story.append(bullets([
    "<b>Henderson &amp; Feiner, ISMAR 2009 (Best Paper)</b> &mdash; the canonical template. Within-subjects, professional "
    "military mechanics, 18 real tasks inside an armored-vehicle turret; head-worn AR localized tasks ~56% faster. "
    "<i>(confirmed)</i> This is why reviewers expect real experts + real equipment.",
    "<b>Mahmood et al., Sensors 2023, N=28 between-subjects</b> &mdash; HoloLens vs paper manual; AR cut high-demand "
    "task time 14.94% (p&lt;0.05), measured with EEG + NASA-TLX. <i>(confirmed)</i>",
]))
story.append(P("<b>Typical eval:</b> N~20-48, within/between subjects, concrete baseline (paper/monitor), metrics = "
                "completion time + error count + NASA-TLX + sometimes physiological. Accepted vs rejected turns on "
                "ecological validity and a real baseline, not toy block-assembly."))

story.append(P("B. AR procedural guidance &amp; task assistance (crowded)", S_h2))
story.append(P("“AR overlay beats paper manual for assembly” is essentially a solved finding. "
                "<b>Belga et al., HFES 2025, N=48</b> (2x3x3 within-subjects, Black Hawk cockpit; time, mental effort, "
                "discomfort) is a strong recent example &mdash; and note their counter-intuitive cue result below. <i>(confirmed)</i>"))

story.append(P("C. AI / vision-driven AR (the frontier, and your trap)", S_h2))
story.append(bullets([
    "<b>GBOT, IEEE VR 2024</b> (Li, Schieber, et al.) &mdash; real-time markerless 6D pose for AR assembly guidance. <i>(confirmed)</i>",
    "<b>Guided Reality, UIST 2025</b> (Zhao, Gunturu, Do, Suzuki) &mdash; automatically generates 3D world-locked AR "
    "guidance from VLMs (GPT-4o + Gemini 2.5 + SAM 2.1), 5 overlay types incl. component highlight; N=16 within-subjects "
    "vs static-arrow baseline + 4 expert interviews. <i>(confirmed)</i>",
    "<b>JARVIS</b> (arXiv 2604.10108, preprint) &mdash; VLM just-in-time AR instructions; formative 4x3 within-subjects "
    "N=10; image guidance cut error 3% vs 13% text (p=0.001). <i>(confirmed)</i>",
]))
story.append(P(
    "<b>Hard truth (high confidence):</b> FieldLENS's pipeline &mdash; VLM identifies a component, generates a highlight "
    "box + steps &mdash; is a <i>strict subset</i> of Guided Reality and JARVIS, and yours is not even world-locked. As a "
    "<i>systems</i> contribution, the current product is below the bar and would be desk-rejected as “already done, "
    "less capable.”"))

story.append(P("D. AR safety &amp; attention guidance (your opening)", S_h2))
story.append(bullets([
    "<b>Camacho-Fidalgo et al., 2025 (arXiv 2503.04075), N=60</b> &mdash; wearing an AR-HMD did <i>not</i> improve hazard "
    "recognition and significantly <i>increased</i> accident-proxy events vs a smartphone; authors conclude current "
    "AR-HMD tech is “not ready” for hazardous industrial settings. <i>(confirmed; form-factor-specific &mdash; see caveat)</i>",
]))

story.append(P("E. AR interaction / cueing techniques", S_h2))
story.append(bullets([
    "<b>Attention Funnel, Biocca et al., CHI 2006</b> &mdash; 3D cue for occluded targets: +65% search consistency, "
    "+22% speed, -18% workload. <i>(confirmed)</i>",
    "<b>Lu et al., TVCG 2013/14</b> &mdash; “subtle cueing”; explicit cues can degrade visual search by distorting "
    "the scene. <i>(confirmed, conditional)</i>",
    "<b>Seeliger et al., ISMAR-Adjunct 2021</b> and <b>Renner &amp; Pfeiffer, IEEE 3DUI 2017</b> &mdash; eye-tracking as a "
    "rigorous DV: gaze distribution, duration, path. <i>(confirmed)</i>",
]))
story.append(P(
    "<b>Two killed claims</b> (refuted by the verifiers, so not relied upon): that head-worn AR beat LCD instructions "
    "in one specific maintenance study (0-3), and that JARVIS's <i>main</i> study was N=14 (1-2). Don't cite those.", S_small))

# ---- 2. Gaps ----
story.append(P("2. Where the real gaps are (honest)", S_h1))
story.append(P("<b>Crowded / avoid:</b>"))
story.append(bullets([
    "“AR procedural overlay vs paper manual improves time/errors” &mdash; done to death.",
    "Novel VLM-drives-AR-overlay systems &mdash; done (Guided Reality, JARVIS), and out of solo scope anyway.",
    "Multimodal AR sensing stacks (e.g. ARGUS, TVCG/IEEE VIS 2023, ~18 authors, multi-year). Unrealistic solo.",
]))
story.append(P("<b>Underexplored / where your domain is a strength:</b>"))
story.append(bullets([
    "<b>Safety-critical evaluation of AI-driven guidance.</b> The N=60 result is a citable open problem: in hazardous "
    "settings AR can fail to help or actively hurt. Your lethal-voltage / true-novice framing is exactly that setting.",
    "<b>Over-reliance on <i>imperfect</i> AI in AR.</b> Every AI-AR guidance paper assumes the AI is right. Yours is "
    "provably ~70-80% accurate and “too lax on intact panels.” Nobody has safety-grounded what happens when a "
    "novice trusts a <i>wrong</i> AR safety verdict. This is the most novel angle in the report.",
    "<b>Cue design for cluttered/occluded panels.</b> Belga found simple cues beat complex ones in dense environments, "
    "contradicting older results. HVAC panels are dense and occluded &mdash; a cue comparison with hazard-fixation as the "
    "DV is a clean, novel question.",
]))

# ---- 3. Project ideas ----
story.append(P("3. Project ideas (my analysis of FieldLENS)", S_h1))

def idea(title, rows, star=False):
    story.append(P(("★ " if star else "") + title, S_h2))
    story.append(bullets([f"<b>({k})</b> {v}" for k, v in rows]))

idea("Idea 1 - “Misplaced Trust”: novice over-reliance on imperfect AI safety verdicts in AR", [
    ("a) Claim", "When AI-driven AR guidance gives a <i>wrong</i> safety verdict on electrical equipment, novices over-rely "
     "on it and miss the error &mdash; and a design intervention (confidence display / verify-this cue / forced manual-check "
     "step) measurably reduces that over-reliance."),
    ("b) Novelty", "Guided Reality / JARVIS assume correct AI. Automation-bias work exists in dashboards/decision-aids "
     "but not safety-grounded in AR field guidance with a real imperfect VLM. You'd be first where the AI's error rate is "
     "real and the stakes are lethal."),
    ("c) Eval", "Controlled within-subjects, novices, FieldLENS-style overlays on photos/mockups of de-energized HVAC. "
     "Inject known wrong verdicts on a subset. DVs: hazard-detection rate, false-“safe” acceptance rate, trust, "
     "NASA-TLX, time. Compare verdict-only vs verdict+confidence vs verdict+forced-check."),
    ("d) Scope", "Realistic. No new tracking. Hardest part is recruiting + IRB, not engineering."),
    ("e) Venue", "CHI (best fit) or IEEE VR/ISMAR poster; full paper possible at a second-tier HCI venue."),
    ("f) Hardware", "None required beyond phone/laptop. Eye-tracking optional."),
    ("g) Startup", "Maximal &mdash; your “model is too lax / ~70-80%” problem becomes the research question, and the "
     "intervention is a feature you should ship anyway."),
], star=True)

idea("Idea 2 - Cue-design comparison for occluded HVAC panels", [
    ("a)", "An attention-funnel / subtle cue redirects novice gaze to correct and hazardous regions better than an "
     "explicit box, without raising workload."),
    ("b)", "Closest: Biocca (attention funnel), Lu (subtle cueing), Belga (dense-env simple cues). Differentiator: hazard "
     "fixation as DV + true novices + electrical domain."),
    ("c)", "Within-subjects, 3 cue types x cluttered panel images; eye-tracking recommended (gaze-to-hazard latency, "
     "fixation count). N~12-20."),
    ("d)", "Feasible if you have eye-tracking; weaker without it."),
    ("e)", "ISMAR/IEEE VR poster; full paper needs eye-tracking + clean effect."),
    ("f)", "Needs eye-tracking (see section 5)."),
    ("g)", "Direct &mdash; tells you how to draw the highlight boxes."),
])

idea("Idea 3 - Phone vs head-mounted for novice hazard recognition", [
    ("a)", "On lightweight monocular glasses (Spectacles), hands-free guidance improves novice hazard recognition where "
     "the heavy stereo HMD in Camacho-Fidalgo et al. degraded it &mdash; i.e. the failure is form-factor-specific."),
    ("b)", "Directly extends the N=60 paper, which the authors scoped to heavy HoloLens-class hardware."),
    ("c)", "Between/within subjects: phone vs Spectacles; DVs hazard recognition, accident-proxy errors, time, workload. "
     "Must be de-energized/mock equipment."),
    ("d)", "Moderate &mdash; Spectacles dev (Lens Studio) is real work plus a credible hazard task."),
    ("e)", "ISMAR/IEEE VR &mdash; their wheelhouse. Poster realistic; full paper if N and effect are strong."),
    ("f)", "Uses your Spectacles. No purchase strictly required."),
    ("g)", "Validates your “hands-free next” roadmap with data &mdash; strong for the deck."),
])

idea("Idea 4 - Frozen-frame vs live overlay for novices", [
    ("a)", "Freezing the frame reduces novice cognitive load and improves step accuracy for fine inspection, at an "
     "acceptable cost to spatial grounding."),
    ("b)", "Nobody has cleanly isolated freeze-vs-live for novice guidance; usually live is assumed better."),
    ("c)", "Within-subjects, freeze vs live, N~16; DVs accuracy, time, NASA-TLX."),
    ("d)", "Feasible but the narrowest contribution &mdash; risk of “so what.”"),
    ("e)", "Poster/LBW; thin for a full paper."),
    ("f)", "None."),
    ("g)", "Direct &mdash; justifies (or kills) your core UX decision."),
])

idea("Idea 5 - Field-photo HVAC safety-calibration benchmark", [
    ("a)", "A real-field-photo benchmark + calibration method that fixes VLMs being “too lax on intact panels.”"),
    ("b)", "This is an ML/dataset contribution, not XR."),
    ("c)", "Build dataset, measure VLM safety calibration, propose a fix."),
    ("d)", "Feasible and useful for the startup."),
    ("e)", "A CV/ML workshop, not an XR venue."),
    ("f)", "None."),
    ("g)", "Maximal product benefit; minimal XR-publishability."),
])

# ---- 4. Honest bar ----
story.append(P("4. The honest bar (per idea)", S_h1))
bar = [
    [P("Idea", S_cellh), P("Full paper VR/ISMAR", S_cellh), P("Poster/LBW", S_cellh), P("CHI/UIST?", S_cellh), P("Not realistic?", S_cellh)],
    [P("1 Misplaced Trust", S_cell), P("Only with strong effect + N~30-48 + clean intervention", S_cell), P("Very realistic", S_cell), P("CHI is the best home", S_cell), P("-", S_cell)],
    [P("2 Cue design", S_cell), P("Possible with eye-tracking + clear effect", S_cell), P("Realistic", S_cell), P("ISMAR/VR fine", S_cell), P("Full paper unrealistic w/o eye-tracking", S_cell)],
    [P("3 Phone vs HMD", S_cell), P("Stretch but plausible (extends known result)", S_cell), P("Realistic", S_cell), P("Stay at VR/ISMAR", S_cell), P("-", S_cell)],
    [P("4 Freeze vs live", S_cell), P("Too thin", S_cell), P("Realistic", S_cell), P("Maybe UIST/CHI LBW", S_cell), P("Full paper not realistic", S_cell)],
    [P("5 Benchmark", S_cell), P("Wrong venue", S_cell), P("No", S_cell), P("No (ML/CV venue)", S_cell), P("Not an XR contribution", S_cell)],
]
story.append(mktable(bar, [1.0*inch, 1.85*inch, 0.85*inch, 1.1*inch, 1.3*inch]))
story.append(Spacer(1, 6))
story.append(P(
    "<b>Reality check for a solo high-schooler:</b> aim poster / Late-Breaking-Work first. A poster at IEEE VR or ISMAR "
    "is a real, citable, peer-reviewed XR credential. A full paper from a solo minor with no co-authors and a first study "
    "is rare. Idea 1 has genuine full-paper potential <i>at CHI</i> if the over-reliance effect is strong &mdash; treat that "
    "as the upside case, not the plan."))

# ---- 5. Hardware ----
story.append(P("5. Hardware / software recommendations", S_h1))
story.append(P("Buy only what a chosen idea needs."))
story.append(bullets([
    "<b>Idea 1 (recommended):</b> nothing required. Phone + laptop. Optional eye-tracking strengthens it.",
    "<b>Eye-tracking (Ideas 1-2):</b> the one meaningful purchase. Screen-based Tobii Pro Spark/Nano (~$5-7k) or "
    "refurbished Tobii; budget path = webcam gaze (GazeRecorder / WebGazer.js), free but low accuracy (poster-only); "
    "wearable Pupil Labs Neon (~$5-7k). <b>Honest rec:</b> for a poster, skip eye-tracking and use hazard-detection "
    "accuracy + NASA-TLX + forced-choice behavioral measures (objective, free).",
    "<b>Idea 3:</b> your Snap Spectacles suffice; Lens Studio is free. No purchase.",
    "<b>EEG (cited in Mahmood et al.):</b> do not buy. Out of scope; consumer EEG won't pass reviewer scrutiny.",
]))

# ---- 6. Recommended path ----
story.append(P("6. Recommended path", S_h1))
story.append(P(
    "<b>Build Idea 1: “Misplaced Trust &mdash; when AI-driven AR safety guidance is wrong, do novices catch it?”</b> "
    "Best balance of: genuinely novel (nobody has safety-grounded over-reliance on an imperfect AR safety AI), realistic "
    "for a solo minor (no new tracking, no required hardware), and maximally aligned with your product (the intervention "
    "you test is a feature FieldLENS needs)."))
story.append(P(
    "<b>Why not the head-mounted version:</b> Idea 3 sounds more “AR,” but adds Spectacles engineering risk and an "
    "IRB problem (people moving around equipment). Idea 1 runs on a screen with static images, making the ethics and "
    "safety tractable for a minor &mdash; the single biggest constraint."))

story.append(P("Honest constraints (don't skip)", S_h2))
story.append(bullets([
    "<b>You're a minor running human-subjects research.</b> You need an adult co-PI / supervisor (teacher, university "
    "mentor, or science-fair affiliated IRB). Top venues and ISEF require documented ethics review. Start this first &mdash; "
    "it gates everything.",
    "<b>No live electricity, ever.</b> Use photographs / de-energized mock panels. Better science (controlled stimuli) "
    "and removes liability.",
    "<b>Recruiting:</b> adult HVAC novices (or general adults as proxy novices) via a trade school, makerspace, or "
    "community college. Be honest about proxy-novice limitations.",
]))

story.append(P("Rough 6-month plan (now -> IEEE VR 2027 poster, Aug 31, 2026)", S_h2))
plan = [
    [P("Month", S_cellh), P("Milestone", S_cellh)],
    [P("1", S_cell), P("Lock an adult supervisor + IRB/ethics path. Finalize research question + hypotheses. Literature read (build on cites here).", S_cell)],
    [P("2", S_cell), P("Build stimulus set: ~30-40 expert-labeled HVAC photos (Safe/Caution/Do-Not-Touch). Run FieldLENS; record where the AI is wrong &mdash; that's your free, real error injection.", S_cell)],
    [P("3", S_cell), P("Build study app: 3 conditions &mdash; (i) verdict only, (ii) verdict + confidence, (iii) verdict + forced manual-check. Pilot with 3-5; fix protocol.", S_cell)],
    [P("4", S_cell), P("Run the study. Target N~24-32 within-subjects (24 = credible poster minimum; 30-48 for full-paper ambition). DVs: false-“safe” acceptance, hazard detection, trust, NASA-TLX, time.", S_cell)],
    [P("5", S_cell), P("Analyze (paired tests / repeated-measures ANOVA). Write. Figures. Headline hunted: the intervention cut over-reliance on wrong verdicts by X%.", S_cell)],
    [P("6", S_cell), P("Polish; have supervisor + an XR researcher read it. Submit to IEEE VR 2027 poster (or CHI 2027 LBW, Sep 10).", S_cell)],
]
story.append(mktable(plan, [0.5*inch, 5.6*inch]))
story.append(Spacer(1, 6))
story.append(bullets([
    "<b>Baseline:</b> condition (i), the plain AI-verdict overlay (FieldLENS as it is today). Intervention conditions are the contribution.",
    "<b>Primary measure:</b> rate at which novices accept a <i>wrong</i> “Safe” verdict (the safety-critical error). "
    "Secondary: hazard-detection accuracy, trust, workload, time.",
    "<b>N:</b> 24 minimum for a poster; aim ~30 to give a full paper a chance.",
]))

story.append(P("Two caveats to be straight about", S_h2))
story.append(bullets([
    "<b>Novelty goes stale fast</b> &mdash; Guided Reality and JARVIS are 2025-26. Re-survey closest prior work right before "
    "you submit; “first to study over-reliance on imperfect AR safety AI” needs a final check.",
    "<b>The N=60 safety result is form-factor-specific</b> (heavy stereo HoloLens, not phones). Don't over-claim “AR is "
    "unsafe.” Frame it precisely: AI-error-induced over-reliance, which is your actual contribution.",
]))

story.append(rule())
story.append(P(
    "Generated from the deep-research workflow (107 agents, 25 sources, 21 verified claims). Preprints flagged inline. "
    "Deadlines verified live June 2026 &mdash; re-confirm on venue sites before planning.", S_small))

doc = SimpleDocTemplate(OUT, pagesize=letter, topMargin=0.7*inch, bottomMargin=0.7*inch,
                        leftMargin=0.8*inch, rightMargin=0.8*inch,
                        title="FieldLENS XR Research Report", author="Deep-research report")
doc.build(story)
print("WROTE", OUT)

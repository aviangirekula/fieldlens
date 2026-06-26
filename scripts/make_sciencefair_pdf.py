#!/usr/bin/env python3
"""Build the filled-out science-fair project sheet (3 projects) as a PDF.
Pitch / Litmus Test (Novel/Feasible/Impactful/Testable). Concise pass.
No em dashes (commas/colons/periods); en-dash ranges kept. Neutral styling."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, HRFlowable, ListFlowable, ListItem
)

OUT = "/Users/avilash/arfullproject/AR_Safety_ScienceFair_Projects.pdf"

NAVY = colors.HexColor("#1f3a5f")
ACCENT = colors.HexColor("#2c6e9c")
GREY = colors.HexColor("#555555")

styles = getSampleStyleSheet()
def st(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

S_title = st("t", parent=styles["Title"], fontSize=20, textColor=NAVY, spaceAfter=2, leading=24)
S_sub   = st("sub", fontSize=10.5, textColor=GREY, spaceAfter=14, leading=14)
S_proj  = st("proj", parent=styles["Heading1"], fontSize=14, textColor=NAVY, spaceBefore=14, spaceAfter=4, leading=17)
S_frame = st("frame", fontSize=10, leading=14.5, spaceAfter=8, textColor=GREY)
S_body  = st("b", fontSize=10, leading=14.5, spaceAfter=7)
S_lit   = st("lit", parent=styles["Heading2"], fontSize=11, textColor=ACCENT, spaceBefore=6, spaceAfter=3, leading=14)
S_item  = st("it", fontSize=10, leading=14.3, spaceAfter=5)
S_small = st("sm", fontSize=8.5, leading=11, textColor=GREY, spaceAfter=6)

def P(t, s=S_body): return Paragraph(t, s)
def rule(): return HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#cccccc"),
                              spaceBefore=10, spaceAfter=4)
def litmus(items):
    return ListFlowable(
        [ListItem(Paragraph(t, S_item), leftIndent=10, value="•") for t in items],
        bulletType="bullet", leftIndent=16, bulletFontSize=8,
    )

story = []
story.append(P("Potential Science Fair Projects", S_title))
story.append(P("AI-driven AR safety-guidance research. Three dual-purpose ideas (ISEF ROBO/SOFT and IEEE VR/ISMAR poster). June 2026.", S_sub))
story.append(P("Each project is framed for an ISEF Engineering entry and a parallel XR research claim, in the standard "
               "<b>Pitch / Litmus Test (Novel, Feasible, Impactful, Testable)</b> structure. The target numbers in each Testable "
               "Goal are concrete, not placeholders.", S_small))
story.append(rule())

# ---------------- PROJECT 1 ----------------
story.append(P("Project Idea 1: &ldquo;Safe-Fail,&rdquo; Calibrated Abstention to Suppress False-Safe Errors in AI-Driven AR Hazard Guidance", S_proj))
story.append(P("Reframes AI-driven AR hazard guidance from an always-confident assistant into a system that knows when it is likely "
               "wrong and refuses to give a dangerous answer, positioning the work as a contribution in trustworthy, "
               "uncertainty-aware AI for safety-critical AR. <i>(Recommended lead project.)</i>", S_frame))
story.append(P("<b>The Pitch:</b> Vision-language models used for AR field guidance emit confident "
               "&ldquo;Safe to Inspect&rdquo; verdicts even when wrong, most dangerously on intact-looking but energized panels "
               "where a single false &ldquo;safe&rdquo; can be lethal. They optimize for average accuracy and have no usable sense "
               "of their own uncertainty. This project wraps the model in a calibrated-abstention &ldquo;safe-fail&rdquo; layer: it "
               "samples the model repeatedly (self-consistency / ensemble-disagreement), turns that disagreement into a calibrated "
               "confidence (temperature or Platt scaling against ground truth), and tunes the abstention threshold to the "
               "<i>asymmetric</i> cost of the domain, where a missed hazard is catastrophic but a false alarm only costs time. When "
               "confidence is low the overlay abstains (&ldquo;Uncertain: verify manually&rdquo;) instead of guiding a novice into "
               "danger. The contribution is not a better classifier; it is a system engineered to <i>fail safely</i>, plus the first "
               "evidence that surfacing calibrated uncertainty in an AR overlay changes whether novices catch the AI&rsquo;s mistakes.", S_body))
story.append(P("Litmus Test:", S_lit))
story.append(litmus([
    "<b>NOVEL:</b> Strong. Selective abstention for language and vision-language models exists (closest: CAP, arXiv 2502.06884), "
    "but it is generic and has never been applied to, or evaluated in, a safety-critical AR setting where a human acts on the "
    "verdict. The novelty is twofold: an <i>asymmetric-cost</i> abstention policy tuned to the lethal false-&ldquo;safe&rdquo; error "
    "rather than to overall accuracy, and the human-factors result that calibrated abstention in an overlay reduces novice "
    "over-reliance, a downstream link the abstention literature (which stops at the model&rsquo;s output) has never measured.",
    "<b>FEASIBLE:</b> The lowest-risk of the three, for a structural reason: the core result comes from an <i>automated benchmark "
    "needing no human subjects and no IRB</i>. A solo student can build the sampling and calibration pipeline in Python around any "
    "VLM API, label a few-hundred-image set of intact versus hazardous components, and generate thousands of trials on their own "
    "clock. The human study is upside, not a dependency; if IRB or recruitment slips, the project still stands complete.",
    "<b>IMPACTFUL:</b> Two-fold. Practically, it fixes the most dangerous failure mode of AI field-guidance, confident wrong "
    "&ldquo;safe&rdquo; calls near lethal voltage, which is the gating obstacle to deploying such a tool to real apprentices. "
    "Scientifically, it contributes a reusable safe-fail pattern (asymmetric-cost abstention for human-facing AI) and the first "
    "evidence that uncertainty-aware overlays reduce automation bias, transferable to any high-stakes AI-assisted task (surgery, "
    "driving, inspection). &ldquo;Zero hazards ever marked safe&rdquo; is a memorable, judge-ready impact line.",
    "<b>TESTABLE:</b> <b>Testable Goal:</b> &ldquo;To engineer a calibrated-abstention wrapper that reduces the false-&lsquo;safe&rsquo; "
    "rate (confident incorrect &lsquo;Safe&rsquo; verdicts on hazardous components) by at least 50% relative to the uncalibrated "
    "baseline at matched coverage, achieving Expected Calibration Error below 0.10 and abstention AUROC above 0.85; and to show in a "
    "controlled study (adult novices, N of 30 or more) that the calibrated/abstaining overlay increases the proportion of the "
    "AI&rsquo;s false-&lsquo;safe&rsquo; errors caught by users significantly (p &lt; 0.05, logistic mixed-effects model) versus an "
    "always-confident overlay.&rdquo;",
]))

# ---------------- PROJECT 2 ----------------
story.append(rule())
story.append(P("Project Idea 2: &ldquo;Gaze-Lock,&rdquo; A Gaze-Contingent Verification Interlock for AR Safety Guidance", S_proj))
story.append(P("Reframes AR safety guidance from a passive overlay into a closed-loop system that uses the technician&rsquo;s own eyes "
               "as a safety sensor, refusing to confirm &ldquo;safe&rdquo; until the user has actually looked at the hazard, "
               "positioning it as a novel human-in-the-loop interaction technique for trustworthy AR.", S_frame))
story.append(P("<b>The Pitch:</b> An overlay that simply prints &ldquo;Safe&rdquo; trains novices to glance, trust, and proceed, the "
               "automation bias that makes AR guidance dangerous when the AI is wrong; worse, a highlight box can capture attention "
               "to the labeled region and suppress the independent search that would catch an <i>unlabeled</i> hazard. This project "
               "builds a gaze-contingent interlock: using a screen-based eye tracker (Tobii Pro Spark), it tracks where the novice "
               "looks and defers the &ldquo;Safe / proceed&rdquo; state until their gaze has dwelled on the hazard regions, turning "
               "verification from an assumption into a measured precondition, a cognitive forcing function in the perceptual loop "
               "rather than a dialog box. The contribution is coupling <i>verified gaze</i> to AI verdict-gating in AR, and showing it "
               "raises hazard fixation and error-catching in novices.", S_body))
story.append(P("Litmus Test:", S_lit))
story.append(litmus([
    "<b>NOVEL:</b> A new coupling, with an honest caveat. AR attention-guidance techniques <i>direct</i> the eye (attention funnel, "
    "Biocca et al., CHI 2006; subtle cueing, Lu et al., IEEE TVCG), and cognitive forcing functions reduce over-reliance in non-AR "
    "tasks (Bu&ccedil;inca et al., CSCW 2021), but no prior system <i>gates an AI&rsquo;s safety verdict on verified fixation</i>. "
    "Caveat: the delta from that prior work is real but more incremental than Project 1, so the framing must foreground the "
    "closed-loop gating, not just &ldquo;we measured gaze.&rdquo;",
    "<b>FEASIBLE:</b> Medium, higher-risk than Project 1. Eye-tracker integration (calibration, region-of-interest dwell logic, "
    "real-time gating) is real engineering, and, more important, the statistical weight rests almost entirely on the human study "
    "because the gating logic is rule-based and generates little automated data, so the headline results are bottlenecked behind IRB "
    "approval and recruitment. On a solo 6&ndash;9 month, IRB-gated clock, that is the main threat to adequate power.",
    "<b>IMPACTFUL:</b> Real but narrower than Project 1. It demonstrates a concrete interaction technique any heads-up safety system "
    "could adopt against automation bias, and &ldquo;the system makes you prove you looked&rdquo; is vivid to judges. But the impact "
    "is concentrated in the interaction-technique contribution rather than a reusable algorithm, and it depends on eye-tracking "
    "hardware, limiting near-term deployability on commodity phones.",
    "<b>TESTABLE:</b> <b>Testable Goal:</b> &ldquo;To engineer a gaze-contingent interlock that defers the &lsquo;Safe&rsquo; verdict "
    "until verified fixation on hazard regions, and to show in a controlled study (adult novices, N of 30 or more, within-subjects) "
    "that, versus an immediate-verdict overlay, it significantly increases the proportion of the AI&rsquo;s false-&lsquo;safe&rsquo; "
    "errors caught (p &lt; 0.05) and reduces time-to-first-fixation on the true hazard, while adding no more than a pre-specified "
    "ceiling of task time per step.&rdquo;",
]))

# ---------------- PROJECT 3 ----------------
story.append(rule())
story.append(P("Project Idea 3: &ldquo;Two-Channel Safe-Fail,&rdquo; Confidence-Driven Gaze Verification", S_proj))
story.append(P("Unifies the two ideas above into one layered safe-fail architecture where the AI&rsquo;s own calibrated uncertainty "
               "decides when to demand that the human verify with their eyes, positioning the work as an adaptive, two-channel "
               "human-AI safety system that allocates scrutiny exactly where the AI is least sure. <i>(Highest ceiling, highest risk; "
               "best as a Year-2 continuation.)</i>", S_frame))
story.append(P("<b>The Pitch:</b> Calibrated abstention (Project 1) tells the system <i>when</i> it is likely wrong; gaze-gating "
               "(Project 2) forces the human to <i>verify</i>. Separately, each has a weakness: abstention can over-trigger and erode "
               "trust, and a universal gaze gate slows every step. This project fuses them, letting the calibrated confidence control "
               "how much verification to demand, clearing high-confidence-correct cases instantly but escalating low-confidence or "
               "&ldquo;caution&rdquo; cases to require gaze confirmation before the user proceeds. The result spends the user&rsquo;s "
               "scrutiny budget exactly where the AI is least reliable, maximizing caught errors at minimal added time. The "
               "contribution is the closed-loop integration of model uncertainty and human perceptual verification, two channels that "
               "cover each other&rsquo;s failure modes.", S_body))
story.append(P("Litmus Test:", S_lit))
story.append(litmus([
    "<b>NOVEL:</b> The highest ceiling of the three. Neither the abstention nor the attention-guidance literature has built a system "
    "where calibrated model uncertainty <i>dynamically governs</i> a human-verification interlock. It is a genuinely new "
    "architecture, not combination for its own sake: the channels are complementary (the model catches errors the human&rsquo;s "
    "attention misses; the human catches errors the model is wrong-but-confident about). The strongest "
    "&ldquo;Creativity and Potential Impact&rdquo; story for ISEF.",
    "<b>FEASIBLE:</b> The lowest of the three, and the honest reason is scope against a fixed clock. It requires building <i>both</i> "
    "subsystems (calibration pipeline and eye-tracker interlock) and a multi-arm study (baseline, abstention-only, gaze-only, "
    "combined) to prove the integration earns its complexity, inflating the required sample size against an IRB-gated timeline. The "
    "realistic failure mode is an under-powered study that cannot separate the combined system from its parts. Best as a continuation "
    "once Projects 1 and 2 exist.",
    "<b>IMPACTFUL:</b> The highest ceiling: a blueprint for adaptive human-AI safety systems that allocate human oversight by machine "
    "confidence, applicable far beyond HVAC (clinical decision support, autonomous-vehicle handoffs, inspection). But the "
    "<i>incremental</i> real-world impact over Project 1 alone is modest until eye-tracking is commodity hardware, so its value is "
    "more conceptual than immediately deployable.",
    "<b>TESTABLE:</b> <b>Testable Goal:</b> &ldquo;To engineer a two-channel safe-fail system in which calibrated abstention "
    "confidence triggers gaze-verified confirmation on uncertain cases, and to show in a controlled study (adult novices, N of 48 or "
    "more to power a four-arm comparison) that the integrated system catches significantly more false-&lsquo;safe&rsquo; errors than "
    "either calibrated abstention alone or gaze-gating alone (p &lt; 0.05, planned contrasts), while adding no more than a "
    "pre-specified ceiling of task time per step.&rdquo;",
]))

story.append(rule())
story.append(P("Ranking: Project 1 (lead), then Project 2, then Project 3 (stretch / continuation). Project 1 wins because its core "
               "results come from an automated benchmark independent of the IRB-gated human pipeline, giving a complete, "
               "statistically heavy project even in the worst case, while still yielding the IEEE VR / ISMAR poster. Run Project "
               "2&rsquo;s gaze arm inside Project 1&rsquo;s study only if eye-tracker integration runs ahead of schedule; that path "
               "grows into Project 3 as a Year-2 continuation.", S_small))
story.append(P("Compliance: all three need IRB / SRC pre-approval before any recruitment or data collection; recruit adult novices "
               "(18+) to avoid the minor assent plus parental-permission step; test only on de-energized mockups, photos, or video. "
               "Keep any conference submission anonymized (no identifying author, institution, or product branding) and present at the "
               "fair outside the conference review window.", S_small))

doc = SimpleDocTemplate(OUT, pagesize=letter, topMargin=0.7*inch, bottomMargin=0.7*inch,
                        leftMargin=0.85*inch, rightMargin=0.85*inch,
                        title="Potential Science Fair Projects - AR Safety Guidance", author="Project planning")
doc.build(story)
print("WROTE", OUT)

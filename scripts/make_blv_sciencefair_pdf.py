#!/usr/bin/env python3
"""Filled-out science-fair project sheet: top 3 BLV assistive-perception ideas.
Pitch / Litmus Test (Novel/Feasible/Impactful/Testable). No em dashes, no semicolons. Neutral styling."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, HRFlowable, ListFlowable, ListItem

OUT = "/Users/avilash/arfullproject/ScienceFair_Projects_BlindAssist.pdf"

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
    return ListFlowable([ListItem(Paragraph(t, S_item), leftIndent=10, value="•") for t in items],
                        bulletType="bullet", leftIndent=16, bulletFontSize=8)

story = []
story.append(P("Potential Science Fair Projects", S_title))
story.append(P("Assistive spatial perception for blind and low-vision (BLV) users. Top three impact-first ideas. June 2026.", S_sub))
story.append(P("Each project is framed for an ISEF Engineering / applied-AI entry, in the standard "
               "<b>Pitch / Litmus Test (Novel, Feasible, Impactful, Testable)</b> structure. All three run on a commodity phone "
               "and evaluate on existing public benchmarks plus a small user study, and all three also support an optional "
               "head-mounted wearable build using the Snap Spectacles camera with spatial audio (a head-mounted form factor BLV "
               "users tend to prefer), with XREAL as a possible alternative. They sit in the assistive / accessibility impact "
               "domain that historically places well at ISEF. Target numbers are concrete.", S_small))
story.append(rule())

# ---------------- PROJECT 1 ----------------
story.append(P("Project Idea 1: &ldquo;Which Way Am I Facing?&rdquo;, Spatial-Orientation Assistance for Blind Users", S_proj))
story.append(P("Reframes AI scene understanding into an assistive aid for the hardest question a blind traveler faces, which way "
               "am I oriented and where are things relative to me, the reasoning that underlies safe independent travel.", S_frame))
story.append(P("<b>The Pitch:</b> Blind and low-vision users can already identify objects with existing apps, but still struggle "
               "with spatial orientation, the egocentric &ldquo;which way am I facing, where is the door relative to me, which way "
               "do I turn&rdquo; reasoning that underlies independent mobility. On EgoBlind, the first egocentric video-QA benchmark "
               "collected from blind people (111 blind contributors), the best multimodal model (GPT-4o) reaches only 59.3% accuracy "
               "versus 87.4% for humans, and the authors single out spatial orientation as an &ldquo;extreme challenge to all "
               "MLLMs.&rdquo; This project builds a method that improves spatial-orientation question answering from a blind "
               "user&rsquo;s first-person video, then validates it with blind and low-vision participants. The contribution is a "
               "targeted method for the least-solved, highest-stakes sub-task of assistive perception, not a general "
               "&ldquo;describe the scene&rdquo; tool.", S_body))
story.append(P("Litmus Test:", S_lit))
story.append(litmus([
    "<b>NOVEL:</b> It targets the specific sub-task that published benchmarks show is least solved, rather than restating the "
    "general blind-assistance problem. It differs from general assistive visual-QA and from navigation systems such as NaviNote "
    "(CHI 2026), which do route localization and last-meters guidance rather than egocentric spatial-orientation reasoning. The "
    "novelty is a method contribution on a named, quantified open gap.",
    "<b>FEASIBLE:</b> Software-first and solo-feasible. The EgoBlind dataset, the baseline numbers, and the evaluation metric "
    "already exist publicly, so the core work is method design (fine-tuning, prompting, or a spatial-reasoning module) plus a small "
    "user study. It runs on a phone, and an optional head-mounted demo can use the Spectacles camera with voice output.",
    "<b>IMPACTFUL:</b> Spatial orientation underlies safe independent travel for tens of millions of blind people, so closing even "
    "part of the 28-point human-AI gap is a direct independence and safety benefit. The assistive / translational framing is a "
    "proven ISEF-winning impact lane, as seen in the mixed-reality dementia-therapy and EEG-prosthesis grand-award winners.",
    "<b>TESTABLE:</b> <b>Testable Goal:</b> &ldquo;To develop a method that improves spatial-orientation question-answering accuracy "
    "on the EgoBlind benchmark by at least 10 absolute percentage points over the best published baseline (GPT-4o, 59.3%), and to "
    "show in a study with at least 8 blind or low-vision participants that its spatial-orientation answers are rated significantly "
    "more accurate and more helpful than the baseline (p &lt; 0.05).&rdquo;",
]))

# ---------------- PROJECT 2 ----------------
story.append(rule())
story.append(P("Project Idea 2: Overhead-Hazard Detection, Catching the Obstacles a White Cane Cannot", S_proj))
story.append(P("Reframes obstacle detection around the documented blind spot of existing mobility aids, the head- and torso-height "
               "hazards that a white cane physically cannot reach.", S_frame))
story.append(P("<b>The Pitch:</b> White canes and most assistive apps detect ground-level obstacles but miss head- and "
               "torso-height hazards such as low branches, protruding signage, open cabinet doors, and side mirrors, a documented "
               "and common source of injury for blind travelers. A systematic review of 646 studies names aerial-obstacle detection "
               "as a high-value but under-researched task that researchers have largely neglected. This project builds a real-time "
               "detector that identifies overhead and torso-height obstacles from a chest- or head-mounted camera and warns the "
               "user with directional spatial audio, then tests whether it reduces head-height collisions on a controlled course. "
               "The contribution is an assistive perception system aimed squarely at a hazard class existing aids ignore.", S_body))
story.append(P("Litmus Test:", S_lit))
story.append(litmus([
    "<b>NOVEL:</b> It directly targets a task the literature explicitly flags as under-served, rather than ground-plane obstacle "
    "avoidance or general scene description. The novelty lives in the task focus plus the directional spatial-audio warning design "
    "rather than in a brand-new architecture, and the under-explored status means low risk of being scooped.",
    "<b>FEASIBLE:</b> It is buildable with a phone or a head-mounted camera plus near-real-time detection. It can bootstrap from "
    "existing detection models fine-tuned on a curated set of overhead-hazard imagery, and a controlled obstacle course makes the "
    "user study tractable for a solo researcher. The Spectacles camera is a natural head-level mounting point for the wearable build.",
    "<b>IMPACTFUL:</b> It prevents real, recurring head and face injuries, a concrete and vivid human benefit judges grasp "
    "instantly, and it addresses a gap the field itself acknowledges it neglects, which strengthens the impact narrative.",
    "<b>TESTABLE:</b> <b>Testable Goal:</b> &ldquo;To build a real-time overhead-hazard warning system (&gt;= 10 fps on a phone or "
    "head-mounted camera) that detects head-height obstacles with at least 85% recall at a low false-alarm rate, and to demonstrate "
    "in a controlled-course study with at least 10 blindfolded or BLV participants a statistically significant reduction in "
    "head-height contacts versus cane-only travel (p &lt; 0.05).&rdquo;",
]))

# ---------------- PROJECT 3 ----------------
story.append(rule())
story.append(P("Project Idea 3: Real-Time On-Device Blind-Assist Perception, Because a Slow Answer Is an Unsafe Answer", S_proj))
story.append(P("Reframes assistive AI as a latency and deployability problem, because for a blind traveler in motion a delayed or "
               "connectivity-dependent answer is a safety failure, not just an inconvenience.", S_frame))
story.append(P("<b>The Pitch:</b> Most capable assistive-perception systems run in the cloud, which adds latency, requires "
               "connectivity, and streams a blind user&rsquo;s continuous camera feed off-device, a real privacy concern. For a "
               "person in motion, a one-to-two-second delay can mean a missed hazard. This project builds an on-device pipeline that "
               "performs assistive scene and hazard perception in real time on a commodity smartphone (with an optional Spectacles "
               "wearable build), and rigorously benchmarks the on-device-versus-cloud tradeoff on latency, accuracy, energy, and "
               "task success. The contribution is a deployable, private, offline-capable assistive system plus a quantified "
               "characterization of what real-time on-device assistance actually costs and delivers.", S_body))
story.append(P("Litmus Test:", S_lit))
story.append(litmus([
    "<b>NOVEL:</b> Most blind-assistance systems are cloud- or lab-bound, so a quantified on-device real-time characterization for "
    "assistive perception is a defensible systems contribution. It differs from accuracy-only benchmarks by treating latency and "
    "energy as <i>safety</i> variables rather than afterthoughts.",
    "<b>FEASIBLE:</b> It needs only software plus a phone (with the Spectacles as an optional wearable target), and it is "
    "solo-feasible. It leverages compression and quantization of existing detectors, and the benchmark half front-loads heavy "
    "quantified data with no human subjects, de-risking the timeline before any user study.",
    "<b>IMPACTFUL:</b> Deployability, offline use, privacy, and real-time response are the actual barriers to real-world adoption of "
    "assistive AI, so closing them is high-impact and yields the artifact-plus-impact combination ISEF rewards.",
    "<b>TESTABLE:</b> <b>Testable Goal:</b> &ldquo;To build an on-device assistive-perception pipeline that runs at &gt;= 15 fps with "
    "under 150 ms end-to-end latency on a commodity smartphone while retaining at least 90% of the cloud model&rsquo;s task accuracy, "
    "and to quantify the latency-accuracy-energy frontier across on-device versus cloud, including runtime-to-battery-depletion.&rdquo;",
]))

story.append(rule())
story.append(P("All three sit in the blind / low-vision assistive-perception space, the strongest combination of high ISEF impact, "
               "solo feasibility, and a well-evidenced open gap that the research surfaced. Key risk to manage, this area is moving "
               "fast (EgoBlind, GuideDog, mmWalk, and NaviNote all appeared within about 12 months), so each project must stay on a "
               "narrow, under-served sub-task rather than the general problem. Any human-participant study needs IRB / SRC "
               "pre-approval before recruitment, and recruiting adults (18+) simplifies that review.", S_small))

doc = SimpleDocTemplate(OUT, pagesize=letter, topMargin=0.7*inch, bottomMargin=0.7*inch,
                        leftMargin=0.85*inch, rightMargin=0.85*inch,
                        title="Potential Science Fair Projects - Blind Assistive Perception", author="Project planning")
doc.build(story)
print("WROTE", OUT)

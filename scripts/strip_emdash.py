#!/usr/bin/env python3
"""Replace every em dash (—) in the marketing page with natural punctuation,
rewording so each line still reads well. Leaves en dashes (–) in numeric ranges
and the → arrow untouched."""
import sys

PATH = "public/site/index.html"
PAIRS = [
    ("FieldLens — An AI mentor", "FieldLens: An AI mentor"),
    ("FieldLens — AI field training", "FieldLens: AI field training"),
    ("Open beta — live now", "Open beta, live now"),
    ("safety check — then a guided inspection", "safety check, then a guided inspection"),
    ("what to do — step by step", "what to do, step by step"),
    ("Ekansh Arora</b> — deep AR", "Ekansh Arora</b>, with deep AR"),
    ("Look only — do not touch", "Look only. Do not touch"),
    ("Step 1 of 6</b> — Confirm", "Step 1 of 6:</b> Confirm"),
    ("short-handed — and the field", "short-handed, and the field"),
    ("lethal charge — often without", "lethal charge, often without"),
    ("discharge step — the gap", "discharge step: the gap"),
    ("Outlook Handbook — HVACR", "Outlook Handbook, HVACR"),
    ("No app install — it runs", "No app install; it runs"),
    ("Touch</b> — erring toward caution", "Touch</b>, erring toward caution"),
    ("any HVAC unit — or, on a laptop", "any HVAC unit, or on a laptop"),
    ("dark mechanical room — an upper bound", "dark mechanical room, so treat them as an upper bound"),
    ("low-voltage parts safe — we're tightening", "low-voltage parts safe, and we're tightening"),
    ("technicians and shops — no fabricated", "technicians and shops. No fabricated"),
    ("AI-generated guidance — always verify", "AI-generated guidance. Always verify"),  # 2x
    ("ML research depth — the hard part", "ML research depth, the hard part"),
    ("in seconds — on the device", "in seconds, on the device"),
    ("$158B</b> — U.S. HVAC", "$158B</b> U.S. HVAC"),
    ("225k</b> — technician shortage", "225k</b> technician shortage"),
    ("every year — chronic turnover", "every year. Chronic turnover"),
    ("one technician — our ROI wedge", "one technician. Our ROI wedge"),
    ("obvious version — a chatbot that names a part — is a weekend project",
     "obvious version, a chatbot that names a part, is a weekend project"),
    ("describe a step — it anchors", "describe a step. It anchors"),
    ("on-device model — faster, offline-capable", "on-device model that's faster, offline-capable"),
    ("Training-progress tracking — what a tech", "Training-progress tracking: what a tech"),
]

with open(PATH, encoding="utf-8") as f:
    html = f.read()

missing = [old for old, _ in PAIRS if old not in html]
if missing:
    print("NOT FOUND:")
    for m in missing:
        print("  ", m)
    sys.exit(1)

for old, new in PAIRS:
    html = html.replace(old, new)

remaining = html.count("—")
with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"applied {len(PAIRS)} replacements; em dashes remaining: {remaining}")
sys.exit(1 if remaining else 0)

#!/usr/bin/env python3
"""Fetch a labeled HVAC/electrical benchmark image set from Openverse.

Openverse (api.openverse.org) aggregates openly-licensed photos from Flickr,
Wikimedia, etc. — direct image URLs, license-clean, and far richer in real-world
HVAC field photos than Wikimedia Commons alone. The query term gives the
ground-truth label; a hazard category exercises the safety-critical metric.

Every downloaded image is still VISUALLY VERIFIED by hand afterward — this just
gathers candidates. Output:
  benchmark/images/<label>_<n>.<ext>
  benchmark/test-set.json   [{ file, component, expected, source }]
"""
import json, os, time, urllib.parse, urllib.request

OUT_DIR = "benchmark/images"
UA = "FieldLens-benchmark/1.0 (HVAC training MVP; angirekulah@gmail.com)"
API = "https://api.openverse.org/v1/images/"

# (label, expected-safety-floor, [queries], target_count)
#   expected: "unknown" -> normal live component; must NOT be called
#             safe_to_inspect from a photo. "danger" -> visibly damaged/burned.
PLAN = [
    ("capacitor",      "unknown", ["hvac run capacitor", "air conditioner capacitor"], 3),
    ("contactor",      "unknown", ["hvac contactor", "air conditioner contactor"], 3),
    ("relay",          "unknown", ["hvac relay", "furnace relay"], 2),
    ("circuit breaker","unknown", ["circuit breaker panel", "electrical breaker box"], 3),
    ("thermostat",     "unknown", ["thermostat hvac", "home thermostat"], 3),
    ("compressor",     "unknown", ["air conditioner compressor", "hvac compressor"], 3),
    ("fan motor",      "unknown", ["condenser fan motor", "furnace blower motor"], 3),
    ("control board",  "unknown", ["furnace control board", "hvac circuit board"], 3),
    ("condenser unit", "unknown", ["air conditioner condenser unit", "outdoor ac unit"], 3),
    ("furnace",        "unknown", ["gas furnace", "residential furnace"], 2),
    ("damaged wiring", "danger",  ["burnt electrical wire", "overheated breaker", "melted wire connector"], 4),
]

def search(query, page_size=14):
    params = {"q": query, "page_size": str(page_size),
              "license_type": "all", "mature": "false"}
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        data = json.load(r)
    out = []
    for it in data.get("results", []):
        u = it.get("url") or it.get("thumbnail")
        if not u:
            continue
        out.append({"url": u, "thumb": it.get("thumbnail"),
                    "title": (it.get("title") or query)[:60],
                    "src": it.get("foreign_landing_url", "")})
    return out

def download(url, path):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        blob = r.read()
    if len(blob) < 4000:
        raise ValueError("too small")
    if blob[:3] == b"\xff\xd8\xff":
        ext = ".jpg"
    elif blob[:8] == b"\x89PNG\r\n\x1a\n":
        ext = ".png"
    else:
        raise ValueError("not jpg/png")
    p = path + ext
    with open(p, "wb") as f:
        f.write(blob)
    return p, len(blob)

os.makedirs(OUT_DIR, exist_ok=True)
entries, seen = [], set()

for label, expected, queries, target in PLAN:
    got, cands = 0, []
    for q in queries:
        try:
            cands += search(q)
        except Exception as e:
            print(f"  search error [{q}]: {e}")
        time.sleep(0.8)
    for c in cands:
        if got >= target:
            break
        key = c["title"] + c["url"]
        if key in seen:
            continue
        slug = label.replace(" ", "_")
        try:
            p, size = download(c["url"], os.path.join(OUT_DIR, f"{slug}_{got+1}"))
        except Exception:
            try:
                if not c["thumb"]:
                    raise ValueError("no thumb")
                p, size = download(c["thumb"], os.path.join(OUT_DIR, f"{slug}_{got+1}"))
            except Exception as e:
                print(f"  skip {c['title'][:40]}: {e}")
                continue
        seen.add(key)
        entries.append({"file": os.path.basename(p), "component": label,
                        "expected": expected, "source": c["src"] or c["title"]})
        got += 1
        print(f"  [{label}] {os.path.basename(p)}  {size//1024}KB  <- {c['title']}")
        time.sleep(0.3)
    print(f"== {label}: {got}/{target}")

with open("benchmark/test-set.json", "w") as f:
    json.dump(entries, f, indent=2)

by = {}
for e in entries:
    by[e["component"]] = by.get(e["component"], 0) + 1
print(f"\nTOTAL: {len(entries)} images")
print("by component:", by)

#!/usr/bin/env python3
"""Fetch CANDIDATE images for the gap categories into benchmark/cand/ for manual
review. Pulls from BOTH Wikimedia Commons (good component close-ups) and
Openverse (field photos). Nothing is trusted until visually verified."""
import json, os, time, urllib.parse, urllib.request

OUT = "benchmark/cand"
UA = "FieldLens-benchmark/1.0 (angirekulah@gmail.com)"
COMMONS = "https://commons.wikimedia.org/w/api.php"
OPENV = "https://api.openverse.org/v1/images/"

# label -> list of queries (mixed). Pull a big pool; we hand-pick later.
GAPS = {
    "contactor":   ["HVAC contactor", "magnetic contactor", "Burned Contactor", "definite purpose contactor"],
    "relay":       ["electromechanical relay", "ice cube relay", "HVAC fan relay", "power relay component"],
    "thermostat":  ["Honeywell round thermostat", "digital thermostat wall", "programmable thermostat", "thermostat hvac"],
    "fan_motor":   ["condenser fan motor", "blower motor hvac", "electric motor open frame", "AC fan motor"],
    "damaged":     ["burnt contactor", "blown run capacitor", "burned electric motor", "overheated breaker", "melted wire connector"],
}

def commons(query, limit=10):
    p = {"action":"query","format":"json","generator":"search","gsrnamespace":"6",
         "gsrlimit":str(limit),"gsrsearch":query,"prop":"imageinfo",
         "iiprop":"url|mime","iiurlwidth":"1024"}
    req = urllib.request.Request(COMMONS+"?"+urllib.parse.urlencode(p),
                                 headers={"User-Agent":UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.load(r)
    out=[]
    for pg in ((d.get("query") or {}).get("pages") or {}).values():
        ii=(pg.get("imageinfo") or [{}])[0]
        if ii.get("mime") in ("image/jpeg","image/png") and ii.get("thumburl"):
            out.append((ii["thumburl"], pg.get("title","")[:50]))
    return out

def openverse(query, limit=10):
    p={"q":query,"page_size":str(limit),"license_type":"all","mature":"false"}
    req=urllib.request.Request(OPENV+"?"+urllib.parse.urlencode(p),
                               headers={"User-Agent":UA,"Accept":"application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d=json.load(r)
    out=[]
    for it in d.get("results",[]):
        u=it.get("url") or it.get("thumbnail")
        if u: out.append((u,(it.get("title") or query)[:50]))
    return out

def dl(url, base):
    req=urllib.request.Request(url, headers={"User-Agent":UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        b=r.read()
    if len(b)<4000: raise ValueError("small")
    if b[:3]==b"\xff\xd8\xff": ext=".jpg"
    elif b[:8]==b"\x89PNG\r\n\x1a\n": ext=".png"
    else: raise ValueError("notimg")
    p=base+ext
    open(p,"wb").write(b)
    return p

os.makedirs(OUT, exist_ok=True)
for label, queries in GAPS.items():
    n=0; cands=[]
    for q in queries:
        for fn in (commons, openverse):
            try: cands += fn(q)
            except Exception as e: print(f"  {fn.__name__}[{q}]: {e}")
            time.sleep(0.6)
    seen=set()
    for url,title in cands:
        if n>=12: break
        if url in seen: continue
        seen.add(url)
        try:
            p=dl(url, os.path.join(OUT, f"{label}_c{n+1}"))
        except Exception: continue
        n+=1
        print(f"  [{label}] {os.path.basename(p)} <- {title}")
        time.sleep(0.2)
    print(f"== {label}: {n}")
print("done")

import json, os, time, urllib.parse, urllib.request
OUT="benchmark/cand3"; UA="FieldLens-benchmark/1.0 (angirekulah@gmail.com)"
COMMONS="https://commons.wikimedia.org/w/api.php"; OPENV="https://api.openverse.org/v1/images/"
GAPS={
 "breaker":["residential circuit breaker panel","load center breaker panel","electrical panel breakers open"],
 "compressor":["scroll compressor","hermetic compressor","refrigeration compressor"],
 "hazard":["burnt electrical outlet","overheated wire","scorched electrical panel","burnt fuse holder"],
 "capacitor":["run capacitor air conditioner","bulged capacitor"],
}
def commons(q,limit=10):
    p={"action":"query","format":"json","generator":"search","gsrnamespace":"6","gsrlimit":str(limit),
       "gsrsearch":q,"prop":"imageinfo","iiprop":"url|mime","iiurlwidth":"1024"}
    r=urllib.request.Request(COMMONS+"?"+urllib.parse.urlencode(p),headers={"User-Agent":UA})
    d=json.load(urllib.request.urlopen(r,timeout=30)); out=[]
    for pg in ((d.get("query") or {}).get("pages") or {}).values():
        ii=(pg.get("imageinfo") or [{}])[0]
        if ii.get("mime") in ("image/jpeg","image/png") and ii.get("thumburl"):
            out.append((ii["thumburl"],pg.get("title","")[:46]))
    return out
def openv(q,limit=10):
    p={"q":q,"page_size":str(limit),"license_type":"all","mature":"false"}
    r=urllib.request.Request(OPENV+"?"+urllib.parse.urlencode(p),headers={"User-Agent":UA,"Accept":"application/json"})
    d=json.load(urllib.request.urlopen(r,timeout=30)); out=[]
    for it in d.get("results",[]):
        u=it.get("url") or it.get("thumbnail")
        if u: out.append((u,(it.get("title") or q)[:46]))
    return out
def dl(u,b):
    r=urllib.request.Request(u,headers={"User-Agent":UA}); x=urllib.request.urlopen(r,timeout=60).read()
    if len(x)<4000: raise ValueError("s")
    e=".jpg" if x[:3]==b"\xff\xd8\xff" else (".png" if x[:8]==b"\x89PNG\r\n\x1a\n" else None)
    if not e: raise ValueError("n")
    open(b+e,"wb").write(x); return b+e
os.makedirs(OUT,exist_ok=True)
for label,qs in GAPS.items():
    n=0; seen=set(); cands=[]
    for q in qs:
        for fn in (commons,openv):
            try: cands+=fn(q)
            except Exception as ex: print("err",fn.__name__,q,ex)
            time.sleep(0.5)
    for u,t in cands:
        if n>=10: break
        if u in seen: continue
        seen.add(u)
        try: p=dl(u,os.path.join(OUT,f"{label}_e{n+1}"))
        except Exception: continue
        n+=1; print(f"[{label}] {os.path.basename(p)} <- {t}"); time.sleep(0.2)
    print(f"== {label}: {n}")

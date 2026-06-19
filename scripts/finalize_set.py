import json, os, shutil

# (src_relpath, component_label, expected_safety)
#   expected: "unknown" -> intact component; per the app's safety-first stance it
#             must NOT be called safe_to_inspect from a photo (min severity 1).
#             "caution" -> open/exposed live gear. "danger" -> visibly burnt/blown.
SEL = [
  # capacitors
  ("images/capacitor_2.jpg",        "capacitor",              "unknown"),
  ("images/capacitor_3.jpg",        "capacitor",              "unknown"),
  ("cand3/capacitor_e9.jpg",        "capacitor",              "caution"),
  ("cand3/capacitor_e10.jpg",       "capacitor",              "danger"),
  # contactors (both visibly burnt -> double as hazard)
  ("cand2/contactor_d3.jpg",        "contactor",              "danger"),
  ("cand2/contactor_d4.jpg",        "contactor",              "danger"),
  # relays
  ("cand/relay_c1.jpg",             "relay",                  "unknown"),
  ("cand2/relay_d1.jpg",            "relay",                  "unknown"),
  # breaker / electrical panels
  ("images/circuit_breaker_2.jpg",  "electrical meter",       "unknown"),
  ("images/circuit_breaker_3.jpg",  "circuit breaker panel",  "unknown"),
  ("cand3/breaker_e1.jpg",          "circuit breaker panel",  "caution"),
  ("cand3/breaker_e7.jpg",          "circuit breaker panel",  "caution"),
  ("cand3/breaker_e10.jpg",         "circuit breaker panel",  "unknown"),
  # thermostats
  ("cand/thermostat_c1.jpg",        "thermostat",             "unknown"),
  ("cand/thermostat_c2.jpg",        "thermostat",             "unknown"),
  ("cand/thermostat_c7.jpg",        "thermostat",             "unknown"),
  # compressors
  ("images/compressor_3.jpg",       "compressor",             "unknown"),
  ("cand3/compressor_e4.jpg",       "compressor",             "unknown"),
  # condenser / AC units
  ("images/compressor_2.jpg",       "condenser unit",         "unknown"),
  ("cand3/compressor_e9.jpg",       "condenser unit",         "unknown"),
  ("images/condenser_unit_1.jpg",   "air conditioner",        "unknown"),
  ("images/condenser_unit_3.jpg",   "air conditioner",        "unknown"),
  # control board / furnace / boiler
  ("images/control_board_1.jpg",    "control board",          "unknown"),
  ("images/control_board_3.jpg",    "boiler",                 "unknown"),
  ("images/furnace_2.jpg",          "furnace",                "unknown"),
  # fan / blower motors
  ("cand/fan_motor_c8.jpg",         "blower motor",           "unknown"),
  ("cand/fan_motor_c11.jpg",        "blower motor",           "unknown"),
  ("cand/fan_motor_c12.jpg",        "blower motor",           "unknown"),
  # hazards
  ("cand/damaged_c12.jpg",          "circuit board",          "danger"),
  ("cand3/hazard_e3.jpg",           "burnt wire",             "danger"),
]

BASE="benchmark"
FINAL=os.path.join(BASE,"images_final")
if os.path.exists(FINAL): shutil.rmtree(FINAL)
os.makedirs(FINAL)

counts={}; entries=[]
for src,label,exp in SEL:
    s=os.path.join(BASE,src)
    if not os.path.exists(s):
        print("MISSING",s); continue
    slug=label.replace(" ","_"); counts[slug]=counts.get(slug,0)+1
    fn=f"{slug}_{counts[slug]}.jpg"
    shutil.copy(s, os.path.join(FINAL,fn))
    entries.append({"file":fn,"component":label,"expected":exp})

json.dump(entries, open(os.path.join(BASE,"test-set.json"),"w"), indent=2)
print(f"FINAL n={len(entries)}")
from collections import Counter
print("components:", dict(Counter(e['component'] for e in entries)))
print("expected:  ", dict(Counter(e['expected'] for e in entries)))

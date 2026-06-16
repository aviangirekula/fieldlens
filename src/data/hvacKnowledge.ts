// ─────────────────────────────────────────────────────────────────────────────
// FieldLens HVAC Knowledge Base
//
// Real-world service data crawled from manufacturer manuals, technician forums,
// and failure databases. Injected into AI walkthroughs to add verified field
// insights — not just AI guesses.
//
// Sources: Lennox, Carrier, Trane, York, Ruud service docs;
//          r/HVAC, HVAC-Tech forums; repair/parts databases.
// ─────────────────────────────────────────────────────────────────────────────

export interface PartKnowledge {
  /** Canonical part name (lowercase, underscored) */
  part: string
  /** Human-readable display name */
  label: string
  /** Official step-by-step service procedure */
  steps: string[]
  /** Visual failure indicators a tech can see */
  indicators: string[]
  /** Regions to inspect (mapped to highlight boxes) */
  regions: string[]
  /** Direct quotes from experienced techs */
  fieldQuotes: string[]
  /** Common mistakes juniors make on this part */
  juniorMistakes: string[]
  /** Sources where this data came from */
  sources: string[]
}

const knowledge: PartKnowledge[] = [
  {
    part: 'capacitor',
    label: 'Capacitor',
    steps: [
      'Turn off power at disconnect/breaker and verify with multimeter',
      'Visually inspect for bulging top, oil leakage, or burnt terminals',
      'Discharge capacitor safely using insulated screwdriver or resistor',
      'Test capacitance with multimeter — replace if >10% below rated MFD',
      'Replace with same µF rating and equal/higher voltage rating, reconnecting terminals (C, FAN, HERM) exactly',
    ],
    indicators: [
      'Bulging or bubbled top vent',
      'Oil leakage or residue on body',
      'Burnt/melted terminal connections',
      'System buzzing but not starting',
      'Capacitor reads >10% below rated MFD',
    ],
    regions: [
      'Terminal connections (C, FAN, HERM)',
      'Top vent dome for bulging',
      'Body for oil stains/leakage',
    ],
    fieldQuotes: [
      'Capacitors can hold lethal charge even when power is off — never skip discharge verification.',
      'Humming noises and no cooling are classic signs of a bad capacitor — always test with a multimeter before replacing.',
      'If it looks like a fat tomato, it\'s dead.',
      'Look for burn marks, swollen capacitors, or loose connections — these are dead giveaways.',
    ],
    juniorMistakes: [
      'Checking voltage but forgetting to discharge the capacitor before handling',
      'Assuming a capacitor is good because it looks fine without testing capacitance with a multimeter',
      'Not verifying the microfarad rating matches specifications before replacement',
    ],
    sources: [
      'hvacrschool.com — Capacitor testing and replacement procedure',
      'oemstock.com — How to test your HVAC capacitor',
      'appliancepartspros.com — How to test and replace a central AC capacitor',
    ],
  },
  {
    part: 'contactor',
    label: 'Contactor',
    steps: [
      'Shut off power at breaker/disconnect',
      'Document wiring and disconnect all terminals',
      'Remove old contactor from mounting bracket',
      'Install new contactor with same coil voltage (24–29V AC)',
      'Reconnect wiring per labels, restore power, and test system operation',
    ],
    indicators: [
      'Pitted or carbon-covered contact surfaces',
      'Blackened/burnt contact points',
      'Coil burnout or melted housing',
      'Visible rust or corrosion on plunger',
      'Plunger stuck or not pulling in fully',
    ],
    regions: [
      'Main power contact surfaces',
      'Coil winding area',
      'Plunger mechanism',
    ],
    fieldQuotes: [
      'A bad contactor blows apart after arcing — pitted contacts, welded terminals, or burned terminals signal trouble before complete failure.',
      'Your contactor is worn. Pitted contacts cause buzzing, hard starting, and no-cool breakdowns.',
      'Waiting until it quits means finding out on a hot day.',
      'No click? Check coil voltage. Click but no heat? Contacts are welded.',
    ],
    juniorMistakes: [
      'Replacing the contactor without checking if low voltage (24V) is reaching the coil',
      'Missing that pitted contacts can still show continuity but fail under load',
      'Not cleaning or replacing contactors during preventative maintenance',
    ],
    sources: [
      'hvacprosales.com — HVAC contactor replacement',
      'contactordepot.com — How to test a contactor in an AC unit',
      'hvaclaboratory.com — Step-by-step guide to replacing your HVAC system\'s contactors',
    ],
  },
  {
    part: 'relay',
    label: 'Relay',
    steps: [
      'Measure relay coil voltage (24V AC expected) when board commands function',
      'Check contact continuity with multimeter under power command',
      'Compare resistance readings to manufacturer specs',
      'Replace relay or entire board if contacts welded or coil open',
      'Verify system operation after replacement',
    ],
    indicators: [
      'Burnt or pitted relay contacts',
      'Carbon tracking on circuit board',
      'Welded/fused contacts — no click when energized',
      'Open coil — infinite resistance',
      'Visible damage to solder joints',
    ],
    regions: [
      'Relay contact terminals',
      'Coil connections',
      'PCB solder joints near relay',
    ],
    fieldQuotes: [
      'No response after thermostat call, flashing error codes, burnt capacitors — relay stuck or shorted.',
      'Set multimeter to ohms; good coil reads 200–600 Ω. No continuity = faulty relay.',
      'Buzzing noises signal an underlying failure — relays that chatter often overheat.',
    ],
    juniorMistakes: [
      'Testing relays while energized — shock hazard and false readings',
      'Using wrong multimeter setting — voltage mode instead of ohms',
      'Not disconnecting power before testing relay coils',
    ],
    sources: [
      'pickcomfort.com — Furnace circuit board troubleshooting and replacement',
      'pickhvac.com — Furnace control board ultimate troubleshooting guide',
    ],
  },
  {
    part: 'control_board',
    label: 'Control Board',
    steps: [
      'Visually inspect for burnt components, swollen capacitors, corroded terminals',
      'Check LED status codes (1 flash = ignition failure, 2 = pressure switch, 3 = limit switch)',
      'Test 24V AC input from transformer at board terminals',
      'Check for blown fuses and secure loose connections',
      'Replace board if physical damage or no voltage output',
    ],
    indicators: [
      'Burnt/browned components on PCB',
      'Swollen or leaking capacitors on board',
      'Corroded terminal blocks',
      'LED error codes flashing',
      'Blown fuse on board',
    ],
    regions: [
      'LED diagnostic indicator',
      'Transformer input terminals (24V AC)',
      'Fuse holder',
      'Capacitor banks',
      'Relay/contactor terminals',
    ],
    fieldQuotes: [
      'Look for burn marks, swollen capacitors, or loose connections — these are dead giveaways a control board is failing.',
      'Flashing error codes are your first clue — match the blink pattern to the manual.',
    ],
    juniorMistakes: [
      'Replacing the control board without checking 24V transformer first',
      'Not checking for loose wire connections before condemning the board',
      'Missing that a bad relay or sensor can make the board appear faulty',
    ],
    sources: [
      'pickhvac.com — Furnace control board ultimate troubleshooting guide',
      'pickcomfort.com — Furnace control board troubleshooting',
      'furnaceservicemanual.com — Lennox Elite Series furnace service manual',
    ],
  },
  {
    part: 'fan_motor',
    label: 'Fan Motor',
    steps: [
      'Turn off power and remove access panel',
      'Photograph wiring connections before disconnecting',
      'Disconnect wires and slide out motor assembly',
      'Inspect shaft, bearings, windings, and capacitor',
      'Test motor winding continuity and resistance to ground',
    ],
    indicators: [
      'Burnt winding smell or visible charring',
      'Seized or rough-spinning bearings',
      'Grinding/squealing noise during operation',
      'Overheating — hot to touch after running',
      'Weak or no airflow',
      'Bulging fan capacitor',
    ],
    regions: [
      'Motor windings — test with ohmmeter',
      'Shaft and bearing surfaces',
      'Capacitor connection',
      'Mounting grommets',
    ],
    fieldQuotes: [
      'Noises often indicate insufficient lubrication or worn sleeve bearings.',
      'Grinding suggests damaged ball bearings or metal-to-metal contact.',
      'Excessive friction from failing bearings raises motor temperature.',
      'Worn bearings cause grinding noise and hot-metal odor.',
    ],
    juniorMistakes: [
      'Running a motor with a burning smell instead of shutting off power immediately',
      'Not checking the air filter — dirty filters overload the motor',
      'Confusing bearing noise with blower wheel imbalance',
    ],
    sources: [
      'hvacrschool.com — Fan motor troubleshooting and replacement',
      'pickhvac.com — Blower motor symptoms and fixes',
      'hvaclaboratory.com —Fan motor bearing replacement guide',
    ],
  },
  {
    part: 'compressor',
    label: 'Compressor',
    steps: [
      'WARNING: Compressor service requires EPA Section 608 certified technician',
      'Recovery of refrigerant required by law before any compressor service',
      'Professional technicians test winding resistance and ground fault',
      'Brazing and vacuum procedures required for replacement',
    ],
    indicators: [
      'Breaker trips immediately on startup — likely short circuit',
      'Locked rotor — high amperage, no spin',
      'Burnt terminals at connection box',
      'Grounded windings — professional megger test required',
    ],
    regions: [
      'Terminal box connections',
      'Motor windings — professional megger test',
    ],
    fieldQuotes: [
      'Breaker trips immediately on startup? Likely short circuit in compressor or wiring.',
      'Compressor locked rotor — high amperage, no spin, weak capacitor or internal failure.',
      'Don\'t condemn the compressor before checking the run capacitor and hard start kit.',
    ],
    juniorMistakes: [
      'Not checking the run capacitor before condemning the compressor',
      'Missing that a hard start kit could save a marginal compressor',
      'Not measuring locked rotor amps (LRA) vs rated load amps (RLA)',
    ],
    sources: [
      'EPA Section 608 certification required by law',
      'General industry knowledge — no manufacturer-published DIY procedures',
    ],
  },
  {
    part: 'thermostat',
    label: 'Thermostat',
    steps: [
      'Check/replace batteries for battery-powered models',
      'Verify 24–28V AC at R/W terminals for hardwired units',
      'Inspect wiring for corrosion, loose connections at terminals',
      'Power cycle at breaker — 20–30 seconds off, then on',
      'Replace if display remains blank or controls unresponsive',
    ],
    indicators: [
      'Blank/dead display screen',
      'Unresponsive buttons or touchscreen',
      'Erratic temperature cycling',
      'Inaccurate temperature readings',
      'Corrosion at wiring terminals',
    ],
    regions: [
      'Battery compartment',
      'Wire terminal connections (R, W, Y, G, C)',
      'Sensor area — for inaccurate readings',
      'Wall cavity — for wire damage',
    ],
    fieldQuotes: [
      'Check for a short between thermostat wires — disconnect both ends and test with a DMM in ohms mode.',
    ],
    juniorMistakes: [
      'Not verifying 24V at the thermostat terminals before replacing',
      'Mislabeling wires during replacement causing system malfunction',
      'Assuming the thermostat is bad when the issue is in the control circuit or transformer',
    ],
    sources: [
      'trane.com — Thermostat controls troubleshooting',
      'northnjhvac.com — Thermostat died, no AC troubleshooting',
      'hvaclaboratory.com — How to repair a broken HVAC thermostat',
    ],
  },
  {
    part: 'circuit_breaker',
    label: 'Circuit Breaker',
    steps: [
      'WARNING: Circuit breaker work requires licensed electrician',
      'Turn off main power before any electrical panel work',
      'Verify breaker rating matches HVAC unit specifications',
      'Professional electrician inspects for burnt lugs/terminals',
    ],
    indicators: [
      'Breaker trips repeatedly or won\'t reset',
      'Visible burn marks at terminals',
      'Melted housing or smell of burning plastic',
    ],
    regions: [
      'Breaker terminal connections',
      'Bus bar connection point',
    ],
    fieldQuotes: [
      'Breaker trips immediately on startup? Likely short circuit in compressor or wiring.',
      'Compressor locked rotor — high amperage, no spin.',
    ],
    juniorMistakes: [
      'Replacing the breaker without finding the root cause — compressor, contactor, wiring',
      'Not measuring amp draw to verify if the breaker is tripping from overload vs defect',
      'Resetting a breaker repeatedly without investigation — risk of fire or equipment damage',
    ],
    sources: [
      'General industry knowledge — no manufacturer-published HVAC breaker procedures',
    ],
  },
]

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Case-insensitive, fuzzy match by part name */
export function lookupPart(raw: string): PartKnowledge | null {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return knowledge.find((p) => p.part === key) ?? null
}

/** Get a random field quote for a part (for AI enrichment) */
export function getFieldQuote(part: string): string | null {
  const p = lookupPart(part)
  if (!p || p.fieldQuotes.length === 0) return null
  return p.fieldQuotes[Math.floor(Math.random() * p.fieldQuotes.length)]
}

/** Get all junior mistakes for a part */
export function getMistakes(part: string): string[] {
  return lookupPart(part)?.juniorMistakes ?? []
}

/** Get all indicators for a part */
export function getIndicators(part: string): string[] {
  return lookupPart(part)?.indicators ?? []
}

/** Get all parts in the knowledge base */
export function getAllParts(): PartKnowledge[] {
  return knowledge
}

export default knowledge

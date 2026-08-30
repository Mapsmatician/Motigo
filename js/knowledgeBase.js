// Motigo Automotive Maintenance Knowledge Base & Expert Vehicle Specs Library

export const carKnowledgeBase = {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. MANUFACTURER-SPECIFIC SPECIFICATIONS & KNOWN MILEAGE PATTERNS
  // ─────────────────────────────────────────────────────────────────────────
  manufacturers: {
    toyota: {
      name: 'Toyota',
      oilGrade: '0W-20 or 5W-30 Full Synthetic',
      oilCapacity: '4.0L - 4.4L',
      coolantType: 'Toyota Super Long Life Coolant (Pink, HOAT)',
      transmissionFluid: 'Toyota Genuine ATF WS (World Standard) or CVT Fluid FE',
      sparkPlugType: 'Iridium Long-Life (100,000 km replacement)',
      keyMilestones: [
        { km: 40000, title: 'Brake Fluid & Cabin Filter Replacement' },
        { km: 80000, title: 'Automatic Transmission / CVT Fluid & Spark Plugs' },
        { km: 100000, title: 'Coolant Flush, Water Pump & Serpentine Belt Inspection' },
        { km: 150000, title: 'High-Mileage Suspension Bushings, Struts & Oxygen Sensors' }
      ],
      knownIssues: 'Water pump weep at ~100k km, VVTi oil line check, carbon buildup on GDI engines.'
    },
    honda: {
      name: 'Honda',
      oilGrade: '0W-20 or 5W-20 Full Synthetic',
      oilCapacity: '3.7L - 4.2L',
      coolantType: 'Honda Type 2 Coolant (Blue, Silicate-Free)',
      transmissionFluid: 'Honda DW-1 (ATF) or Honda HCF-2 (CVT)',
      sparkPlugType: 'Laser Iridium (100,000 km replacement)',
      keyMilestones: [
        { km: 40000, title: 'CVT Fluid Flush (Crucial for Honda CVT Longevity)' },
        { km: 60000, title: 'Brake Fluid Replacement & Valve Clearance Check' },
        { km: 100000, title: 'Timing Belt (V6 Models) or Timing Chain Tensioner Check (Inline-4)' },
        { km: 120000, title: 'Engine Mounts & Compliance Bushing Inspection' }
      ],
      knownIssues: 'CVT fluid degradation if skipped, compliance bushing tear, starter motor solenoid wear.'
    },
    lexus: {
      name: 'Lexus',
      oilGrade: '0W-20 or 5W-30 Synthetic',
      oilCapacity: '4.5L - 6.1L (V6 / V8)',
      coolantType: 'Toyota Super Long Life Coolant (Pink)',
      transmissionFluid: 'Toyota ATF WS (Sealed System - Inspect at 80k km)',
      sparkPlugType: 'Denso Iridium Tough',
      keyMilestones: [
        { km: 60000, title: 'Brake Pad & Rotor Thickness Check, Hybrid Battery Fan Cleaning' },
        { km: 90000, title: 'Transmission Fluid Drain & Fill, Differential Fluid Change' },
        { km: 120000, title: 'Air Suspension Struts (if equipped) & Inverter Coolant (Hybrids)' }
      ],
      knownIssues: 'Lower control arm bushing wear, hybrid cooling duct dust blockage, shock absorber seeping.'
    },
    mercedes: {
      name: 'Mercedes-Benz',
      oilGrade: '5W-40 or 0W-40 Approved MB 229.5 / 229.51',
      oilCapacity: '5.5L - 7.5L',
      coolantType: 'MB 325.0 / 325.6 (Blue/Pink OAT)',
      transmissionFluid: 'MB 236.14 / 236.15 (7G-Tronic / 9G-Tronic ATF)',
      sparkPlugType: 'Platinum / Iridium (60,000 km interval)',
      keyMilestones: [
        { km: 50000, title: '7G/9G-Tronic Transmission Service (Filter & Pan Gasket)' },
        { km: 70000, title: 'Brake Fluid Flush & Auxiliary Battery Inspection' },
        { km: 100000, title: 'Thermostat Housing, Water Pump & Thermostat Inspection' }
      ],
      knownIssues: 'Oil filter housing gasket leak, conductor plate in transmission, Airmatic strut bag leaks.'
    },
    bmw: {
      name: 'BMW',
      oilGrade: '5W-30 or 0W-30 BMW Longlife-01 / LL-04',
      oilCapacity: '5.2L - 6.5L',
      coolantType: 'BMW LC-87 / LC-18 Coolant (Blue/Magenta)',
      transmissionFluid: 'ZF LifeguardFluid 6 / 8 (ZF 8-Speed Automatic)',
      sparkPlugType: 'NGK High-Power Iridium (50,000 km - Turbocharged)',
      keyMilestones: [
        { km: 60000, title: 'ZF Transmission Oil & Integrated Filter Pan Service' },
        { km: 80000, title: 'Electric Water Pump, Thermostat & Expansion Tank Replacement' },
        { km: 100000, title: 'Valve Cover Gasket, Oil Filter Housing Gasket & OFHG Seal' }
      ],
      knownIssues: 'Oil filter housing gasket failure, plastic coolant hose cracking, electric water pump failure.'
    },
    ford: {
      name: 'Ford',
      oilGrade: '5W-20 or 5W-30 Motorcraft Synthetic Blend/Full Synthetic',
      oilCapacity: '4.0L - 5.7L',
      coolantType: 'Motorcraft Yellow / Orange Coolant',
      transmissionFluid: 'Mercon LV or Mercon ULV',
      sparkPlugType: 'Motorcraft Platinum / Iridium',
      keyMilestones: [
        { km: 50000, title: 'Transmission Fluid Exchange & Brake Fluid Refresh' },
        { km: 90000, title: 'Spark Plug Renewal (EcoBoost Engine Care)' },
        { km: 120000, title: 'Water Pump & Serpentine Drive Belts' }
      ],
      knownIssues: 'EcoBoost carbon buildup on intake valves, purge valve failure, dual-clutch shudder (DPS6).'
    },
    hyundai: {
      name: 'Hyundai',
      oilGrade: '5W-30 or 5W-20 Full Synthetic',
      oilCapacity: '3.6L - 4.5L',
      coolantType: 'Ethylene Glycol Green / Blue Coolant',
      transmissionFluid: 'Hyundai Genuine ATF SP-IV or DCT Fluid',
      sparkPlugType: 'Iridium Yttrium',
      keyMilestones: [
        { km: 40000, title: 'Air Filter, Cabin Filter & Brake Inspection' },
        { km: 75000, title: 'Automatic / Dual-Clutch Transmission Fluid Service' },
        { km: 100000, title: 'Drive Belt, Spark Plugs & Fuel Injector Cleaning' }
      ],
      knownIssues: 'Theta II engine knock check, ignition coil failure, steering column coupler pad wear.'
    },
    kia: {
      name: 'Kia',
      oilGrade: '5W-30 or 0W-20 Synthetic',
      oilCapacity: '3.6L - 4.5L',
      coolantType: 'Ethylene Glycol Long-Life Coolant',
      transmissionFluid: 'Kia Genuine ATF SP-IV',
      sparkPlugType: 'Iridium Core',
      keyMilestones: [
        { km: 40000, title: 'Brake Inspection & Filter Service' },
        { km: 80000, title: 'Transmission Fluid & Spark Plugs' },
        { km: 100000, title: 'Coolant Flush & Serpentine Belt' }
      ],
      knownIssues: 'GDI valve carbon, crankshaft position sensor wear, steering flexible coupling.'
    }
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. DETAILED AUTOMOTIVE SYSTEMS SYMPTOM & REPAIR KNOWLEDGE BASE
  // ─────────────────────────────────────────────────────────────────────────
  symptomLibrary: [
    {
      keywords: ['smoke', 'white smoke', 'exhaust smoke', 'steam from exhaust'],
      title: 'Exhaust Smoke Diagnostic (White / Blue / Black)',
      causes: {
        white: 'Coolant leaking into cylinder head due to blown head gasket or cracked engine block.',
        blue: 'Engine burning oil caused by worn piston rings, degraded valve stem seals, or failing turbocharger seals.',
        black: 'Rich fuel mixture caused by clogged air filter, leaking fuel injectors, faulty O2 sensor, or dirty MAF sensor.'
      },
      action: 'Check coolant level and oil dipstick for milky texture (oil/coolant mixing). Have a mechanic perform a cooling system pressure test or cylinder compression test immediately.',
      urgency: '🔴 High (Risk of severe engine damage)'
    },
    {
      keywords: ['vibrate', 'vibration', 'steering wheel shake', 'shaking at speed', 'wobble'],
      title: 'Vehicle Vibration & Steering Shake Diagnosis',
      causes: {
        atSpeed: 'Unbalanced front wheels, bent rim, or uneven tyre tread wear.',
        whenBraking: 'Warped brake rotors (disc runout) or sticking brake caliper slide pins.',
        atIdle: 'Worn hydraulic engine or transmission mounts, misfiring spark plug, or dirty idle air control.'
      },
      action: 'If shaking occurs at 80–120 km/h: Perform wheel balancing & alignment. If shaking occurs when pressing brakes: Replace front brake discs and pads.',
      urgency: '🟡 Moderate (Schedule an inspection)'
    },
    {
      keywords: ['squeak', 'squealing', 'belt noise', 'screeching under hood'],
      title: 'Serpentine Drive Belt & Pulley Noise',
      causes: 'Loose or glazed serpentine belt, worn belt tensioner pulley, failing alternator bearing, or AC compressor clutch wear.',
      action: 'Inspect belt for cracks, fraying, or oil contamination. Spray a mist of water on the belt while idling — if squeal stops briefly, the belt needs replacement.',
      urgency: '🟡 Moderate (Belt snapped leads to loss of power steering, alternator & water pump)'
    },
    {
      keywords: ['battery', 'dead battery', 'no start', 'clicking when starting', 'slow crank'],
      title: 'Starting & Battery Electrical System Diagnosis',
      causes: 'Discharged 12V battery, corroded battery terminals, failing starter motor solenoid, or faulty alternator not charging battery.',
      action: '1. Check battery terminal posts for white/green corrosion oxidation.\n2. Measure battery voltage with a multimeter (Healthy rest voltage: 12.6V; Engine running: 13.8V - 14.4V).\n3. If clicking single noise: Starter motor. If rapid clicking: Flat battery.',
      urgency: '🟡 Moderate (Risk of stranding)'
    },
    {
      keywords: ['transmission', 'gear slipping', 'delay shift', 'jerking gear', 'hard shift', 'cvt'],
      title: 'Transmission & Gearbox Health Assessment',
      causes: 'Degraded or low transmission fluid (ATF/CVT), clogged transmission fluid filter, worn clutch packs, or faulty shift solenoids.',
      action: 'Inspect transmission fluid dipstick (if equipped) for burnt smell or dark brown/black color (healthy fluid is bright red/pink). Perform transmission fluid drain & fill with OEM specification fluid.',
      urgency: '🔴 High (Transmission replacement is extremely costly)'
    },
    {
      keywords: ['smell', 'burning smell', 'gas smell', 'burning oil', 'sweet smell'],
      title: 'Automotive Odour & Leak Identification',
      causes: {
        sweet: 'Coolant leak (sweet syrupy smell from radiator, hose, or heater core).',
        burningOil: 'Engine oil leaking onto hot exhaust manifold (valve cover gasket leak).',
        rubber: 'Drive belt rubbing against pulley or slipping.',
        gasoline: 'Fuel line leak, loose gas cap, or stuck open fuel injector.'
      },
      action: 'Identify the odor source. Never ignore fuel odors. Inspect under the hood for wet oil/coolant residue after safely turning off the engine.',
      urgency: '🔴 High if fuel or heavy smoke; 🟡 Moderate if light oil weep'
    }
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // 3. KNOWLEDGE MATCHING HELPER
  // ─────────────────────────────────────────────────────────────────────────
  findManufacturerSpecs(makeName) {
    if (!makeName) return null;
    const clean = makeName.trim().toLowerCase();
    for (const [key, data] of Object.entries(this.manufacturers)) {
      if (clean.includes(key) || data.name.toLowerCase().includes(clean)) {
        return data;
      }
    }
    return null;
  },

  findSymptomMatch(queryStr) {
    if (!queryStr) return null;
    const q = queryStr.toLowerCase();
    return this.symptomLibrary.find(item => 
      item.keywords.some(kw => q.includes(kw))
    );
  }
};

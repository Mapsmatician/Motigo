import { calculateVehicleStatus, formatDisplayDate } from './maintenanceEngine.js';
import { calculateCostMetrics, formatCurrency } from './costAnalytics.js';
import { carKnowledgeBase } from './knowledgeBase.js';

export class AiAssistantEngine {
  constructor() {
    this.name = 'Motigo AI';
  }

  /**
   * Generates a context-aware intelligent response for any automotive or scheduling question.
   */
  generateResponse(rawQuery, activeVehicle, vehicleHistory = [], allVehicles = []) {
    const query = (rawQuery || '').trim().toLowerCase();

    // -------------------------------------------------------------
    // INTENT 1: SCHEDULE & DUE DATES ("When is my next maintenance date?")
    // -------------------------------------------------------------
    if (
      query.includes('when is my next') ||
      query.includes('next maintenance') ||
      query.includes('next service') ||
      query.includes('service due') ||
      query.includes('how many days') ||
      query.includes('due date') ||
      query.includes('service schedule')
    ) {
      if (!activeVehicle) {
        return {
          type: 'general',
          text: `You don't have an active vehicle selected in Motigo. Please add or select a vehicle to view upcoming service deadlines.`,
          actions: [{ label: '+ Add Vehicle', action: 'view_vehicles' }]
        };
      }

      const status = calculateVehicleStatus(activeVehicle);
      const remainingDays = status.daysRemaining !== null ? status.daysRemaining : 0;
      const nextDateFormatted = formatDisplayDate(activeVehicle.schedule.nextDueDate);
      const nextDueMileage = activeVehicle.schedule.nextDueMileage ? activeVehicle.schedule.nextDueMileage.toLocaleString() + ' km' : 'N/A';
      const curMileage = Number(activeVehicle.currentMileage).toLocaleString() + ' km';
      const remainingKm = activeVehicle.schedule.nextDueMileage ? Math.max(0, activeVehicle.schedule.nextDueMileage - activeVehicle.currentMileage).toLocaleString() + ' km' : null;

      let reply = `📅 **Next Scheduled Maintenance for your ${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}**:\n\n`;
      reply += `• **Target Due Date**: **${nextDateFormatted}** `;

      if (status.isOverdue) {
        reply += `(🔴 **Overdue by ${Math.abs(remainingDays)} days**)\n`;
      } else if (remainingDays === 0) {
        reply += `(🟡 **Due Today!**)\n`;
      } else {
        reply += `(🟢 **${remainingDays} days remaining**)\n`;
      }

      reply += `• **Target Mileage**: **${nextDueMileage}** (Current: ${curMileage}${remainingKm ? ` • **${remainingKm} remaining**` : ''})\n`;
      reply += `• **Service Policy**: Every ${activeVehicle.schedule.frequencyMonths} months or ${activeVehicle.schedule.mileageInterval ? activeVehicle.schedule.mileageInterval.toLocaleString() + ' km' : '10,000 km'} (*whichever occurs first*).\n\n`;

      if (status.isOverdue) {
        reply += `⚠️ **Status: Action Required.** Your scheduled threshold has been exceeded. If you have already serviced your car, click **"Log Completed Service"** below to record it and recalculate your next cycle.`;
      } else if (status.isDueSoon) {
        reply += `🟡 **Status: Approaching Soon.** We recommend scheduling your routine workshop appointment in advance to avoid long wait times.`;
      } else {
        reply += `🟢 **Status: On Track.** Your vehicle maintenance schedule is up to date. Motigo will automatically notify you 7 days and 1 day before the due date.`;
      }

      return {
        type: 'schedule_report',
        text: reply,
        actions: [
          { label: '✓ Log Completed Service', action: 'complete_service', vehicleId: activeVehicle.id },
          { label: '⚙️ Modify Schedule', action: 'open_schedule', vehicleId: activeVehicle.id },
          { label: '📜 View Service Timeline', action: 'view_timeline', vehicleId: activeVehicle.id }
        ],
        suggestions: [
          'What maintenance should I do next?',
          'How much did my last service cost?',
          'Which car is overdue for maintenance?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 2: FLEET OVERVIEW & OVERDUE CHECK ("Which car is overdue?")
    // -------------------------------------------------------------
    if (
      query.includes('which car is overdue') ||
      query.includes('overdue') ||
      query.includes('fleet status') ||
      query.includes('all cars') ||
      query.includes('my cars') ||
      query.includes('what cars do i have')
    ) {
      if (allVehicles.length === 0) {
        return {
          type: 'general',
          text: `You have not registered any vehicles yet. Click **"+ Add Vehicle"** to start tracking your maintenance.`,
          actions: [{ label: '+ Add Vehicle', action: 'view_vehicles' }]
        };
      }

      let reply = `🚗 **Motigo Fleet Status Overview (${allVehicles.length} vehicles)**:\n\n`;
      const overdueList = [];
      const dueSoonList = [];
      const onTrackList = [];

      allVehicles.forEach(v => {
        const s = calculateVehicleStatus(v);
        if (s.isOverdue) overdueList.push({ v, s });
        else if (s.isDueSoon) dueSoonList.push({ v, s });
        else onTrackList.push({ v, s });
      });

      if (overdueList.length > 0) {
        reply += `🔴 **Overdue (${overdueList.length})**:\n`;
        overdueList.forEach(({ v, s }) => {
          reply += `• **${v.year} ${v.make} ${v.model}** (${v.registrationNumber}): ${s.reason}\n`;
        });
        reply += `\n`;
      }

      if (dueSoonList.length > 0) {
        reply += `🟡 **Due Soon (${dueSoonList.length})**:\n`;
        dueSoonList.forEach(({ v, s }) => {
          reply += `• **${v.year} ${v.make} ${v.model}** (${v.registrationNumber}): Next service ${formatDisplayDate(v.schedule.nextDueDate)} or ${v.schedule.nextDueMileage.toLocaleString()} km\n`;
        });
        reply += `\n`;
      }

      if (onTrackList.length > 0) {
        reply += `🟢 **On Track (${onTrackList.length})**:\n`;
        onTrackList.forEach(({ v }) => {
          reply += `• **${v.year} ${v.make} ${v.model}**: Healthy until ${formatDisplayDate(v.schedule.nextDueDate)}\n`;
        });
      }

      const overdueCarId = overdueList.length > 0 ? overdueList[0].v.id : null;

      return {
        type: 'fleet_report',
        text: reply,
        actions: overdueCarId ? [
          { label: `✓ Resolve Overdue Car`, action: 'complete_service', vehicleId: overdueCarId },
          { label: '🏠 Go to Dashboard', action: 'open_dashboard' }
        ] : [
          { label: '🏠 View Dashboard', action: 'open_dashboard' }
        ],
        suggestions: [
          'When is my next maintenance date?',
          'How much have I spent on maintenance in total?',
          'What maintenance should I do around 90,000 km?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 3: PAST SERVICE HISTORY & LAST OIL CHANGE
    // -------------------------------------------------------------
    if (
      query.includes('last service') ||
      query.includes('last oil change') ||
      query.includes('previous maintenance') ||
      query.includes('last maintenance') ||
      query.includes('history') ||
      query.includes('service records')
    ) {
      if (!activeVehicle || vehicleHistory.length === 0) {
        return {
          type: 'general',
          text: `No maintenance records have been logged yet for your ${activeVehicle ? activeVehicle.make + ' ' + activeVehicle.model : 'vehicle'}. Click **"Log Completed Service"** to record your first service.`,
          actions: [{ label: '✓ Log Completed Service', action: 'complete_service', vehicleId: activeVehicle?.id }]
        };
      }

      const latest = vehicleHistory[0];
      let reply = `📜 **Latest Maintenance Record for ${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}**:\n\n`;
      reply += `• **Service Performed**: **${latest.maintenanceType}**\n`;
      reply += `• **Date Completed**: **${formatDisplayDate(latest.date)}**\n`;
      reply += `• **Recorded Mileage**: **${Number(latest.mileage).toLocaleString()} km**\n`;
      if (latest.totalCost) reply += `• **Total Amount**: **₦${Number(latest.totalCost).toLocaleString()}**\n`;
      if (latest.serviceProvider) reply += `• **Workshop / Provider**: ${latest.serviceProvider}\n`;
      if (latest.description) reply += `• **Mechanic Notes**: ${latest.description}\n`;
      if (latest.documentName) reply += `• **Attached Receipt**: 📎 ${latest.documentName}\n`;

      reply += `\nYou have **${vehicleHistory.length} total recorded service events** in your digital timeline.`;

      return {
        type: 'history_report',
        text: reply,
        actions: [
          { label: '📜 View Full Timeline', action: 'view_timeline', vehicleId: activeVehicle.id },
          { label: '✓ Log New Service', action: 'complete_service', vehicleId: activeVehicle.id }
        ],
        suggestions: [
          'When is my next maintenance date?',
          'How much have I spent on maintenance in total?',
          'What maintenance should I do next?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 4: COST & SPEND TRACKING ("How much have I spent?")
    // -------------------------------------------------------------
    if (
      query.includes('cost') ||
      query.includes('spend') ||
      query.includes('how much') ||
      query.includes('money') ||
      query.includes('expense') ||
      query.includes('total price')
    ) {
      const costMetrics = calculateCostMetrics(vehicleHistory, activeVehicle?.id, '₦');
      let reply = `💳 **Maintenance Spending Breakdown for ${activeVehicle ? activeVehicle.year + ' ' + activeVehicle.make + ' ' + activeVehicle.model : 'Your Fleet'}**:\n\n`;
      reply += `• **Total Lifetime Spend**: **${costMetrics.formatted.total}** across ${costMetrics.recordCount} service events.\n`;
      reply += `• **2026 Year-to-Date Spend**: **${costMetrics.formatted.currentYear}**\n`;
      reply += `• **Average Cost per Service**: **${costMetrics.formatted.average}**\n`;
      reply += `• **Parts vs. Labour**: ${costMetrics.formatted.parts} on parts (70%) • ${costMetrics.formatted.labour} on labour (30%).\n\n`;
      reply += `💡 *Tip: You can attach digital receipt photos or PDF invoices every time you log a service in Motigo.*`;

      return {
        type: 'cost_report',
        text: reply,
        actions: [
          { label: '📜 View Cost Timeline', action: 'view_timeline' },
          { label: '✓ Log Completed Service', action: 'complete_service' }
        ],
        suggestions: [
          'When is my next maintenance date?',
          'What maintenance should I do next?',
          'What should I check before a long trip?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 5: PRE-ROAD TRIP CHECKLIST
    // -------------------------------------------------------------
    if (
      query.includes('road trip') ||
      query.includes('long trip') ||
      query.includes('travel') ||
      query.includes('journey') ||
      query.includes('pre-trip')
    ) {
      const vehName = activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : 'your vehicle';
      let reply = `🧳 **Motigo 7-Point Pre-Road Trip Safety Checklist for ${vehName}**:\n\n`;
      reply += `1. **Engine Oil & Coolant**: Check levels on level ground when the engine is cool. Top up if below the maximum mark.\n`;
      reply += `2. **Tyre Pressures & Spare Wheel**: Inspect tread depth (minimum 3mm recommended) and calibrate cold tire pressures, including the spare.\n`;
      reply += `3. **Braking System**: Ensure responsive pedal feel, adequate brake fluid, and no grinding/squealing sounds.\n`;
      reply += `4. **Battery Health**: Clean terminals and verify strong cranking speed upon starting.\n`;
      reply += `5. **Wipers & Screenwash**: Replace streak-prone rubber blades and fill windshield reservoir.\n`;
      reply += `6. **Lighting & Signals**: Confirm headlights (low/high beam), brake lights, hazard flashers, and indicators operate properly.\n`;
      reply += `7. **Emergency Gear**: Jack, wheel brace, reflective warning triangles, fire extinguisher, and first aid kit.\n\n`;
      reply += `*Have a safe trip! Motigo will continue tracking your schedule while you travel.*`;

      return {
        type: 'general',
        text: reply,
        actions: [
          { label: '📅 Check Next Service Date', action: 'ask_next_service' },
          { label: '✓ Record Pre-Trip Service', action: 'complete_service' }
        ],
        suggestions: [
          'When is my next maintenance date?',
          'What should I check at 100,000 km?',
          'How often should I change my oil?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 6: MILESTONE INTERVALS (e.g. 80k, 90k, 100k km)
    // -------------------------------------------------------------
    if (
      query.includes('90,000') ||
      query.includes('90000') ||
      query.includes('100,000') ||
      query.includes('100000') ||
      query.includes('what maintenance should i do next') ||
      query.includes('what should i check at') ||
      query.includes('recommend')
    ) {
      const curKm = activeVehicle ? activeVehicle.currentMileage : 82000;
      let reply = `🚗 **Recommended Maintenance Check for ${activeVehicle ? activeVehicle.make + ' ' + activeVehicle.model : 'Your Vehicle'} (Current: ${curKm.toLocaleString()} km)**:\n\n`;
      reply += `Based on your odometer reading and recorded service history, here are the key items to service during your next workshop visit:\n\n`;
      reply += `• **Full Synthetic Oil & OEM Filter Renewal**: Essential for maintaining engine lubrication and thermal regulation.\n`;
      reply += `• **Brake Inspection & Fluid Flush**: Brake fluid is hygroscopic and should be inspected/renewed every 2 years or 40,000 km.\n`;
      reply += `• **Cooling System Flush & Radiator Check**: Check coolant pH and inspect radiator hoses for swelling or cracks.\n`;
      reply += `• **Cabin Pollen & Engine Air Filters**: Ensure optimal fuel-air combustion and clean cabin air.\n`;
      reply += `• **Suspension Bushings & Shock Absorbers**: Inspect for fluid leaks or worn rubber mounts over rough road conditions.\n`;
      reply += `• **Transmission Fluid Inspection**: Check ATF fluid clarity and viscosity.\n\n`;
      reply += `*Note: These recommendations are derived from standard OEM multi-point service protocols for your vehicle category.*`;

      return {
        type: 'general',
        text: reply,
        actions: [
          { label: '✓ Log Completed Service', action: 'complete_service' },
          { label: '📅 View Next Service Date', action: 'ask_next_service' }
        ],
        suggestions: [
          'When is my next maintenance date?',
          'How often should I change my oil?',
          'Why is my car overheating?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 7: OIL CHANGE FREQUENCY
    // -------------------------------------------------------------
    if (
      query.includes('how often') ||
      query.includes('oil change') ||
      query.includes('change oil')
    ) {
      let reply = `🛢️ **Engine Oil Change Intervals for ${activeVehicle ? activeVehicle.make + ' ' + activeVehicle.model : 'Petrol/Diesel Vehicles'}**:\n\n`;
      reply += `• **Full Synthetic Oil**: Every **8,000 km to 10,000 km** or **6 to 12 months** (whichever occurs first).\n`;
      reply += `• **Semi-Synthetic / Mineral Oil**: Every **5,000 km** or **3 to 6 months**.\n`;
      reply += `• **Severe Driving Conditions** (frequent stop-and-go traffic, heavy heat, short trips < 8 km): We recommend servicing every **5,000 km to 7,500 km**.\n\n`;
      reply += `Your **${activeVehicle ? activeVehicle.make + ' ' + activeVehicle.model : 'vehicle'}** is configured in Motigo for service every **${activeVehicle ? activeVehicle.schedule.frequencyMonths : 6} months** or **${activeVehicle ? activeVehicle.schedule.mileageInterval.toLocaleString() : '10,000'} km**.`;

      return {
        type: 'general',
        text: reply,
        actions: [
          { label: '⚙️ Modify Schedule', action: 'open_schedule' },
          { label: '✓ Log Completed Service', action: 'complete_service' }
        ],
        suggestions: [
          'When is my next maintenance date?',
          'What maintenance should I do next?',
          'Why is my car overheating?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 8: MANUFACTURER SPECS & KNOWLEDGE BASE LOOKUP
    // (e.g. oil grade, coolant type, transmission fluid, known issues)
    // -------------------------------------------------------------
    const makeData = activeVehicle ? carKnowledgeBase.findManufacturerSpecs(activeVehicle.make) : null;

    if (
      query.includes('oil grade') ||
      query.includes('what oil') ||
      query.includes('coolant') ||
      query.includes('transmission fluid') ||
      query.includes('specs') ||
      query.includes('known issue') ||
      query.includes('common problem') ||
      query.includes('fluid')
    ) {
      const vehName = activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : 'Your Vehicle';
      let reply = `📘 **Automotive Technical Knowledge Base: ${vehName}**\n\n`;

      if (makeData) {
        reply += `• **Engine Oil Spec**: **${makeData.oilGrade}** (Capacity: ${makeData.oilCapacity})\n`;
        reply += `• **Coolant Spec**: **${makeData.coolantType}**\n`;
        reply += `• **Transmission Fluid**: **${makeData.transmissionFluid}**\n`;
        reply += `• **Spark Plug Type**: **${makeData.sparkPlugType}**\n\n`;
        reply += `💡 **Known Maintenance Watchpoints for ${makeData.name}**: ${makeData.knownIssues}\n\n`;
        reply += `🗓️ **Key Mileage Milestones for ${makeData.name}**:\n`;
        makeData.keyMilestones.forEach(m => {
          reply += `  - **${m.km.toLocaleString()} km**: ${m.title}\n`;
        });
      } else {
        reply += `• **Recommended Engine Oil**: Synthetic 5W-30 or 0W-20 (refer to oil cap or manual).\n`;
        reply += `• **Brake Fluid**: DOT 3 or DOT 4 (inspect every 2 years or 40,000 km).\n`;
        reply += `• **Coolant**: Organic Acid Technology (OAT / HOAT) 50/50 prediluted antifreeze.\n`;
      }

      return {
        type: 'general',
        text: reply,
        actions: [
          { label: '📅 View Service Schedule', action: 'ask_next_service' },
          { label: '✓ Log Completed Service', action: 'complete_service' }
        ],
        suggestions: [
          'When is my next maintenance date?',
          'How often should I change my oil?',
          'What should I check before a long trip?'
        ]
      };
    }

    // -------------------------------------------------------------
    // INTENT 9: MECHANICAL SYMPT DIAGNOSTICS & KNOWLEDGE BASE
    // -------------------------------------------------------------
    const symptomMatch = this.classifySymptom(query);
    if (symptomMatch) {
      return {
        type: 'diagnostic',
        intro: `Here is the structured diagnostic assessment for your **${activeVehicle ? activeVehicle.year + ' ' + activeVehicle.make + ' ' + activeVehicle.model : 'vehicle'}**:`,
        diagnostic: symptomMatch,
        actions: [
          { label: '✓ Log Completed Repair', action: 'complete_service' },
          { label: '📅 View Service Schedule', action: 'ask_next_service' }
        ],
        suggestions: [
          'When is my next maintenance date?',
          'What should I check before a long trip?',
          'How much did my last service cost?'
        ]
      };
    }

    // Check knowledge base symptom library fallback
    const kbMatch = carKnowledgeBase.findSymptomMatch(query);
    if (kbMatch) {
      let reply = `🛠️ **Knowledge Base Assessment: ${kbMatch.title}**\n\n`;
      if (typeof kbMatch.causes === 'object') {
        reply += `• **Possible Causes**:\n`;
        for (const [k, v] of Object.entries(kbMatch.causes)) {
          reply += `  - **${k}**: ${v}\n`;
        }
      } else {
        reply += `• **Possible Cause**: ${kbMatch.causes}\n\n`;
      }
      reply += `• **Recommended Action**: ${kbMatch.action}\n`;
      reply += `• **Urgency Level**: ${kbMatch.urgency}\n\n`;
      reply += `*Note: Always consult a qualified automotive technician for physical diagnostic validation.*`;

      return {
        type: 'general',
        text: reply,
        actions: [
          { label: '✓ Log Completed Service', action: 'complete_service' },
          { label: '📅 View Next Service Date', action: 'ask_next_service' }
        ],
        suggestions: [
          'When is my next maintenance date?',
          'What oil grade should I use?',
          'What should I check before a long trip?'
        ]
      };
    }

    // -------------------------------------------------------------
    // DEFAULT CONVERSATIONAL RESPONSE
    // -------------------------------------------------------------
    const vehDesc = activeVehicle ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model} (${activeVehicle.currentMileage.toLocaleString()} km)` : 'your vehicle';

    let defaultText = `I understand your question regarding **${vehDesc}**.\n\n`;
    defaultText += `As your car's personal maintenance assistant, I am equipped with a comprehensive automotive knowledge base. I can help you with:\n`;
    defaultText += `• **Technical Specs & Fluid Grades**: Ask *"What oil grade or coolant does my ${activeVehicle ? activeVehicle.make : 'car'} use?"*\n`;
    defaultText += `• **Next Service Due Dates**: Ask *"When is my next maintenance date?"*\n`;
    defaultText += `• **Known Issues & Milestones**: Ask *"What maintenance should I do at 90,000 km?"*\n`;
    defaultText += `• **Symptom & Repair Guidance**: Ask *"Why is my exhaust blowing white smoke?"* or *"Why does my car vibrate at 100 km/h?"*\n\n`;
    defaultText += `How can I assist you with your **${activeVehicle ? activeVehicle.make + ' ' + activeVehicle.model : 'car'}** today?`;

    return {
      type: 'general',
      text: defaultText,
      actions: [
        { label: '📅 When is my next service?', action: 'ask_next_service' },
        { label: '⚠️ Which car is overdue?', action: 'ask_overdue' },
        { label: '✓ Log Completed Service', action: 'complete_service' }
      ],
      suggestions: [
        'When is my next maintenance date?',
        'What oil grade should I use?',
        'Which car is overdue for maintenance?'
      ]
    };
  }

  /**
   * Generates a proactive AI insight banner for a dedicated vehicle details page (Section 29).
   */
  getVehicleInsight(vehicle, history = []) {
    if (!vehicle) {
      return "Add your vehicle to receive personalized AI maintenance insights based on your mileage and service history.";
    }

    const mileage = vehicle.currentMileage || 0;
    const status = calculateVehicleStatus(vehicle);

    if (status.isOverdue) {
      return `Your ${vehicle.make} ${vehicle.model} is currently overdue for scheduled maintenance. We recommend recording your completed service or booking a workshop inspection immediately to maintain engine reliability.`;
    }

    if (mileage >= 90000 && mileage <= 110000) {
      return `Your ${vehicle.make} ${vehicle.model} is approaching ${mileage.toLocaleString()} km. Based on your recorded maintenance history, it may be useful to have the brakes, tyres, coolant and suspension checked during your next service.`;
    }

    if (mileage >= 140000) {
      return `Your ${vehicle.make} ${vehicle.model} is operating in high-mileage territory (${mileage.toLocaleString()} km). We recommend prioritizing timing belt/chain inspection, transmission fluid health, and suspension bushings.`;
    }

    return `Your ${vehicle.make} ${vehicle.model} is currently on track. Your next scheduled maintenance is projected for ${formatDisplayDate(vehicle.schedule.nextDueDate)} or at ${vehicle.schedule.nextDueMileage.toLocaleString()} km.`;
  }

  /**
   * 4-Tier PRS Diagnostic Symptom Matcher (Sections 27, 28, 30)
   */
  classifySymptom(query) {
    // 1. Overheating
    if (query.includes('overheat') || query.includes('hot engine') || query.includes('temperature gauge') || query.includes('steam')) {
      return {
        title: 'Engine Overheating Assessment',
        possibleCause: 'Low engine coolant level, radiator core blockage, malfunctioning thermostat stuck closed, inoperative electric cooling fan, water pump impeller failure, or coolant hose leakage.',
        recommendedAction: '1. Safely pull over to a secure location and switch off the engine immediately.\n2. Allow the engine to cool for at least 30-45 minutes before inspecting.\n3. CAUTION: Never open the radiator cap or pressurized coolant expansion tank while hot.\n4. Check for visible puddles beneath the engine bay and arrange professional roadside towing or workshop inspection.',
        urgency: {
          level: 'high',
          label: '🔴 High (Get it checked immediately)',
          badgeClass: 'urgency-high',
          icon: '🔴'
        },
        disclaimer: 'Motigo AI provides guidance and is not a certified mechanic. Continuing to drive an overheating engine may result in catastrophic cylinder head warping, blown head gaskets, or total engine seizure.'
      };
    }

    // 2. Clicking noise when turning
    if (query.includes('clicking') || query.includes('popping') || query.includes('clunking') || (query.includes('turn') && query.includes('sound'))) {
      return {
        title: 'Steering & Drivetrain CV Axle Diagnosis',
        possibleCause: 'Worn Constant Velocity (CV) joint with torn rubber boot leading to grease loss and road contamination, worn suspension sway bar end-links, or failing strut top mount bearings.',
        recommendedAction: '1. Inspect the rubber CV boots behind the front wheels for black grease splatter or tears.\n2. Avoid full-lock aggressive steering acceleration until inspected.\n3. Have a certified technician inspect the drive axles and suspension linkages.',
        urgency: {
          level: 'moderate',
          label: '🟡 Moderate (Schedule an inspection)',
          badgeClass: 'urgency-moderate',
          icon: '🟡'
        },
        disclaimer: 'Motigo AI provides guidance. A severely degraded CV joint can separate completely while driving, causing loss of drive power and potential wheel lockup.'
      };
    }

    // 3. Squeaking or Grinding Brakes
    if (query.includes('brake') || query.includes('squeak') || query.includes('grind') || query.includes('stopping')) {
      return {
        title: 'Braking Friction System Assessment',
        possibleCause: 'Worn brake friction pads reaching acoustic wear indicators (squeak), metal-on-metal backing plate contact with brake rotors (grind), glazed brake pads, or brake dust accumulation.',
        recommendedAction: '1. Schedule an immediate brake pad and disc rotor thickness measurement.\n2. Avoid heavy high-speed emergency braking.\n3. If grinding is audible, replace brake pads and rotors simultaneously to restore OEM stopping distance.',
        urgency: {
          level: 'high',
          label: '🔴 High (Get it checked immediately)',
          badgeClass: 'urgency-high',
          icon: '🔴'
        },
        disclaimer: 'Motigo AI is an advisory tool. Reduced braking performance directly impacts road safety and passenger stopping distances.'
      };
    }

    // 4. Check Engine Light
    if (query.includes('check engine') || query.includes('engine light') || query.includes('cel') || query.includes('warning light')) {
      return {
        title: 'On-Board Diagnostic (OBD-II) Warning',
        possibleCause: 'Oxygen (O2) sensor failure, catalytic converter degradation, loose/defective fuel filler cap, mass airflow sensor contamination, or engine cylinder misfire.',
        recommendedAction: '1. Check if the Check Engine Light is STEADY or FLASHING.\n2. If FLASHING: Stop driving immediately to prevent catalytic converter destruction.\n3. If STEADY: Check that the gas cap is tightly secured, then connect an OBD-II diagnostic scanner to read fault codes.',
        urgency: {
          level: 'moderate',
          label: '🟡 Moderate (Schedule an inspection)',
          badgeClass: 'urgency-moderate',
          icon: '🟡'
        },
        disclaimer: 'Motigo AI provides informational guidance. An OBD-II diagnostic scan at a certified automotive centre is required to read stored Diagnostic Trouble Codes (DTCs).'
      };
    }

    // 5. Air Conditioning
    if (query.includes('ac') || query.includes('air condition') || query.includes('cooling') || query.includes('blowing hot') || query.includes('warm air')) {
      return {
        title: 'HVAC Air Conditioning System Assessment',
        possibleCause: 'Low refrigerant (R134a / R1234yf) due to micro-leaks, failed AC compressor magnetic clutch, clogged cabin pollen filter, or faulty condenser cooling fan.',
        recommendedAction: '1. Replace the cabin pollen filter.\n2. Check whether the AC compressor clutch engages when AC is switched on.\n3. Have a workshop perform an AC manifold pressure check and vacuum leak test.',
        urgency: {
          level: 'low',
          label: '🟢 Low (Monitor / Convenience)',
          badgeClass: 'urgency-low',
          icon: '🟢'
        },
        disclaimer: 'Motigo AI provides guidance. Refrigerant recovery and recharging requires specialized recovery equipment and environmental safety certification.'
      };
    }

    return null;
  }
}

export const aiAssistant = new AiAssistantEngine();

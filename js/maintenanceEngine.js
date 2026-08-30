// Maintenance Engine: Scheduling, Thresholds, Due Status, and Next-Cycle Calculations

export function calculateVehicleStatus(vehicle, currentDateStr = null) {
  if (!vehicle || !vehicle.schedule) {
    return {
      status: 'on_track',
      label: 'On Track',
      color: '#10b981',
      badgeClass: 'status-on-track',
      reason: 'No maintenance due',
      daysRemaining: 999,
      kmRemaining: 99999,
      isOverdue: false,
      isDueSoon: false
    };
  }

  const currentDate = currentDateStr ? new Date(currentDateStr) : new Date();
  const nextDueDate = new Date(vehicle.schedule.nextDueDate);
  const diffTime = nextDueDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const currentKm = Number(vehicle.currentMileage) || 0;
  const nextDueKm = Number(vehicle.schedule.nextDueMileage) || 0;
  const kmRemaining = nextDueKm - currentKm;

  // Determine if overdue by date or mileage
  const isOverdueByDate = diffDays < 0;
  const isOverdueByKm = kmRemaining <= 0;
  const isOverdue = isOverdueByDate || isOverdueByKm;

  // Determine if due soon (within 14 days or within 1,000 km)
  const isDueSoonByDate = diffDays <= 14 && diffDays >= 0;
  const isDueSoonByKm = kmRemaining <= 1000 && kmRemaining > 0;
  const isDueSoon = !isOverdue && (isDueSoonByDate || isDueSoonByKm);

  if (isOverdue) {
    let overdueReason = '';
    if (isOverdueByDate && isOverdueByKm) {
      overdueReason = `Overdue by ${Math.abs(diffDays)} days and ${Math.abs(kmRemaining).toLocaleString()} km`;
    } else if (isOverdueByDate) {
      overdueReason = `Overdue by ${Math.abs(diffDays)} days (Due: ${formatDisplayDate(vehicle.schedule.nextDueDate)})`;
    } else {
      overdueReason = `Exceeded mileage threshold by ${Math.abs(kmRemaining).toLocaleString()} km`;
    }

    return {
      status: 'overdue',
      label: 'Overdue',
      color: '#ef4444',
      badgeClass: 'status-overdue',
      reason: overdueReason,
      daysRemaining: diffDays,
      kmRemaining: kmRemaining,
      isOverdue: true,
      isDueSoon: false,
      triggerType: isOverdueByKm ? 'mileage' : 'time'
    };
  }

  if (isDueSoon) {
    let dueReason = '';
    if (isDueSoonByDate && isDueSoonByKm) {
      dueReason = `Due in ${diffDays} days (${kmRemaining.toLocaleString()} km remaining)`;
    } else if (isDueSoonByDate) {
      dueReason = `Due in ${diffDays} days (${formatDisplayDate(vehicle.schedule.nextDueDate)})`;
    } else {
      dueReason = `Due in ${kmRemaining.toLocaleString()} km`;
    }

    return {
      status: 'due_soon',
      label: 'Due Soon',
      color: '#f59e0b',
      badgeClass: 'status-due-soon',
      reason: dueReason,
      daysRemaining: diffDays,
      kmRemaining: kmRemaining,
      isOverdue: false,
      isDueSoon: true,
      triggerType: kmRemaining <= 1000 ? 'mileage' : 'time'
    };
  }

  // On Track
  return {
    status: 'on_track',
    label: 'On Track',
    color: '#10b981',
    badgeClass: 'status-on-track',
    reason: `Next service: ${formatDisplayDate(vehicle.schedule.nextDueDate)} (in ${diffDays} days / ${kmRemaining.toLocaleString()} km)`,
    daysRemaining: diffDays,
    kmRemaining: kmRemaining,
    isOverdue: false,
    isDueSoon: false
  };
}

/**
 * Calculates next due date based on frequency months
 * Alias: calculateNextDueDate (used by state.js)
 */
export function calculateNextDueDate(dateString, months) {
  const d = new Date(dateString);
  d.setMonth(d.getMonth() + Number(months));
  return d.toISOString().split('T')[0];
}

export function addMonthsToDate(dateString, months) {
  const d = new Date(dateString);
  const targetMonth = d.getMonth() + Number(months);
  d.setMonth(targetMonth);
  return d.toISOString().split('T')[0];
}

/**
 * Formats YYYY-MM-DD into human readable "12 Jan 2027"
 */
export function formatDisplayDate(dateString) {
  if (!dateString) return 'Not set';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-GB', options);
}

/**
 * Calculates new schedule after completion
 */
export function calculateNextServiceCycle(currentSchedule, completionDate, completionMileage) {
  const frequencyMonths = Number(currentSchedule.frequencyMonths) || 6;
  const mileageInterval = Number(currentSchedule.mileageInterval) || 10000;
  const nextDueDate = addMonthsToDate(completionDate, frequencyMonths);
  const nextDueMileage = Number(completionMileage) + mileageInterval;

  return {
    ...currentSchedule,
    lastServiceDate: completionDate,
    lastServiceMileage: Number(completionMileage),
    nextDueDate: nextDueDate,
    nextDueMileage: nextDueMileage,
    frequencyMonths: frequencyMonths,
    mileageInterval: mileageInterval
  };
}

/**
 * Calculates mileage delta and generates friendly prompt string
 */
export function calculateMileageDelta(lastMileage, newMileage, unit = 'km') {
  const delta = Number(newMileage) - Number(lastMileage);
  if (delta > 0) {
    return {
      delta,
      message: `You've driven approximately ${delta.toLocaleString()} ${unit} since your last update.`
    };
  } else if (delta === 0) {
    return {
      delta: 0,
      message: `Odometer unchanged (${lastMileage.toLocaleString()} ${unit}).`
    };
  } else {
    return {
      delta,
      message: `New reading is lower than previous recorded ${lastMileage.toLocaleString()} ${unit}.`
    };
  }
}

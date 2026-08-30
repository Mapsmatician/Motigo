// Cost Analytics Engine: Spend Aggregations, Annual Trends, and Category Distributions

export function calculateCostMetrics(records = [], vehicleId = null, currencySymbol = '₦') {
  const filtered = vehicleId 
    ? records.filter(r => r.vehicleId === vehicleId) 
    : records;

  let totalCost = 0;
  let totalPartsCost = 0;
  let totalLabourCost = 0;
  const costByYear = {};
  const costByType = {};

  filtered.forEach(rec => {
    const cost = Number(rec.totalCost) || 0;
    const parts = Number(rec.partsCost) || (cost * 0.7);
    const labour = Number(rec.labourCost) || (cost - parts);

    totalCost += cost;
    totalPartsCost += parts;
    totalLabourCost += labour;

    // By Year
    const year = rec.date ? new Date(rec.date).getFullYear() : 2026;
    costByYear[year] = (costByYear[year] || 0) + cost;

    // By Type
    const type = rec.maintenanceType || 'General';
    costByType[type] = (costByType[type] || 0) + cost;
  });

  const recordCount = filtered.length;
  const averageCost = recordCount > 0 ? Math.round(totalCost / recordCount) : 0;
  const currentYear = 2026;
  const currentYearCost = costByYear[currentYear] || totalCost;

  return {
    totalCost,
    totalPartsCost,
    totalLabourCost,
    averageCost,
    currentYearCost,
    currentYear,
    recordCount,
    costByYear,
    costByType,
    formatted: {
      total: formatCurrency(totalCost, currencySymbol),
      average: formatCurrency(averageCost, currencySymbol),
      currentYear: formatCurrency(currentYearCost, currencySymbol),
      parts: formatCurrency(totalPartsCost, currencySymbol),
      labour: formatCurrency(totalLabourCost, currencySymbol)
    }
  };
}

export function formatCurrency(amount, symbol = '₦') {
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString()}`;
}

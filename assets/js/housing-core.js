export const MONTHS_PER_YEAR = 12;

export function annualToMonthly(amount) {
  return amount / MONTHS_PER_YEAR;
}

export function totalMonthlyCost(items) {
  return items.reduce((total, item) => total + item.monthlyAmount, 0);
}

export function makeDonutRows(items, groupBelowPercent = 5) {
  const totals = new Map();
  items.forEach((item) => {
    if (item.monthlyAmount > 0) {
      totals.set(item.category, (totals.get(item.category) || 0) + item.monthlyAmount);
    }
  });
  const totalAmount = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
  if (totalAmount <= 0) return [];

  const rows = [];
  let groupedAmount = 0;
  totals.forEach((amount, category) => {
    if (amount / totalAmount < groupBelowPercent / 100) {
      groupedAmount += amount;
    } else {
      rows.push({ Categorie: category, Maandbedrag: amount });
    }
  });
  if (groupedAmount > 0) rows.push({ Categorie: "Overig", Maandbedrag: groupedAmount });
  return rows.sort((a, b) => b.Maandbedrag - a.Maandbedrag);
}

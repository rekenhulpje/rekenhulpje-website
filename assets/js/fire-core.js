const MONTHS_PER_YEAR = 12;

export function fireTarget(annualExpenses, withdrawalRatePercent) {
  const rate = withdrawalRatePercent / 100;
  if (annualExpenses <= 0) return 0;
  if (rate <= 0) return Number.POSITIVE_INFINITY;
  return annualExpenses / rate;
}

export function calculateFirePlan(input) {
  const currentAge = Math.max(0, input.currentAge);
  const currentNetWorth = Math.max(0, input.currentNetWorth);
  const monthlyContribution = Math.max(0, input.monthlyContribution);
  const annualExpenses = Math.max(0, input.annualExpenses);
  const annualReturnRate = Math.max(-0.99, input.annualReturnPercent / 100);
  const withdrawalRatePercent = Math.max(0, input.withdrawalRatePercent);
  const inflationRate = Math.max(0, input.inflationPercent / 100);
  const contributionIncreaseRate = Math.max(0, input.annualContributionIncreasePercent / 100);
  const maxAge = Math.max(currentAge, input.maxAge || 100);
  const startYear = input.startYear || new Date().getFullYear();

  let balance = currentNetWorth;
  let annualContribution = monthlyContribution * MONTHS_PER_YEAR;
  let reached = false;
  let fireAge = null;
  let fireYear = null;
  let fireNetWorth = null;
  let rowContribution = 0;
  let rowReturn = 0;
  const rows = [];

  for (let yearIndex = 0; yearIndex <= maxAge - currentAge; yearIndex += 1) {
    const age = currentAge + yearIndex;
    const year = startYear + yearIndex;
    const target = fireTarget(
      annualExpenses * (1 + inflationRate) ** yearIndex,
      withdrawalRatePercent
    );
    const distance = Math.max(0, target - balance);

    rows.push({
      Jaar: year,
      Leeftijd: age,
      Vermogen: balance,
      "FIRE doelvermogen": target,
      "Jaarlijkse inleg": rowContribution,
      "Verwacht rendement": rowReturn,
      "Afstand tot FIRE": distance,
    });

    if (!reached && balance >= target) {
      reached = true;
      fireAge = age;
      fireYear = year;
      fireNetWorth = balance;
      break;
    }

    if (age >= maxAge) break;

    const startBalance = balance;
    rowContribution = annualContribution;
    rowReturn = (startBalance + rowContribution) * annualReturnRate;
    balance = Math.max(0, startBalance + rowContribution + rowReturn);
    annualContribution *= 1 + contributionIncreaseRate;
  }

  const finalRow = rows.at(-1);
  return {
    reached,
    fireAge,
    fireYear,
    fireNetWorth,
    yearsToFire: reached ? fireAge - currentAge : null,
    currentTarget: fireTarget(annualExpenses, withdrawalRatePercent),
    finalAge: finalRow?.Leeftijd || currentAge,
    finalNetWorth: finalRow?.Vermogen || currentNetWorth,
    projectionRows: rows,
  };
}

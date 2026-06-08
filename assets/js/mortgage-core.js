export const MONTHS_PER_YEAR = 12;

export const MortgageType = {
  ANNUITY: "Annuiteit",
  LINEAR: "Lineair",
};

export function monthlyRate(annualRatePercent) {
  return annualRatePercent / 100 / MONTHS_PER_YEAR;
}

export function annuityPayment(principal, annualRatePercent, years) {
  const months = years * MONTHS_PER_YEAR;
  const rate = monthlyRate(annualRatePercent);
  if (principal <= 0 || months <= 0) return 0;
  if (rate === 0) return principal / months;
  return (principal * rate) / (1 - (1 + rate) ** -months);
}

export function buildSchedule({ principal, annualRatePercent, years, mortgageType }) {
  const months = years * MONTHS_PER_YEAR;
  if (principal <= 0 || months <= 0) return [];

  const rate = monthlyRate(annualRatePercent);
  let balance = principal;
  const schedule = [];
  const fixedAnnuityPayment = annuityPayment(principal, annualRatePercent, years);
  const fixedLinearPrincipal = principal / months;

  for (let month = 1; month <= months; month += 1) {
    const interest = balance * rate;
    let payment;
    let principalPaid;

    if (mortgageType === MortgageType.ANNUITY) {
      payment = fixedAnnuityPayment;
      principalPaid = payment - interest;
    } else {
      principalPaid = Math.min(fixedLinearPrincipal, balance);
      payment = principalPaid + interest;
    }

    if (month === months) {
      principalPaid = balance;
      payment = principalPaid + interest;
    }

    balance = Math.max(0, balance - principalPaid);
    schedule.push({
      month,
      year: Math.floor((month - 1) / MONTHS_PER_YEAR) + 1,
      payment,
      interest,
      principal: principalPaid,
      remainingBalance: balance,
    });
  }

  return schedule;
}

export function eigenwoningforfait2026(wozValue) {
  if (wozValue <= 12_500) return 0;
  if (wozValue <= 25_000) return wozValue * 0.001;
  if (wozValue <= 50_000) return wozValue * 0.002;
  if (wozValue <= 75_000) return wozValue * 0.0025;
  if (wozValue <= 1_350_000) return wozValue * 0.0035;
  return 4_725 + (wozValue - 1_350_000) * 0.0235;
}

export function yearlyTotals(schedule, year) {
  return schedule
    .filter((row) => row.year === year)
    .reduce(
      (totals, row) => ({
        payment: totals.payment + row.payment,
        interest: totals.interest + row.interest,
        principal: totals.principal + row.principal,
      }),
      { payment: 0, interest: 0, principal: 0 }
    );
}

export function estimateTaxBenefit({
  annualInterest,
  wozValue,
  deductionRatePercent,
  hillenRatePercent = 71.867,
}) {
  const eigenwoningforfait = eigenwoningforfait2026(wozValue);
  const taxableHomeIncomeBeforeHillen = eigenwoningforfait - annualInterest;
  let hillenDeduction = 0;
  let deductibleAmount = 0;

  if (taxableHomeIncomeBeforeHillen > 0) {
    hillenDeduction = taxableHomeIncomeBeforeHillen * (hillenRatePercent / 100);
  } else {
    deductibleAmount = Math.abs(taxableHomeIncomeBeforeHillen);
  }

  const taxBenefit = deductibleAmount * (deductionRatePercent / 100);
  return {
    annualInterest,
    eigenwoningforfait,
    taxableHomeIncomeBeforeHillen,
    hillenDeduction,
    deductibleAmount,
    taxBenefit,
    monthlyTaxBenefit: taxBenefit / MONTHS_PER_YEAR,
  };
}

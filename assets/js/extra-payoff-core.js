import {
  MortgageType,
  annuityPayment,
  estimateTaxBenefit,
  monthlyRate,
} from "./mortgage-core.js";

const MONTHS_PER_YEAR = 12;

export const PayoffScenarioMode = {
  LOWER_PAYMENT: "lower_payment",
  SHORTEN_TERM: "shorten_term",
  REINVEST_SAVINGS: "reinvest_savings",
};

export function calculateExtraPayoff(input) {
  const principal = Math.max(0, input.principal);
  const annualRatePercent = Math.max(0, input.annualRatePercent);
  const years = Math.max(0, input.years);
  const oneTimeExtra = Math.min(principal, Math.max(0, input.oneTimeExtra));
  const monthlyExtra = Math.max(0, input.monthlyExtra);
  const mortgageType = input.mortgageType || MortgageType.ANNUITY;
  const scenarioMode = input.scenarioMode || PayoffScenarioMode.LOWER_PAYMENT;
  const homeValue = Math.max(0, input.homeValue || principal);
  const deductionRate = Math.max(0, input.deductionRate || 0);
  const usesPaymentTarget = [
    PayoffScenarioMode.SHORTEN_TERM,
    PayoffScenarioMode.REINVEST_SAVINGS,
  ].includes(scenarioMode);

  const base = simulateSchedule({
    principal,
    annualRatePercent,
    years,
    mortgageType,
    monthlyExtra: 0,
  });
  const baseFirstPayment = base.rows[0]?.payment || 0;
  const extra = simulateSchedule({
    principal: Math.max(0, principal - oneTimeExtra),
    annualRatePercent,
    years,
    mortgageType,
    monthlyExtra,
    paymentTarget: usesPaymentTarget ? baseFirstPayment + monthlyExtra : null,
  });

  const extraFirstPayment = extra.rows[0]?.payment || 0;

  return {
    base,
    extra,
    scenarioMode,
    oneTimeExtra,
    monthlyExtra,
    baseFirstPayment,
    extraFirstPayment,
    monthlyDifference: extraFirstPayment - baseFirstPayment,
    interestSaved: Math.max(0, base.totalInterest - extra.totalInterest),
    finalBalance: extra.rows.at(-1)?.remainingBalance || 0,
    monthsSaved: Math.max(0, base.monthsToPayoff - extra.monthsToPayoff),
    comparisonRows: makeComparisonRows(base, extra),
    termCostRows: makeTermCostRows({
      base,
      extra,
      homeValue,
      deductionRate,
    }),
  };
}

export function simulateSchedule({
  principal,
  annualRatePercent,
  years,
  mortgageType,
  monthlyExtra = 0,
  paymentTarget = null,
}) {
  const totalMonths = Math.round(years * MONTHS_PER_YEAR);
  const rate = monthlyRate(annualRatePercent);
  const rows = [];
  let balance = Math.max(0, principal);
  let totalInterest = 0;
  let monthsToPayoff = totalMonths;
  const fixedLinearPrincipal = totalMonths > 0 ? balance / totalMonths : 0;
  const fixedAnnuityPayment = annuityPayment(balance, annualRatePercent, years);

  for (let month = 1; month <= totalMonths; month += 1) {
    if (balance <= 0) {
      rows.push(emptyRow(month));
      continue;
    }

    const interest = balance * rate;
    let requiredPrincipal;
    let requiredPayment;

    if (Number.isFinite(paymentTarget) && paymentTarget > 0) {
      requiredPayment = Math.min(paymentTarget, balance + interest);
      requiredPrincipal = Math.max(0, requiredPayment - interest);
    } else if (mortgageType === MortgageType.LINEAR) {
      requiredPrincipal = Math.min(fixedLinearPrincipal, balance);
      requiredPayment = requiredPrincipal + interest;
    } else {
      requiredPayment = Math.min(
        fixedAnnuityPayment,
        balance + interest
      );
      requiredPrincipal = Math.max(0, requiredPayment - interest);
    }

    const extraPrincipal =
      Number.isFinite(paymentTarget) && paymentTarget > 0
        ? 0
        : Math.min(monthlyExtra, Math.max(0, balance - requiredPrincipal));
    const principalPaid = Math.min(balance, requiredPrincipal + extraPrincipal);
    const payment = interest + principalPaid;
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;

    if (balance === 0 && monthsToPayoff === totalMonths) {
      monthsToPayoff = month;
    }

    rows.push({
      month,
      year: Math.floor((month - 1) / MONTHS_PER_YEAR) + 1,
      payment,
      interest,
      principal: principalPaid,
      extraPrincipal,
      remainingBalance: balance,
    });
  }

  return {
    rows,
    totalInterest,
    totalPayment: rows.reduce((sum, row) => sum + row.payment, 0),
    monthsToPayoff,
  };
}

function emptyRow(month) {
  return {
    month,
    year: Math.floor((month - 1) / MONTHS_PER_YEAR) + 1,
    payment: 0,
    interest: 0,
    principal: 0,
    extraPrincipal: 0,
    remainingBalance: 0,
  };
}

function makeComparisonRows(base, extra) {
  const selectedMonths = [1, 12, 60, 120, 180, 240, 300, 360];
  const maxMonth = Math.max(base.rows.length, extra.rows.length);
  return selectedMonths
    .filter((month) => month <= maxMonth)
    .map((month) => {
      const baseRow = base.rows[month - 1] || emptyRow(month);
      const extraRow = extra.rows[month - 1] || emptyRow(month);
      return {
        Moment: month === 1 ? "Na maand 1" : `Na jaar ${Math.round(month / MONTHS_PER_YEAR)}`,
        "Restschuld zonder extra": baseRow.remainingBalance,
        "Restschuld met extra": extraRow.remainingBalance,
        "Verschil restschuld": baseRow.remainingBalance - extraRow.remainingBalance,
        "Rente zonder extra": sumInterestToMonth(base.rows, month),
        "Rente met extra": sumInterestToMonth(extra.rows, month),
      };
    });
}

function sumInterestToMonth(rows, month) {
  return rows
    .slice(0, month)
    .reduce((sum, row) => sum + row.interest, 0);
}

function makeTermCostRows({ base, extra, homeValue, deductionRate }) {
  const years = Math.max(
    ...base.rows.map((row) => row.year),
    ...extra.rows.map((row) => row.year),
    0
  );
  const rows = [];

  for (let year = 1; year <= years; year += 1) {
    const baseYear = summarizeYear(base.rows, year, homeValue, deductionRate);
    const extraYear = summarizeYear(extra.rows, year, homeValue, deductionRate);
    rows.push({
      Jaar: year,
      "Bruto maandlast zonder extra": baseYear.grossMonthly,
      "Netto maandlast zonder extra": baseYear.netMonthly,
      "Bruto maandlast met extra": extraYear.grossMonthly,
      "Netto maandlast met extra": extraYear.netMonthly,
      "Netto ruimte per maand": baseYear.netMonthly - extraYear.netMonthly,
      "Indicatieve renteaftrek zonder extra": baseYear.monthlyTaxBenefit,
      "Indicatieve renteaftrek met extra": extraYear.monthlyTaxBenefit,
      "Restschuld zonder extra": baseYear.remainingBalance,
      "Restschuld met extra": extraYear.remainingBalance,
    });
  }

  return rows;
}

function summarizeYear(rows, year, homeValue, deductionRate) {
  const yearRows = rows.filter((row) => row.year === year);
  if (!yearRows.length) {
    return {
      grossMonthly: 0,
      netMonthly: 0,
      monthlyTaxBenefit: 0,
      remainingBalance: 0,
    };
  }

  const annualPayment = yearRows.reduce((sum, row) => sum + row.payment, 0);
  const annualInterest = yearRows.reduce((sum, row) => sum + row.interest, 0);
  const tax = estimateTaxBenefit({
    annualInterest,
    wozValue: homeValue,
    deductionRatePercent: deductionRate,
  });
  const grossMonthly = annualPayment / MONTHS_PER_YEAR;
  const monthlyTaxBenefit = tax.monthlyTaxBenefit;

  return {
    grossMonthly,
    netMonthly: Math.max(0, grossMonthly - monthlyTaxBenefit),
    monthlyTaxBenefit,
    remainingBalance: yearRows.at(-1)?.remainingBalance || 0,
  };
}

import {
  byId,
  bindCalculator,
  debounce,
  destroyChart,
  downloadCsv,
  downloadExcel,
  euro,
  euroMonth,
  percent,
  renderDetails,
  renderMetrics,
  renderTable,
  syncRangeNumber,
  valueNumber,
  valueString,
} from "./shared.js?v=native-20260611";
import {
  MortgageType,
  buildSchedule,
  estimateTaxBenefit,
  yearlyTotals,
} from "./mortgage-core.js?v=native-20260608b";

let paymentChart = null;
let currentScheduleRows = [];
let currentAssumptionsRows = [];
let currentTaxRows = [];

const tableColumns = [
  { key: "Maand", label: "Maand" },
  { key: "Jaar", label: "Jaar" },
  { key: "Bruto betaling", label: "Bruto betaling" },
  { key: "Rente", label: "Rente" },
  { key: "Aflossing", label: "Aflossing" },
  { key: "Restschuld", label: "Restschuld" },
];

function getInputs() {
  const purchasePrice = valueNumber("mortgage-purchase-price");
  const ownFunds = valueNumber("mortgage-own-funds");
  const mortgageAmount = Math.max(0, purchasePrice - ownFunds);
  const termYears = valueNumber("mortgage-term-years");

  return {
    purchasePrice,
    ownFunds,
    mortgageAmount,
    annualInterestRate: valueNumber("mortgage-interest-rate"),
    termYears,
    mortgageType: valueString("mortgage-type") || MortgageType.ANNUITY,
    wozValue: valueNumber("mortgage-woz-value"),
    selectedYear: Math.min(Math.max(1, valueNumber("mortgage-tax-year")), termYears),
    deductionRate: valueNumber("mortgage-deduction-rate"),
  };
}

function calculate() {
  const inputs = getInputs();
  byId("mortgage-amount-label").textContent = euro(inputs.mortgageAmount);

  const schedule = buildSchedule({
    principal: inputs.mortgageAmount,
    annualRatePercent: inputs.annualInterestRate,
    years: inputs.termYears,
    mortgageType: inputs.mortgageType,
  });
  const totals = yearlyTotals(schedule, inputs.selectedYear);
  const tax = estimateTaxBenefit({
    annualInterest: totals.interest,
    wozValue: inputs.wozValue,
    deductionRatePercent: inputs.deductionRate,
  });

  const first = schedule[0] || { payment: 0, interest: 0, principal: 0 };
  const netMonthly = first.payment - tax.monthlyTaxBenefit;

  byId("mortgage-primary-result").textContent = euroMonth(netMonthly);
  renderMetrics(byId("mortgage-metrics"), [
    { label: "Netto maandlast indicatief", value: euroMonth(netMonthly) },
    { label: "Bruto maandlast", value: euroMonth(first.payment) },
    { label: "Rente eerste maand", value: euroMonth(first.interest) },
    { label: "Aflossing eerste maand", value: euroMonth(first.principal) },
    { label: "Belastingvoordeel indicatief", value: euroMonth(tax.monthlyTaxBenefit) },
  ]);

  renderDetails(byId("mortgage-tax-details"), [
    { label: "Betaalde rente in gekozen jaar", value: euro(tax.annualInterest) },
    { label: "Eigenwoningforfait", value: euro(tax.eigenwoningforfait) },
    { label: "Saldo eigen woning voor Hillen", value: euro(tax.taxableHomeIncomeBeforeHillen) },
    { label: "Aftrek geen/kleine eigenwoningschuld", value: euro(tax.hillenDeduction) },
    { label: "Aftrekbaar bedrag", value: euro(tax.deductibleAmount) },
    { label: "Belastingvoordeel per jaar", value: euro(tax.taxBenefit) },
  ]);

  currentScheduleRows = schedule.map((row) => ({
    Maand: row.month,
    Jaar: row.year,
    "Bruto betaling": round2(row.payment),
    Rente: round2(row.interest),
    Aflossing: round2(row.principal),
    Restschuld: round2(row.remainingBalance),
  }));
  currentAssumptionsRows = [
    { Onderdeel: "Koopsom", Waarde: inputs.purchasePrice },
    { Onderdeel: "Eigen geld", Waarde: inputs.ownFunds },
    { Onderdeel: "Hypotheekbedrag", Waarde: inputs.mortgageAmount },
    { Onderdeel: "Rentepercentage", Waarde: percent(inputs.annualInterestRate) },
    { Onderdeel: "Looptijd in jaren", Waarde: inputs.termYears },
    { Onderdeel: "Hypotheekvorm", Waarde: inputs.mortgageType },
    { Onderdeel: "WOZ-waarde", Waarde: inputs.wozValue },
    { Onderdeel: "Aftrekpercentage", Waarde: percent(inputs.deductionRate) },
    { Onderdeel: "Belastingjaar in calculator", Waarde: inputs.selectedYear },
  ];
  currentTaxRows = [
    { Onderdeel: "Betaalde rente", Bedrag: round2(tax.annualInterest) },
    { Onderdeel: "Eigenwoningforfait", Bedrag: round2(tax.eigenwoningforfait) },
    { Onderdeel: "Saldo eigen woning voor Hillen", Bedrag: round2(tax.taxableHomeIncomeBeforeHillen) },
    { Onderdeel: "Aftrek geen/kleine eigenwoningschuld", Bedrag: round2(tax.hillenDeduction) },
    { Onderdeel: "Aftrekbaar bedrag", Bedrag: round2(tax.deductibleAmount) },
    { Onderdeel: "Belastingvoordeel per jaar", Bedrag: round2(tax.taxBenefit) },
    { Onderdeel: "Belastingvoordeel per maand", Bedrag: round2(tax.monthlyTaxBenefit) },
  ];

  renderTable(byId("mortgage-schedule-table"), tableColumns, currentScheduleRows);
  renderChart(schedule);
}

function renderChart(schedule) {
  const canvas = byId("mortgage-payment-chart");
  destroyChart(paymentChart);
  paymentChart = new window.Chart(canvas, {
    type: "line",
    data: {
      labels: schedule.map((row) => row.month),
      datasets: [
        {
          label: "Rente",
          data: schedule.map((row) => round2(row.interest)),
          borderColor: "#d94c57",
          backgroundColor: "rgba(217, 76, 87, 0.12)",
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: "Aflossing",
          data: schedule.map((row) => round2(row.principal)),
          borderColor: "#1769aa",
          backgroundColor: "rgba(23, 105, 170, 0.12)",
          pointRadius: 0,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (item) => `${item.dataset.label}: ${euro(item.raw)}`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Maand" } },
        y: { ticks: { callback: (value) => euro(value) } },
      },
    },
  });
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  const root = byId("hypotheek-native-calculator");
  if (!root) return;

  const recalculate = debounce(calculate);
  bindCalculator(root, recalculate);
  syncRangeNumber("mortgage-interest-range", "mortgage-interest-rate", recalculate);
  syncRangeNumber("mortgage-deduction-range", "mortgage-deduction-rate", recalculate);

  byId("mortgage-csv-download").addEventListener("click", () => {
    downloadCsv("hypotheek-aflossingsschema.csv", currentScheduleRows);
  });
  byId("mortgage-excel-download").addEventListener("click", () => {
    downloadExcel("hypotheek-aflossingsschema.xlsx", [
      { name: "Aflossingsschema", rows: currentScheduleRows },
      { name: "Invoer", rows: currentAssumptionsRows },
      { name: "Belasting", rows: currentTaxRows },
    ]);
  });

  calculate();
});

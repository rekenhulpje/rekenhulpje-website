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
  renderMetrics,
  renderTable,
  syncRangeNumber,
  valueNumber,
  valueString,
} from "./shared.js?v=native-20260611c";
import {
  MortgageType,
} from "./mortgage-core.js?v=native-20260608b";
import {
  calculateExtraPayoff,
  PayoffScenarioMode,
} from "./extra-payoff-core.js?v=native-20260611c";

let balanceChart = null;
let currentRows = [];
let currentSummaryRows = [];
let currentInputsRows = [];
let lastScenarioMode = null;

const columns = [
  { key: "Moment", label: "Moment" },
  { key: "Restschuld zonder extra", label: "Restschuld zonder extra" },
  { key: "Restschuld met extra", label: "Restschuld met extra" },
  { key: "Verschil restschuld", label: "Verschil restschuld" },
  { key: "Rente zonder extra", label: "Rente zonder extra" },
  { key: "Rente met extra", label: "Rente met extra" },
];

function getInputs() {
  const principal = valueNumber("payoff-principal");
  return {
    principal,
    annualRatePercent: valueNumber("payoff-interest-rate"),
    years: valueNumber("payoff-term-years"),
    oneTimeExtra: valueNumber("payoff-one-time-extra"),
    monthlyExtra: valueNumber("payoff-monthly-extra"),
    scenarioMode: valueString("payoff-scenario-mode") || PayoffScenarioMode.LOWER_PAYMENT,
    mortgageType: valueString("payoff-mortgage-type") || MortgageType.ANNUITY,
    homeValue: valueNumber("payoff-home-value") || principal,
    deductionRate: valueNumber("payoff-deduction-rate"),
  };
}

function calculate() {
  const inputs = getInputs();
  lastScenarioMode = inputs.scenarioMode;
  const result = calculateExtraPayoff(inputs);
  const newPayment = result.extraFirstPayment;
  const monthlyDifference = result.monthlyDifference;

  byId("payoff-primary-result").textContent = euroMonth(newPayment);
  byId("payoff-home-value").placeholder = String(Math.round(inputs.principal));
  byId("payoff-status").textContent =
    "Indicatief. Controleer altijd je boetevrije ruimte, bankvoorwaarden en fiscale gevolgen voordat je extra aflost.";

  const shortenTerm = inputs.scenarioMode === PayoffScenarioMode.SHORTEN_TERM;
  renderMetrics(
    byId("payoff-metrics"),
    shortenTerm
      ? [
          { label: "Maandlast met extra aflossen", value: euroMonth(newPayment) },
          { label: "Extra per maand", value: signedEuroMonth(monthlyDifference) },
          { label: "Rente bespaard indicatief", value: euro(result.interestSaved) },
          { label: "Eerder afgelost", value: `${result.monthsSaved} mnd` },
        ]
      : [
          { label: "Nieuwe maandlast indicatief", value: euroMonth(newPayment) },
          { label: "Verschil per maand", value: signedEuroMonth(monthlyDifference) },
          { label: "Rente bespaard indicatief", value: euro(result.interestSaved) },
          { label: "Restschuld na looptijd", value: euro(result.finalBalance) },
        ]
  );

  currentRows = result.comparisonRows.map((row) => ({
    ...row,
    "Restschuld zonder extra": round2(row["Restschuld zonder extra"]),
    "Restschuld met extra": round2(row["Restschuld met extra"]),
    "Verschil restschuld": round2(row["Verschil restschuld"]),
    "Rente zonder extra": round2(row["Rente zonder extra"]),
    "Rente met extra": round2(row["Rente met extra"]),
  }));

  currentSummaryRows = [
    { Onderdeel: "Nieuwe maandlast indicatief", Waarde: round2(newPayment) },
    { Onderdeel: "Oude maandlast indicatief", Waarde: round2(result.baseFirstPayment) },
    { Onderdeel: "Verschil per maand", Waarde: round2(monthlyDifference) },
    { Onderdeel: "Rente bespaard indicatief", Waarde: round2(result.interestSaved) },
    { Onderdeel: "Maanden eerder afgelost", Waarde: result.monthsSaved },
    { Onderdeel: "Restschuld na looptijd", Waarde: round2(result.finalBalance) },
  ];
  currentInputsRows = [
    { Veld: "Huidige hypotheek/restschuld", Waarde: inputs.principal },
    { Veld: "Rentepercentage", Waarde: percent(inputs.annualRatePercent) },
    { Veld: "Resterende looptijd", Waarde: inputs.years },
    { Veld: "Eenmalige extra aflossing", Waarde: inputs.oneTimeExtra },
    { Veld: "Extra over per maand", Waarde: inputs.monthlyExtra },
    { Veld: "Scenario", Waarde: scenarioModeLabel(inputs.scenarioMode) },
    { Veld: "Hypotheekvorm", Waarde: inputs.mortgageType },
    { Veld: "Woningwaarde/WOZ", Waarde: inputs.homeValue },
    { Veld: "Aftrekpercentage", Waarde: percent(inputs.deductionRate) },
  ];

  renderTable(byId("payoff-comparison-table"), columns, formatRows(currentRows));
  renderChart(result);
}

function watchScenarioModeChange() {
  const scenarioMode = valueString("payoff-scenario-mode") || PayoffScenarioMode.LOWER_PAYMENT;
  if (lastScenarioMode === null || scenarioMode === lastScenarioMode) return;
  calculate();
}

function formatRows(rows) {
  return rows.map((row) => ({
    ...row,
    "Restschuld zonder extra": euro(row["Restschuld zonder extra"]),
    "Restschuld met extra": euro(row["Restschuld met extra"]),
    "Verschil restschuld": euro(row["Verschil restschuld"]),
    "Rente zonder extra": euro(row["Rente zonder extra"]),
    "Rente met extra": euro(row["Rente met extra"]),
  }));
}

function renderChart(result) {
  const canvas = byId("payoff-balance-chart");
  destroyChart(balanceChart);
  const labels = result.base.rows
    .filter((row) => row.month % 12 === 0 || row.month === 1)
    .map((row) => row.month === 1 ? "Start" : `Jaar ${row.year}`);
  const baseData = result.base.rows
    .filter((row) => row.month % 12 === 0 || row.month === 1)
    .map((row) => round2(row.remainingBalance));
  const extraData = result.extra.rows
    .filter((row) => row.month % 12 === 0 || row.month === 1)
    .map((row) => round2(row.remainingBalance));

  balanceChart = new window.Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Zonder extra aflossen",
          data: baseData,
          borderColor: "#d94c57",
          backgroundColor: "rgba(217, 76, 87, 0.12)",
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: "Met extra aflossen",
          data: extraData,
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
        y: { ticks: { callback: (value) => euro(value) } },
      },
    },
  });
}

function scenarioModeLabel(value) {
  if (value === PayoffScenarioMode.SHORTEN_TERM) return "Looptijd verkorten";
  return "Maandlast verlagen";
}

function signedEuroMonth(value) {
  if (value === 0) return euroMonth(0);
  return `${value > 0 ? "+" : "-"}${euro(Math.abs(value))}/mnd`;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  const root = byId("extra-aflossen-native-calculator");
  if (!root) return;

  const recalculate = debounce(calculate);
  bindCalculator(root, recalculate);
  syncRangeNumber("payoff-interest-range", "payoff-interest-rate", recalculate);
  syncRangeNumber("payoff-deduction-range", "payoff-deduction-rate", recalculate);

  byId("payoff-csv-download").addEventListener("click", () => {
    downloadCsv("extra-aflossen-hypotheek-scenarios.csv", currentRows);
  });
  byId("payoff-excel-download").addEventListener("click", () => {
    downloadExcel("extra-aflossen-hypotheek.xlsx", [
      { name: "Samenvatting", rows: currentSummaryRows },
      { name: "Invoer", rows: currentInputsRows },
      { name: "Scenario's", rows: currentRows },
    ]);
  });

  calculate();
  window.setInterval(watchScenarioModeChange, 300);
});

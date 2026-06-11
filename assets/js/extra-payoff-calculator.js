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
} from "./extra-payoff-core.js?v=native-20260611d";

let balanceChart = null;
let costChart = null;
let currentRows = [];
let currentTermCostRows = [];
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

const termCostColumns = [
  { key: "Jaar", label: "Jaar" },
  { key: "Bruto maandlast zonder extra", label: "Bruto zonder extra" },
  { key: "Netto maandlast zonder extra", label: "Netto zonder extra" },
  { key: "Bruto maandlast met extra", label: "Bruto met extra" },
  { key: "Netto maandlast met extra", label: "Netto met extra" },
  { key: "Netto ruimte per maand", label: "Netto ruimte per maand" },
  { key: "Restschuld met extra", label: "Restschuld met extra" },
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
  const firstTermRow = result.termCostRows[0] || {};
  const firstNetPayment = firstTermRow["Netto maandlast met extra"] || 0;
  const firstNetDifference = firstTermRow["Netto ruimte per maand"] || 0;

  byId("payoff-primary-result").textContent = euroMonth(firstNetPayment);
  byId("payoff-home-value").placeholder = String(Math.round(inputs.principal));
  byId("payoff-status").textContent =
    "Indicatief. Controleer altijd je boetevrije ruimte, bankvoorwaarden en fiscale gevolgen voordat je extra aflost.";

  const reinvestSavings = [
    PayoffScenarioMode.SHORTEN_TERM,
    PayoffScenarioMode.REINVEST_SAVINGS,
  ].includes(inputs.scenarioMode);
  renderMetrics(
    byId("payoff-metrics"),
    reinvestSavings
      ? [
          { label: "Bruto maandlast met extra", value: euroMonth(newPayment) },
          { label: "Netto maandlast indicatief", value: euroMonth(firstNetPayment) },
          { label: "Netto verschil per maand", value: signedEuroMonth(firstNetDifference) },
          { label: "Rente bespaard indicatief", value: euro(result.interestSaved) },
          { label: "Eerder afgelost", value: `${result.monthsSaved} mnd` },
        ]
      : [
          { label: "Bruto maandlast met extra", value: euroMonth(newPayment) },
          { label: "Netto maandlast indicatief", value: euroMonth(firstNetPayment) },
          { label: "Netto extra over per maand", value: signedEuroMonth(firstNetDifference) },
          { label: "Bruto verschil per maand", value: signedEuroMonth(monthlyDifference * -1) },
          { label: "Rente bespaard indicatief", value: euro(result.interestSaved) },
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
  currentTermCostRows = result.termCostRows.map((row) => ({
    ...row,
    "Bruto maandlast zonder extra": round2(row["Bruto maandlast zonder extra"]),
    "Netto maandlast zonder extra": round2(row["Netto maandlast zonder extra"]),
    "Bruto maandlast met extra": round2(row["Bruto maandlast met extra"]),
    "Netto maandlast met extra": round2(row["Netto maandlast met extra"]),
    "Netto ruimte per maand": round2(row["Netto ruimte per maand"]),
    "Indicatieve renteaftrek zonder extra": round2(row["Indicatieve renteaftrek zonder extra"]),
    "Indicatieve renteaftrek met extra": round2(row["Indicatieve renteaftrek met extra"]),
    "Restschuld zonder extra": round2(row["Restschuld zonder extra"]),
    "Restschuld met extra": round2(row["Restschuld met extra"]),
  }));

  currentSummaryRows = [
    { Onderdeel: "Nieuwe bruto maandlast indicatief", Waarde: round2(newPayment) },
    { Onderdeel: "Nieuwe netto maandlast indicatief", Waarde: round2(firstNetPayment) },
    { Onderdeel: "Oude bruto maandlast indicatief", Waarde: round2(result.baseFirstPayment) },
    { Onderdeel: "Bruto verschil per maand", Waarde: round2(monthlyDifference) },
    { Onderdeel: "Netto ruimte per maand", Waarde: round2(firstNetDifference) },
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
  renderTable(byId("payoff-term-cost-table"), termCostColumns, formatTermCostRows(currentTermCostRows));
  renderChart(result);
  renderCostChart(result);
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

function formatTermCostRows(rows) {
  return rows.map((row) => ({
    ...row,
    "Bruto maandlast zonder extra": euroMonth(row["Bruto maandlast zonder extra"]),
    "Netto maandlast zonder extra": euroMonth(row["Netto maandlast zonder extra"]),
    "Bruto maandlast met extra": euroMonth(row["Bruto maandlast met extra"]),
    "Netto maandlast met extra": euroMonth(row["Netto maandlast met extra"]),
    "Netto ruimte per maand": signedEuroMonth(row["Netto ruimte per maand"]),
    "Indicatieve renteaftrek zonder extra": euroMonth(row["Indicatieve renteaftrek zonder extra"]),
    "Indicatieve renteaftrek met extra": euroMonth(row["Indicatieve renteaftrek met extra"]),
    "Restschuld zonder extra": euro(row["Restschuld zonder extra"]),
    "Restschuld met extra": euro(row["Restschuld met extra"]),
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

function renderCostChart(result) {
  const canvas = byId("payoff-cost-chart");
  if (!canvas) return;
  destroyChart(costChart);
  const yearlyRows = result.termCostRows.filter((row) => row.Jaar === 1 || row.Jaar % 2 === 0);

  costChart = new window.Chart(canvas, {
    type: "line",
    data: {
      labels: yearlyRows.map((row) => `Jaar ${row.Jaar}`),
      datasets: [
        {
          label: "Netto zonder extra",
          data: yearlyRows.map((row) => round2(row["Netto maandlast zonder extra"])),
          borderColor: "#d94c57",
          backgroundColor: "rgba(217, 76, 87, 0.12)",
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: "Netto met extra",
          data: yearlyRows.map((row) => round2(row["Netto maandlast met extra"])),
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
            label: (item) => `${item.dataset.label}: ${euroMonth(item.raw)}`,
          },
        },
      },
      scales: {
        y: { ticks: { callback: (value) => euroMonth(value) } },
      },
    },
  });
}

function scenarioModeLabel(value) {
  if (value === PayoffScenarioMode.SHORTEN_TERM || value === PayoffScenarioMode.REINVEST_SAVINGS) {
    return "Besparing opnieuw aflossen";
  }
  return "Vrij overhouden";
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
    downloadCsv("extra-aflossen-hypotheek-lasten-looptijd.csv", currentTermCostRows);
  });
  byId("payoff-excel-download").addEventListener("click", () => {
    downloadExcel("extra-aflossen-hypotheek.xlsx", [
      { name: "Samenvatting", rows: currentSummaryRows },
      { name: "Invoer", rows: currentInputsRows },
      { name: "Lasten looptijd", rows: currentTermCostRows },
      { name: "Scenario's", rows: currentRows },
    ]);
  });

  calculate();
  window.setInterval(watchScenarioModeChange, 300);
});

import {
  bindCalculator,
  byId,
  debounce,
  destroyChart,
  downloadCsv,
  downloadExcel,
  euro,
  percent,
  renderMetrics,
  renderTable,
  syncRangeNumber,
  valueNumber,
} from "./shared.js?v=native-20260611c";
import {
  calculateFirePlan,
} from "./fire-core.js?v=native-20260611";

let fireChart = null;
let latest = null;

const projectionColumns = [
  { key: "Jaar", label: "Jaar" },
  { key: "Leeftijd", label: "Leeftijd" },
  { key: "Vermogen", label: "Vermogen" },
  { key: "FIRE doelvermogen", label: "FIRE doelvermogen" },
  { key: "Jaarlijkse inleg", label: "Jaarlijkse inleg" },
  { key: "Verwacht rendement", label: "Verwacht rendement" },
  { key: "Afstand tot FIRE", label: "Afstand tot FIRE" },
];

function readInputs() {
  return {
    currentAge: valueNumber("fire-current-age"),
    currentNetWorth: valueNumber("fire-current-net-worth"),
    monthlyContribution: valueNumber("fire-monthly-contribution"),
    annualExpenses: valueNumber("fire-annual-expenses"),
    annualReturnPercent: valueNumber("fire-return-rate"),
    withdrawalRatePercent: valueNumber("fire-withdrawal-rate"),
    inflationPercent: valueNumber("fire-inflation-rate"),
    annualContributionIncreasePercent: valueNumber("fire-contribution-growth"),
    maxAge: 100,
    startYear: new Date().getFullYear(),
  };
}

function calculate() {
  const input = readInputs();
  const result = calculateFirePlan(input);
  latest = { input, result };

  byId("fire-primary-result").textContent = result.reached
    ? `${Math.round(result.fireAge)} jaar`
    : "Niet voor 100";
  byId("fire-status").textContent = result.reached
    ? `Indicatief bereikt in ${result.fireYear}. Rendement, inflatie en belasting kunnen afwijken.`
    : "Met deze aannames wordt FIRE niet bereikt voor leeftijd 100. Verhoog je inleg, verlaag je uitgaven of pas je aannames aan.";

  renderMetrics(byId("fire-metrics"), [
    { label: "FIRE datum", value: result.reached ? String(result.fireYear) : "Niet bereikt" },
    { label: "Benodigd vermogen nu", value: moneyOrDash(result.currentTarget) },
    { label: "Jaren tot FIRE", value: result.reached ? `${result.yearsToFire} jaar` : "Niet voor 100" },
    { label: "Vermogen op FIRE", value: result.reached ? euro(result.fireNetWorth) : euro(result.finalNetWorth) },
  ]);

  renderTable(byId("fire-projection-table"), projectionColumns, formatProjectionRows(result.projectionRows));
  renderFireChart(result);
}

function renderFireChart(result) {
  const canvas = byId("fire-chart");
  destroyChart(fireChart);
  const rows = result.projectionRows;

  fireChart = new window.Chart(canvas, {
    type: "line",
    data: {
      labels: rows.map((row) => `${row.Leeftijd}`),
      datasets: [
        {
          label: "Verwacht vermogen",
          data: rows.map((row) => round2(row.Vermogen)),
          borderColor: "#1769aa",
          backgroundColor: "rgba(23, 105, 170, 0.12)",
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: "FIRE doelvermogen",
          data: rows.map((row) => Number.isFinite(row["FIRE doelvermogen"]) ? round2(row["FIRE doelvermogen"]) : null),
          borderColor: "#e7a92e",
          backgroundColor: "rgba(231, 169, 46, 0.12)",
          borderDash: [6, 5],
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
            title: (items) => `Leeftijd ${items[0].label}`,
            label: (item) => `${item.dataset.label}: ${euro(item.raw)}`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: "Leeftijd" } },
        y: { ticks: { callback: (value) => euro(value) } },
      },
    },
  });
}

function formatProjectionRows(rows) {
  return rows.map((row) => ({
    ...row,
    Vermogen: euro(row.Vermogen),
    "FIRE doelvermogen": moneyOrDash(row["FIRE doelvermogen"]),
    "Jaarlijkse inleg": euro(row["Jaarlijkse inleg"]),
    "Verwacht rendement": euro(row["Verwacht rendement"]),
    "Afstand tot FIRE": moneyOrDash(row["Afstand tot FIRE"]),
  }));
}

function summaryRows() {
  const { input, result } = latest;
  return [
    { Kenmerk: "FIRE bereikt", Waarde: result.reached ? "Ja" : "Nee" },
    { Kenmerk: "FIRE leeftijd", Waarde: result.reached ? result.fireAge : "Niet voor 100" },
    { Kenmerk: "FIRE jaar", Waarde: result.reached ? result.fireYear : "Niet bereikt" },
    { Kenmerk: "Jaren tot FIRE", Waarde: result.yearsToFire ?? "Niet voor 100" },
    { Kenmerk: "Benodigd vermogen nu", Waarde: result.currentTarget },
    { Kenmerk: "Verwacht vermogen op FIRE/eind", Waarde: result.reached ? result.fireNetWorth : result.finalNetWorth },
    { Kenmerk: "Opnamepercentage", Waarde: percent(input.withdrawalRatePercent) },
  ];
}

function inputRows() {
  const { input } = latest;
  return [
    { Veld: "Huidige leeftijd", Waarde: input.currentAge },
    { Veld: "Huidig vermogen", Waarde: input.currentNetWorth },
    { Veld: "Maandelijkse inleg", Waarde: input.monthlyContribution },
    { Veld: "Jaarlijkse uitgaven na FIRE", Waarde: input.annualExpenses },
    { Veld: "Verwacht rendement na kosten en belasting", Waarde: percent(input.annualReturnPercent) },
    { Veld: "Opnamepercentage", Waarde: percent(input.withdrawalRatePercent) },
    { Veld: "Inflatiepercentage", Waarde: percent(input.inflationPercent) },
    { Veld: "Jaarlijkse verhoging inleg", Waarde: percent(input.annualContributionIncreasePercent) },
  ];
}

function projectionExportRows() {
  return latest.result.projectionRows.map((row) => ({
    ...row,
    Vermogen: round2(row.Vermogen),
    "FIRE doelvermogen": round2(row["FIRE doelvermogen"]),
    "Jaarlijkse inleg": round2(row["Jaarlijkse inleg"]),
    "Verwacht rendement": round2(row["Verwacht rendement"]),
    "Afstand tot FIRE": round2(row["Afstand tot FIRE"]),
  }));
}

function bindDownloads() {
  byId("fire-csv-download").addEventListener("click", () => {
    downloadCsv("fire-calculator-jaarprojectie.csv", projectionExportRows());
  });

  byId("fire-excel-download").addEventListener("click", () => {
    downloadExcel("fire-calculator.xlsx", [
      { name: "Samenvatting", rows: summaryRows() },
      { name: "Invoer", rows: inputRows() },
      { name: "Jaarprojectie", rows: projectionExportRows() },
    ]);
  });
}

function moneyOrDash(value) {
  if (!Number.isFinite(value)) return "-";
  return euro(value);
}

function round2(value) {
  if (!Number.isFinite(value)) return value;
  return Math.round(value * 100) / 100;
}

const root = byId("fire-native-calculator");
if (root) {
  const update = debounce(calculate);
  bindCalculator(root, update);
  syncRangeNumber("fire-return-range", "fire-return-rate", update);
  syncRangeNumber("fire-withdrawal-range", "fire-withdrawal-rate", update);
  syncRangeNumber("fire-inflation-range", "fire-inflation-rate", update);
  bindDownloads();
  calculate();
}

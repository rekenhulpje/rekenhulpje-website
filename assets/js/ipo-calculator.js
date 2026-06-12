import {
  bindCalculator,
  byId,
  debounce,
  downloadCsv,
  downloadExcel,
  euro,
  percent,
  renderMetrics,
  renderTable,
  valueNumber,
} from "./shared.js?v=native-20260611c";

let latest = null;
let scenarioChart = null;

const presets = {
  custom: {
    label: "Eigen scenario",
    ipoPrice: 100,
    laterPrice: 200,
    lowPercent: -50,
    highPercent: 300,
    note: "Vul zelf een startprijs, latere prijs en beweeglijkheid in.",
  },
  alphabet: {
    label: "Google/Alphabet stijl",
    ipoPrice: 100,
    laterPrice: 6000,
    lowPercent: -65,
    highPercent: 6500,
    note: "Voorbeeld van een zeer succesvolle tech-IPO. Afgeronde factor, niet realtime.",
  },
  amazon: {
    label: "Amazon stijl",
    ipoPrice: 100,
    laterPrice: 150000,
    lowPercent: -90,
    highPercent: 160000,
    note: "Extreem winnaarsscenario met enorme tussentijdse dalingen. Afgeronde factor.",
  },
  meta: {
    label: "Facebook/Meta stijl",
    ipoPrice: 100,
    laterPrice: 1600,
    lowPercent: -55,
    highPercent: 1900,
    note: "Sterke lange termijn, maar met moeilijke jaren na de beursgang.",
  },
  uber: {
    label: "Uber stijl",
    ipoPrice: 100,
    laterPrice: 220,
    lowPercent: -65,
    highPercent: 250,
    note: "Voorbeeld van een grote naam met een veel grilliger pad.",
  },
  coinbase: {
    label: "Coinbase stijl",
    ipoPrice: 100,
    laterPrice: 80,
    lowPercent: -90,
    highPercent: 160,
    note: "Hypegevoelig voorbeeld met grote pieken en diepe dalingen.",
  },
  rivian: {
    label: "Rivian stijl",
    ipoPrice: 100,
    laterPrice: 15,
    lowPercent: -90,
    highPercent: 150,
    note: "Negatief IPO-scenario waarbij veel hype verdampt.",
  },
};

const scenarioColumns = [
  { key: "Scenario", label: "Scenario" },
  { key: "Koers", label: "Koers" },
  { key: "Waarde", label: "Waarde" },
  { key: "Winst/verlies", label: "Winst/verlies" },
  { key: "Rendement", label: "Rendement" },
];

const exampleColumns = [
  { key: "Voorbeeld", label: "Voorbeeld" },
  { key: "Type", label: "Type" },
  { key: "Waarde van 1000 euro", label: "Waarde van 1000 euro" },
  { key: "Rendement", label: "Rendement" },
  { key: "Diepe daling", label: "Diepe daling" },
];

function applyPreset() {
  const key = byId("ipo-preset").value;
  const preset = presets[key] || presets.custom;
  byId("ipo-start-price").value = preset.ipoPrice;
  byId("ipo-later-price").value = preset.laterPrice;
  byId("ipo-low-percent").value = preset.lowPercent;
  byId("ipo-high-percent").value = preset.highPercent;
  byId("ipo-preset-note").textContent = preset.note;
}

function readInputs() {
  return {
    presetKey: byId("ipo-preset").value,
    investment: valueNumber("ipo-investment"),
    ipoPrice: Math.max(valueNumber("ipo-start-price"), 0.0001),
    laterPrice: Math.max(valueNumber("ipo-later-price"), 0),
    lowPercent: valueNumber("ipo-low-percent"),
    highPercent: valueNumber("ipo-high-percent"),
  };
}

function calculate() {
  const input = readInputs();
  const shares = input.investment / input.ipoPrice;
  const laterValue = shares * input.laterPrice;
  const profit = laterValue - input.investment;
  const returnPercent = ((input.laterPrice / input.ipoPrice) - 1) * 100;
  const lowValue = input.investment * (1 + input.lowPercent / 100);
  const highValue = input.investment * (1 + input.highPercent / 100);
  const recoveryNeeded = input.lowPercent < 0
    ? (Math.abs(input.lowPercent) / (100 - Math.abs(input.lowPercent))) * 100
    : 0;

  const scenarioRows = buildScenarioRows(input, shares);
  const exampleRows = buildExampleRows();
  latest = { input, shares, laterValue, profit, returnPercent, lowValue, highValue, recoveryNeeded, scenarioRows, exampleRows };

  byId("ipo-primary-result").textContent = euro(laterValue);
  byId("ipo-status").textContent = profit >= 0
    ? `Indicatieve winst: ${euro(profit)}. Dit is geen beleggingsadvies.`
    : `Indicatief verlies: ${euro(Math.abs(profit))}. Beleggen kan verlies opleveren.`;

  renderMetrics(byId("ipo-metrics"), [
    { label: "Rendement", value: percent(returnPercent, 1) },
    { label: "Winst/verlies", value: euro(profit) },
    { label: "Aantal aandelen indicatief", value: shares.toFixed(2).replace(".", ",") },
    { label: "Na diepe daling nodig voor herstel", value: percent(recoveryNeeded, 0) },
  ]);

  renderTable(byId("ipo-scenario-table"), scenarioColumns, formatScenarioRows(scenarioRows));
  renderTable(byId("ipo-example-table"), exampleColumns, formatExampleRows(exampleRows));
  renderScenarioChart(scenarioRows);
}

function buildScenarioRows(input, shares) {
  const points = [
    { label: "Diepe daling", price: input.ipoPrice * (1 + input.lowPercent / 100) },
    { label: "-70%", price: input.ipoPrice * 0.3 },
    { label: "-50%", price: input.ipoPrice * 0.5 },
    { label: "-25%", price: input.ipoPrice * 0.75 },
    { label: "IPO prijs", price: input.ipoPrice },
    { label: "+100%", price: input.ipoPrice * 2 },
    { label: "+300%", price: input.ipoPrice * 4 },
    { label: "Latere prijs", price: input.laterPrice },
    { label: "Hoogtepunt", price: input.ipoPrice * (1 + input.highPercent / 100) },
  ];

  return points.map((point) => {
    const value = Math.max(point.price, 0) * shares;
    return {
      Scenario: point.label,
      Koers: Math.max(point.price, 0),
      Waarde: value,
      "Winst/verlies": value - input.investment,
      Rendement: ((Math.max(point.price, 0) / input.ipoPrice) - 1) * 100,
    };
  });
}

function buildExampleRows() {
  return Object.entries(presets)
    .filter(([key]) => key !== "custom")
    .map(([, preset]) => {
      const returnPercent = ((preset.laterPrice / preset.ipoPrice) - 1) * 100;
      const value = 1000 * (preset.laterPrice / preset.ipoPrice);
      return {
        Voorbeeld: preset.label.replace(" stijl", ""),
        Type: returnPercent > 1000 ? "grote winnaar" : returnPercent > 0 ? "positief/gemengd" : "negatief",
        "Waarde van 1000 euro": value,
        Rendement: returnPercent,
        "Diepe daling": preset.lowPercent,
      };
    });
}

function renderScenarioChart(rows) {
  const canvas = byId("ipo-chart");
  if (scenarioChart) scenarioChart.destroy();

  scenarioChart = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: rows.map((row) => row.Scenario),
      datasets: [
        {
          label: "Waarde belegging",
          data: rows.map((row) => round2(row.Waarde)),
          backgroundColor: rows.map((row) => row["Winst/verlies"] >= 0 ? "rgba(23, 105, 170, 0.72)" : "rgba(198, 78, 78, 0.72)"),
          borderColor: rows.map((row) => row["Winst/verlies"] >= 0 ? "#1769aa" : "#c64e4e"),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `Waarde: ${euro(item.raw)}`,
          },
        },
      },
      scales: {
        y: { ticks: { callback: (value) => euro(value) } },
      },
    },
  });
}

function formatScenarioRows(rows) {
  return rows.map((row) => ({
    ...row,
    Koers: euro(row.Koers, 2),
    Waarde: euro(row.Waarde),
    "Winst/verlies": euro(row["Winst/verlies"]),
    Rendement: percent(row.Rendement, 1),
  }));
}

function formatExampleRows(rows) {
  return rows.map((row) => ({
    ...row,
    "Waarde van 1000 euro": euro(row["Waarde van 1000 euro"]),
    Rendement: percent(row.Rendement, 0),
    "Diepe daling": percent(row["Diepe daling"], 0),
  }));
}

function scenarioExportRows() {
  return latest.scenarioRows.map((row) => ({
    ...row,
    Koers: round2(row.Koers),
    Waarde: round2(row.Waarde),
    "Winst/verlies": round2(row["Winst/verlies"]),
    Rendement: round2(row.Rendement),
  }));
}

function exampleExportRows() {
  return latest.exampleRows.map((row) => ({
    ...row,
    "Waarde van 1000 euro": round2(row["Waarde van 1000 euro"]),
    Rendement: round2(row.Rendement),
    "Diepe daling": round2(row["Diepe daling"]),
  }));
}

function summaryRows() {
  const { input, laterValue, profit, returnPercent, recoveryNeeded } = latest;
  return [
    { Kenmerk: "Voorbeeld", Waarde: presets[input.presetKey]?.label || "Eigen scenario" },
    { Kenmerk: "Beleggingsbedrag", Waarde: input.investment },
    { Kenmerk: "Startprijs", Waarde: input.ipoPrice },
    { Kenmerk: "Latere prijs", Waarde: input.laterPrice },
    { Kenmerk: "Waarde later", Waarde: round2(laterValue) },
    { Kenmerk: "Winst/verlies", Waarde: round2(profit) },
    { Kenmerk: "Rendement", Waarde: round2(returnPercent) },
    { Kenmerk: "Herstel nodig na diepe daling", Waarde: round2(recoveryNeeded) },
  ];
}

function bindDownloads() {
  byId("ipo-csv-download").addEventListener("click", () => {
    downloadCsv("ipo-rendement-scenarios.csv", scenarioExportRows());
  });

  byId("ipo-excel-download").addEventListener("click", () => {
    downloadExcel("ipo-rendement-calculator.xlsx", [
      { name: "Samenvatting", rows: summaryRows() },
      { name: "Scenario's", rows: scenarioExportRows() },
      { name: "Voorbeelden", rows: exampleExportRows() },
    ]);
  });
}

function round2(value) {
  if (!Number.isFinite(value)) return value;
  return Math.round(value * 100) / 100;
}

const root = byId("ipo-native-calculator");
if (root) {
  const update = debounce(calculate);
  byId("ipo-preset").addEventListener("change", () => {
    applyPreset();
    update();
  });
  bindCalculator(root, update);
  bindDownloads();
  applyPreset();
  calculate();
}

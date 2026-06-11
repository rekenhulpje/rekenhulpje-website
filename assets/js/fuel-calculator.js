import {
  byId,
  euro,
  euroMonth,
  valueNumber,
  renderMetrics,
  renderDetails,
  renderTable,
  downloadCsv,
  downloadExcel,
  destroyChart,
  bindCalculator,
  debounce,
} from "./shared.js?v=native-20260611c";
import {
  FUEL_TYPES,
  FuelType,
  VAT_RATE,
  calculateFuelCosts,
  calculateTaxBreakdown,
  makePriceScenarios,
} from "./fuel-core.js";

let scenarioChart = null;
let taxChart = null;
let latest = null;

const scenarioColumns = [
  { key: "Scenario", label: "Scenario" },
  { key: "Literprijs", label: "Literprijs" },
  { key: "Liters per maand", label: "Liters per maand" },
  { key: "Maandkosten", label: "Maandkosten" },
  { key: "Jaarkosten", label: "Jaarkosten" },
  { key: "Extra per maand", label: "Extra per maand" },
  { key: "Extra per jaar", label: "Extra per jaar" },
];

function readInputs() {
  return {
    fuelType: byId("fuel-type")?.value || FuelType.PETROL,
    literPrice: valueNumber("fuel-liter-price"),
    kmPerMonth: valueNumber("fuel-km-month"),
    consumptionPer100Km: valueNumber("fuel-consumption"),
  };
}

function calculate() {
  const input = readInputs();
  const fuel = FUEL_TYPES[input.fuelType] ?? FUEL_TYPES[FuelType.PETROL];
  const costs = calculateFuelCosts(input);
  const tax = calculateTaxBreakdown({
    fuelType: input.fuelType,
    literPrice: input.literPrice,
    litersPerMonth: costs.litersPerMonth,
  });
  const scenarios = makePriceScenarios(input);

  latest = { input, fuel, costs, tax, scenarios };

  byId("fuel-primary-result").textContent = euroMonth(costs.monthlyCost);
  byId("fuel-liters-label").textContent = `${costs.litersPerMonth.toFixed(1).replace(".", ",")} liter per maand`;
  byId("fuel-assumption-label").textContent = `${fuel.label}: ${euro(fuel.excisePerLiter, 4)} accijns per liter, btw ${(VAT_RATE * 100).toFixed(0)}%`;

  renderMetrics(byId("fuel-metrics"), [
    { label: "Maandkosten", value: euroMonth(costs.monthlyCost) },
    { label: "Jaarkosten", value: euro(costs.yearlyCost) },
    { label: "Kosten per km", value: euro(costs.costPerKm, 2) },
    { label: "Liters per maand", value: `${costs.litersPerMonth.toFixed(1).replace(".", ",")} l` },
  ]);

  renderDetails(byId("fuel-tax-details"), [
    { label: "Accijns per maand", value: euro(tax.excise) },
    { label: "Btw per maand", value: euro(tax.vat) },
    { label: "Totaal belastingdeel", value: `${euro(tax.totalTax)} (${tax.taxSharePercent.toFixed(1).replace(".", ",")}%)` },
    { label: "Netto brandstofdeel", value: euro(tax.netFuel) },
  ]);

  renderTable(byId("fuel-scenarios-table"), scenarioColumns, formatScenarioRows(scenarios));
  renderScenarioChart(scenarios);
  renderTaxChart(tax);
}

function formatScenarioRows(rows) {
  return rows.map((row) => ({
    ...row,
    Literprijs: euro(row.Literprijs, 2),
    "Liters per maand": row["Liters per maand"].toFixed(1).replace(".", ","),
    Maandkosten: euro(row.Maandkosten),
    Jaarkosten: euro(row.Jaarkosten),
    "Extra per maand": euro(row["Extra per maand"]),
    "Extra per jaar": euro(row["Extra per jaar"]),
  }));
}

function renderScenarioChart(rows) {
  const ctx = byId("fuel-scenario-chart");
  destroyChart(scenarioChart);
  scenarioChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map((row) => row.Scenario),
      datasets: [
        {
          label: "Maandkosten",
          data: rows.map((row) => Math.round(row.Maandkosten)),
          backgroundColor: "#1769aa",
          borderRadius: 6,
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
            label: (context) => euro(context.parsed.y),
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => euro(value),
          },
        },
      },
    },
  });
}

function renderTaxChart(tax) {
  const ctx = byId("fuel-tax-chart");
  destroyChart(taxChart);
  taxChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Accijns", "Btw", "Netto brandstofdeel"],
      datasets: [
        {
          data: [tax.excise, tax.vat, tax.netFuel],
          backgroundColor: ["#e7a92e", "#1769aa", "#2d8c6f"],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (context) => `${context.label}: ${euro(context.parsed)}`,
          },
        },
      },
      cutout: "58%",
    },
  });
}

function scenarioExportRows() {
  return latest.scenarios.map((row) => ({
    Scenario: row.Scenario,
    Literprijs: row.Literprijs,
    "Liters per maand": row["Liters per maand"],
    Maandkosten: row.Maandkosten,
    Jaarkosten: row.Jaarkosten,
    "Extra per maand": row["Extra per maand"],
    "Extra per jaar": row["Extra per jaar"],
    "Belastingdeel per maand": row["Belastingdeel per maand"],
  }));
}

function bindDownloads() {
  byId("fuel-csv-download").addEventListener("click", () => {
    downloadCsv("brandstofkosten-scenarios.csv", scenarioExportRows());
  });

  byId("fuel-excel-download").addEventListener("click", () => {
    downloadExcel("brandstofkosten-calculator.xlsx", [
      {
        name: "Samenvatting",
        rows: [
          { Kenmerk: "Brandstof", Waarde: latest.fuel.label },
          { Kenmerk: "Maandkosten", Waarde: latest.costs.monthlyCost },
          { Kenmerk: "Jaarkosten", Waarde: latest.costs.yearlyCost },
          { Kenmerk: "Kosten per km", Waarde: latest.costs.costPerKm },
          { Kenmerk: "Totaal belastingdeel per maand", Waarde: latest.tax.totalTax },
        ],
      },
      {
        name: "Invoer",
        rows: [
          { Veld: "Literprijs", Waarde: latest.input.literPrice },
          { Veld: "Kilometers per maand", Waarde: latest.input.kmPerMonth },
          { Veld: "Verbruik per 100 km", Waarde: latest.input.consumptionPer100Km },
          { Veld: "Liters per maand", Waarde: latest.costs.litersPerMonth },
          { Veld: "Accijns per liter", Waarde: latest.tax.excisePerLiter },
        ],
      },
      { name: "Scenario's", rows: scenarioExportRows() },
      {
        name: "Belasting",
        rows: [
          { Post: "Accijns", Maandbedrag: latest.tax.excise },
          { Post: "Btw", Maandbedrag: latest.tax.vat },
          { Post: "Netto brandstofdeel", Maandbedrag: latest.tax.netFuel },
          { Post: "Totaal", Maandbedrag: latest.tax.total },
        ],
      },
    ]);
  });
}

function bindFuelDefaults() {
  byId("fuel-type").addEventListener("change", () => {
    const fuel = FUEL_TYPES[byId("fuel-type").value] ?? FUEL_TYPES[FuelType.PETROL];
    byId("fuel-liter-price").value = fuel.defaultPrice.toFixed(2);
    byId("fuel-consumption").value = fuel.defaultConsumption.toFixed(1);
    calculate();
  });
}

const root = byId("brandstof-native-calculator");
if (root) {
  const update = debounce(calculate);
  bindCalculator(root, update);
  bindFuelDefaults();
  bindDownloads();
  calculate();
}

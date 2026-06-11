import {
  byId,
  bindCalculator,
  debounce,
  destroyChart,
  downloadCsv,
  downloadExcel,
  euro,
  percent,
  renderDetails,
  renderMetrics,
  renderTable,
  syncRangeNumber,
  valueNumber,
} from "./shared.js?v=native-20260611c";
import {
  calculateSale,
  makeScenarios,
} from "./sale-proceeds-core.js?v=native-20260608b";

let waterfallChart = null;
let currentSummaryRows = [];
let currentInputRows = [];
let currentScenarioRows = [];

const scenarioColumns = [
  { key: "Scenario", label: "Scenario" },
  { key: "Verkoopprijs", label: "Verkoopprijs" },
  { key: "Netto over na verkoop", label: "Netto over na verkoop" },
  { key: "Fiscale overwaarde indicatief", label: "Fiscale overwaarde indicatief" },
  { key: "Totale verkoopkosten", label: "Totale verkoopkosten" },
  { key: "Restschuld", label: "Restschuld" },
];

function getInputs() {
  return {
    salePrice: valueNumber("sale-price"),
    remainingMortgage: valueNumber("sale-remaining-mortgage"),
    existingHomeReserve: valueNumber("sale-existing-home-reserve"),
    brokerPercentage: valueNumber("sale-broker-percentage"),
    brokerFixedFee: valueNumber("sale-broker-fixed-fee"),
    energyLabelCost: valueNumber("sale-energy-label-cost"),
    stylingPhotographyCost: valueNumber("sale-styling-cost"),
    valuationInspectionCost: valueNumber("sale-valuation-cost"),
    advertisingCost: valueNumber("sale-advertising-cost"),
    otherSaleCosts: valueNumber("sale-other-costs"),
    penaltyInterest: valueNumber("sale-penalty-interest"),
    notaryRoyementCost: valueNumber("sale-notary-cost"),
    movingBuffer: valueNumber("sale-moving-buffer"),
    nextHomePurchasePrice: valueNumber("sale-next-home-price"),
    nextHomePurchaseCosts: valueNumber("sale-next-home-costs"),
    desiredNewMortgage: valueNumber("sale-desired-new-mortgage"),
  };
}

function calculate() {
  const inputs = getInputs();
  const result = calculateSale(inputs);

  byId("sale-primary-result").textContent = euro(result.netSaleProceeds);
  renderMetrics(byId("sale-metrics"), [
    { label: "Fiscale overwaarde indicatief", value: euro(result.fiscalSurplus) },
    { label: "Totale verkoopkosten", value: euro(result.saleCosts) },
    { label: "Extra afrekening", value: euro(result.extraSettlementCosts) },
    { label: "Restschuld / ruimte", value: euro(result.restDebt > 0 ? result.restDebt : result.availableCash) },
  ]);

  const status = byId("sale-status");
  if (result.restDebt > 0) {
    status.className = "alert warn";
    status.textContent = `De berekening komt uit op een mogelijke restschuld van ${euro(result.restDebt)}.`;
  } else {
    status.className = "alert good";
    status.textContent = `Indicatief beschikbaar na verkoop: ${euro(result.availableCash)}.`;
  }

  renderDetails(byId("sale-tax-details"), [
    { label: "Nieuwe eigenwoningreserve indicatief", value: euro(result.newHomeReserve) },
    { label: "Maximaal aftrekbare eigenwoningschuld volgende woning", value: euro(result.maxDeductibleHomeDebt) },
    { label: "Gewenste hypotheek mogelijk niet-aftrekbaar", value: euro(result.nonDeductibleRequestedDebt) },
    { label: "Makelaarskosten", value: euro(result.brokerCosts) },
  ]);

  currentScenarioRows = makeScenarios(inputs);
  currentSummaryRows = [
    { Onderdeel: "Netto over na verkoop", Bedrag: round2(result.netSaleProceeds) },
    { Onderdeel: "Fiscale overwaarde indicatief", Bedrag: round2(result.fiscalSurplus) },
    { Onderdeel: "Nieuwe eigenwoningreserve indicatief", Bedrag: round2(result.newHomeReserve) },
    { Onderdeel: "Totale verkoopkosten", Bedrag: round2(result.saleCosts) },
    { Onderdeel: "Extra afrekening", Bedrag: round2(result.extraSettlementCosts) },
    { Onderdeel: "Restschuld", Bedrag: round2(result.restDebt) },
  ];
  currentInputRows = Object.entries({
    "Verwachte verkoopprijs": inputs.salePrice,
    "Resterende hypotheek / eigenwoningschuld": inputs.remainingMortgage,
    "Bestaande eigenwoningreserve": inputs.existingHomeReserve,
    Makelaarscourtage: percent(inputs.brokerPercentage, 1),
    "Vaste makelaarskosten": inputs.brokerFixedFee,
    Energielabel: inputs.energyLabelCost,
    "Verkoopstyling / fotografie": inputs.stylingPhotographyCost,
    "Taxatie / keuring": inputs.valuationInspectionCost,
    Advertentiekosten: inputs.advertisingCost,
    "Overige verkoopkosten": inputs.otherSaleCosts,
    "Boeterente / afloskosten": inputs.penaltyInterest,
    "Notaris / royement": inputs.notaryRoyementCost,
    Verhuisbuffer: inputs.movingBuffer,
    "Aankoopprijs volgende woning": inputs.nextHomePurchasePrice,
    "Aankoopkosten volgende woning": inputs.nextHomePurchaseCosts,
    "Gewenste nieuwe hypotheek": inputs.desiredNewMortgage,
  }).map(([Veld, Waarde]) => ({ Veld, Waarde }));

  renderTable(byId("sale-scenarios-table"), scenarioColumns, currentScenarioRows);
  renderWaterfall(inputs, result);
}

function renderWaterfall(inputs, result) {
  const canvas = byId("sale-waterfall-chart");
  const afterMortgage = inputs.salePrice - inputs.remainingMortgage;
  const afterSaleCosts = afterMortgage - result.saleCosts;
  const afterExtra = result.netSaleProceeds;
  const bars = [
    [0, inputs.salePrice],
    [afterMortgage, inputs.salePrice],
    [afterSaleCosts, afterMortgage],
    [afterExtra, afterSaleCosts],
    [Math.min(0, afterExtra), Math.max(0, afterExtra)],
  ];

  destroyChart(waterfallChart);
  waterfallChart = new window.Chart(canvas, {
    type: "bar",
    data: {
      labels: ["Verkoopprijs", "Hypotheek", "Verkoopkosten", "Extra afrekening", "Netto over"],
      datasets: [
        {
          label: "Bedrag",
          data: bars,
          backgroundColor: ["#2bb3a3", "#d94c57", "#d94c57", "#d94c57", "#1769aa"],
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
            label: (item) => {
              const [start, end] = item.raw;
              return euro(Math.abs(end - start));
            },
          },
        },
      },
      scales: {
        y: { ticks: { callback: (value) => euro(value) } },
      },
    },
  });
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  const root = byId("verkoopopbrengst-native-calculator");
  if (!root) return;

  const recalculate = debounce(calculate);
  bindCalculator(root, recalculate);
  syncRangeNumber("sale-broker-range", "sale-broker-percentage", recalculate);

  byId("sale-csv-download").addEventListener("click", () => {
    downloadCsv("verkoopopbrengst-scenarios.csv", currentScenarioRows);
  });
  byId("sale-excel-download").addEventListener("click", () => {
    downloadExcel("verkoopopbrengst-calculator.xlsx", [
      { name: "Samenvatting", rows: currentSummaryRows },
      { name: "Invoer", rows: currentInputRows },
      { name: "Scenario's", rows: currentScenarioRows },
    ]);
  });

  calculate();
});

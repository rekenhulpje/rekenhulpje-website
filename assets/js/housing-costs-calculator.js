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
} from "./shared.js?v=native-20260608c";
import {
  MortgageType,
  buildSchedule,
  estimateTaxBenefit,
  yearlyTotals,
} from "./mortgage-core.js?v=native-20260608b";
import {
  annualToMonthly,
  makeDonutRows,
  totalMonthlyCost,
} from "./housing-core.js?v=native-20260608b";

let donutChart = null;
let currentSummaryRows = [];
let currentInputRows = [];
let currentMonthlyRows = [];

const monthlyColumns = [
  { key: "Categorie", label: "Categorie" },
  { key: "Post", label: "Post" },
  { key: "Maandbedrag", label: "Maandbedrag" },
];

function getInputs() {
  const purchasePrice = valueNumber("housing-purchase-price");
  const ownFunds = valueNumber("housing-own-funds");
  const suggestedMortgage = Math.max(0, purchasePrice - ownFunds);
  return {
    purchasePrice,
    wozValue: valueNumber("housing-woz-value"),
    ownFunds,
    suggestedMortgage,
    mortgageAmount: valueNumber("housing-mortgage-amount"),
    annualInterestRate: valueNumber("housing-interest-rate"),
    termYears: valueNumber("housing-term-years"),
    mortgageType: valueString("housing-mortgage-type") || MortgageType.ANNUITY,
    energy: valueNumber("housing-energy"),
    water: valueNumber("housing-water"),
    internet: valueNumber("housing-internet"),
    insurance: valueNumber("housing-insurance"),
    maintenance: valueNumber("housing-maintenance"),
    vve: valueNumber("housing-vve"),
    localTaxesYearly: valueNumber("housing-local-taxes"),
    waterBoardYearly: valueNumber("housing-water-board"),
    leasehold: valueNumber("housing-leasehold"),
    contingency: valueNumber("housing-contingency"),
    parkingStorage: valueNumber("housing-parking-storage"),
    otherHousing: valueNumber("housing-other"),
    deductionRate: valueNumber("housing-deduction-rate"),
    selectedYear: valueNumber("housing-tax-year"),
  };
}

function calculate() {
  const inputs = getInputs();
  byId("housing-suggested-mortgage").textContent = euro(inputs.suggestedMortgage);

  const schedule = buildSchedule({
    principal: inputs.mortgageAmount,
    annualRatePercent: inputs.annualInterestRate,
    years: inputs.termYears,
    mortgageType: inputs.mortgageType,
  });
  const selectedYear = Math.min(Math.max(1, inputs.selectedYear), inputs.termYears);
  const yearTotals = yearlyTotals(schedule, selectedYear);
  const tax = estimateTaxBenefit({
    annualInterest: yearTotals.interest,
    wozValue: inputs.wozValue,
    deductionRatePercent: inputs.deductionRate,
  });
  const grossMortgageMonthly = schedule[0]?.payment || 0;
  const netMortgageMonthly = Math.max(0, grossMortgageMonthly - tax.monthlyTaxBenefit);

  const costItems = [
    item("Netto hypotheek", "Netto hypotheek", netMortgageMonthly),
    item("Energie/water", "Energie", inputs.energy),
    item("Energie/water", "Water", inputs.water),
    item("Internet en diensten", "Internet en diensten", inputs.internet),
    item("Verzekeringen", "Verzekeringen", inputs.insurance),
    item("Belastingen", "Lokale belastingen", annualToMonthly(inputs.localTaxesYearly)),
    item("Belastingen", "Waterschap", annualToMonthly(inputs.waterBoardYearly)),
    item("Onderhoud/VvE/erfpacht", "Onderhoud", inputs.maintenance),
    item("Onderhoud/VvE/erfpacht", "VvE", inputs.vve),
    item("Onderhoud/VvE/erfpacht", "Erfpacht", inputs.leasehold),
    item("Optionele woonlasten", "Onvoorzien / reservering", inputs.contingency),
    item("Optionele woonlasten", "Parkeren / berging / opslag", inputs.parkingStorage),
    item("Optionele woonlasten", "Overige woonlasten", inputs.otherHousing),
  ];

  const fixedCostsMonthly = totalMonthlyCost(costItems.slice(1));
  const totalCostsMonthly = totalMonthlyCost(costItems);

  byId("housing-primary-result").textContent = euroMonth(totalCostsMonthly);
  renderMetrics(byId("housing-metrics"), [
    { label: "Bruto hypotheek", value: euroMonth(grossMortgageMonthly) },
    { label: "Netto hypotheek indicatief", value: euroMonth(netMortgageMonthly) },
    { label: "Vaste woonlasten", value: euroMonth(fixedCostsMonthly) },
    { label: "Woonlasten per jaar", value: euro(totalCostsMonthly * 12) },
  ]);

  currentMonthlyRows = costItems.map((costItem) => ({
    Categorie: costItem.category,
    Post: costItem.label,
    Maandbedrag: round2(costItem.monthlyAmount),
  }));
  currentSummaryRows = [
    { Onderdeel: "Totale netto woonlasten per maand", Bedrag: round2(totalCostsMonthly) },
    { Onderdeel: "Woonlasten per jaar", Bedrag: round2(totalCostsMonthly * 12) },
    { Onderdeel: "Bruto hypotheek per maand", Bedrag: round2(grossMortgageMonthly) },
    { Onderdeel: "Netto hypotheek indicatief per maand", Bedrag: round2(netMortgageMonthly) },
    { Onderdeel: "Vaste woonlasten per maand", Bedrag: round2(fixedCostsMonthly) },
    { Onderdeel: "Belastingvoordeel indicatief per maand", Bedrag: round2(tax.monthlyTaxBenefit) },
  ];
  currentInputRows = Object.entries({
    "Woningwaarde / koopsom": inputs.purchasePrice,
    "WOZ-waarde": inputs.wozValue,
    "Eigen geld": inputs.ownFunds,
    "Hypotheekbedrag": inputs.mortgageAmount,
    "Rentepercentage": percent(inputs.annualInterestRate),
    "Looptijd": inputs.termYears,
    "Hypotheekvorm": inputs.mortgageType,
    Energie: inputs.energy,
    Water: inputs.water,
    "Internet en diensten": inputs.internet,
    Verzekeringen: inputs.insurance,
    Onderhoud: inputs.maintenance,
    VvE: inputs.vve,
    "Lokale belastingen per jaar": inputs.localTaxesYearly,
    "Waterschap per jaar": inputs.waterBoardYearly,
    Erfpacht: inputs.leasehold,
    "Onvoorzien / reservering": inputs.contingency,
    "Parkeren / berging / opslag": inputs.parkingStorage,
    "Overige woonlasten": inputs.otherHousing,
    Aftrekpercentage: percent(inputs.deductionRate),
    "Belastingjaar in berekening": selectedYear,
  }).map(([Veld, Waarde]) => ({ Veld, Waarde }));

  renderTable(byId("housing-costs-table"), monthlyColumns, currentMonthlyRows);
  renderDonut(makeDonutRows(costItems, 5));
}

function renderDonut(rows) {
  const canvas = byId("housing-donut-chart");
  destroyChart(donutChart);
  donutChart = new window.Chart(canvas, {
    type: "doughnut",
    data: {
      labels: rows.map((row) => row.Categorie),
      datasets: [
        {
          data: rows.map((row) => round2(row.Maandbedrag)),
          backgroundColor: ["#1769aa", "#2bb3a3", "#d94c57", "#f2a541", "#6d7dd2", "#7c8794", "#8c6ccf"],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
      plugins: {
        legend: { position: "bottom" },
        tooltip: {
          callbacks: {
            label: (item) => {
              const total = item.dataset.data.reduce((sum, value) => sum + value, 0);
              const share = total > 0 ? (item.raw / total) * 100 : 0;
              return `${item.label}: ${euro(item.raw)} (${percent(share, 1)})`;
            },
          },
        },
      },
    },
  });
}

function item(category, label, monthlyAmount) {
  return { category, label, monthlyAmount };
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => {
  const root = byId("woonlasten-native-calculator");
  if (!root) return;

  const recalculate = debounce(calculate);
  bindCalculator(root, recalculate);
  syncRangeNumber("housing-interest-range", "housing-interest-rate", recalculate);
  syncRangeNumber("housing-deduction-range", "housing-deduction-rate", recalculate);

  byId("housing-csv-download").addEventListener("click", () => {
    downloadCsv("woonlasten-maandlasten.csv", currentMonthlyRows);
  });
  byId("housing-excel-download").addEventListener("click", () => {
    downloadExcel("woonlasten-overzicht.xlsx", [
      { name: "Samenvatting", rows: currentSummaryRows },
      { name: "Invoer", rows: currentInputRows },
      { name: "Maandlasten", rows: currentMonthlyRows },
    ]);
  });

  calculate();
});

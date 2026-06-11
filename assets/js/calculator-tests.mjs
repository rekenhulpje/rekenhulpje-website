import {
  MortgageType,
  annuityPayment,
  buildSchedule,
  eigenwoningforfait2026,
  estimateTaxBenefit,
} from "./mortgage-core.js";
import {
  annualToMonthly,
  makeDonutRows,
  totalMonthlyCost,
} from "./housing-core.js";
import {
  calculateSale,
  makeScenarios,
} from "./sale-proceeds-core.js";
import {
  FuelType,
  calculateFuelCosts,
  calculateTaxBreakdown,
  makePriceScenarios,
} from "./fuel-core.js";
import {
  calculateExtraPayoff,
  PayoffScenarioMode,
} from "./extra-payoff-core.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  assert(Object.is(actual, expected), `${message}: expected ${expected}, got ${actual}`);
}

function assertClose(actual, expected, message, tolerance = 0.01) {
  assert(Math.abs(actual - expected) <= tolerance, `${message}: expected ${expected}, got ${actual}`);
}

const annuitySchedule = buildSchedule({
  principal: 300_000,
  annualRatePercent: 4,
  years: 30,
  mortgageType: MortgageType.ANNUITY,
});
assertEqual(annuitySchedule.length, 360, "annuity schedule length");
assertEqual(annuitySchedule.at(-1).remainingBalance, 0, "annuity pays down to zero");
assertClose(annuitySchedule[0].payment, annuityPayment(300_000, 4, 30), "annuity first payment");

const linearSchedule = buildSchedule({
  principal: 300_000,
  annualRatePercent: 4,
  years: 30,
  mortgageType: MortgageType.LINEAR,
});
assert(linearSchedule[0].payment > linearSchedule.at(-1).payment, "linear payment declines");
assertEqual(linearSchedule.at(-1).remainingBalance, 0, "linear pays down to zero");

assertEqual(eigenwoningforfait2026(280_000), 980, "eigenwoningforfait regular band");
const tax = estimateTaxBenefit({
  annualInterest: 10_000,
  wozValue: 280_000,
  deductionRatePercent: 37.56,
});
assertEqual(tax.eigenwoningforfait, 980, "tax estimate eigenwoningforfait");
assertEqual(tax.deductibleAmount, 9_020, "tax deductible amount");
assertClose(tax.taxBenefit, 3_387.912, "tax benefit");

assertEqual(annualToMonthly(1_200), 100, "annual to monthly");
const housingItems = [
  { category: "Netto hypotheek", label: "Netto hypotheek", monthlyAmount: 900 },
  { category: "Belastingen", label: "Belastingen", monthlyAmount: 40 },
  { category: "Verzekeringen", label: "Verzekeringen", monthlyAmount: 30 },
  { category: "Energie/water", label: "Energie", monthlyAmount: 30 },
];
assertEqual(totalMonthlyCost(housingItems), 1_000, "housing total");
assertEqual(JSON.stringify(makeDonutRows(housingItems, 5)), JSON.stringify([
  { Categorie: "Netto hypotheek", Maandbedrag: 900 },
  { Categorie: "Overig", Maandbedrag: 100 },
]), "donut groups small categories");

const saleInputs = {
  salePrice: 450_000,
  remainingMortgage: 300_000,
  existingHomeReserve: 0,
  brokerPercentage: 1.5,
  brokerFixedFee: 0,
  energyLabelCost: 300,
  stylingPhotographyCost: 750,
  valuationInspectionCost: 0,
  advertisingCost: 0,
  otherSaleCosts: 0,
  penaltyInterest: 0,
  notaryRoyementCost: 0,
  movingBuffer: 2_500,
  nextHomePurchasePrice: 0,
  nextHomePurchaseCosts: 0,
  desiredNewMortgage: 0,
};
const saleResult = calculateSale(saleInputs);
assertEqual(saleResult.saleCosts, 7_800, "sale costs");
assertEqual(saleResult.fiscalSurplus, 142_200, "fiscal surplus");
assertEqual(saleResult.netSaleProceeds, 139_700, "net sale proceeds");
const scenarios = makeScenarios(saleInputs);
assertEqual(scenarios.length, 6, "scenario count");
assertEqual(scenarios[0].Scenario, "-10,0%", "first scenario");
assertEqual(scenarios.at(-1).Scenario, "+5,0%", "last scenario");

const fuelCosts = calculateFuelCosts({
  literPrice: 2.23,
  kmPerMonth: 1200,
  consumptionPer100Km: 6.8,
});
assertClose(fuelCosts.litersPerMonth, 81.6, "fuel liters per month");
assertClose(fuelCosts.monthlyCost, 181.968, "fuel monthly cost");
assertClose(fuelCosts.costPerKm, 0.15164, "fuel cost per km", 0.00001);

const fuelTax = calculateTaxBreakdown({
  fuelType: FuelType.PETROL,
  literPrice: 2.23,
  litersPerMonth: fuelCosts.litersPerMonth,
});
assertClose(fuelTax.vat, fuelTax.total * (0.21 / 1.21), "fuel vat");
assertClose(fuelTax.excise, 68.92752, "fuel excise");
assertClose(fuelTax.totalTax + fuelTax.netFuel, fuelTax.total, "fuel tax parts add up");

const fuelScenarios = makePriceScenarios({
  fuelType: FuelType.PETROL,
  literPrice: 2.23,
  kmPerMonth: 1200,
  consumptionPer100Km: 6.8,
});
assertEqual(fuelScenarios.length, 5, "fuel scenario count");
assertEqual(fuelScenarios.at(-1).Scenario, "+50 cent", "fuel last scenario");
assert(fuelScenarios.at(-1).Maandkosten > fuelScenarios[0].Maandkosten, "fuel scenarios increase");

const noExtraPayoff = calculateExtraPayoff({
  principal: 300_000,
  annualRatePercent: 4,
  years: 25,
  oneTimeExtra: 0,
  monthlyExtra: 0,
  mortgageType: MortgageType.ANNUITY,
});
assertClose(noExtraPayoff.baseFirstPayment, noExtraPayoff.extraFirstPayment, "no extra payoff same payment");
assertClose(noExtraPayoff.interestSaved, 0, "no extra payoff saves no interest");

const oneTimePayoff = calculateExtraPayoff({
  principal: 300_000,
  annualRatePercent: 4,
  years: 25,
  oneTimeExtra: 20_000,
  monthlyExtra: 0,
  scenarioMode: PayoffScenarioMode.LOWER_PAYMENT,
  mortgageType: MortgageType.ANNUITY,
  homeValue: 300_000,
  deductionRate: 37.56,
});
assert(oneTimePayoff.extraFirstPayment < oneTimePayoff.baseFirstPayment, "one-time payoff lowers monthly payment");
assert(oneTimePayoff.interestSaved > 0, "one-time payoff saves interest");
assert(oneTimePayoff.comparisonRows[0]["Restschuld met extra"] < oneTimePayoff.comparisonRows[0]["Restschuld zonder extra"], "one-time payoff lowers balance");
assert(oneTimePayoff.termCostRows.length > 0, "payoff term cost rows exist");
assert(oneTimePayoff.termCostRows[0]["Netto maandlast met extra"] < oneTimePayoff.termCostRows[0]["Netto maandlast zonder extra"], "lower payment lowers net monthly cost");
assert(oneTimePayoff.termCostRows[0]["Netto ruimte per maand"] > 0, "lower payment creates net monthly room");

const shortenTermPayoff = calculateExtraPayoff({
  principal: 300_000,
  annualRatePercent: 4,
  years: 25,
  oneTimeExtra: 20_000,
  monthlyExtra: 0,
  scenarioMode: PayoffScenarioMode.SHORTEN_TERM,
  mortgageType: MortgageType.ANNUITY,
});
assertClose(shortenTermPayoff.extraFirstPayment, shortenTermPayoff.baseFirstPayment, "shorten term keeps monthly payment");
assert(shortenTermPayoff.monthsSaved > oneTimePayoff.monthsSaved, "shorten term saves more months");
assert(shortenTermPayoff.interestSaved > oneTimePayoff.interestSaved, "shorten term saves more interest");

const reinvestSavingsPayoff = calculateExtraPayoff({
  principal: 300_000,
  annualRatePercent: 4,
  years: 25,
  oneTimeExtra: 20_000,
  monthlyExtra: 0,
  scenarioMode: PayoffScenarioMode.REINVEST_SAVINGS,
  mortgageType: MortgageType.ANNUITY,
  homeValue: 300_000,
  deductionRate: 37.56,
});
assertClose(reinvestSavingsPayoff.extraFirstPayment, reinvestSavingsPayoff.baseFirstPayment, "reinvest savings keeps gross monthly payment");
assert(reinvestSavingsPayoff.monthsSaved > 0, "reinvest savings shortens payoff");

const monthlyPayoff = calculateExtraPayoff({
  principal: 300_000,
  annualRatePercent: 4,
  years: 25,
  oneTimeExtra: 0,
  monthlyExtra: 200,
  scenarioMode: PayoffScenarioMode.SHORTEN_TERM,
  mortgageType: MortgageType.ANNUITY,
});
assert(monthlyPayoff.interestSaved > 0, "monthly payoff saves interest");
assert(monthlyPayoff.monthsSaved > 0, "monthly payoff shortens payoff");

const oversizedPayoff = calculateExtraPayoff({
  principal: 50_000,
  annualRatePercent: 4,
  years: 10,
  oneTimeExtra: 75_000,
  monthlyExtra: 100,
  mortgageType: MortgageType.ANNUITY,
});
assertEqual(oversizedPayoff.finalBalance, 0, "extra payoff cannot create negative balance");

export const passed = true;

export const VAT_RATE = 0.21;

export const FuelType = Object.freeze({
  PETROL: "benzine",
  DIESEL: "diesel",
  LPG: "lpg",
});

export const FUEL_TYPES = Object.freeze({
  [FuelType.PETROL]: {
    label: "Benzine",
    defaultPrice: 2.23,
    defaultConsumption: 6.8,
    excisePerLiter: 0.8447,
  },
  [FuelType.DIESEL]: {
    label: "Diesel",
    defaultPrice: 2.14,
    defaultConsumption: 5.4,
    excisePerLiter: 0.5523,
  },
  [FuelType.LPG]: {
    label: "LPG",
    defaultPrice: 1.04,
    defaultConsumption: 8.5,
    excisePerLiter: 0.1993,
  },
});

export const PRICE_INCREASES = Object.freeze([0, 0.05, 0.1, 0.25, 0.5]);

export function monthlyLiters(kmPerMonth, consumptionPer100Km) {
  if (kmPerMonth <= 0 || consumptionPer100Km <= 0) return 0;
  return (kmPerMonth * consumptionPer100Km) / 100;
}

export function calculateFuelCosts({ literPrice, kmPerMonth, consumptionPer100Km }) {
  const litersPerMonth = monthlyLiters(kmPerMonth, consumptionPer100Km);
  const monthlyCost = litersPerMonth * Math.max(0, literPrice);
  const yearlyCost = monthlyCost * 12;
  const costPerKm = kmPerMonth > 0 ? monthlyCost / kmPerMonth : 0;

  return {
    litersPerMonth,
    monthlyCost,
    yearlyCost,
    costPerKm,
  };
}

export function calculateTaxBreakdown({ fuelType, literPrice, litersPerMonth }) {
  const fuel = FUEL_TYPES[fuelType] ?? FUEL_TYPES[FuelType.PETROL];
  const total = Math.max(0, literPrice) * Math.max(0, litersPerMonth);
  const vat = total * (VAT_RATE / (1 + VAT_RATE));
  const excise = fuel.excisePerLiter * Math.max(0, litersPerMonth);
  const netFuel = Math.max(0, total - vat - excise);
  const totalTax = vat + excise;

  return {
    excisePerLiter: fuel.excisePerLiter,
    total,
    excise,
    vat,
    totalTax,
    netFuel,
    taxSharePercent: total > 0 ? (totalTax / total) * 100 : 0,
  };
}

export function makePriceScenarios({ fuelType, literPrice, kmPerMonth, consumptionPer100Km }) {
  const base = calculateFuelCosts({ literPrice, kmPerMonth, consumptionPer100Km });

  return PRICE_INCREASES.map((increase) => {
    const scenarioPrice = Math.max(0, literPrice + increase);
    const costs = calculateFuelCosts({
      literPrice: scenarioPrice,
      kmPerMonth,
      consumptionPer100Km,
    });
    const tax = calculateTaxBreakdown({
      fuelType,
      literPrice: scenarioPrice,
      litersPerMonth: costs.litersPerMonth,
    });

    return {
      Scenario: increase === 0 ? "Huidige prijs" : `+${Math.round(increase * 100)} cent`,
      Literprijs: scenarioPrice,
      "Liters per maand": costs.litersPerMonth,
      "Maandkosten": costs.monthlyCost,
      "Jaarkosten": costs.yearlyCost,
      "Extra per maand": costs.monthlyCost - base.monthlyCost,
      "Extra per jaar": (costs.monthlyCost - base.monthlyCost) * 12,
      "Belastingdeel per maand": tax.totalTax,
    };
  });
}

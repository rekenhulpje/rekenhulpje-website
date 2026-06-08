export const SCENARIO_PERCENTAGES = [-10, -5, -2.5, 0, 2.5, 5];

export function calculateSale(inputs) {
  const brokerCosts = inputs.salePrice * (inputs.brokerPercentage / 100) + inputs.brokerFixedFee;
  const saleCosts =
    brokerCosts +
    inputs.energyLabelCost +
    inputs.stylingPhotographyCost +
    inputs.valuationInspectionCost +
    inputs.advertisingCost +
    inputs.otherSaleCosts;
  const extraSettlementCosts = inputs.penaltyInterest + inputs.notaryRoyementCost + inputs.movingBuffer;
  const fiscalSurplus = inputs.salePrice - inputs.remainingMortgage - saleCosts;
  const newHomeReserve = inputs.existingHomeReserve + fiscalSurplus;
  const positiveHomeReserve = Math.max(0, newHomeReserve);
  const netSaleProceeds = inputs.salePrice - inputs.remainingMortgage - saleCosts - extraSettlementCosts;
  const restDebt = Math.abs(Math.min(0, netSaleProceeds));
  const availableCash = Math.max(0, netSaleProceeds);
  const nextHomeTotal = inputs.nextHomePurchasePrice + inputs.nextHomePurchaseCosts;
  const maxDeductibleHomeDebt = Math.max(0, nextHomeTotal - positiveHomeReserve);
  const nonDeductibleRequestedDebt = Math.max(0, inputs.desiredNewMortgage - maxDeductibleHomeDebt);

  return {
    brokerCosts,
    saleCosts,
    extraSettlementCosts,
    fiscalSurplus,
    newHomeReserve,
    netSaleProceeds,
    restDebt,
    availableCash,
    maxDeductibleHomeDebt,
    nonDeductibleRequestedDebt,
  };
}

export function makeScenarios(inputs, percentages = SCENARIO_PERCENTAGES) {
  return percentages.map((scenarioPercentage) => {
    const scenarioPrice = inputs.salePrice * (1 + scenarioPercentage / 100);
    const result = calculateSale({ ...inputs, salePrice: scenarioPrice });
    return {
      Scenario: `${scenarioPercentage >= 0 ? "+" : ""}${scenarioPercentage.toFixed(1).replace(".", ",")}%`,
      Verkoopprijs: round2(scenarioPrice),
      "Netto over na verkoop": round2(result.netSaleProceeds),
      "Fiscale overwaarde indicatief": round2(result.fiscalSurplus),
      "Totale verkoopkosten": round2(result.saleCosts),
      Restschuld: round2(result.restDebt),
    };
  });
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

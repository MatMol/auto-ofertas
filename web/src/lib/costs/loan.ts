export interface LoanResult {
  cuotaMensual: number;
  totalIntereses: number;
  totalDevolver: number;
  montoFinanciado: number;
}

const IVA_RATE = 0.21;

export function calculateLoan(
  vehiclePrice: number,
  financingPercentage: number,
  annualRate: number,
  months: number
): LoanResult {
  const montoFinanciado = Math.round(vehiclePrice * (financingPercentage / 100));

  if (months === 0 || annualRate === 0) {
    return {
      cuotaMensual: Math.round(montoFinanciado / Math.max(months, 1)),
      totalIntereses: 0,
      totalDevolver: montoFinanciado,
      montoFinanciado,
    };
  }

  const monthlyRate = annualRate / 100 / 12;
  const factor =
    (monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);
  const cuotaBase = montoFinanciado * factor;

  const totalBase = cuotaBase * months;
  const interesesTotales = totalBase - montoFinanciado;
  const ivaIntereses = interesesTotales * IVA_RATE;

  const cuotaMensual = Math.round(cuotaBase + ivaIntereses / months);
  const totalDevolver = Math.round(totalBase + ivaIntereses);
  const totalIntereses = Math.round(interesesTotales + ivaIntereses);

  return {
    cuotaMensual,
    totalIntereses,
    totalDevolver,
    montoFinanciado,
  };
}

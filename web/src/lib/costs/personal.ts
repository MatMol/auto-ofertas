import { calculatePatente } from "./patente";
import { calculateFuel } from "./fuel";
import { calculateInsurance } from "./insurance";
import { getFuelPricePerLiter } from "../constants/fuel-prices";
import type { Preferences } from "../personal";
import type { Listing } from "../types";
export function personalCosts(l: Listing, p: Preferences) {
  const price =
    l.currency === "USD" && p.usdRate > 0 ? l.price * p.usdRate : l.priceArs;
  const patente = calculatePatente(p.fiscalValue || price, p.province);
  const baseFuel = calculateFuel(
    l.fuelType,
    l.bodyType,
    l.tankCapacity,
    l.consumption,
    p.monthlyKm,
  );
  const ratio =
    p.fuelPrice > 0
      ? p.fuelPrice / getFuelPricePerLiter(l.fuelType || "nafta")
      : 1;
  const fuel = {
    ...baseFuel,
    llenarTanque: Math.round(baseFuel.llenarTanque * ratio),
    costoMensual: Math.round(baseFuel.costoMensual * ratio),
  };
  const insurance = calculateInsurance(l.bodyType, l.year, p.province);
  const insuranceMonthly =
    p.insurance || (insurance.tercerosMin + insurance.tercerosMax) / 2;
  return {
    price,
    patente,
    fuel,
    insurance,
    insuranceMonthly,
    monthlyTotal: Math.round(
      patente.cuotaBimestral / 2 +
        fuel.costoMensual +
        insuranceMonthly +
        p.maintenance +
        p.parking +
        p.tolls,
    ),
  };
}

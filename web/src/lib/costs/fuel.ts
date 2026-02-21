import {
  getFuelPricePerLiter,
  getDefaultConsumption,
  getDefaultTankCapacity,
} from "@/lib/constants/fuel-prices";

export interface FuelResult {
  llenarTanque: number;
  costoMensual: number;
  consumoPor100km: number;
  precioUnidad: number;
  unidad: string;
}

export function calculateFuel(
  fuelType: string | null,
  bodyType: string | null,
  tankCapacity: number | null,
  consumption: number | null,
  monthlyKm: number
): FuelResult {
  const ft = fuelType ?? "nafta";
  const isElectric = ft === "electrico";

  const precioUnidad = getFuelPricePerLiter(ft);
  const consumo = consumption ?? getDefaultConsumption(bodyType, ft);
  const tanque = tankCapacity ?? getDefaultTankCapacity(bodyType, ft);

  const llenarTanque = Math.round(tanque * precioUnidad);
  const costoMensual = Math.round((consumo / 100) * monthlyKm * precioUnidad);

  return {
    llenarTanque,
    costoMensual,
    consumoPor100km: consumo,
    precioUnidad,
    unidad: isElectric ? "kWh" : "L",
  };
}

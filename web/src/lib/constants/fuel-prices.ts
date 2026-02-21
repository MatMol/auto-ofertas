export const FUEL_PRICES = {
  nafta_super: 1_350,
  nafta_premium: 1_520,
  diesel: 1_280,
  gnc: 450,
  electricidad_kwh: 120,
} as const;

export const DEFAULT_CONSUMPTION: Record<string, number> = {
  sedan_nafta: 8.5,
  sedan_diesel: 6.5,
  sedan_gnc: 10.0,
  suv_nafta: 10.5,
  suv_diesel: 8.0,
  hatchback_nafta: 7.5,
  hatchback_diesel: 5.8,
  pickup_nafta: 12.5,
  pickup_diesel: 9.5,
  coupe_nafta: 9.5,
  electrico: 16.0, // kWh/100km
  hibrido: 5.5,
  default: 9.0,
};

export const DEFAULT_TANK_CAPACITY: Record<string, number> = {
  sedan: 50,
  suv: 60,
  hatchback: 45,
  pickup: 75,
  coupe: 50,
  van: 70,
  convertible: 50,
  electrico: 60, // kWh
  default: 55,
};

export function getFuelPricePerLiter(fuelType: string): number {
  switch (fuelType) {
    case "nafta":
      return FUEL_PRICES.nafta_super;
    case "diesel":
      return FUEL_PRICES.diesel;
    case "gnc":
      return FUEL_PRICES.gnc;
    case "electrico":
      return FUEL_PRICES.electricidad_kwh;
    default:
      return FUEL_PRICES.nafta_super;
  }
}

export function getDefaultConsumption(
  bodyType: string | null,
  fuelType: string | null
): number {
  if (fuelType === "electrico") return DEFAULT_CONSUMPTION["electrico"];
  if (fuelType === "hibrido") return DEFAULT_CONSUMPTION["hibrido"];

  const key = `${bodyType ?? "sedan"}_${fuelType ?? "nafta"}`;
  return DEFAULT_CONSUMPTION[key] ?? DEFAULT_CONSUMPTION["default"];
}

export function getDefaultTankCapacity(
  bodyType: string | null,
  fuelType: string | null
): number {
  if (fuelType === "electrico") return DEFAULT_TANK_CAPACITY["electrico"];
  return DEFAULT_TANK_CAPACITY[bodyType ?? "default"] ?? DEFAULT_TANK_CAPACITY["default"];
}

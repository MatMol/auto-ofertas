export interface PatenteTramo {
  hasta: number;
  fijo: number;
  porcentaje: number;
}

export const PATENTE_TRAMOS_ARBA: PatenteTramo[] = [
  { hasta: 14_100_000, fijo: 0, porcentaje: 1 },
  { hasta: 18_700_000, fijo: 141_000, porcentaje: 2 },
  { hasta: 26_100_000, fijo: 233_000, porcentaje: 3 },
  { hasta: 53_900_000, fijo: 455_000, porcentaje: 4 },
  { hasta: Infinity, fijo: 1_567_000, porcentaje: 4.5 },
];

export const PATENTE_TRAMOS_AGIP: PatenteTramo[] = [
  { hasta: 12_000_000, fijo: 0, porcentaje: 1.2 },
  { hasta: 20_000_000, fijo: 144_000, porcentaje: 2.5 },
  { hasta: 35_000_000, fijo: 344_000, porcentaje: 3.5 },
  { hasta: 60_000_000, fijo: 869_000, porcentaje: 4 },
  { hasta: Infinity, fijo: 1_869_000, porcentaje: 4.5 },
];

export const PATENTE_TRAMOS_DEFAULT: PatenteTramo[] = [
  { hasta: 15_000_000, fijo: 0, porcentaje: 1.2 },
  { hasta: 25_000_000, fijo: 180_000, porcentaje: 2 },
  { hasta: 40_000_000, fijo: 380_000, porcentaje: 3 },
  { hasta: Infinity, fijo: 830_000, porcentaje: 3.5 },
];

export function getTramosForProvince(province: string): PatenteTramo[] {
  switch (province) {
    case "Buenos Aires":
      return PATENTE_TRAMOS_ARBA;
    case "CABA":
      return PATENTE_TRAMOS_AGIP;
    default:
      return PATENTE_TRAMOS_DEFAULT;
  }
}

export interface PatentamientoResult {
  arancelInscripcion: number;
  sellos: number;
  formularios: number;
  total: number;
}

const SELLOS_POR_PROVINCIA: Record<string, number> = {
  CABA: 0.03,
  "Buenos Aires": 0.025,
  Córdoba: 0.02,
  "Santa Fe": 0.02,
  Mendoza: 0.025,
};
const DEFAULT_SELLOS = 0.02;

const FORMULARIOS_FIJOS = 35_000;

export function calculatePatentamiento(
  price: number,
  province: string,
  isImported: boolean
): PatentamientoResult {
  const porcentajeArancel = isImported ? 0.02 : 0.015;
  const arancelInscripcion = Math.round(price * porcentajeArancel);

  const porcentajeSellos =
    SELLOS_POR_PROVINCIA[province] ?? DEFAULT_SELLOS;
  const sellos = Math.round(price * porcentajeSellos);

  return {
    arancelInscripcion,
    sellos,
    formularios: FORMULARIOS_FIJOS,
    total: arancelInscripcion + sellos + FORMULARIOS_FIJOS,
  };
}

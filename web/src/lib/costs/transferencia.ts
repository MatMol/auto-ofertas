export interface TransferenciaResult {
  arancelInscripcion: number;
  gastosFijos: number;
  total: number;
}

const GASTOS_FIJOS = {
  formularios: 15_000,
  verificacionPolicial: 25_000,
  informeDominio: 12_000,
  certificadoEstadoDeuda: 8_000,
};

const TOTAL_GASTOS_FIJOS = Object.values(GASTOS_FIJOS).reduce(
  (a, b) => a + b,
  0
);

export function calculateTransferencia(
  price: number,
  isImported: boolean
): TransferenciaResult {
  const porcentaje = isImported ? 0.02 : 0.015;
  const arancelInscripcion = Math.round(price * porcentaje);

  return {
    arancelInscripcion,
    gastosFijos: TOTAL_GASTOS_FIJOS,
    total: arancelInscripcion + TOTAL_GASTOS_FIJOS,
  };
}

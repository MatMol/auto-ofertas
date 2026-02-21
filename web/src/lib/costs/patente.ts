import { getTramosForProvince } from "@/lib/constants/patente-tramos";

export interface PatenteResult {
  cuotaBimestral: number;
  costoAnual: number;
  costoAnualConDescuentos: number;
}

export function calculatePatente(
  valuacionFiscal: number,
  province: string
): PatenteResult {
  const tramos = getTramosForProvince(province);
  let impuestoAnual = 0;

  let prevHasta = 0;
  for (const tramo of tramos) {
    if (valuacionFiscal <= tramo.hasta) {
      const excedente = valuacionFiscal - prevHasta;
      impuestoAnual = tramo.fijo + (excedente * tramo.porcentaje) / 100;
      break;
    }
    prevHasta = tramo.hasta;
  }

  const cuotaBimestral = Math.round(impuestoAnual / 6);
  const descPagoAnticipado = 0.1;
  const descBuenCumplimiento = 0.1;
  const costoAnualConDescuentos = Math.round(
    impuestoAnual * (1 - descPagoAnticipado) * (1 - descBuenCumplimiento)
  );

  return {
    cuotaBimestral,
    costoAnual: Math.round(impuestoAnual),
    costoAnualConDescuentos,
  };
}

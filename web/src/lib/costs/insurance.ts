import { getInsuranceRange } from "@/lib/constants/insurance-ranges";

export interface InsuranceResult {
  tercerosMin: number;
  tercerosMax: number;
  todoRiesgoMin: number;
  todoRiesgoMax: number;
}

export function calculateInsurance(
  bodyType: string | null,
  year: number,
  province: string
): InsuranceResult {
  return getInsuranceRange(bodyType, year, province);
}

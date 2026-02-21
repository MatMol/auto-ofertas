interface InsuranceRange {
  tercerosMin: number;
  tercerosMax: number;
  todoRiesgoMin: number;
  todoRiesgoMax: number;
}

interface InsuranceCategory {
  bodyTypes: string[];
  maxAge: number;
  zones: Record<string, InsuranceRange>;
}

const DEFAULT_ZONE: InsuranceRange = {
  tercerosMin: 35_000,
  tercerosMax: 70_000,
  todoRiesgoMin: 70_000,
  todoRiesgoMax: 140_000,
};

const INSURANCE_CATEGORIES: InsuranceCategory[] = [
  {
    bodyTypes: ["sedan", "hatchback"],
    maxAge: 5,
    zones: {
      CABA: { tercerosMin: 45_000, tercerosMax: 85_000, todoRiesgoMin: 90_000, todoRiesgoMax: 160_000 },
      "Buenos Aires": { tercerosMin: 40_000, tercerosMax: 80_000, todoRiesgoMin: 80_000, todoRiesgoMax: 150_000 },
      default: { tercerosMin: 35_000, tercerosMax: 70_000, todoRiesgoMin: 70_000, todoRiesgoMax: 130_000 },
    },
  },
  {
    bodyTypes: ["sedan", "hatchback"],
    maxAge: 15,
    zones: {
      CABA: { tercerosMin: 35_000, tercerosMax: 65_000, todoRiesgoMin: 70_000, todoRiesgoMax: 120_000 },
      "Buenos Aires": { tercerosMin: 30_000, tercerosMax: 60_000, todoRiesgoMin: 60_000, todoRiesgoMax: 110_000 },
      default: { tercerosMin: 25_000, tercerosMax: 55_000, todoRiesgoMin: 55_000, todoRiesgoMax: 100_000 },
    },
  },
  {
    bodyTypes: ["suv", "pickup"],
    maxAge: 5,
    zones: {
      CABA: { tercerosMin: 60_000, tercerosMax: 120_000, todoRiesgoMin: 120_000, todoRiesgoMax: 200_000 },
      "Buenos Aires": { tercerosMin: 55_000, tercerosMax: 110_000, todoRiesgoMin: 110_000, todoRiesgoMax: 180_000 },
      default: { tercerosMin: 45_000, tercerosMax: 90_000, todoRiesgoMin: 90_000, todoRiesgoMax: 160_000 },
    },
  },
  {
    bodyTypes: ["suv", "pickup"],
    maxAge: 15,
    zones: {
      CABA: { tercerosMin: 45_000, tercerosMax: 85_000, todoRiesgoMin: 85_000, todoRiesgoMax: 150_000 },
      "Buenos Aires": { tercerosMin: 40_000, tercerosMax: 80_000, todoRiesgoMin: 80_000, todoRiesgoMax: 140_000 },
      default: { tercerosMin: 35_000, tercerosMax: 70_000, todoRiesgoMin: 70_000, todoRiesgoMax: 120_000 },
    },
  },
];

export function getInsuranceRange(
  bodyType: string | null,
  year: number,
  province: string
): InsuranceRange {
  const age = new Date().getFullYear() - year;
  const bt = bodyType ?? "sedan";

  const category = INSURANCE_CATEGORIES.find(
    (c) => c.bodyTypes.includes(bt) && age <= c.maxAge
  );

  if (!category) {
    const fallback = INSURANCE_CATEGORIES.find(
      (c) => c.bodyTypes.includes(bt)
    );
    if (fallback) {
      return fallback.zones[province] ?? fallback.zones["default"] ?? DEFAULT_ZONE;
    }
    return DEFAULT_ZONE;
  }

  return category.zones[province] ?? category.zones["default"] ?? DEFAULT_ZONE;
}

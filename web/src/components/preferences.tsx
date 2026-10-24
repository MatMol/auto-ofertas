"use client";
import { usePersonal, updatePersonal, type Preferences } from "@/lib/personal";
import { PROVINCES } from "@/lib/types";
const fields: { key: keyof Preferences; label: string }[] = [
  { key: "yearMin", label: "Año mínimo para destacados" },
  { key: "kmMax", label: "Kilometraje máximo" },
  { key: "budget", label: "Presupuesto máximo (ARS)" },
  { key: "monthlyKm", label: "Km mensuales" },
  { key: "usdRate", label: "Cotización USD/ARS personal (0: usar aviso)" },
  {
    key: "fuelPrice",
    label: "Combustible por litro / energía por kWh (0: estimación)",
  },
  { key: "insurance", label: "Seguro mensual (0: estimación)" },
  { key: "fiscalValue", label: "Valuación fiscal (0: aproximar con precio)" },
  { key: "transferCost", label: "Transferencia cotizada (0: estimación)" },
  { key: "registrationCost", label: "Patentamiento cotizado (0: estimación)" },
  { key: "maintenance", label: "Mantenimiento mensual" },
  { key: "parking", label: "Cochera mensual" },
  { key: "tolls", label: "Peajes mensuales" },
];
export function PreferencesForm() {
  const { preferences: p } = usePersonal();
  return (
    <details className="border rounded-lg p-4">
      <summary className="font-semibold cursor-pointer">
        Mis preferencias y costos
      </summary>
      <p className="text-sm text-muted-foreground my-3">
        Se guardan en este navegador. Los costos personalizados se usan también
        en el comparador. Revisá cada supuesto antes de decidir.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="text-sm">
          Provincia de radicación
          <select
            className="block w-full border rounded p-2"
            value={p.province}
            onChange={(e) =>
              updatePersonal((s) => ({
                ...s,
                preferences: { ...s.preferences, province: e.target.value },
              }))
            }
          >
            {PROVINCES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        {fields.map(({ key, label }) => (
          <label key={key} className="text-sm">
            {label}
            <input
              type="number"
              min={0}
              className="block w-full border rounded p-2"
              value={p[key]}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= 0)
                  updatePersonal((s) => ({
                    ...s,
                    preferences: { ...s.preferences, [key]: v },
                  }));
              }}
            />
          </label>
        ))}
      </div>
    </details>
  );
}

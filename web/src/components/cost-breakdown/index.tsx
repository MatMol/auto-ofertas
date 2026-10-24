"use client";
import { usePersonal, updatePersonal } from "@/lib/personal";
import { personalCosts } from "@/lib/costs/personal";
import Link from "next/link";

import { useState, useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Receipt,
  FileText,
  Fuel,
  Shield,
  Landmark,
  Calculator,
  Zap,
} from "lucide-react";
import { calculateTransferencia } from "@/lib/costs/transferencia";
import { calculatePatentamiento } from "@/lib/costs/patentamiento";
import { calculateLoan } from "@/lib/costs/loan";
import { formatPrice } from "@/lib/format";
import { PROVINCES } from "@/lib/types";
import type { Listing } from "@/lib/types";

function CostSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="flex items-center gap-2 font-semibold text-sm">
        <Icon size={16} className="text-muted-foreground" />
        {title}
      </h4>
      <div className="pl-6 space-y-2">{children}</div>
    </div>
  );
}

function CostRow({
  label,
  value,
  secondary,
  highlight,
}: {
  label: string;
  value: string;
  secondary?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={highlight ? "font-bold text-base" : "font-medium"}>
          {value}
        </span>
        {secondary && (
          <span className="block text-xs text-muted-foreground">
            {secondary}
          </span>
        )}
      </div>
    </div>
  );
}

export function CostBreakdown({ listing }: { listing: Listing }) {
  const { preferences } = usePersonal();
  const fieldId = useId();
  const province = preferences.province,
    monthlyKm = preferences.monthlyKm;
  const setProvince = (province: string) =>
    updatePersonal((p) => ({
      ...p,
      preferences: { ...p.preferences, province },
    }));
  const setMonthlyKm = (monthlyKm: number) =>
    updatePersonal((p) => ({
      ...p,
      preferences: { ...p.preferences, monthlyKm: Math.max(0, monthlyKm) },
    }));
  const calculated = personalCosts(listing, preferences);
  const [financingPct, setFinancingPct] = useState(70);
  const [loanMonths, setLoanMonths] = useState(48);
  const [tna, setTna] = useState(57.5);

  const { patente, fuel, insurance, monthlyTotal } = calculated;
  const transferencia = !listing.isNew
    ? calculateTransferencia(calculated.price, listing.isImported)
    : null;
  const patentamiento = listing.isNew
    ? calculatePatentamiento(calculated.price, province, listing.isImported)
    : null;
  const loan = calculateLoan(calculated.price, financingPct, tna, loanMonths);

  const monthlyTotalWithLoan = monthlyTotal + loan.cuotaMensual;

  const isElectric = listing.fuelType === "electrico";

  if (listing.priceKind !== "total" || calculated.price <= 0)
    return (
      <Card>
        <CardContent className="p-6">
          Los costos requieren un precio total confirmado y una conversión
          válida a ARS.
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator size={20} />
          Detalle de Costos
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Estimaciones calculadas automáticamente para este vehículo. Ajustá
          provincia y km mensuales para personalizar.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-muted-foreground">
          Tablas orientativas sin validación de vigencia. La patente usa{" "}
          {preferences.fiscalValue
            ? "tu valuación fiscal"
            : "el precio publicado como aproximación de valuación fiscal"}
          . El origen nacional/importado no está confirmado.{" "}
          <Link href="/mi-garage" className="underline">
            Editar costos, cotización y supuestos
          </Link>
          .
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-province`} className="text-xs">
              Provincia de radicación
            </Label>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger id={`${fieldId}-province`} className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${fieldId}-km`} className="text-xs">
              Km mensuales estimados
            </Label>
            <Input
              type="number"
              id={`${fieldId}-km`}
              min={0}
              value={monthlyKm}
              onChange={(e) => setMonthlyKm(Number(e.target.value) || 0)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <Separator />

        {/* Patente */}
        <CostSection icon={Receipt} title="Patente bimestral">
          <CostRow
            label="Cuota bimestral"
            value={formatPrice(patente.cuotaBimestral)}
          />
          <CostRow
            label="Costo anual"
            value={formatPrice(patente.costoAnual)}
          />
          <CostRow
            label="Con descuentos (pago anticipado + buen cumplimiento)"
            value={formatPrice(patente.costoAnualConDescuentos)}
            secondary="-19% aproximado"
          />
        </CostSection>

        <Separator />

        {/* Transferencia o Patentamiento */}
        {transferencia && (
          <>
            <CostSection icon={FileText} title="Transferencia (usado)">
              <CostRow
                label={`Arancel (${listing.isImported ? "2%" : "1.5%"} del valor)`}
                value={formatPrice(transferencia.arancelInscripcion)}
              />
              <CostRow
                label="Gastos fijos (formularios, verificación, informes)"
                value={formatPrice(transferencia.gastosFijos)}
              />
              <CostRow
                label="Total transferencia"
                value={formatPrice(
                  preferences.transferCost || transferencia.total,
                )}
                highlight
              />
            </CostSection>
            <Separator />
          </>
        )}

        {patentamiento && (
          <>
            <CostSection icon={FileText} title="Patentamiento (0 km)">
              <CostRow
                label={`Arancel inscripción (${listing.isImported ? "2%" : "1.5%"})`}
                value={formatPrice(patentamiento.arancelInscripcion)}
              />
              <CostRow
                label="Impuesto de sellos"
                value={formatPrice(patentamiento.sellos)}
              />
              <CostRow
                label="Formularios"
                value={formatPrice(patentamiento.formularios)}
              />
              <CostRow
                label="Total patentamiento"
                value={formatPrice(
                  preferences.registrationCost || patentamiento.total,
                )}
                highlight
              />
            </CostSection>
            <Separator />
          </>
        )}

        {/* Combustible / Carga EV */}
        <CostSection
          icon={isElectric ? Zap : Fuel}
          title={isElectric ? "Carga eléctrica" : "Combustible"}
        >
          <CostRow
            label={isElectric ? "Cargar batería completa" : "Llenar el tanque"}
            value={formatPrice(fuel.llenarTanque)}
            secondary={`${fuel.consumoPor100km} ${fuel.unidad}/100km`}
          />
          <CostRow
            label={`Costo mensual (${monthlyKm.toLocaleString()} km/mes)`}
            value={formatPrice(fuel.costoMensual)}
            highlight
          />
        </CostSection>

        <Separator />

        {/* Seguro */}
        <CostSection icon={Shield} title="Seguro estimado (mensual)">
          <CostRow
            label="Terceros completo"
            value={`${formatPrice(insurance.tercerosMin)} — ${formatPrice(insurance.tercerosMax)}`}
          />
          <CostRow
            label="Todo riesgo"
            value={`${formatPrice(insurance.todoRiesgoMin)} — ${formatPrice(insurance.todoRiesgoMax)}`}
          />
          <p className="text-[11px] text-muted-foreground">
            Valores orientativos según tipo de vehículo, antigüedad y zona.
          </p>
        </CostSection>

        <Separator />

        {/* Préstamo prendario */}
        <CostSection icon={Landmark} title="Préstamo prendario (simulador)">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Porcentaje a financiar
                </span>
                <span className="font-medium">{financingPct}%</span>
              </div>
              <Slider
                value={[financingPct]}
                onValueChange={([v]) => setFinancingPct(v)}
                min={10}
                max={85}
                step={5}
                aria-label="Porcentaje a financiar"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Plazo</span>
                <span className="font-medium">{loanMonths} meses</span>
              </div>
              <Slider
                value={[loanMonths]}
                onValueChange={([v]) => setLoanMonths(v)}
                min={12}
                max={60}
                step={12}
                aria-label="Plazo del préstamo en meses"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor={`${fieldId}-tna`}
                className="text-xs text-muted-foreground"
              >
                TNA (%)
              </Label>
              <Input
                type="number"
                id={`${fieldId}-tna`}
                min={0}
                value={tna}
                onChange={(e) =>
                  setTna(Math.max(0, Number(e.target.value) || 0))
                }
                className="h-8 text-sm w-24"
                step={0.5}
              />
            </div>

            <Separator />

            <CostRow
              label="Monto a financiar"
              value={formatPrice(loan.montoFinanciado)}
            />
            <CostRow
              label="Cuota mensual promedio con IVA"
              value={formatPrice(loan.cuotaMensual)}
              highlight
            />
            <CostRow
              label="Total intereses (inc. IVA)"
              value={formatPrice(loan.totalIntereses)}
            />
            <CostRow
              label="Total a devolver"
              value={formatPrice(loan.totalDevolver)}
            />
            <p className="text-[11px] text-muted-foreground">
              Simulación orientativa con sistema francés. Consultá con tu banco
              para valores exactos. El IVA se distribuye como promedio; no es un
              cronograma bancario ni incluye todos los cargos.
            </p>
          </div>
        </CostSection>

        <Separator />

        <CostRow
          label="Seguro usado en total"
          value={formatPrice(calculated.insuranceMonthly)}
        />
        <CostRow
          label="Mantenimiento + cochera + peajes"
          value={formatPrice(
            preferences.maintenance + preferences.parking + preferences.tolls,
          )}
        />
        {/* Resumen */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-5 space-y-3">
            <h4 className="font-bold text-base">
              Costo Total Mensual Estimado
            </h4>
            <div className="flex items-baseline justify-between">
              <span className="text-sm opacity-90">Sin préstamo</span>
              <span className="text-2xl font-bold">
                {formatPrice(monthlyTotal)}
                <span className="text-sm font-normal opacity-80">/mes</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm opacity-90">
                Con préstamo ({loanMonths} cuotas)
              </span>
              <span className="text-2xl font-bold">
                {formatPrice(monthlyTotalWithLoan)}
                <span className="text-sm font-normal opacity-80">/mes</span>
              </span>
            </div>
            <p className="text-xs opacity-75">
              Incluye patente + combustible + seguro (personalizado o estimado)
              {loan.cuotaMensual > 0 && " + cuota préstamo"}. Incluye tus
              importes configurados de mantenimiento, cochera y peajes.
            </p>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

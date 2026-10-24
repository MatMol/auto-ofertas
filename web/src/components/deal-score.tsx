"use client";
import { useState } from "react";
import { getDealScoreBg, getDealScoreLabel } from "@/lib/format";
function Score({ score }: { score: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Explicar puntaje de oportunidad"
        onClick={() => setOpen(!open)}
        className={`rounded-full px-3 py-1 text-xs font-semibold ${score > 0 ? getDealScoreBg(score) + " text-white" : "bg-muted text-muted-foreground"}`}
      >
        {score > 0 ? `${score} · ${getDealScoreLabel(score)}` : "Sin calificar"}{" "}
        ⓘ
      </button>
      {open && (
        <div className="absolute z-30 top-full right-0 mt-2 w-64 rounded-lg border bg-background p-3 shadow-lg text-xs text-foreground">
          Comparamos el precio total con la mediana de al menos 3 avisos de la
          misma versión, años cercanos y kilometraje similar. Excluimos
          anticipos, cuotas y valores extremos. Sin suficientes comparables no
          asignamos puntaje. No evalúa el estado mecánico.
          <button
            className="block underline mt-2"
            onClick={() => setOpen(false)}
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
export function DealScoreBadge({ score }: { score: number }) {
  return <Score score={score} />;
}
export function DealScoreGauge({
  score,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  return <Score score={score} />;
}

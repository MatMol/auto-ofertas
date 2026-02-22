"use client";

import { getDealScoreBg, getDealScoreLabel } from "@/lib/format";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

const SCORE_EXPLANATION = [
  { label: "Precio vs. mercado", weight: "40%", desc: "Compara el precio contra autos del mismo modelo y año similar" },
  { label: "Kilómetros", weight: "20%", desc: "Menos km recorridos = mejor puntaje" },
  { label: "Precio por km", weight: "15%", desc: "Cuánto pagás por cada km de uso" },
  { label: "Info completa", weight: "10%", desc: "Fotos, descripción y datos del vendedor" },
  { label: "Publicación reciente", weight: "10%", desc: "Ofertas nuevas puntúan más" },
  { label: "Fuente confiable", weight: "5%", desc: "Verificados y concesionarias suman" },
];

function ScoreTooltipContent() {
  return (
    <div className="space-y-2.5 text-left">
      <p className="font-semibold text-sm">
        ¿Cómo se calcula el Deal Score?
      </p>
      <p className="text-xs opacity-80 leading-relaxed">
        Analizamos cada auto comparándolo con otros del mismo modelo, versión y
        año similar. Un puntaje más alto significa mejor relación precio/valor.
      </p>
      <div className="space-y-1.5">
        {SCORE_EXPLANATION.map((item) => (
          <div key={item.label} className="flex items-start gap-2 text-xs">
            <span className="font-mono opacity-60 w-8 text-right flex-shrink-0">
              {item.weight}
            </span>
            <div className="min-w-0">
              <span className="font-medium">{item.label}</span>
              <span className="opacity-70"> — {item.desc}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 text-[11px] pt-1 border-t border-current/20">
        <span className="text-emerald-400 font-medium">80+ Muy buena</span>
        <span className="text-amber-400 font-medium">60-79 Aceptable</span>
        <span className="text-red-400 font-medium">&lt;60 Precio alto</span>
      </div>
    </div>
  );
}

function ScoreTooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="cursor-help" aria-label={label}>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="w-72 p-3"
      >
        <ScoreTooltipContent />
      </TooltipContent>
    </Tooltip>
  );
}

export function DealScoreGauge({
  score,
  size = "md",
}: {
  score: number;
  size?: "sm" | "md" | "lg";
}) {
  const sizeMap = {
    sm: { width: 48, height: 48, textSize: "text-sm", labelSize: "text-[10px]" },
    md: { width: 80, height: 80, textSize: "text-xl", labelSize: "text-xs" },
    lg: { width: 120, height: 120, textSize: "text-3xl", labelSize: "text-sm" },
  };

  const { width, height, textSize, labelSize } = sizeMap[size];
  const radius = (width - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const color =
    score >= 80
      ? "stroke-emerald-500"
      : score >= 60
        ? "stroke-amber-500"
        : "stroke-red-500";

  const scoreLabel = getDealScoreLabel(score);

  const gauge = (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width, height }}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="-rotate-90"
          role="img"
          aria-label={`Deal Score: ${score} de 100 — ${scoreLabel}`}
        >
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            className="text-muted/30"
          />
          <circle
            cx={width / 2}
            cy={height / 2}
            r={radius}
            fill="none"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className={`font-bold ${textSize}`}>{score}</span>
        </div>
      </div>
      {size !== "sm" && (
        <span className={`${labelSize} text-muted-foreground text-center inline-flex items-center gap-1`}>
          {scoreLabel}
          <Info size={size === "md" ? 11 : 13} className="opacity-50" aria-hidden="true" />
        </span>
      )}
    </div>
  );

  return <ScoreTooltip label={`Deal Score ${score} de 100, ${scoreLabel}. Presioná para más información.`}>{gauge}</ScoreTooltip>;
}

export function DealScoreBadge({ score }: { score: number }) {
  const bg = getDealScoreBg(score);
  const label = getDealScoreLabel(score);
  return (
    <ScoreTooltip label={`Deal Score ${score} de 100, ${label}. Presioná para más información.`}>
      <div
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${bg}`}
        role="img"
        aria-label={`Deal Score: ${score} — ${label}`}
      >
        <span aria-hidden="true">{score}</span>
        <Info size={10} className="opacity-70" aria-hidden="true" />
      </div>
    </ScoreTooltip>
  );
}

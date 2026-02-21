"use client";

import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Building2, CheckCircle } from "lucide-react";
import type { VerificationBadge as VBadgeType } from "@/lib/types";

const BADGE_CONFIG: Record<
  string,
  { label: string; icon: typeof ShieldCheck; className: string }
> = {
  kavak_verified: {
    label: "Verificado por Kavak",
    icon: ShieldCheck,
    className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
  },
  ml_verified: {
    label: "Verificado en ML",
    icon: CheckCircle,
    className: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
  },
  concesionaria: {
    label: "Concesionaria",
    icon: Building2,
    className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
  },
};

export function VerificationBadge({
  badge,
  size = "sm",
}: {
  badge: VBadgeType;
  size?: "sm" | "md";
}) {
  if (!badge) return null;

  const config = BADGE_CONFIG[badge];
  if (!config) return null;

  const Icon = config.icon;
  const iconSize = size === "sm" ? 12 : 14;

  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      <Icon size={iconSize} aria-hidden="true" />
      <span className={size === "sm" ? "text-xs" : "text-sm"}>
        {config.label}
      </span>
    </Badge>
  );
}

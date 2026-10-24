"use client";
import { useEffect, useState } from "react";
import { SOURCE_LABELS, type Source } from "@/lib/types";
export function HealthStatus() {
  const [rows, setRows] = useState<
    { source: string; last_success: string | null }[] | null
  >(null);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/health", { signal: c.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r) => setRows(Array.isArray(r) ? r : []))
      .catch(() => {});
    return () => c.abort();
  }, []);
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">Estado de las fuentes</summary>
      {rows === null ? (
        <p>Estado no disponible</p>
      ) : rows.length === 0 ? (
        <p>Todavía no hay ejecuciones registradas.</p>
      ) : (
        rows.map((r) => (
          <p key={r.source}>
            {SOURCE_LABELS[r.source as Source] || r.source}:{" "}
            {r.last_success
              ? `última ejecución exitosa ${new Date(r.last_success).toLocaleString("es-AR")}`
              : "sin ejecución exitosa"}
          </p>
        ))
      )}
    </details>
  );
}

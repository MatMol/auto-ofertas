"use client";
import { readListings } from "@/lib/http";
import { useState, Suspense } from "react";
import Link from "next/link";
import { usePersonal, updatePersonal } from "@/lib/personal";
import { PreferencesForm } from "@/components/preferences";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { safeUrl, PRICE_LABELS } from "../../../../shared/quality";
import type { Listing } from "@/lib/types";
function Garage() {
  const p = usePersonal();
  const [messages, setMessages] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function refresh() {
    setBusy(true);
    setError("");
    const alerts: string[] = [];
    try {
      const ids = p.favorites
        .filter((l) => l.source !== "external")
        .map((l) => l.id);
      const latest: Listing[] = [];
      for (let i = 0; i < ids.length; i += 60) {
        const r = await fetch(
          `/api/listings?ids=${encodeURIComponent(ids.slice(i, i + 60).join(","))}`,
        );
        if (!r.ok) throw new Error("No pudimos actualizar favoritos");
        latest.push(...(await readListings(r)).listings);
      }
      for (const l of latest) {
        const old = p.favorites.find((x) => x.id === l.id)!;
        if (
          l.priceKind === "total" &&
          old.priceKind === "total" &&
          l.currency === old.currency &&
          l.price < old.price
        )
          alerts.push(
            `${l.brand} ${l.model}: bajó de ${formatPrice(old.price, old.currency)} a ${formatPrice(l.price, l.currency)}`,
          );
      }
      updatePersonal((s) => ({
        ...s,
        favorites: s.favorites.map(
          (l) => latest.find((x) => x.id === l.id) || l,
        ),
      }));
      for (const search of p.searches) {
        const params = new URLSearchParams(search.params);
        params.set("sortBy", "newest");
        params.set("pageSize", "60");
        params.set("page", "1");
        const r = await fetch(`/api/listings?${params}`);
        if (!r.ok) throw new Error(`No pudimos revisar ${search.name}`);
        const data = await readListings(r);
        const listings: Listing[] = data.listings;
        const fresh = listings.filter(
          (l) => !search.seen.includes(l.id) && l.createdAt > search.createdAt,
        );
        if (search.initialized && fresh.length)
          alerts.push(
            `${search.name}: ${fresh.length} avisos nuevos entre los últimos 60 resultados`,
          );
        updatePersonal((s) => ({
          ...s,
          searches: s.searches.map((x) =>
            x.id === search.id
              ? {
                  ...x,
                  initialized: true,
                  seen: [
                    ...new Set([...listings.map((l) => l.id), ...x.seen]),
                  ].slice(0, 1000),
                }
              : x,
          ),
        }));
      }
      setMessages(
        alerts.length
          ? alerts
          : ["No detectamos cambios nuevos en esta revisión."],
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function addExternal(form: FormData) {
    const url = safeUrl(String(form.get("url")));
    const year = Number(form.get("year")),
      price = Number(form.get("price")),
      kmRaw = String(form.get("km"));
    if (
      !url ||
      year < 1950 ||
      year > new Date().getFullYear() + 1 ||
      price <= 0
    ) {
      setError("Revisá enlace, año y precio");
      return;
    }
    const now = new Date().toISOString();
    const l: Listing = {
      id: `external-${crypto.randomUUID()}`,
      source: "external",
      sourceId: "manual",
      sourceUrl: url,
      brand: String(form.get("brand")),
      model: String(form.get("model")),
      version: null,
      year,
      isNew: false,
      price,
      currency: form.get("currency") === "USD" ? "USD" : "ARS",
      priceArs:
        form.get("currency") === "USD" ? price * p.preferences.usdRate : price,
      priceUsd: form.get("currency") === "USD" ? price : null,
      km: kmRaw === "" ? null : Number(kmRaw),
      fuelType: null,
      transmission: null,
      bodyType: null,
      doors: null,
      isImported: false,
      location: "Sin confirmar",
      province: p.preferences.province,
      imageUrls: [],
      sellerType: "particular",
      verificationBadge: null,
      acceptsSwap: false,
      hasFinancing: false,
      dealScore: 0,
      consumption: null,
      tankCapacity: null,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      priceKind: form.get("priceKind") as Listing["priceKind"],
      scoreConfidence: "insufficient",
    };
    updatePersonal((s) => ({ ...s, favorites: [...s.favorites, l] }));
    setError("");
  }
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Mi garage</h1>
      <p className="text-muted-foreground">
        Favoritos, notas y búsquedas guardados en este navegador. Los avisos
        externos se actualizan manualmente.
      </p>
      <PreferencesForm />
      <div className="flex flex-wrap gap-3">
        <Button onClick={refresh} disabled={busy}>
          {busy ? "Revisando…" : "Revisar novedades y bajas"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            const a = document.createElement("a");
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(p, null, 2)], {
                type: "application/json",
              }),
            );
            a.href = url;
            a.download = "autoofertas-garage.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Exportar respaldo
        </Button>
        <Link className="underline self-center" href="/comparar">
          Comparar ({p.compare.length}/3)
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        Las alertas se calculan al pulsar revisar; no se ejecutan con la página
        cerrada.
      </p>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <div aria-live="polite">
        {messages.map((m, i) => (
          <p key={i} className="border rounded p-3 my-2">
            {m}
          </p>
        ))}
      </div>
      <section className="space-y-3">
        <h2 className="font-semibold text-xl">Búsquedas guardadas</h2>
        {!p.searches.length && <p>Guardá una búsqueda desde los resultados.</p>}
        {p.searches.map((s) => (
          <div className="flex gap-3 items-center" key={s.id}>
            <Link className="underline" href={`/buscar?${s.params}`}>
              {s.name}
            </Link>
            <button
              aria-label={`Eliminar búsqueda ${s.name}`}
              onClick={() =>
                updatePersonal((p) => ({
                  ...p,
                  searches: p.searches.filter((x) => x.id !== s.id),
                }))
              }
            >
              Eliminar
            </button>
          </div>
        ))}
      </section>
      <details className="border rounded p-4">
        <summary className="cursor-pointer font-semibold">
          Añadir aviso de Marketplace u otro sitio
        </summary>
        <p className="text-sm my-3">
          Pegá el enlace y los datos que verificaste. Indicá si el importe es
          total, anticipo o cuota.
        </p>
        <form action={addExternal} className="grid sm:grid-cols-2 gap-3">
          {["url", "brand", "model", "year", "price", "km"].map((key, i) => (
            <label key={key}>
              {
                [
                  "Enlace",
                  "Marca",
                  "Modelo",
                  "Año",
                  "Importe",
                  "Km (opcional)",
                ][i]
              }
              <input
                className="border rounded p-2 block w-full"
                name={key}
                required={key !== "km"}
                type={
                  key === "url"
                    ? "url"
                    : ["year", "price", "km"].includes(key)
                      ? "number"
                      : "text"
                }
                min={0}
              />
            </label>
          ))}
          <label>
            Moneda
            <select className="block border p-2" name="currency">
              <option>ARS</option>
              <option>USD</option>
            </select>
          </label>
          <label>
            Tipo de precio
            <select className="block border p-2" name="priceKind">
              <option value="unknown">Sin confirmar</option>
              <option value="total">Total confirmado</option>
              <option value="deposit">Anticipo</option>
              <option value="installment">Cuota</option>
            </select>
          </label>
          <Button type="submit">Guardar aviso</Button>
        </form>
      </details>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Favoritos ({p.favorites.length})
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {p.favorites.map((l) => (
            <div key={l.id} className="space-y-2">
              {l.source === "external" ? (
                <div className="border rounded p-4 space-y-2">
                  <h3>
                    {l.brand} {l.model} {l.year}
                  </h3>
                  <p>
                    {formatPrice(l.price, l.currency)} ·{" "}
                    {PRICE_LABELS[l.priceKind || "unknown"]}
                  </p>
                  <a
                    className="underline"
                    href={l.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver aviso externo
                  </a>
                  <Button
                    variant="outline"
                    onClick={() =>
                      updatePersonal((s) => ({
                        ...s,
                        compare: s.compare.includes(l.id)
                          ? s.compare
                          : s.compare.length < 3
                            ? [...s.compare, l.id]
                            : s.compare,
                      }))
                    }
                  >
                    Comparar
                  </Button>
                </div>
              ) : (
                <ListingCard listing={l} />
              )}
              <label className="text-sm block">
                Notas de {l.brand} {l.model}
                <textarea
                  className="border rounded p-2 w-full"
                  placeholder="Consultado, visita, observaciones…"
                  value={p.notes[l.id] || ""}
                  onChange={(e) =>
                    updatePersonal((s) => ({
                      ...s,
                      notes: { ...s.notes, [l.id]: e.target.value },
                    }))
                  }
                />
              </label>
              <button
                className="text-sm underline"
                onClick={() =>
                  updatePersonal((s) => ({
                    ...s,
                    favorites: s.favorites.filter((x) => x.id !== l.id),
                  }))
                }
              >
                Quitar favorito
              </button>
            </div>
          ))}
        </div>
      </section>
      <details>
        <summary>Descartados ({p.discarded.length})</summary>
        {p.discarded.map((id) => (
          <div key={id} className="flex gap-3">
            <Link href={`/auto/${encodeURIComponent(id)}`}>{id}</Link>
            <button
              onClick={() =>
                updatePersonal((s) => ({
                  ...s,
                  discarded: s.discarded.filter((x) => x !== id),
                }))
              }
            >
              Restaurar
            </button>
          </div>
        ))}
      </details>
    </div>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p>Cargando garage…</p>}>
      <Garage />
    </Suspense>
  );
}

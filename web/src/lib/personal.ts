"use client";
import { useSyncExternalStore } from "react";
import type { Listing } from "./types";
export interface Preferences {
  province: string;
  monthlyKm: number;
  yearMin: number;
  kmMax: number;
  budget: number;
  fuelPrice: number;
  insurance: number;
  maintenance: number;
  parking: number;
  tolls: number;
  usdRate: number;
  fiscalValue: number;
  transferCost: number;
  registrationCost: number;
}
export interface SavedSearch {
  id: string;
  name: string;
  params: string;
  createdAt: string;
  seen: string[];
  initialized: boolean;
}
export interface Personal {
  favorites: Listing[];
  discarded: string[];
  compare: string[];
  notes: Record<string, string>;
  searches: SavedSearch[];
  preferences: Preferences;
}
export const DEFAULT_PREFERENCES: Preferences = {
  province: "CABA",
  monthlyKm: 1500,
  yearMin: 2015,
  kmMax: 100000,
  budget: 30000000,
  fuelPrice: 0,
  insurance: 0,
  maintenance: 0,
  parking: 0,
  tolls: 0,
  usdRate: 0,
  fiscalValue: 0,
  transferCost: 0,
  registrationCost: 0,
};
const defaults: Personal = {
  favorites: [],
  discarded: [],
  compare: [],
  notes: {},
  searches: [],
  preferences: DEFAULT_PREFERENCES,
};
const KEY = "autoofertas.personal.v1",
  empty = JSON.stringify(defaults);
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(KEY) || empty;
  } catch {
    return empty;
  }
}
function parse(raw: string): Personal {
  try {
    const p = JSON.parse(raw);
    return {
      ...defaults,
      ...p,
      preferences: { ...DEFAULT_PREFERENCES, ...p.preferences },
    };
  } catch {
    return defaults;
  }
}
export function usePersonal() {
  return parse(useSyncExternalStore(subscribe, snapshot, () => empty));
}
export function updatePersonal(fn: (p: Personal) => Personal) {
  try {
    localStorage.setItem(KEY, JSON.stringify(fn(parse(snapshot()))));
    listeners.forEach((cb) => cb());
  } catch {
    window.alert(
      "No se pudo guardar. Revisá el espacio o los permisos del navegador.",
    );
  }
}
export function toggleFavorite(l: Listing) {
  updatePersonal((p) => ({
    ...p,
    favorites: p.favorites.some((x) => x.id === l.id)
      ? p.favorites.filter((x) => x.id !== l.id)
      : [...p.favorites, l],
  }));
}
export function toggleCompare(id: string) {
  updatePersonal((p) => ({
    ...p,
    compare: p.compare.includes(id)
      ? p.compare.filter((x) => x !== id)
      : p.compare.length < 3
        ? [...p.compare, id]
        : p.compare,
  }));
}

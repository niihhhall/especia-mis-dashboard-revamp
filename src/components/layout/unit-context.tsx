"use client";

import { createContext, useContext, type ReactNode } from "react";

import { fmtAmount, fmtCompact } from "@/lib/format";
import { DEFAULT_USD_RATE, type MoneyUnit } from "@/lib/unit-cookie";

interface UnitState {
  unit: MoneyUnit;
  usdRate: number;
}
const UnitContext = createContext<UnitState>({ unit: "auto", usdRate: DEFAULT_USD_RATE });

/** Mounted once by `AppShell` with the settings read from cookies on the server. */
export function UnitProvider({ unit, usdRate, children }: UnitState & { children: ReactNode }) {
  return <UnitContext.Provider value={{ unit, usdRate }}>{children}</UnitContext.Provider>;
}

export function useUnitState(): UnitState {
  return useContext(UnitContext);
}

/** `fmtCompact` bound to the viewer's unit and dollar rate, for client components (charts, cards). */
export function useFmtCompact(): (v: number) => string {
  const { unit, usdRate } = useContext(UnitContext);
  return (v) => fmtCompact(v, unit, usdRate);
}

/** `fmtAmount` (full-precision table amounts) bound to the viewer's unit, for client tables. */
export function useFmtAmount(): (v: number) => string {
  const { unit, usdRate } = useContext(UnitContext);
  return (v) => fmtAmount(v, unit, usdRate);
}

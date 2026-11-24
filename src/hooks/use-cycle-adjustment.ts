import { useEffect, useState } from "react";
import { AJUSTE_KEY, FAZENDAS_KEY, RELATORIOS_KEY } from "@/lib/harvest";
import { CYCLE_ADJUSTMENTS_KEY, cycleKey, migrateAdjustments, saveOpenCycle, type CycleAdjustments } from "@/lib/productionAdjustments";

const CHANGE_EVENT = "harvest:cycle-adjustment";

function readValues(): CycleAdjustments {
  const existing = localStorage.getItem(CYCLE_ADJUSTMENTS_KEY);
  if (existing) return JSON.parse(existing);
  const values = migrateAdjustments(
    JSON.parse(localStorage.getItem(AJUSTE_KEY) ?? '""'),
    JSON.parse(localStorage.getItem(RELATORIOS_KEY) ?? "[]"),
    JSON.parse(localStorage.getItem("harvest:modulos") ?? "[]"),
  );
  localStorage.setItem(CYCLE_ADJUSTMENTS_KEY, JSON.stringify(values));
  return values;
}

export function useCycleAdjustment() {
  const [values, setValues] = useState<CycleAdjustments>({});
  const [currentCycle, setCurrentCycle] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = () => {
      setCurrentCycle(cycleKey(new Date()));
      try {
        setValues(readValues());
        setReady(true);
        setError("");
      } catch {
        setError("Não foi possível acessar o ajuste salvo no aparelho.");
      }
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);

  const setAdjustment = (value: string) => {
    if (!ready) return;
    try {
      const latest = readValues();
      const next = saveOpenCycle(latest, currentCycle, value);
      if (next === latest) {
        setCurrentCycle(cycleKey(new Date()));
        setValues(latest);
        return;
      }
      localStorage.setItem(CYCLE_ADJUSTMENTS_KEY, JSON.stringify(next));
      setValues(next);
      setError("");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setError("Ajuste não salvo: confira o espaço disponível no aparelho.");
    }
  };
  return { values, currentCycle, ready, error, adjustment: values[currentCycle] ?? "", setAdjustment };
}
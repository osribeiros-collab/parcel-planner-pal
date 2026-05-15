import { useEffect, useState } from "react";

export type Talhao = {
  id: string;
  numero: string;
  vmi: string;
  metaArvH: string;
  metaM3H: string;
};

export type Fazenda = {
  id: string;
  codigo: string;
  nome: string;
  talhoes: Talhao[];
};

export type Relatorio = {
  id: string;
  data: string; // YYYY-MM-DD
  fazendaId: string;
  talhaoId: string;
  horimetroInicial: string;
  horimetroFinal: string;
  arv: string;
  horaTrabalhando: string; // HH:MM
  paradaOperacional: string; // HH:MM
  paradaMecanica: string; // HH:MM
  obs: string;
};

export const FAZENDAS_KEY = "harvest:fazendas";
export const RELATORIOS_KEY = "harvest:relatorios";

export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (hydrated) localStorage.setItem(key, JSON.stringify(value));
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}

export const fazendaLabel = (f: Fazenda) => `${f.codigo} - 🌲 - ${f.nome}`;

export const toDateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Produção começa dia 21 e termina dia 20 do mês seguinte
export function getProductionMonthRange(ref: Date = new Date()) {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const day = ref.getDate();
  const start = day >= 21 ? new Date(y, m, 21) : new Date(y, m - 1, 21);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 20);
  return { start, end };
}

export function isInProductionMonth(dateStr: string, ref: Date = new Date()) {
  const { start, end } = getProductionMonthRange(ref);
  const k = dateStr;
  return k >= toDateKey(start) && k <= toDateKey(end);
}

export function productionMonthLabel(ref: Date = new Date()) {
  const { start, end } = getProductionMonthRange(ref);
  const f = (d: Date) => d.toLocaleDateString("pt-BR");
  return `${f(start)} — ${f(end)}`;
}

export type CycleAdjustments = Record<string, string>;
export const CYCLE_ADJUSTMENTS_KEY = "harvest:ajustesPorCiclo:v1";

export function cycleKey(date: Date): string {
  const start = new Date(date.getFullYear(), date.getMonth() - (date.getDate() < 21 ? 1 : 0), 21);
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-21`;
}

export function dateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function saveOpenCycle(values: CycleAdjustments, target: string, value: string, now = new Date()): CycleAdjustments {
  return target === cycleKey(now) ? { ...values, [target]: value } : values;
}

export function adjustmentNumber(value: string): number {
  const n = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// The old global value was used for every historical PDF. Freeze that visible
// value once; explicit older module values take precedence when available.
export function migrateAdjustments(legacy: string, reports: { data: string }[], modules: { dataInicial: string; ajusteSistemico?: string }[], now = new Date()): CycleAdjustments {
  const values: CycleAdjustments = { [cycleKey(now)]: legacy };
  for (const report of reports) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(report.data)) values[cycleKey(dateFromKey(report.data))] = legacy;
  }
  for (const module of modules) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(module.dataInicial)) continue;
    const key = cycleKey(dateFromKey(module.dataInicial));
    values[key] = module.ajusteSistemico?.trim() ? module.ajusteSistemico : (values[key] ?? legacy);
  }
  return values;
}

export function adjustmentForRange(values: CycleAdjustments, start: string, end: string): number {
  if (start > end) return 0;
  let date = dateFromKey(cycleKey(dateFromKey(start)));
  let total = 0;
  while (cycleKey(date) <= end) {
    total += adjustmentNumber(values[cycleKey(date)] ?? "");
    date = new Date(date.getFullYear(), date.getMonth() + 1, 21);
  }
  return total;
}
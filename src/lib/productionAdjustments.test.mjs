import { describe, test, expect } from "bun:test";
import { cycleKey, migrateAdjustments, saveOpenCycle, adjustmentForRange } from "./productionAdjustments.ts";

describe("ajuste local por ciclo", () => {
  test("fecha no dia 20 e abre um novo ciclo no dia 21", () => {
    expect(cycleKey(new Date(2026, 10, 20, 23, 59))).toBe("2026-10-21");
    expect(cycleKey(new Date(2026, 10, 21, 0, 0))).toBe("2026-11-21");
    expect(cycleKey(new Date(2027, 0, 20))).toBe("2026-12-21");
  });
  test("alterar o ciclo aberto nunca altera o ajuste encerrado", () => {
    const before = { "2026-10-21": "-154,00", "2026-11-21": "50,00" };
    const after = saveOpenCycle(before, "2026-11-21", "75,50", new Date(2026, 10, 24));
    expect(after["2026-10-21"]).toBe("-154,00");
    expect(adjustmentForRange(after, "2026-10-21", "2026-11-20")).toBe(-154);
    expect(adjustmentForRange(after, "2026-11-21", "2026-12-20")).toBe(75.5);
  });
  test("impede escrita retroativa inclusive com o app aberto na virada", () => {
    const values = { "2026-10-21": "50,00" };
    expect(saveOpenCycle(values, "2026-10-21", "99,00", new Date(2026, 10, 21))).toBe(values);
  });
  test("novo mês começa sem carregar o ajuste do mês anterior", () => {
    expect(adjustmentForRange({ "2026-10-21": "50,00" }, "2026-11-21", "2026-12-20")).toBe(0);
  });
  test("preserva o legado conhecido e o último ajuste explícito histórico", () => {
    const migrated = migrateAdjustments("50,00", [{ data: "2026-10-23" }], [{ dataInicial: "2026-09-21", ajusteSistemico: "-154,00" }], new Date(2026, 10, 24));
    expect(migrated["2026-09-21"]).toBe("-154,00");
    expect(migrated["2026-10-21"]).toBe("50,00");
    const changed = saveOpenCycle(migrated, "2026-11-21", "100,00", new Date(2026, 10, 24));
    expect(adjustmentForRange(changed, "2026-09-21", "2026-10-20")).toBe(-154);
  });
});
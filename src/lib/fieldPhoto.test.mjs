import { describe, test, expect } from "bun:test";
import { extractField } from "./fieldPhoto.ts";

const imageText = "Horímetro inicial: 1.234,5\nHorímetro final: 1243.3\nÁrv: 1.234\nHora trabalhando: 06:30\nParada operacional: Aguardando transporte\nParada mecânica: 00:48\nObservações: Troca de corrente";
describe("leitura exclusiva da linha escolhida", () => {
  test("horímetro inicial é decimal brasileiro sem os outros números", () => expect(extractField(imageText, "horimetroInicial")).toBe("1234,5"));
  test("horímetro final não reutiliza o inicial", () => expect(extractField(imageText, "horimetroFinal")).toBe("1243,3"));
  test("árvores são um inteiro", () => expect(extractField(imageText, "arv")).toBe("1234"));
  test("trabalho lê só seu tempo", () => expect(extractField(imageText, "horaTrabalhando")).toBe("06:30"));
  test("parada operacional aceita texto livre", () => expect(extractField(imageText, "paradaOperacional")).toBe("Aguardando transporte"));
  test("parada mecânica lê só seu tempo", () => expect(extractField(imageText, "paradaMecanica")).toBe("00:48"));
  test("observação lê somente seu texto", () => expect(extractField(imageText, "obs")).toBe("Troca de corrente"));
  test("uma linha isolada de tempo não exige uma lista fechada", () => expect(extractField("08h48", "horaTrabalhando")).toBe("08:48"));
  test("não escolhe arbitrariamente entre linhas sem rótulo", () => expect(extractField("12,3\n87,5", "horimetroInicial")).toBeNull());
  test("não lê outro campo quando o solicitado está ausente", () => expect(extractField("Horímetro final: 23,5", "horimetroInicial")).toBeNull());
  test("não incorpora o campo vizinho na mesma linha", () => expect(extractField("Hora trabalhando: 06:30 Parada operacional: 01:30", "horaTrabalhando")).toBe("06:30"));
});
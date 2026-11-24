export type PhotoFieldKey = "horimetroInicial" | "horimetroFinal" | "arv" | "horaTrabalhando" | "paradaOperacional" | "paradaMecanica" | "obs";
export const photoFields: { key: PhotoFieldKey; label: string; mode?: "decimal" | "numeric" }[] = [
  { key: "horimetroInicial", label: "Horímetro inicial", mode: "decimal" },
  { key: "horimetroFinal", label: "Horímetro final", mode: "decimal" },
  { key: "arv", label: "Árv", mode: "numeric" },
  { key: "horaTrabalhando", label: "Hora trabalhando" },
  { key: "paradaOperacional", label: "Parada operacional" },
  { key: "paradaMecanica", label: "Parada mecânica" },
  { key: "obs", label: "Observações" },
];
const aliases: Record<PhotoFieldKey, string> = {
  horimetroInicial: "horimetro\\s*(?:inicial|inicio)",
  horimetroFinal: "horimetro\\s*(?:final|fim)",
  arv: "(?:arvores|arv\\.?)(?![a-z])",
  horaTrabalhando: "(?:horas?\\s*(?:trabalhando|trabalhadas?|de\\s*trabalho)|tempo\\s*(?:trabalhando|de\\s*trabalho)|trabalho)(?![a-z])",
  paradaOperacional: "parada\\s*(?:operacional|op\\.?)(?![a-z])",
  paradaMecanica: "parada\\s*(?:mecanica|mec\\.?)(?![a-z])",
  obs: "(?:observacoes|observacao|obs\\.?)(?![a-z])",
};
const normalized = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function extractField(text: string, field: PhotoFieldKey): string | null {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const matches: string[] = [];
  for (const line of lines) {
    const match = new RegExp(aliases[field], "i").exec(normalized(line));
    if (!match) continue;
    let value = line.slice(match.index + match[0].length).replace(/^\s*[:=–—-]?\s*/, "");
    const other = new RegExp(Object.entries(aliases).filter(([key]) => key !== field).map(([, pattern]) => pattern).join("|"), "i").exec(normalized(value));
    if (other) value = value.slice(0, other.index).trim();
    if (value) matches.push(value);
  }
  // Never guess between unrelated rows in a whole-screen photo.
  const value = matches.length === 1 ? matches[0] : lines.length === 1 && !Object.values(aliases).some(pattern => new RegExp(pattern, "i").test(normalized(lines[0]))) ? lines[0] : null;
  if (!value) return null;
  if (field === "horimetroInicial" || field === "horimetroFinal") {
    const numbers = value.match(/\d+(?:[.,]\d+)*/g);
    if (numbers?.length !== 1) return null;
    const raw = numbers[0];
    return raw.includes(",") ? raw.replace(/\./g, "") : raw.replace(/\.(?=[^.]*$)/, ",").replace(/\./g, "");
  }
  if (field === "arv") {
    const numbers = value.match(/\d+(?:[.]\d{3})*/g);
    return numbers?.length === 1 && !/\d,\d/.test(value) ? numbers[0].replace(/\./g, "") : null;
  }
  const time = /^(\d{1,3})\s*(?::|h)\s*(\d{2})\s*(?:min)?$/i.exec(value);
  if (field !== "obs" && time && Number(time[2]) < 60) return `${time[1].padStart(2, "0")}:${time[2]}`;
  return value.trim();
}
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Boxes, Target, Users, Cog, FileDown, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import {
  useLocalState,
  Fazenda,
  Relatorio,
  FAZENDAS_KEY,
  RELATORIOS_KEY,
  getProductionMonthRange,
  productionMonthLabel,
} from "@/lib/harvest";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export type Modulo = {
  id: string;
  mesReferencia: string; // YYYY-MM
  dataInicial: string; // YYYY-MM-DD
  dataFinal: string;
  metaTotal: string; // m³
  qtdMaquinas: string;
  qtdOperadoresPorMaquina: string;
  ajusteSistemico?: string; // m³ +/-
};


const MODULOS_KEY = "harvest:modulos";

export const Route = createFileRoute("/modulos")({
  component: ModulosPage,
  head: () => ({
    meta: [
      { title: "Harvest — Módulo" },
      { name: "description", content: "Meta do módulo dividida por máquina e operador." },
    ],
  }),
});

const fmt = (n: number, d = 2) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: d }).format(n);

const parseNum = (s: string) => {
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const parseHoras = (hhmm: string): number => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map((x) => Number(x) || 0);
  return h + m / 60;
};

const fmtHoras = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

const mesLabel = (mes: string) => {
  if (!mes) return "—";
  const [y, m] = mes.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

function ModulosPage() {
  const [modulos, setModulos] = useLocalState<Modulo[]>(MODULOS_KEY, []);
  const [fazendas] = useLocalState<Fazenda[]>(FAZENDAS_KEY, []);
  const [relatorios] = useLocalState<Relatorio[]>(RELATORIOS_KEY, []);

  const periodoAtual = productionMonthLabel();
  const rangeAtual = getProductionMonthRange();

  const [draft, setDraft] = useState<Omit<Modulo, "id">>({
    mesReferencia: "",
    dataInicial: "",
    dataFinal: "",
    metaTotal: "",
    qtdMaquinas: "15",
    qtdOperadoresPorMaquina: "3",
    ajusteSistemico: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const update = (k: keyof typeof draft, v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const resetDraft = () => {
    setDraft({
      mesReferencia: "",
      dataInicial: "",
      dataFinal: "",
      metaTotal: "",
      qtdMaquinas: "15",
      qtdOperadoresPorMaquina: "3",
      ajusteSistemico: "",
    });
    setEditingId(null);
  };


  const calc = (m: Modulo) => {
    const meta = parseNum(m.metaTotal);
    const maq = Math.max(1, parseNum(m.qtdMaquinas));
    const op = Math.max(1, parseNum(m.qtdOperadoresPorMaquina));
    const porMaquina = meta / maq;
    const porOperador = porMaquina / op;
    return { meta, maq, op, porMaquina, porOperador, totalOperadores: maq * op };
  };

  const previa = calc({ id: "", ...draft });

  const salvar = () => {
    if (!draft.metaTotal || !draft.mesReferencia || !draft.dataInicial || !draft.dataFinal) {
      toast.error("Preencha meta, mês e datas.");
      return;
    }
    if (editingId) {
      setModulos((arr) => arr.map((m) => (m.id === editingId ? { id: editingId, ...draft } : m)));
      toast.success("Módulo atualizado.");
    } else {
      setModulos((arr) => [{ id: crypto.randomUUID(), ...draft }, ...arr]);
      toast.success("Módulo salvo.");
    }
    resetDraft();
  };

  const editar = (m: Modulo) => {
    setEditingId(m.id);
    setDraft({
      mesReferencia: m.mesReferencia,
      dataInicial: m.dataInicial,
      dataFinal: m.dataFinal,
      metaTotal: m.metaTotal,
      qtdMaquinas: m.qtdMaquinas,
      qtdOperadoresPorMaquina: m.qtdOperadoresPorMaquina,
      ajusteSistemico: m.ajusteSistemico ?? "",
    });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // PDF options dialog
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfTarget, setPdfTarget] = useState<Modulo | null>(null);
  const [pdfOpts, setPdfOpts] = useState({
    arvores: true,
    m3: true,
    ajuste: true,
    horas: true,
    eficiencia: true,
    relatorios: true,
  });
  const abrirPdfDialog = (m?: Modulo) => {
    setPdfTarget(m ?? null);
    setPdfOpen(true);
  };


  const gerarPDF = (moduloAlvo?: Modulo) => {
    const usandoAntigo = !!moduloAlvo;
    const start = usandoAntigo ? new Date(moduloAlvo!.dataInicial) : rangeAtual.start;
    const end = usandoAntigo ? new Date(moduloAlvo!.dataFinal) : rangeAtual.end;
    const periodo = usandoAntigo ? moduloAlvo!.mesReferencia : periodoAtual;

    const rels = relatorios.filter((r) => {
      const dataR = new Date(r.data);
      return dataR >= start && dataR <= end;
    });

    let arv = 0, trab = 0, op = 0, mec = 0, m3 = 0;
    for (const r of rels) {
      const f = fazendas.find((x) => x.id === r.fazendaId);
      const t = f?.talhoes.find((x) => x.id === r.talhaoId);
      const a = parseNum(r.arv);
      arv += a;
      m3 += a * parseNum(t?.vmi || "0");
      trab += parseHoras(r.horaTrabalhando);
      op += parseHoras(r.paradaOperacional);
      mec += parseHoras(r.paradaMecanica);
    }
    const m3h = trab > 0 ? m3 / trab : 0;
    const arvh = trab > 0 ? arv / trab : 0;
    const mod = usandoAntigo ? moduloAlvo! : (modulos.find((m) => {
      const ms = m.dataInicial; const me = m.dataFinal;
      if (!ms || !me) return false;
      const sk = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      return ms <= sk && me >= sk;
    }) || modulos[0]);
    const metaPessoal = mod
      ? parseNum(mod.metaTotal) /
        Math.max(1, parseNum(mod.qtdMaquinas)) /
        Math.max(1, parseNum(mod.qtdOperadoresPorMaquina))
      : 0;
    const pct = metaPessoal > 0 ? (m3 / metaPessoal) * 100 : 0;

    const doc = new jsPDF();
    let y = 18;
    doc.setFontSize(16);
    doc.text("Resumo do Mês de Produção", 14, y); y += 7;
    doc.setFontSize(10);
    doc.text(`Período: ${periodo}`, 14, y); y += 6;
    doc.text(`Relatórios: ${rels.length}`, 14, y); y += 8;

    doc.setFontSize(12);
    doc.text("Totais", 14, y); y += 6;
    doc.setFontSize(10);
    const linhas = [
      ["Árvores", fmt(arv)],
      ["Volume (m³)", `${fmt(m3)} m³`],
      ["Hora trabalhando", fmtHoras(trab)],
      ["Parada operacional", fmtHoras(op)],
      ["Parada mecânica", fmtHoras(mec)],
      ["Produtividade", `${fmt(arvh)} árv/h`],
      ["m³/h", `${fmt(m3h)} m³/h`],
    ];
    for (const [k, v] of linhas) {
      doc.text(`${k}:`, 16, y);
      doc.text(v, 90, y);
      y += 6;
    }
    y += 4;
    doc.setFontSize(12);
    doc.text("Meta pessoal", 14, y); y += 6;
    doc.setFontSize(10);
    if (mod) {
      doc.text(`Meta: ${fmt(metaPessoal)} m³`, 16, y); y += 6;
      doc.text(`Realizado: ${fmt(m3)} m³ (${fmt(pct, 1)}%)`, 16, y); y += 8;
    } else {
      doc.text("Nenhum módulo cadastrado para o período.", 16, y); y += 8;
    }

    doc.setFontSize(12);
    doc.text("Relatórios do período", 14, y); y += 6;
    doc.setFontSize(9);
    if (rels.length === 0) {
      doc.text("Sem relatórios.", 16, y);
    } else {
      const sorted = [...rels].sort((a, b) => a.data.localeCompare(b.data));
      for (const r of sorted) {
        if (y > 280) { doc.addPage(); y = 18; }
        const f = fazendas.find((x) => x.id === r.fazendaId);
        const t = f?.talhoes.find((x) => x.id === r.talhaoId);
        const a = parseNum(r.arv);
        const v = a * parseNum(t?.vmi || "0");
        const dataBR = r.data.split("-").reverse().join("/");
        doc.text(
          `${dataBR}  ${f?.codigo ?? "?"} T${t?.numero ?? "?"}  Árv ${a}  ${fmt(v)}m³  Tr ${r.horaTrabalhando || "-"} Op ${r.paradaOperacional || "-"} Mec ${r.paradaMecanica || "-"}`,
          16, y,
        );
        y += 5;
      }
    }

    doc.save(`harvest-${periodo.replace(/\//g, "-").replace(/ /g, "")}.pdf`);
    toast.success("PDF gerado.");
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-secondary/30 to-background">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-primary text-base">
            <span className="flex items-center gap-2"><FileDown className="h-4 w-4" /> Resumo do mês</span>
            <span className="text-[10px] font-normal text-muted-foreground">{periodoAtual}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => gerarPDF()} className="w-full">
            <FileDown className="h-4 w-4" /> Gerar PDF do mês de produção
          </Button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            O mês de produção começa dia 21 e termina dia 20. As informações ficam guardadas e o painel zera automaticamente no próximo ciclo.
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Boxes className="h-5 w-5" /> {editingId ? "Editar módulo" : "Novo módulo"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Mês de referência</Label>
              <Input
                type="month"
                value={draft.mesReferencia}
                onChange={(e) => update("mesReferencia", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Meta total (m³)</Label>
              <Input
                inputMode="decimal"
                placeholder="100000"
                value={draft.metaTotal}
                onChange={(e) => update("metaTotal", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data inicial</Label>
              <Input
                type="date"
                value={draft.dataInicial}
                onChange={(e) => update("dataInicial", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data final</Label>
              <Input
                type="date"
                value={draft.dataFinal}
                onChange={(e) => update("dataFinal", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Qtd. máquinas</Label>
              <Input
                inputMode="numeric"
                value={draft.qtdMaquinas}
                onChange={(e) => update("qtdMaquinas", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Operadores por máquina</Label>
              <Input
                inputMode="numeric"
                value={draft.qtdOperadoresPorMaquina}
                onChange={(e) => update("qtdOperadoresPorMaquina", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-md border border-primary/20 bg-secondary/30 p-3 sm:grid-cols-3">
            <Stat icon={<Target className="h-4 w-4" />} label="Meta / máquina" value={`${fmt(previa.porMaquina)} m³`} />
            <Stat icon={<Users className="h-4 w-4" />} label="Meta / operador" value={`${fmt(previa.porOperador)} m³`} />
            <Stat icon={<Cog className="h-4 w-4" />} label="Operadores totais" value={`${previa.totalOperadores}`} />
          </div>

          <div className="flex gap-2">
            <Button onClick={salvar} className="w-full sm:w-auto">
              {editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingId ? "Atualizar módulo" : "Salvar módulo"}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={resetDraft}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {modulos.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Nenhum módulo cadastrado.</p>
        )}
        {modulos.map((m) => {
          const c = calc(m);
          const dataInic = new Date(m.dataInicial);
          const dataFim = new Date(m.dataFinal);
          return (
            <Card key={m.id} className="border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-primary text-base">
                  <span>{mesLabel(m.mesReferencia)}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => editar(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setModulos((arr) => arr.filter((x) => x.id !== m.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-primary/10 bg-secondary/20 p-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Meta total</div>
                    <div className="font-semibold">{fmt(c.meta)} m³</div>
                  </div>
                  <div className="rounded-md border border-primary/10 bg-secondary/20 p-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Meta / operador</div>
                    <div className="font-semibold">{fmt(c.porOperador)} m³</div>
                  </div>
                  <div className="rounded-md border border-primary/10 bg-secondary/20 p-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Máquinas</div>
                    <div className="font-semibold">{c.maq}</div>
                  </div>
                  <div className="rounded-md border border-primary/10 bg-secondary/20 p-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Operadores</div>
                    <div className="font-semibold">{c.totalOperadores}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{dataInic.toLocaleDateString("pt-BR")} → {dataFim.toLocaleDateString("pt-BR")}</span>
                  <Button size="sm" variant="secondary" onClick={() => gerarPDF(m)}>
                    <FileDown className="mr-1 h-3 w-3" /> PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-primary/10 bg-secondary/20 p-2 text-sm">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-semibold">{value}</div>
      </div>
    </div>
  );
}

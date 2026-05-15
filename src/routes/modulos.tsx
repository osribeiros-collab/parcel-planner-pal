import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Boxes, Target, Users, Cog, FileDown } from "lucide-react";
import { toast } from "sonner";
import {
  useLocalState,
  Fazenda,
  Relatorio,
  FAZENDAS_KEY,
  RELATORIOS_KEY,
  isInProductionMonth,
  getProductionMonthRange,
  productionMonthLabel,
} from "@/lib/harvest";
import jsPDF from "jspdf";

export type Modulo = {
  id: string;
  mesReferencia: string; // YYYY-MM
  dataInicial: string; // YYYY-MM-DD
  dataFinal: string;
  metaTotal: string; // m³
  qtdMaquinas: string;
  qtdOperadoresPorMaquina: string;
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

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);

const parseNum = (s: string) => {
  const n = Number(String(s).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const mesLabel = (mes: string) => {
  if (!mes) return "—";
  const [y, m] = mes.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};

function ModulosPage() {
  const [modulos, setModulos] = useLocalState<Modulo[]>(MODULOS_KEY, []);
  const [draft, setDraft] = useState<Omit<Modulo, "id">>({
    mesReferencia: "",
    dataInicial: "",
    dataFinal: "",
    metaTotal: "",
    qtdMaquinas: "15",
    qtdOperadoresPorMaquina: "3",
  });

  const update = (k: keyof typeof draft, v: string) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const salvar = () => {
    if (!draft.metaTotal || !draft.mesReferencia || !draft.dataInicial || !draft.dataFinal) {
      toast.error("Preencha meta, mês e datas.");
      return;
    }
    setModulos((arr) => [{ id: crypto.randomUUID(), ...draft }, ...arr]);
    setDraft({
      mesReferencia: "",
      dataInicial: "",
      dataFinal: "",
      metaTotal: "",
      qtdMaquinas: "15",
      qtdOperadoresPorMaquina: "3",
    });
    toast.success("Módulo salvo.");
  };

  const remover = (id: string) => setModulos((arr) => arr.filter((m) => m.id !== id));

  const calc = (m: Modulo) => {
    const meta = parseNum(m.metaTotal);
    const maq = Math.max(1, parseNum(m.qtdMaquinas));
    const op = Math.max(1, parseNum(m.qtdOperadoresPorMaquina));
    const porMaquina = meta / maq;
    const porOperador = porMaquina / op;
    return { meta, maq, op, porMaquina, porOperador, totalOperadores: maq * op };
  };

  const previa = calc({ id: "", ...draft });

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Boxes className="h-5 w-5" /> Novo módulo
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

          <Button onClick={salvar} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" /> Salvar módulo
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {modulos.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">Nenhum módulo cadastrado.</p>
        )}
        {modulos.map((m) => {
          const c = calc(m);
          return (
            <Card key={m.id} className="border-primary/20">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="capitalize text-primary">{mesLabel(m.mesReferencia)}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {m.dataInicial?.split("-").reverse().join("/")} — {m.dataFinal?.split("-").reverse().join("/")}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remover(m.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Stat icon={<Target className="h-4 w-4" />} label="Meta total" value={`${fmt(c.meta)} m³`} />
                <Stat icon={<Cog className="h-4 w-4" />} label={`Por máquina (${c.maq})`} value={`${fmt(c.porMaquina)} m³`} />
                <Stat icon={<Users className="h-4 w-4" />} label={`Por operador (${c.op}/máq)`} value={`${fmt(c.porOperador)} m³`} />
                <Stat icon={<Users className="h-4 w-4" />} label="Operadores totais" value={`${c.totalOperadores}`} />
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
    <div className="flex items-center justify-between rounded-md bg-background/40 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold text-primary">{value}</div>
    </div>
  );
}

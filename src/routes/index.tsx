import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TreePine,
  Clock,
  Pause,
  Wrench,
  Target,
  ArrowUp,
  ArrowDown,
  Boxes,
} from "lucide-react";
import {
  Fazenda,
  Relatorio,
  FAZENDAS_KEY,
  RELATORIOS_KEY,
  useLocalState,
  isInProductionMonth,
  productionMonthLabel,
} from "@/lib/harvest";
import type { Modulo } from "./modulos";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Harvest — Início" },
      { name: "description", content: "Painel com produtividade, metas e totais." },
    ],
  }),
});

const MODULOS_KEY = "harvest:modulos";

const parseHoras = (hhmm: string): number => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map((x) => Number(x) || 0);
  return h + m / 60;
};

const parseNum = (s: string) => {
  const n = Number(String(s ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number, d = 2) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: d }).format(n);

const fmtH = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

function Dashboard() {
  const [fazendas] = useLocalState<Fazenda[]>(FAZENDAS_KEY, []);
  const [relatorios] = useLocalState<Relatorio[]>(RELATORIOS_KEY, []);
  const [modulos] = useLocalState<Modulo[]>(MODULOS_KEY, []);

  const periodoLabel = productionMonthLabel();

  const data = useMemo(() => {
    let arv = 0;
    let trabalho = 0;
    let opStop = 0;
    let mecStop = 0;
    let m3Total = 0;
    let metaArvHsoma = 0;
    let metaM3Hsoma = 0;
    let count = 0;

    for (const r of relatorios) {
      if (!isInProductionMonth(r.data)) continue;
      const f = fazendas.find((x) => x.id === r.fazendaId);
      const t = f?.talhoes.find((x) => x.id === r.talhaoId);
      const a = parseNum(r.arv);
      const ht = parseHoras(r.horaTrabalhando);
      arv += a;
      trabalho += ht;
      opStop += parseHoras(r.paradaOperacional);
      mecStop += parseHoras(r.paradaMecanica);
      const vmi = parseNum(t?.vmi || "0");
      m3Total += a * vmi;
      if (t) {
        metaArvHsoma += parseNum(t.metaArvH);
        metaM3Hsoma += parseNum(t.metaM3H);
        count += 1;
      }
    }

    const prod = trabalho > 0 ? arv / trabalho : 0;
    const m3h = trabalho > 0 ? m3Total / trabalho : 0;
    const metaArvHmed = count > 0 ? metaArvHsoma / count : 0;
    const metaM3Hmed = count > 0 ? metaM3Hsoma / count : 0;

    return { arv, trabalho, opStop, mecStop, m3Total, prod, m3h, metaArvHmed, metaM3Hmed };
  }, [relatorios, fazendas]);

  const moduloAtivo = modulos[0];
  const metaPessoal = moduloAtivo
    ? parseNum(moduloAtivo.metaTotal) /
      Math.max(1, parseNum(moduloAtivo.qtdMaquinas)) /
      Math.max(1, parseNum(moduloAtivo.qtdOperadoresPorMaquina))
    : 0;
  const pctMeta = metaPessoal > 0 ? (data.m3Total / metaPessoal) * 100 : 0;

  const chart = [
    {
      name: "Arv/h",
      Meta: Number(data.metaArvHmed.toFixed(2)),
      Produzido: Number(data.prod.toFixed(2)),
    },
    {
      name: "m³/h",
      Meta: Number(data.metaM3Hmed.toFixed(2)),
      Produzido: Number(data.m3h.toFixed(2)),
    },
  ];

  const trend = (val: number, meta: number) => {
    if (meta <= 0) return null;
    const ok = val >= meta;
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold ${ok ? "text-emerald-400" : "text-red-400"}`}
      >
        {ok ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {fmt(Math.abs(val - meta))}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-secondary/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Boxes className="h-5 w-5" /> Meta pessoal (m³)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {moduloAtivo ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold text-primary">{fmt(pctMeta, 1)}%</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(data.m3Total)} m³ de {fmt(metaPessoal)} m³
                  </p>
                </div>
                {trend(pctMeta, 100)}
              </div>
              <Progress value={Math.min(100, pctMeta)} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Cadastre um módulo para visualizar a meta pessoal.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<TreePine className="h-4 w-4" />}
          label="Árvores"
          value={fmt(data.arv, 0)}
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Total m³"
          value={fmt(data.m3Total)}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Trabalho"
          value={fmtH(data.trabalho)}
        />
        <StatCard
          icon={<Pause className="h-4 w-4" />}
          label="Parada op."
          value={fmtH(data.opStop)}
        />
        <StatCard
          icon={<Wrench className="h-4 w-4" />}
          label="Parada mec."
          value={fmtH(data.mecStop)}
        />
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Produtividade x Meta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.78 0.15 85 / 0.15)" />
                <XAxis dataKey="name" stroke="oklch(0.78 0.15 85)" />
                <YAxis stroke="oklch(0.78 0.15 85)" />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.16 0.02 85)",
                    border: "1px solid oklch(0.78 0.15 85 / 0.4)",
                    borderRadius: 8,
                    color: "oklch(0.98 0 0)",
                  }}
                />
                <Legend />
                <Bar dataKey="Meta" fill="oklch(0.55 0.05 85)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Produzido" radius={[6, 6, 0, 0]}>
                  {chart.map((row, i) => (
                    <Cell
                      key={i}
                      fill={
                        row.Produzido >= row.Meta
                          ? "oklch(0.78 0.15 85)"
                          : "oklch(0.55 0.20 25)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <MiniRow label="Arv/h" val={data.prod} meta={data.metaArvHmed} />
            <MiniRow label="m³/h" val={data.m3h} meta={data.metaM3Hmed} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-primary/20">
      <CardContent className="flex flex-col gap-1 p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className="text-lg font-bold text-primary">{value}</p>
      </CardContent>
    </Card>
  );
}

function MiniRow({ label, val, meta }: { label: string; val: number; meta: number }) {
  const ok = meta > 0 && val >= meta;
  const diff = val - meta;
  const fmtN = (n: number) =>
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n);
  return (
    <div className="flex items-center justify-between rounded-md border border-primary/10 bg-secondary/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-semibold ${meta <= 0 ? "text-primary" : ok ? "text-emerald-400" : "text-red-400"}`}
      >
        {meta > 0 &&
          (ok ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
        {fmtN(val)}
        {meta > 0 && (
          <span className="text-xs opacity-80">
            {" "}
            ({diff >= 0 ? "+" : ""}
            {fmtN(diff)})
          </span>
        )}
      </span>
    </div>
  );
}

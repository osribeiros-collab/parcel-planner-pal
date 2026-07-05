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
  Percent,
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
    let metaM3Periodo = 0;
    const talhoesUsados = new Set<string>();
    const byDay = new Map<
      string,
      { arv: number; ht: number; m3: number; metaArvHsum: number; metaM3Hsum: number; metaCount: number }
    >();


    for (const r of relatorios) {
      if (!isInProductionMonth(r.data)) continue;
      const f = fazendas.find((x) => x.id === r.fazendaId);
      const t = f?.talhoes.find((x) => x.id === r.talhaoId);
      const a = parseNum(r.arv);
      const ht = parseHoras(r.horaTrabalhando);
      const vmi = parseNum(t?.vmi || "0");
      const metaArvH = parseNum(t?.metaArvH || "0");
      const metaM3H = parseNum(t?.metaM3H || "0");
      arv += a;
      trabalho += ht;
      opStop += parseHoras(r.paradaOperacional);
      mecStop += parseHoras(r.paradaMecanica);
      m3Total += a * vmi;
      metaM3Periodo += ht * metaM3H;
      if (t) talhoesUsados.add(`${r.fazendaId}:${r.talhaoId}`);

      const d = byDay.get(r.data) || {
        arv: 0,
        ht: 0,
        m3: 0,
        metaArvHsum: 0,
        metaM3Hsum: 0,
        metaCount: 0,
      };
      d.arv += a;
      d.ht += ht;
      d.m3 += a * vmi;
      if (metaArvH > 0 || metaM3H > 0) {
        d.metaArvHsum += metaArvH;
        d.metaM3Hsum += metaM3H;
        d.metaCount += 1;
      }
      byDay.set(r.data, d);
    }

    // Soma das metas dos talhões trabalhados no mês (únicos)
    let metaArvHsoma = 0;
    let metaM3Hsoma = 0;
    for (const key of talhoesUsados) {
      const [fid, tid] = key.split(":");
      const t = fazendas.find((x) => x.id === fid)?.talhoes.find((x) => x.id === tid);
      if (t) {
        metaArvHsoma += parseNum(t.metaArvH);
        metaM3Hsoma += parseNum(t.metaM3H);
      }
    }

    const prod = trabalho > 0 ? arv / trabalho : 0;
    const m3h = trabalho > 0 ? m3Total / trabalho : 0;
    const eficiencia = metaM3Hsoma > 0 ? (m3h / (metaM3Hsoma / talhoesUsados.size)) * 100 : 0;
    const eo = (trabalho + opStop) > 0 ? (trabalho / (trabalho + opStop)) * 100 : 0;

    const diario = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        const [, mm, dd] = date.split("-");
        return {
          name: `${dd}/${mm}`,
          "Arv/h": v.ht > 0 ? Number((v.arv / v.ht).toFixed(2)) : 0,
          "m³/h": v.ht > 0 ? Number((v.m3 / v.ht).toFixed(2)) : 0,
          "Meta Arv/h": v.metaCount > 0 ? Number((v.metaArvHsum / v.metaCount).toFixed(2)) : 0,
          "Meta m³/h": v.metaCount > 0 ? Number((v.metaM3Hsum / v.metaCount).toFixed(2)) : 0,
        };
      });

    return {
      arv,
      trabalho,
      opStop,
      mecStop,
      m3Total,
      metaM3Periodo,
      prod,
      m3h,
      metaArvHmed: metaArvHsoma / Math.max(1, talhoesUsados.size),
      metaM3Hmed: metaM3Hsoma / Math.max(1, talhoesUsados.size),
      eficiencia,
      eo,
      talhoesCount: talhoesUsados.size,
      diario,
    };
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
          <CardTitle className="flex items-center justify-between gap-2 text-primary">
            <span className="flex items-center gap-2"><Boxes className="h-5 w-5" /> Meta pessoal (m³)</span>
            <span className="text-[10px] font-normal text-muted-foreground">{periodoLabel}</span>
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
        <StatCard
          icon={<Percent className="h-4 w-4" />}
          label="E.O."
          value={`${fmt(data.eo, 1)}%`}
        />
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-secondary/20 to-background">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-primary">
            <span>Eficiência de Produção</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {data.talhoesCount} talhão(ões)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-primary">{fmt(data.eficiencia, 1)}%</p>
              <p className="text-xs text-muted-foreground">
                Real {fmt(data.m3h)} m³/h ÷ Meta {fmt(data.metaM3Hmed)} m³/h
              </p>
            </div>
            {trend(data.eficiencia, 100)}
          </div>
          <Progress value={Math.min(100, data.eficiencia)} />
        </CardContent>
      </Card>


      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-primary">
            <span>Produtividade por dia</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              {data.diario.length} dia(s)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.diario.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sem relatórios no período para exibir o gráfico diário.
            </p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.diario}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.78 0.15 85 / 0.15)" />
                  <XAxis dataKey="name" stroke="oklch(0.78 0.15 85)" />
                  <YAxis stroke="oklch(0.78 0.15 85)" />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload || payload.length === 0) return null;

                      const getVal = (key: string) =>
                        payload.find((p: any) => p.dataKey === key)?.value ?? 0;

                      const arvMeta = getVal("Meta Arv/h");
                      const arvProd = getVal("Arv/h");
                      const m3Meta = getVal("Meta m³/h");
                      const m3Prod = getVal("m³/h");
                      const pctArv = arvMeta > 0 ? (arvProd / arvMeta) * 100 : 0;
                      const pctM3 = m3Meta > 0 ? (m3Prod / m3Meta) * 100 : 0;

                      return (
                        <div
                          style={{
                            background: "oklch(0.16 0.02 85)",
                            border: "1px solid oklch(0.78 0.15 85 / 0.4)",
                            borderRadius: 8,
                            padding: "8px 12px",
                            color: "oklch(0.98 0 0)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
                          {payload.map((p: any, i: number) => (
                            <div key={i} style={{ color: p.color, fontSize: 12 }}>
                              {p.name}: {fmt(p.value)}
                            </div>
                          ))}
                          {(arvMeta > 0 || m3Meta > 0) && (
                            <div style={{ marginTop: 4, fontSize: 12, color: "oklch(0.78 0.15 85)" }}>
                              {arvMeta > 0 && <>Arv/h: {fmt(pctArv, 1)}% </>}
                              {m3Meta > 0 && <>m³/h: {fmt(pctM3, 1)}%</>}
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Meta Arv/h" fill="oklch(0.55 0.05 85)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Arv/h" fill="oklch(0.78 0.15 85)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Meta m³/h" fill="oklch(0.45 0.05 200)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="m³/h" fill="oklch(0.68 0.15 200)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
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

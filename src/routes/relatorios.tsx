import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Clock, ArrowUp, ArrowDown, FilePlus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Fazenda,
  Relatorio,
  FAZENDAS_KEY,
  RELATORIOS_KEY,
  fazendaLabel,
  toDateKey,
  useLocalState,
} from "@/lib/harvest";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/relatorios")({
  component: Relatorios,
  head: () => ({
    meta: [
      { title: "Harvest — Relatórios" },
      { name: "description", content: "Relatórios diários de produção." },
    ],
  }),
});

type Draft = Omit<Relatorio, "id" | "data">;

const emptyDraft = (): Draft => ({
  fazendaId: "",
  talhaoId: "",
  horimetroInicial: "",
  horimetroFinal: "",
  arv: "",
  horaTrabalhando: "",
  paradaOperacional: "",
  paradaMecanica: "",
  obs: "",
});

const parseHoras = (hhmm: string): number => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h)) return 0;
  return h + (m || 0) / 60;
};

const parseNum = (s: string): number => {
  if (!s) return 0;
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const fmt = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const JORNADA_H = 8 + 48 / 60; // 8:48
const fmtH = (h: number) => {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};
function JornadaAlert({ trab, op, mec }: { trab: string; op: string; mec: string }) {
  const total = parseHoras(trab) + parseHoras(op) + parseHoras(mec);
  if (total === 0) return null;
  const diff = total - JORNADA_H;
  if (Math.abs(diff) < 1 / 120) return null; // tolerância < 30s
  const acima = diff > 0;
  return (
    <div
      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
        acima
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
          : "border-red-500/40 bg-red-500/10 text-red-400"
      }`}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>
        Jornada {fmtH(total)} {acima ? "acima" : "abaixo"} de 08:48 ({diff >= 0 ? "+" : "−"}
        {fmtH(Math.abs(diff))})
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  meta,
  unit,
}: {
  label: string;
  value: number;
  meta: number;
  unit: string;
}) {
  const ok = meta > 0 && value >= meta;
  const cor = meta <= 0 ? "text-muted-foreground" : ok ? "text-emerald-500" : "text-red-500";
  const Icon = ok ? ArrowUp : ArrowDown;
  const diff = value - meta;
  const pct = meta > 0 ? (value / meta) * 100 : 0;
  return (
    <div className="rounded-md border border-primary/20 bg-background/50 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`flex items-center gap-1 text-base font-bold ${cor}`}>
        {meta > 0 && <Icon className="h-4 w-4" />}
        {fmt(value)} <span className="text-xs font-normal">{unit}</span>
      </div>
      {meta > 0 && (
        <div className="text-[10px] text-muted-foreground">
          Meta {fmt(meta)} · {diff >= 0 ? "+" : ""}{fmt(diff)} ({fmt(pct)}%)
        </div>
      )}
    </div>
  );
}

function Relatorios() {
  const [fazendas] = useLocalState<Fazenda[]>(FAZENDAS_KEY, []);
  const [relatorios, setRelatorios] = useLocalState<Relatorio[]>(RELATORIOS_KEY, []);
  const [viewDate, setViewDate] = useState<Date | undefined>(undefined);
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoDate, setNovoDate] = useState<string>(toDateKey(new Date()));
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);

  const datasComRelatorio = useMemo(() => {
    const set = new Set(relatorios.map((r) => r.data));
    return Array.from(set).map((d) => {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, m - 1, day);
    });
  }, [relatorios]);

  const viewKey = viewDate ? toDateKey(viewDate) : "";
  const relatoriosDoDia = relatorios.filter((r) => r.data === viewKey);

  const updateDraft = (idx: number, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

  const addSubRelatorio = () => setDrafts((p) => [...p, emptyDraft()]);
  const removeDraft = (idx: number) =>
    setDrafts((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx)));

  const abrirNovo = () => {
    setNovoDate(toDateKey(new Date()));
    setDrafts([emptyDraft()]);
    setNovoOpen(true);
  };

  const salvar = () => {
    if (!novoDate) {
      toast.error("Selecione uma data");
      return;
    }
    const validos: Relatorio[] = [];
    for (const d of drafts) {
      if (!d.fazendaId || !d.talhaoId) {
        toast.error("Selecione fazenda e talhão em todos os relatórios");
        return;
      }
      validos.push({ id: crypto.randomUUID(), data: novoDate, ...d });
    }
    setRelatorios((prev) => [...prev, ...validos]);
    toast.success(`${validos.length} relatório(s) salvos`);
    setNovoOpen(false);
  };

  const removerRelatorio = (id: string) =>
    setRelatorios((prev) => prev.filter((r) => r.id !== id));

  const fazendaById = (id: string) => fazendas.find((f) => f.id === id);

  return (
    <div className="space-y-6">
      <Button onClick={abrirNovo} className="w-full" disabled={fazendas.length === 0}>
        <FilePlus className="mr-2 h-4 w-4" /> Adicionar relatório
      </Button>
      {fazendas.length === 0 && (
        <p className="text-xs text-destructive -mt-4">
          Cadastre uma fazenda antes de criar relatórios.
        </p>
      )}

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Calendário de relatórios</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={viewDate}
            onSelect={(d) => d && setViewDate(d)}
            modifiers={{ hasReport: datasComRelatorio }}
            modifiersClassNames={{
              hasReport: "bg-primary/30 text-primary-foreground rounded-md font-semibold",
            }}
            className="pointer-events-auto"
          />
        </CardContent>
      </Card>

      {/* View existing reports */}
      <Dialog open={!!viewDate} onOpenChange={(o) => !o && setViewDate(undefined)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {viewDate?.toLocaleDateString("pt-BR")}
            </DialogTitle>
          </DialogHeader>

          {relatoriosDoDia.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum relatório nesse dia.</p>
          ) : (
            <div className="space-y-3">
              {relatoriosDoDia.map((r) => {
                const f = fazendaById(r.fazendaId);
                const t = f?.talhoes.find((x) => x.id === r.talhaoId);
                const horas = parseHoras(r.horaTrabalhando);
                const arv = parseNum(r.arv);
                const vmi = parseNum(t?.vmi || "0");
                const metaArv = parseNum(t?.metaArvH || "0");
                const metaM3 = parseNum(t?.metaM3H || "0");
                const prod = horas > 0 ? arv / horas : 0;
                const m3 = arv * vmi;
                const m3h = horas > 0 ? m3 / horas : 0;
                return (
                  <div
                    key={r.id}
                    className="space-y-3 rounded-md border border-primary/20 bg-secondary/20 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-medium text-primary">
                          {f ? fazendaLabel(f) : "Fazenda removida"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Talhão {t?.numero ?? "?"} · Árv: {r.arv || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Horímetro: {r.horimetroInicial || "—"} → {r.horimetroFinal || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Trab: {r.horaTrabalhando || "—"} · Op: {r.paradaOperacional || "—"} ·
                          Mec: {r.paradaMecanica || "—"}
                        </div>
                        {r.obs && (
                          <div className="text-xs italic text-muted-foreground">"{r.obs}"</div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removerRelatorio(r.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <JornadaAlert
                      trab={r.horaTrabalhando}
                      op={r.paradaOperacional}
                      mec={r.paradaMecanica}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Stat label="Produtividade" value={prod} meta={metaArv} unit="árv/h" />
                      <Stat label="m³ no dia" value={m3} meta={0} unit="m³" />
                      <Stat label="m³/h" value={m3h} meta={metaM3} unit="m³/h" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New report */}
      <Dialog open={novoOpen} onOpenChange={setNovoOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Novo relatório</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Data</Label>
              <Input
                type="date"
                value={novoDate}
                onChange={(e) => setNovoDate(e.target.value)}
              />
            </div>

            {drafts.map((d, idx) => {
              const f = fazendaById(d.fazendaId);
              return (
                <div
                  key={idx}
                  className="space-y-3 rounded-lg border border-primary/20 bg-secondary/10 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">
                      {idx === 0 ? "Relatório" : `Sub-relatório ${idx}`}
                    </span>
                    {drafts.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeDraft(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fazenda</Label>
                      <Select
                        value={d.fazendaId}
                        onValueChange={(v) =>
                          updateDraft(idx, { fazendaId: v, talhaoId: "" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {fazendas.map((fz) => (
                            <SelectItem key={fz.id} value={fz.id}>
                              {fazendaLabel(fz)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Talhão</Label>
                      <Select
                        value={d.talhaoId}
                        onValueChange={(v) => updateDraft(idx, { talhaoId: v })}
                        disabled={!f}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={f ? "Selecione" : "Escolha fazenda"} />
                        </SelectTrigger>
                        <SelectContent>
                          {f?.talhoes.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              Talhão {t.numero}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Horímetro inicial</Label>
                      <Input
                        value={d.horimetroInicial}
                        onChange={(e) => updateDraft(idx, { horimetroInicial: e.target.value })}
                        inputMode="decimal"
                        placeholder="0,0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Horímetro final</Label>
                      <Input
                        value={d.horimetroFinal}
                        onChange={(e) => updateDraft(idx, { horimetroFinal: e.target.value })}
                        inputMode="decimal"
                        placeholder="0,0"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Árv</Label>
                      <Input
                        value={d.arv}
                        onChange={(e) => updateDraft(idx, { arv: e.target.value })}
                        inputMode="numeric"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Hora trabalhando
                      </Label>
                      <Input
                        type="time"
                        step={60}
                        value={d.horaTrabalhando}
                        onChange={(e) => updateDraft(idx, { horaTrabalhando: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Parada operacional
                      </Label>
                      <Input
                        type="time"
                        step={60}
                        value={d.paradaOperacional}
                        onChange={(e) => updateDraft(idx, { paradaOperacional: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Parada mecânica
                      </Label>
                      <Input
                        type="time"
                        step={60}
                        value={d.paradaMecanica}
                        onChange={(e) => updateDraft(idx, { paradaMecanica: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Observações</Label>
                      <Textarea
                        value={d.obs}
                        onChange={(e) => updateDraft(idx, { obs: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                  <JornadaAlert
                    trab={d.horaTrabalhando}
                    op={d.paradaOperacional}
                    mec={d.paradaMecanica}
                  />
                </div>
              );
            })}

            <Button variant="secondary" className="w-full" onClick={addSubRelatorio}>
              <Plus className="mr-1 h-4 w-4" /> Trabalhar em outro talhão
            </Button>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setNovoOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={salvar}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

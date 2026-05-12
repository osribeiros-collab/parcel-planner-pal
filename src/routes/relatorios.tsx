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
import { Plus, Trash2, Clock } from "lucide-react";
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

function Relatorios() {
  const [fazendas] = useLocalState<Fazenda[]>(FAZENDAS_KEY, []);
  const [relatorios, setRelatorios] = useLocalState<Relatorio[]>(RELATORIOS_KEY, []);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);

  const datasComRelatorio = useMemo(() => {
    const set = new Set(relatorios.map((r) => r.data));
    return Array.from(set).map((d) => {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, m - 1, day);
    });
  }, [relatorios]);

  const dateKey = selectedDate ? toDateKey(selectedDate) : "";
  const relatoriosDoDia = relatorios.filter((r) => r.data === dateKey);

  const openDay = (d: Date | undefined) => {
    if (!d) return;
    setSelectedDate(d);
    setDrafts([emptyDraft()]);
  };

  const updateDraft = (idx: number, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

  const addSubRelatorio = () => setDrafts((p) => [...p, emptyDraft()]);
  const removeDraft = (idx: number) =>
    setDrafts((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx)));

  const salvar = () => {
    if (!selectedDate) return;
    const validos: Relatorio[] = [];
    for (const d of drafts) {
      if (!d.fazendaId || !d.talhaoId) {
        toast.error("Selecione fazenda e talhão em todos os relatórios");
        return;
      }
      validos.push({ id: crypto.randomUUID(), data: dateKey, ...d });
    }
    setRelatorios((prev) => [...prev, ...validos]);
    toast.success(`${validos.length} relatório(s) salvos`);
    setSelectedDate(undefined);
  };

  const removerRelatorio = (id: string) =>
    setRelatorios((prev) => prev.filter((r) => r.id !== id));

  const fazendaById = (id: string) => fazendas.find((f) => f.id === id);

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Calendário de relatórios</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={selectedDate}
            onSelect={openDay}
            modifiers={{ hasReport: datasComRelatorio }}
            modifiersClassNames={{
              hasReport: "bg-primary/30 text-primary-foreground rounded-md font-semibold",
            }}
            className="pointer-events-auto"
          />
        </CardContent>
      </Card>

      <Dialog open={!!selectedDate} onOpenChange={(o) => !o && setSelectedDate(undefined)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">
              {selectedDate?.toLocaleDateString("pt-BR")}
            </DialogTitle>
          </DialogHeader>

          {relatoriosDoDia.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary">Relatórios do dia</h3>
              {relatoriosDoDia.map((r) => {
                const f = fazendaById(r.fazendaId);
                const t = f?.talhoes.find((x) => x.id === r.talhaoId);
                return (
                  <div key={r.id} className="rounded-md border border-primary/20 bg-secondary/20 p-3 text-sm">
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
                          Trab: {r.horaTrabalhando || "—"} · Op: {r.paradaOperacional || "—"} · Mec: {r.paradaMecanica || "—"}
                        </div>
                        {r.obs && <div className="text-xs italic text-muted-foreground">"{r.obs}"</div>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removerRelatorio(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-semibold text-primary">Novo relatório</h3>
            {drafts.map((d, idx) => {
              const f = fazendaById(d.fazendaId);
              return (
                <div key={idx} className="space-y-3 rounded-lg border border-primary/20 bg-secondary/10 p-3">
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
                        onValueChange={(v) => updateDraft(idx, { fazendaId: v, talhaoId: "" })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {fazendas.map((fz) => (
                            <SelectItem key={fz.id} value={fz.id}>{fazendaLabel(fz)}</SelectItem>
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
                        <SelectTrigger><SelectValue placeholder={f ? "Selecione" : "Escolha fazenda"} /></SelectTrigger>
                        <SelectContent>
                          {f?.talhoes.map((t) => (
                            <SelectItem key={t.id} value={t.id}>Talhão {t.numero}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Horímetro inicial</Label>
                      <Input value={d.horimetroInicial} onChange={(e) => updateDraft(idx, { horimetroInicial: e.target.value })} inputMode="decimal" placeholder="0,0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Horímetro final</Label>
                      <Input value={d.horimetroFinal} onChange={(e) => updateDraft(idx, { horimetroFinal: e.target.value })} inputMode="decimal" placeholder="0,0" />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Árv</Label>
                      <Input value={d.arv} onChange={(e) => updateDraft(idx, { arv: e.target.value })} inputMode="numeric" placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Hora trabalhando</Label>
                      <Input type="time" step={60} value={d.horaTrabalhando} onChange={(e) => updateDraft(idx, { horaTrabalhando: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Parada operacional</Label>
                      <Input type="time" step={60} value={d.paradaOperacional} onChange={(e) => updateDraft(idx, { paradaOperacional: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Parada mecânica</Label>
                      <Input type="time" step={60} value={d.paradaMecanica} onChange={(e) => updateDraft(idx, { paradaMecanica: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">Observações</Label>
                      <Textarea value={d.obs} onChange={(e) => updateDraft(idx, { obs: e.target.value })} rows={2} />
                    </div>
                  </div>
                </div>
              );
            })}

            <Button variant="secondary" className="w-full" onClick={addSubRelatorio}>
              <Plus className="mr-1 h-4 w-4" /> Trabalhar em outro talhão
            </Button>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSelectedDate(undefined)}>Cancelar</Button>
              <Button onClick={salvar} disabled={fazendas.length === 0}>Salvar</Button>
            </div>
            {fazendas.length === 0 && (
              <p className="text-xs text-destructive">Cadastre uma fazenda antes de criar relatórios.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

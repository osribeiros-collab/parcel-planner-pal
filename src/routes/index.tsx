import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Fazenda,
  Talhao,
  FAZENDAS_KEY,
  useLocalState,
} from "@/lib/harvest";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Harvest — Fazendas" },
      { name: "description", content: "Cadastro de fazendas e talhões." },
    ],
  }),
});

function Index() {
  const [fazendas, setFazendas] = useLocalState<Fazenda[]>(FAZENDAS_KEY, []);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Record<string, Omit<Talhao, "id">>>({});

  const salvarFazenda = () => {
    if (!codigo.trim() || !nome.trim()) {
      toast.error("Informe o código e o nome da fazenda");
      return;
    }
    const nova: Fazenda = {
      id: crypto.randomUUID(),
      codigo: codigo.trim(),
      nome: nome.trim(),
      talhoes: [],
    };
    setFazendas((prev) => [nova, ...prev]);
    setExpanded((p) => ({ ...p, [nova.id]: true }));
    setCodigo("");
    setNome("");
    toast.success("Fazenda cadastrada");
  };

  const removerFazenda = (id: string) => {
    setFazendas((prev) => prev.filter((f) => f.id !== id));
  };

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const getDraft = (id: string) =>
    draft[id] ?? { numero: "", vmi: "", metaArvH: "", metaM3H: "" };

  const updateDraft = (id: string, patch: Partial<Omit<Talhao, "id">>) =>
    setDraft((p) => ({ ...p, [id]: { ...getDraft(id), ...patch } }));

  const addTalhao = (fid: string) => {
    const d = getDraft(fid);
    if (!d.numero.trim()) {
      toast.error("Informe o número do talhão");
      return;
    }
    setFazendas((prev) =>
      prev.map((f) =>
        f.id === fid
          ? {
              ...f,
              talhoes: [
                ...f.talhoes,
                {
                  id: crypto.randomUUID(),
                  numero: d.numero.trim(),
                  vmi: d.vmi.trim(),
                  metaArvH: d.metaArvH.trim(),
                  metaM3H: d.metaM3H.trim(),
                },
              ],
            }
          : f,
      ),
    );
    setDraft((p) => ({ ...p, [fid]: { numero: "", vmi: "", metaArvH: "", metaM3H: "" } }));
    setShowForm((p) => ({ ...p, [fid]: false }));
    toast.success("Talhão adicionado");
  };

  const removeTalhao = (fid: string, tid: string) => {
    setFazendas((prev) =>
      prev.map((f) =>
        f.id === fid ? { ...f, talhoes: f.talhoes.filter((t) => t.id !== tid) } : f,
      ),
    );
  };

  return (
    <div className="space-y-8">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-primary">Nova fazenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código da fazenda</Label>
              <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: 2020" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da fazenda</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Santa Isabel" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={salvarFazenda}>Salvar fazenda</Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-primary">Fazendas cadastradas</h2>
        {fazendas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma fazenda cadastrada ainda.</p>
        ) : (
          <div className="grid gap-3">
            {fazendas.map((f) => {
              const isOpen = !!expanded[f.id];
              const d = getDraft(f.id);
              return (
                <Card key={f.id} className="border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <button onClick={() => toggle(f.id)} className="flex flex-1 items-center gap-2 text-left">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-primary" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-primary" />
                      )}
                      <div>
                        <CardTitle className="text-base text-primary">{f.nome}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Código: {f.codigo} · {f.talhoes.length} talhão(ões)
                        </p>
                      </div>
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => removerFazenda(f.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>

                  {isOpen && (
                    <CardContent className="space-y-4">
                      {f.talhoes.length > 0 && (
                        <div className="overflow-x-auto rounded-md border border-primary/10">
                          <table className="w-full text-sm">
                            <thead className="bg-secondary/40 text-left text-xs text-primary">
                              <tr>
                                <th className="px-3 py-2 font-medium">Talhão</th>
                                <th className="px-3 py-2 font-medium">VMI</th>
                                <th className="px-3 py-2 font-medium">Arv/h</th>
                                <th className="px-3 py-2 font-medium">m³/h</th>
                                <th className="px-3 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {f.talhoes.map((t) => (
                                <tr key={t.id} className="border-t border-primary/10">
                                  <td className="px-3 py-2">{t.numero}</td>
                                  <td className="px-3 py-2">{t.vmi || "—"}</td>
                                  <td className="px-3 py-2">{t.metaArvH || "—"}</td>
                                  <td className="px-3 py-2">{t.metaM3H || "—"}</td>
                                  <td className="px-3 py-2 text-right">
                                    <Button variant="ghost" size="icon" onClick={() => removeTalhao(f.id, t.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {showForm[f.id] ? (
                        <div className="rounded-lg border border-primary/20 bg-secondary/20 p-4">
                          <h3 className="mb-3 text-sm font-medium text-primary">Novo talhão</h3>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Nº do talhão</Label>
                              <Input value={d.numero} onChange={(e) => updateDraft(f.id, { numero: e.target.value })} placeholder="01" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">VMI</Label>
                              <Input value={d.vmi} onChange={(e) => updateDraft(f.id, { vmi: e.target.value })} placeholder="0,00" inputMode="decimal" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Meta Arv/h</Label>
                              <Input value={d.metaArvH} onChange={(e) => updateDraft(f.id, { metaArvH: e.target.value })} placeholder="0" inputMode="decimal" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Meta m³/h</Label>
                              <Input value={d.metaM3H} onChange={(e) => updateDraft(f.id, { metaM3H: e.target.value })} placeholder="0" inputMode="decimal" />
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setShowForm((p) => ({ ...p, [f.id]: false }))}>
                              Cancelar
                            </Button>
                            <Button onClick={() => addTalhao(f.id)}>
                              <Plus className="mr-1 h-4 w-4" /> Salvar talhão
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button variant="secondary" onClick={() => setShowForm((p) => ({ ...p, [f.id]: true }))}>
                          <Plus className="mr-1 h-4 w-4" /> Adicionar talhão
                        </Button>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

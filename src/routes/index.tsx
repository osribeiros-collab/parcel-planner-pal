import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Sprout } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Harvest — Controle de Produção" },
      { name: "description", content: "Cadastro de fazendas e talhões para controle de produção de harvest." },
    ],
  }),
});

type Talhao = {
  id: string;
  numero: string;
  vmi: string;
  metaArvH: string;
  metaM3H: string;
};

type Fazenda = {
  id: string;
  codigo: string;
  nome: string;
  talhoes: Talhao[];
};

const STORAGE_KEY = "harvest:fazendas";

function Index() {
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [talhoes, setTalhoes] = useState<Talhao[]>([]);

  // talhão form
  const [tNumero, setTNumero] = useState("");
  const [tVmi, setTVmi] = useState("");
  const [tArv, setTArv] = useState("");
  const [tM3, setTM3] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setFazendas(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fazendas));
  }, [fazendas]);

  const addTalhao = () => {
    if (!tNumero.trim()) {
      toast.error("Informe o número do talhão");
      return;
    }
    setTalhoes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        numero: tNumero.trim(),
        vmi: tVmi.trim(),
        metaArvH: tArv.trim(),
        metaM3H: tM3.trim(),
      },
    ]);
    setTNumero("");
    setTVmi("");
    setTArv("");
    setTM3("");
  };

  const removeTalhao = (id: string) => {
    setTalhoes((prev) => prev.filter((t) => t.id !== id));
  };

  const salvarFazenda = () => {
    if (!codigo.trim() || !nome.trim()) {
      toast.error("Informe o código e o nome da fazenda");
      return;
    }
    const nova: Fazenda = {
      id: crypto.randomUUID(),
      codigo: codigo.trim(),
      nome: nome.trim(),
      talhoes,
    };
    setFazendas((prev) => [nova, ...prev]);
    setCodigo("");
    setNome("");
    setTalhoes([]);
    toast.success("Fazenda cadastrada");
  };

  const removerFazenda = (id: string) => {
    setFazendas((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-right" />
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sprout className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Controle de Produção — Harvest</h1>
            <p className="text-sm text-muted-foreground">Cadastro de fazendas e talhões</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Nova fazenda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código da fazenda</Label>
                <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: F-001" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da fazenda</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Fazenda São João" />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <h3 className="mb-3 text-sm font-medium">Adicionar talhão</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="t-num" className="text-xs">Nº do talhão</Label>
                  <Input id="t-num" value={tNumero} onChange={(e) => setTNumero(e.target.value)} placeholder="01" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-vmi" className="text-xs">VMI</Label>
                  <Input id="t-vmi" value={tVmi} onChange={(e) => setTVmi(e.target.value)} placeholder="0,00" inputMode="decimal" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-arv" className="text-xs">Meta Arv/h</Label>
                  <Input id="t-arv" value={tArv} onChange={(e) => setTArv(e.target.value)} placeholder="0" inputMode="decimal" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-m3" className="text-xs">Meta m³/h</Label>
                  <Input id="t-m3" value={tM3} onChange={(e) => setTM3(e.target.value)} placeholder="0" inputMode="decimal" />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button type="button" variant="secondary" onClick={addTalhao}>
                  <Plus className="mr-1 h-4 w-4" /> Adicionar talhão
                </Button>
              </div>

              {talhoes.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {talhoes.map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
                      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
                        <span><span className="text-muted-foreground">Talhão:</span> {t.numero}</span>
                        <span><span className="text-muted-foreground">VMI:</span> {t.vmi || "—"}</span>
                        <span><span className="text-muted-foreground">Arv/h:</span> {t.metaArvH || "—"}</span>
                        <span><span className="text-muted-foreground">m³/h:</span> {t.metaM3H || "—"}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeTalhao(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={salvarFazenda}>Salvar fazenda</Button>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Fazendas cadastradas</h2>
          {fazendas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma fazenda cadastrada ainda.</p>
          ) : (
            <div className="grid gap-3">
              {fazendas.map((f) => (
                <Card key={f.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">{f.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground">Código: {f.codigo} · {f.talhoes.length} talhão(ões)</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removerFazenda(f.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  {f.talhoes.length > 0 && (
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-left text-xs text-muted-foreground">
                            <tr>
                              <th className="py-1.5 pr-4 font-medium">Talhão</th>
                              <th className="py-1.5 pr-4 font-medium">VMI</th>
                              <th className="py-1.5 pr-4 font-medium">Meta Arv/h</th>
                              <th className="py-1.5 font-medium">Meta m³/h</th>
                            </tr>
                          </thead>
                          <tbody>
                            {f.talhoes.map((t) => (
                              <tr key={t.id} className="border-t">
                                <td className="py-1.5 pr-4">{t.numero}</td>
                                <td className="py-1.5 pr-4">{t.vmi || "—"}</td>
                                <td className="py-1.5 pr-4">{t.metaArvH || "—"}</td>
                                <td className="py-1.5">{t.metaM3H || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map, Upload, Crosshair, Play, Square, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/mapas")({ component: MapasPage });

type CalibPoint = { x: number; y: number; lat: number; lng: number };
type Track = { id: string; nome: string; pontos: { lat: number; lng: number; t: number }[] };
type MapaPDF = {
  id: string;
  nome: string;
  pdfData: string; // base64 data URL
  calib: CalibPoint[]; // 2 pontos em coords da página PDF (pontos PDF) + lat/lng
  pageWidth?: number;
  pageHeight?: number;
  tracks: Track[];
};

const MAPAS_KEY = "harvest_mapas";

function loadMapas(): MapaPDF[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(MAPAS_KEY) || "[]"); } catch { return []; }
}
function saveMapas(m: MapaPDF[]) { localStorage.setItem(MAPAS_KEY, JSON.stringify(m)); }

function MapasPage() {
  const [mapas, setMapas] = useState<MapaPDF[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setMapas(loadMapas()); }, []);

  const update = (next: MapaPDF[]) => { setMapas(next); saveMapas(next); };

  const onFile = async (f: File) => {
    setUploading(true);
    try {
      const b64 = await fileToDataUrl(f);
      const novo: MapaPDF = {
        id: crypto.randomUUID(),
        nome: f.name.replace(/\.pdf$/i, ""),
        pdfData: b64,
        calib: [],
        tracks: [],
      };
      const next = [...mapas, novo];
      update(next);
      setSelectedId(novo.id);
      toast.success("Mapa adicionado. Calibre 2 pontos para usar GPS.");
    } catch (e: any) {
      toast.error("Não consegui salvar — talvez o PDF seja grande demais. " + (e?.message ?? ""));
    } finally {
      setUploading(false);
    }
  };

  const removeMapa = (id: string) => {
    update(mapas.filter(m => m.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const updateMapa = (id: string, patch: Partial<MapaPDF>) => {
    update(mapas.map(m => m.id === id ? { ...m, ...patch } : m));
  };

  const selecionado = mapas.find(m => m.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Map className="h-5 w-5" /> Mapas PDF
          </CardTitle>
          <label>
            <input type="file" accept="application/pdf" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = "";
            }} />
            <Button asChild size="sm" disabled={uploading}>
              <span><Upload className="mr-2 h-4 w-4" />{uploading ? "Carregando..." : "Adicionar PDF"}</span>
            </Button>
          </label>
        </CardHeader>
        <CardContent className="space-y-2">
          {mapas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum mapa ainda. Adicione um PDF para começar.</p>
          ) : (
            <div className="grid gap-2">
              {mapas.map(m => (
                <div key={m.id} className={`flex items-center justify-between rounded-md border p-2 ${selectedId === m.id ? "border-primary bg-primary/5" : "border-border"}`}>
                  <button className="flex-1 text-left" onClick={() => setSelectedId(m.id)}>
                    <div className="font-medium text-foreground">{m.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.calib.length === 2 ? "Calibrado" : `${m.calib.length}/2 pontos`} · {m.tracks.length} trilha(s)
                    </div>
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => removeMapa(m.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selecionado && (
        <MapaViewer
          key={selecionado.id}
          mapa={selecionado}
          onChange={patch => updateMapa(selecionado.id, patch)}
        />
      )}
    </div>
  );
}

function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });
}

// ============================================================
// Viewer com pan/zoom, calibração, GPS e gravação de trilha
// ============================================================
function MapaViewer({ mapa, onChange }: { mapa: MapaPDF; onChange: (p: Partial<MapaPDF>) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [pdfPage, setPdfPage] = useState<any>(null);
  const [renderScale, setRenderScale] = useState(1.5);
  const [view, setView] = useState({ tx: 0, ty: 0, zoom: 1 });
  const [calibMode, setCalibMode] = useState(false);
  const [pendingTap, setPendingTap] = useState<{ x: number; y: number } | null>(null);
  const [gpsPos, setGpsPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [recording, setRecording] = useState<Track | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Carrega PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const data = atob(mapa.pdfData.split(",")[1]);
      const bytes = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
      const doc = await pdfjs.getDocument({ data: bytes }).promise;
      const page = await doc.getPage(1);
      if (cancelled) return;
      setPdfPage(page);
    })().catch(e => { console.error(e); toast.error("Erro carregando PDF"); });
    return () => { cancelled = true; };
  }, [mapa.id]);

  // Renderiza página
  useEffect(() => {
    if (!pdfPage || !canvasRef.current) return;
    const viewport = pdfPage.getViewport({ scale: renderScale });
    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const overlay = overlayRef.current!;
    overlay.width = viewport.width;
    overlay.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    pdfPage.render({ canvasContext: ctx, viewport }).promise.then(() => {
      if (!mapa.pageWidth) {
        const v1 = pdfPage.getViewport({ scale: 1 });
        onChange({ pageWidth: v1.width, pageHeight: v1.height });
      }
      drawOverlay();
    });
  }, [pdfPage, renderScale]);

  // Redesenha overlay quando muda algo
  useEffect(() => { drawOverlay(); }, [mapa.calib, mapa.tracks, gpsPos, recording, pendingTap, renderScale]);

  function pdfPtToCanvas(xPt: number, yPt: number) {
    return { x: xPt * renderScale, y: yPt * renderScale };
  }

  function drawOverlay() {
    const c = overlayRef.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    // pontos de calibração
    mapa.calib.forEach((p, i) => {
      const { x, y } = pdfPtToCanvas(p.x, p.y);
      ctx.fillStyle = "#facc15";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#000"; ctx.font = "bold 12px sans-serif";
      ctx.fillText(String(i + 1), x - 3, y + 4);
    });
    // pendente
    if (pendingTap) {
      const { x, y } = pdfPtToCanvas(pendingTap.x, pendingTap.y);
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
    }
    // trilhas
    const all = [...mapa.tracks, ...(recording ? [recording] : [])];
    all.forEach(t => {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      let first = true;
      t.pontos.forEach(p => {
        const pt = latLngToPdfPt(p.lat, p.lng); if (!pt) return;
        const { x, y } = pdfPtToCanvas(pt.x, pt.y);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    // GPS atual
    if (gpsPos) {
      const pt = latLngToPdfPt(gpsPos.lat, gpsPos.lng);
      if (pt) {
        const { x, y } = pdfPtToCanvas(pt.x, pt.y);
        ctx.fillStyle = "rgba(59,130,246,0.25)";
        ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#3b82f6"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
  }

  function latLngToPdfPt(lat: number, lng: number): { x: number; y: number } | null {
    if (mapa.calib.length < 2) return null;
    const [a, b] = mapa.calib;
    const dLng = b.lng - a.lng;
    const dLat = b.lat - a.lat;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dLng === 0 || dLat === 0) return null;
    const sx = dx / dLng;
    const sy = dy / dLat;
    return {
      x: a.x + (lng - a.lng) * sx,
      y: a.y + (lat - a.lat) * sy,
    };
  }

  function onCanvasClick(e: React.MouseEvent) {
    if (!calibMode) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (overlayRef.current!.width / rect.width);
    const cy = (e.clientY - rect.top) * (overlayRef.current!.height / rect.height);
    setPendingTap({ x: cx / renderScale, y: cy / renderScale });
  }

  // GPS
  function startGps() {
    if (!navigator.geolocation) { toast.error("GPS indisponível"); return; }
    if (watchIdRef.current != null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        setGpsPos(p);
        setRecording(r => r ? { ...r, pontos: [...r.pontos, { lat: p.lat, lng: p.lng, t: Date.now() }] } : r);
      },
      err => toast.error("GPS: " + err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    toast.success("GPS ativado");
  }
  function stopGps() {
    if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setGpsPos(null);
  }
  useEffect(() => () => stopGps(), []);

  function startTrack() {
    const nome = `Trilha ${mapa.tracks.length + 1}`;
    setRecording({ id: crypto.randomUUID(), nome, pontos: [] });
    startGps();
    toast.success("Gravando trilha");
  }
  function stopTrack() {
    if (!recording) return;
    if (recording.pontos.length > 0) onChange({ tracks: [...mapa.tracks, recording] });
    setRecording(null);
    toast.success("Trilha salva");
  }
  function delTrack(id: string) { onChange({ tracks: mapa.tracks.filter(t => t.id !== id) }); }

  const calibrado = mapa.calib.length === 2;

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-primary">
          <span>{mapa.nome}</span>
          <span className="text-xs text-muted-foreground">{calibrado ? "Calibrado ✓" : `Calibre ${2 - mapa.calib.length} ponto(s)`}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={calibMode ? "default" : "outline"} onClick={() => { setCalibMode(v => !v); setPendingTap(null); }}>
            <Crosshair className="mr-1 h-4 w-4" /> {calibMode ? "Sair calibração" : "Calibrar"}
          </Button>
          {!recording ? (
            <Button size="sm" onClick={startTrack} disabled={!calibrado}><Play className="mr-1 h-4 w-4" /> Gravar trilha</Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={stopTrack}><Square className="mr-1 h-4 w-4" /> Parar</Button>
          )}
          {!recording && (
            watchIdRef.current == null ? (
              <Button size="sm" variant="outline" onClick={startGps} disabled={!calibrado}><MapPin className="mr-1 h-4 w-4" /> GPS</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={stopGps}>Desligar GPS</Button>
            )
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => setRenderScale(s => Math.max(0.5, s - 0.25))}>−</Button>
            <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(renderScale * 100)}%</span>
            <Button size="sm" variant="ghost" onClick={() => setRenderScale(s => Math.min(4, s + 0.25))}>+</Button>
          </div>
        </div>

        {calibMode && (
          <p className="text-xs text-muted-foreground">
            Toque no mapa em um ponto conhecido (ex: canto, cruzamento) e informe a latitude/longitude desse ponto. Faça isso 2x em pontos distantes.
          </p>
        )}
        {gpsPos && <p className="text-xs text-muted-foreground">GPS: {gpsPos.lat.toFixed(6)}, {gpsPos.lng.toFixed(6)} (±{Math.round(gpsPos.acc)}m)</p>}

        <div ref={containerRef} className="relative max-h-[70vh] overflow-auto rounded-md border border-border bg-black/40">
          <canvas ref={canvasRef} className="block" />
          <canvas
            ref={overlayRef}
            onClick={onCanvasClick}
            className="absolute left-0 top-0"
            style={{ cursor: calibMode ? "crosshair" : "default", width: canvasRef.current?.style.width }}
          />
        </div>

        {mapa.tracks.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Trilhas salvas</Label>
            {mapa.tracks.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
                <span>{t.nome} <span className="text-xs text-muted-foreground">({t.pontos.length} pts)</span></span>
                <Button size="icon" variant="ghost" onClick={() => delTrack(t.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}

        <CalibDialog
          open={!!pendingTap}
          onCancel={() => setPendingTap(null)}
          onConfirm={(lat, lng) => {
            if (!pendingTap) return;
            const novo = [...mapa.calib, { ...pendingTap, lat, lng }].slice(-2);
            onChange({ calib: novo });
            setPendingTap(null);
            if (novo.length === 2) { setCalibMode(false); toast.success("Mapa calibrado!"); }
          }}
        />
      </CardContent>
    </Card>
  );
}

function CalibDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: (lat: number, lng: number) => void }) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  useEffect(() => { if (open) { setLat(""); setLng(""); } }, [open]);
  return (
    <Dialog open={open} onOpenChange={v => !v && onCancel()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Coordenadas do ponto</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <div>
            <Label>Latitude</Label>
            <Input value={lat} onChange={e => setLat(e.target.value)} placeholder="-15.123456" inputMode="decimal" />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="-47.123456" inputMode="decimal" />
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            navigator.geolocation?.getCurrentPosition(p => {
              setLat(String(p.coords.latitude)); setLng(String(p.coords.longitude));
            }, e => toast.error(e.message), { enableHighAccuracy: true });
          }}>Usar minha posição atual</Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={() => {
            const la = parseFloat(lat.replace(",", "."));
            const ln = parseFloat(lng.replace(",", "."));
            if (isNaN(la) || isNaN(ln)) { toast.error("Coordenadas inválidas"); return; }
            onConfirm(la, ln);
          }}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

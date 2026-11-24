import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractField, type PhotoFieldKey } from "@/lib/fieldPhoto";
import { recognizeLocalPhoto } from "@/lib/localPhotoOcr";

export function ReportPhotoField({ field, label, value, onChange, mode }: {
  field: PhotoFieldKey; label: string; value: string; onChange: (value: string) => void; mode?: "decimal" | "numeric";
}) {
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const task = useRef<AbortController | null>(null);
  const latestValue = useRef(value);
  latestValue.current = value;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => () => task.current?.abort(), []);

  async function read(file: File) {
    const controller = new AbortController();
    task.current = controller;
    const before = latestValue.current;
    setLoading(true);
    setMessage("");
    try {
      const text = await recognizeLocalPhoto(file, controller.signal);
      if (controller.signal.aborted) return;
      const result = extractField(text, field);
      if (!result) setMessage("Linha não identificada. Fotografe só este campo ou digite o valor.");
      else if (latestValue.current !== before) setMessage("Você editou o campo durante a leitura; seu texto foi mantido.");
      else { onChange(result); setMessage("Foto lida. Confira o valor."); }
    } catch {
      if (!controller.signal.aborted) setMessage("Não foi possível ler a foto. Você pode digitar normalmente, mesmo offline.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  const fileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void read(file);
  };
  return (
    <div className={`min-w-0 space-y-1.5 ${field === "obs" ? "sm:col-span-2" : ""}`}>
      <div className="flex min-h-8 items-center justify-between gap-1">
        <Label className="text-xs">{label}</Label>
        <div className="flex shrink-0 items-center">
          {loading ? <LoaderCircle className="m-2 h-4 w-4 animate-spin text-muted-foreground" aria-label={`Lendo ${label}`} /> : <>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Fotografar ${label}`} title={`Fotografar ${label}`} onClick={() => camera.current?.click()}><Camera className="h-4 w-4" /></Button>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`Foto da galeria para ${label}`} title={`Foto da galeria para ${label}`} onClick={() => gallery.current?.click()}><ImagePlus className="h-4 w-4" /></Button>
          </>}
        </div>
      </div>
      <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={fileChange} aria-label={`Galeria: ${label}`} />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={fileChange} aria-label={`Câmera: ${label}`} />
      {field === "obs" ? <Textarea aria-label={label} value={value} onChange={e => onChange(e.target.value)} rows={2} /> : <Input aria-label={label} value={value} onChange={e => onChange(e.target.value)} inputMode={mode} placeholder={mode === "decimal" ? "0,0" : mode === "numeric" ? "0" : "HH:MM ou texto"} />}
      {message && <p role="status" className="text-[11px] text-muted-foreground">{message}</p>}
    </div>
  );
}
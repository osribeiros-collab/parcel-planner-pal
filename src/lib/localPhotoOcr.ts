import type { Worker } from "tesseract.js";

let busy = false;
export async function recognizeLocalPhoto(file: File, signal: AbortSignal): Promise<string> {
  if (busy) throw new Error("Outra foto está sendo lida. Aguarde um instante.");
  busy = true;
  let worker: Worker | undefined;
  let timedOut = false;
  const stop = () => { void worker?.terminate(); };
  const timer = window.setTimeout(() => { timedOut = true; stop(); }, 60_000);
  signal.addEventListener("abort", stop);
  try {
    if (signal.aborted) throw new Error("Leitura cancelada.");
    const { createWorker, OEM, PSM } = await import("tesseract.js");
    worker = await createWorker("por", OEM.LSTM_ONLY, {
      workerPath: "/ocr/worker.min.js",
      corePath: "/ocr/core.wasm.js",
      langPath: "/ocr",
      workerBlobURL: false,
      cacheMethod: "none",
      gzip: true,
    });
    if (signal.aborted || timedOut) throw new Error("Leitura interrompida. Você pode digitar normalmente.");
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) { bitmap.close(); throw new Error("Não foi possível abrir a foto."); }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const result = await worker.recognize(canvas);
    canvas.width = 0;
    canvas.height = 0;
    return result.data.text;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
    await worker?.terminate().catch(() => {});
    busy = false;
  }
}
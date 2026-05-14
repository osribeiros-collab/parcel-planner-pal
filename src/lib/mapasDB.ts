// IndexedDB simples para mapas PDF (suporta arquivos grandes, ao contrário do localStorage ~5MB)
export type CalibPoint = { x: number; y: number; lat: number; lng: number };
export type Track = { id: string; nome: string; pontos: { lat: number; lng: number; t: number }[] };
export type MapaPDF = {
  id: string;
  nome: string;
  pdfBlob: Blob; // armazenamos como Blob — IndexedDB lida nativamente
  calib: CalibPoint[];
  pageWidth?: number;
  pageHeight?: number;
  tracks: Track[];
};

const DB_NAME = "harvest_mapas_db";
const STORE = "mapas";
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listMapas(): Promise<MapaPDF[]> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result as MapaPDF[]);
    req.onerror = () => rej(req.error);
  });
}

export async function putMapa(m: MapaPDF): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(m);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function deleteMapa(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

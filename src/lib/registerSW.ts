// Registra o service worker apenas em produção real (fora de iframe/preview Lovable).
// Suporta kill-switch via ?sw=off.
const SW_URL = "/sw.js";

function shouldRegister(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;

  try {
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return false;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return false;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return false;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return false;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return false;

  return true;
}

async function unregisterAppSW() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter(r => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").includes(SW_URL))
      .map(r => r.unregister()),
  );
}

export function registerOfflineSW() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  if (!shouldRegister()) {
    void unregisterAppSW();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .catch(e => console.warn("SW register failed", e));
  });
}

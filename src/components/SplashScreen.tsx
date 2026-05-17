import { useEffect, useState } from "react";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const shown = sessionStorage.getItem("splash_shown");
    if (shown) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem("splash_shown", "1");
    const t1 = setTimeout(() => setFade(true), 1600);
    const t2 = setTimeout(() => setVisible(false), 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-background via-secondary/40 to-background transition-opacity duration-500 ${
        fade ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700">
        <svg
          width="140"
          height="160"
          viewBox="0 0 140 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_30px_oklch(0.78_0.15_85/0.6)]"
        >
          {/* Pine tree */}
          <polygon points="70,10 110,55 90,55 120,95 95,95 130,135 10,135 45,95 20,95 50,55 30,55" fill="oklch(0.55 0.18 145)" stroke="oklch(0.78 0.15 85)" strokeWidth="2" strokeLinejoin="round"/>
          <rect x="60" y="135" width="20" height="20" fill="oklch(0.35 0.08 50)" />
        </svg>
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-primary">Ribeiro</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-muted-foreground">Controle de Produção</p>
        </div>
      </div>
    </div>
  );
}

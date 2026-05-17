import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { THEMES, getThemeId, setTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ThemePicker() {
  const [current, setCurrent] = useState("amber");

  useEffect(() => {
    setCurrent(getThemeId());
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-primary">
          <Palette className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <p className="mb-2 text-sm font-semibold">Tema do app</p>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                setCurrent(t.id);
              }}
              className={`flex items-center gap-2 rounded-md border px-2 py-2 text-left text-xs transition-colors hover:bg-accent/20 ${
                current === t.id ? "border-primary ring-1 ring-primary" : "border-border"
              }`}
            >
              <span
                className="h-5 w-5 rounded-full border"
                style={{ background: t.primary }}
              />
              <span className="truncate">{t.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

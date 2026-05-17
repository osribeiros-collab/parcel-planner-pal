import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { CalendarDays, Boxes, LayoutDashboard, Map as MapIcon, TreePine } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { useEffect } from "react";
import { registerOfflineSW } from "@/lib/registerSW";
import { SplashScreen } from "@/components/SplashScreen";
import { ThemePicker } from "@/components/ThemePicker";
import { loadTheme } from "@/lib/theme";

function AppShell() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Toaster richColors position="top-right" />
      <header className="border-b border-primary/20 bg-gradient-to-r from-background via-secondary/40 to-background">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-[0_0_20px_-4px_oklch(0.78_0.15_85/0.6)]">
            <Tractor className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-primary">Controle de Produção — Harvest</h1>
            <p className="text-sm text-muted-foreground">Fazendas, talhões e relatórios diários</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-5xl">
          <Link
            to="/"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground transition-colors"
            activeProps={{ className: "flex flex-1 flex-col items-center gap-1 py-3 text-xs text-primary font-semibold" }}
            activeOptions={{ exact: true }}
          >
            <LayoutDashboard className="h-5 w-5" />
            Início
          </Link>
          <Link
            to="/fazendas"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground transition-colors"
            activeProps={{ className: "flex flex-1 flex-col items-center gap-1 py-3 text-xs text-primary font-semibold" }}
          >
            <Tractor className="h-5 w-5" />
            Fazendas
          </Link>
          <Link
            to="/modulos"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground transition-colors"
            activeProps={{ className: "flex flex-1 flex-col items-center gap-1 py-3 text-xs text-primary font-semibold" }}
          >
            <Boxes className="h-5 w-5" />
            Módulo
          </Link>
          <Link
            to="/mapas"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground transition-colors"
            activeProps={{ className: "flex flex-1 flex-col items-center gap-1 py-3 text-xs text-primary font-semibold" }}
          >
            <MapIcon className="h-5 w-5" />
            Mapas
          </Link>
          <Link
            to="/relatorios"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground transition-colors"
            activeProps={{ className: "flex flex-1 flex-col items-center gap-1 py-3 text-xs text-primary font-semibold" }}
          >
            <CalendarDays className="h-5 w-5" />
            Relatórios
          </Link>
        </div>
      </nav>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Harvest — Controle de Produção" },
      { name: "description", content: "Controle de produção florestal offline" },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Harvest" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => { registerOfflineSW(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}

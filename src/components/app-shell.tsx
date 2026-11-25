"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DESKTOP_NAV_ITEMS = [
  { href: "/", label: "Ringkasan", matchPrefix: false },
  { href: "/workout/hari-ini", label: "Workout", matchPrefix: "/workout" },
  { href: "/program", label: "Program", matchPrefix: false },
  { href: "/gerakan", label: "Gerakan", matchPrefix: false },
  { href: "/riwayat", label: "Riwayat", matchPrefix: false },
  { href: "/makanan", label: "Makanan", matchPrefix: false },
  { href: "/harian", label: "Harian", matchPrefix: false },
  { href: "/target", label: "Target", matchPrefix: false },
  { href: "/berat", label: "Berat", matchPrefix: false },
  { href: "/profil", label: "Profil", matchPrefix: false },
] as const;

const MOBILE_BOTTOM_ITEMS = [
  { href: "/", label: "Ringkasan", matchPrefix: false },
  { href: "/workout/hari-ini", label: "Workout", matchPrefix: "/workout" },
  { href: "/makanan", label: "Makanan", matchPrefix: false },
  { href: "/harian", label: "Harian", matchPrefix: false },
  { href: "/berat", label: "Berat", matchPrefix: false },
] as const;

const MOBILE_SECONDARY_ITEMS = [
  { href: "/program", label: "Program" },
  { href: "/gerakan", label: "Gerakan" },
  { href: "/riwayat", label: "Riwayat" },
  { href: "/target", label: "Target Kalori" },
] as const;

function isRouteActive(
  pathname: string,
  href: string,
  matchPrefix: string | false,
): boolean {
  if (matchPrefix) {
    return pathname.startsWith(matchPrefix);
  }
  return pathname === href;
}

function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="hidden flex-wrap items-center gap-0.5 md:flex"
    >
      {DESKTOP_NAV_ITEMS.map((item) => {
        const isActive = isRouteActive(pathname, item.href, item.matchPrefix);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-lg px-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileSecondaryNav() {
  const pathname = usePathname();
  return (
    <div className="border-t border-border/70 md:hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-3 py-1">
        {MOBILE_SECONDARY_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                isActive
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function MobileHeaderProfileLink() {
  const pathname = usePathname();
  return (
    <Link
      href="/profil"
      aria-current={pathname === "/profil" ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-medium md:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        pathname === "/profil"
          ? "bg-accent text-accent-foreground font-semibold"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      Profil
    </Link>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-5 gap-1 px-1.5 py-1.5">
      {MOBILE_BOTTOM_ITEMS.map((item) => {
        const isActive = isRouteActive(pathname, item.href, item.matchPrefix);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center justify-center rounded-lg px-1 text-center text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isActive
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (typeof window !== "undefined" && "caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(
          keys
            .filter((key) => !key.startsWith("wlt-static-"))
            .map((key) => window.caches.delete(key)),
        );
      }
      if (
        typeof navigator !== "undefined" &&
        "serviceWorker" in navigator &&
        navigator.serviceWorker.controller
      ) {
        navigator.serviceWorker.controller.postMessage({
          type: "CLEAR_PRIVATE_CACHE",
        });
      }
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="shrink-0 text-base font-bold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              Pantau Berat
            </Link>

            <Suspense fallback={null}>
              <DesktopNav />
            </Suspense>
          </div>

          <div className="flex items-center gap-1.5">
            <Suspense fallback={null}>
              <MobileHeaderProfileLink />
            </Suspense>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              disabled={loggingOut}
              className="min-h-11 shrink-0 px-3 text-xs font-medium sm:px-4 sm:text-sm"
            >
              {loggingOut ? "Keluar..." : "Keluar"}
            </Button>
          </div>
        </div>

        <Suspense fallback={null}>
          <MobileSecondaryNav />
        </Suspense>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-28 md:pb-10">
        {children}
      </main>

      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card md:hidden"
      >
        <Suspense fallback={<div className="h-14" />}>
          <MobileBottomNav />
        </Suspense>
      </nav>
    </div>
  );
}

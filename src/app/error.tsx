"use client";

import { Button } from "@/components/ui/button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-bold text-foreground">
          Terjadi kesalahan saat memuat halaman
        </h2>
        <p className="text-sm text-muted-foreground">
          Periksa koneksi database atau muat ulang halaman ini.
        </p>
        <Button type="button" onClick={reset} className="min-h-11 px-6">
          Coba Lagi
        </Button>
      </div>
    </div>
  );
}

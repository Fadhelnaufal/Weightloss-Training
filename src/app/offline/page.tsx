"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold text-foreground">Sedang Offline</h1>
        <p className="text-sm text-muted-foreground">
          Koneksi internet terputus dan halaman ini belum tersimpan di cache
          offline. Sambungkan kembali jaringan lalu muat ulang.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 px-5"
          >
            Muat Ulang
          </Button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Ke Ringkasan
          </Link>
        </div>
      </div>
    </div>
  );
}

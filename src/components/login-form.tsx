"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Masukkan password terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal masuk. Coba lagi.");
        return;
      }

      const nextParam = searchParams.get("next");
      const safeNext =
        nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
          ? nextParam
          : "/";

      router.push(safeNext);
      router.refresh();
    } catch {
      setError("Terjadi gangguan jaringan. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-sm border-border bg-card shadow-sm">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl font-bold tracking-tight">
          Pantau Berat
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Masukkan password pribadi Anda untuk mengakses catatan berat badan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="flex gap-2">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="min-h-12 flex-1 text-base"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPassword((prev) => !prev)}
                className="min-h-12 px-3 text-xs font-medium"
                aria-label={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                {showPassword ? "Tutup" : "Lihat"}
              </Button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="min-h-12 w-full text-base font-semibold"
          >
            {submitting ? "Memeriksa..." : "Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

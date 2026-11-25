"use client";

import { useRouter } from "next/navigation";
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
import type { ProfileData } from "@/lib/db/queries";

interface ProfileFormProps {
  initialProfile: ProfileData | null;
}

export function ProfileForm({ initialProfile }: ProfileFormProps) {
  const router = useRouter();
  const [heightCm, setHeightCm] = useState(
    initialProfile ? String(initialProfile.heightCm) : "",
  );
  const [birthDate, setBirthDate] = useState(initialProfile?.birthDate ?? "");
  const [sex, setSex] = useState<"male" | "female">(
    initialProfile?.sex ?? "male",
  );
  const [activityLevel, setActivityLevel] = useState<
    "sedentary" | "light" | "moderate" | "active"
  >(initialProfile?.activityLevel ?? "sedentary");
  const [startWeightKg, setStartWeightKg] = useState(
    initialProfile ? String(initialProfile.startWeightKg) : "",
  );
  const [targetWeightKg, setTargetWeightKg] = useState(
    initialProfile ? String(initialProfile.targetWeightKg) : "",
  );
  const [targetDate, setTargetDate] = useState(
    initialProfile?.targetDate ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heightCm,
          birthDate,
          sex,
          activityLevel,
          startWeightKg,
          targetWeightKg,
          targetDate,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal menyimpan profil.");
        return;
      }

      setSuccessMessage("Profil berhasil disimpan.");
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Data Profil & Target</CardTitle>
        <CardDescription>
          Digunakan untuk menghitung selisih ke target berat badan Anda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="heightCm">Tinggi Badan (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="100"
                max="250"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="Contoh: 170"
                className="min-h-12 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Tanggal Lahir</Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="min-h-12 text-base"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sex">Jenis Kelamin</Label>
              <select
                id="sex"
                value={sex}
                onChange={(e) =>
                  setSex(e.target.value as "male" | "female")
                }
                className="flex min-h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityLevel">Level Aktivitas</Label>
              <select
                id="activityLevel"
                value={activityLevel}
                onChange={(e) =>
                  setActivityLevel(
                    e.target.value as
                      | "sedentary"
                      | "light"
                      | "moderate"
                      | "active",
                  )
                }
                className="flex min-h-12 w-full rounded-lg border border-input bg-background px-3 py-2 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="sedentary">Sedentari (minim gerak)</option>
                <option value="light">Ringan (1-3x/minggu)</option>
                <option value="moderate">Sedang (3-5x/minggu)</option>
                <option value="active">Aktif (rutin/intensif)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="startWeightKg">Berat Awal (kg)</Label>
              <Input
                id="startWeightKg"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="20"
                max="300"
                value={startWeightKg}
                onChange={(e) => setStartWeightKg(e.target.value)}
                placeholder="Contoh: 80.5"
                className="min-h-12 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetWeightKg">Target Berat (kg)</Label>
              <Input
                id="targetWeightKg"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="20"
                max="300"
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                placeholder="Contoh: 70.0"
                className="min-h-12 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Tanggal (opsional)</Label>
              <Input
                id="targetDate"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="min-h-12 text-base"
              />
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

          {successMessage && (
            <p
              role="status"
              className="rounded-lg border border-primary/30 bg-accent px-3 py-2.5 text-sm font-medium text-accent-foreground"
            >
              {successMessage}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="min-h-12 w-full text-base font-semibold sm:w-auto sm:px-8"
          >
            {submitting ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { formatDateID } from "@/lib/date";
import type { WeightLogItem } from "@/lib/db/queries";

interface WeightHistoryProps {
  logs: ReadonlyArray<WeightLogItem>;
}

export function WeightHistory({ logs }: WeightHistoryProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editWaist, setEditWaist] = useState("");
  const [editNote, setEditNote] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(item: WeightLogItem) {
    setError(null);
    setConfirmDeleteId(null);
    setEditingId(item.id);
    setEditDate(item.logDate);
    setEditWeight(String(item.weightKg));
    setEditWaist(item.waistCm !== null ? String(item.waistCm) : "");
    setEditNote(item.note ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function saveEdit(id: number) {
    setError(null);
    setBusyId(id);

    try {
      const response = await fetch(`/api/weights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logDate: editDate,
          weightKg: editWeight,
          waistCm: editWaist,
          note: editNote,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal memperbarui catatan.");
        return;
      }

      setEditingId(null);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEntry(id: number) {
    setError(null);
    setBusyId(id);

    try {
      const response = await fetch(`/api/weights/${id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Gagal menghapus catatan.");
        return;
      }

      setConfirmDeleteId(null);
      router.refresh();
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Riwayat Berat Badan</CardTitle>
        <CardDescription>
          Menampilkan seluruh catatan tersimpan dari terbaru.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive"
          >
            {error}
          </p>
        )}

        {logs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Belum ada riwayat berat badan. Mulai catat berat badan Anda lewat
            formulir di atas.
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {logs.map((item) => {
              const isEditing = editingId === item.id;
              const isConfirmingDelete = confirmDeleteId === item.id;
              const isBusy = busyId === item.id;

              return (
                <li key={item.id} className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor={`edit-weight-${item.id}`}>
                            Berat (kg)
                          </Label>
                          <Input
                            id={`edit-weight-${item.id}`}
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="20"
                            max="300"
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="min-h-11 tabular-nums"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`edit-date-${item.id}`}>
                            Tanggal (WIB)
                          </Label>
                          <Input
                            id={`edit-date-${item.id}`}
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="min-h-11 tabular-nums"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`edit-waist-${item.id}`}>
                            Pinggang (cm)
                          </Label>
                          <Input
                            id={`edit-waist-${item.id}`}
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="30"
                            max="250"
                            value={editWaist}
                            onChange={(e) => setEditWaist(e.target.value)}
                            className="min-h-11 tabular-nums"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-note-${item.id}`}>Catatan</Label>
                        <Input
                          id={`edit-note-${item.id}`}
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          maxLength={500}
                          className="min-h-11"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          onClick={() => saveEdit(item.id)}
                          disabled={isBusy}
                          className="min-h-11 px-4"
                        >
                          {isBusy ? "Menyimpan..." : "Simpan"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelEdit}
                          disabled={isBusy}
                          className="min-h-11 px-4"
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <span className="text-lg font-bold tabular-nums text-foreground">
                            {item.weightKg.toFixed(1)} kg
                          </span>
                          <span className="text-sm text-muted-foreground tabular-nums">
                            {formatDateID(item.logDate)}
                          </span>
                          {item.waistCm !== null && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              Pinggang: {item.waistCm.toFixed(1)} cm
                            </span>
                          )}
                        </div>
                        {item.note && (
                          <p className="break-words text-sm text-muted-foreground">
                            {item.note}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isConfirmingDelete ? (
                          <>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => deleteEntry(item.id)}
                              disabled={isBusy}
                              className="min-h-11 px-4"
                            >
                              {isBusy ? "Menghapus..." : "Konfirmasi Hapus"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isBusy}
                              className="min-h-11 px-4"
                            >
                              Batal
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => startEdit(item)}
                              className="min-h-11 px-4"
                            >
                              Ubah
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="min-h-11 px-4"
                            >
                              Hapus
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

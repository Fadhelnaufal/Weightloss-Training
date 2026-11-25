"use client";

import { useMemo, useState } from "react";
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
import type { PlanDayWithItems } from "@/lib/db/queries";

interface ReminderSettingsCardProps {
  todayDateWIB: string;
  planDays: ReadonlyArray<PlanDayWithItems>;
}

const WEEKDAY_TO_ICS_BYDAY: Record<number, string> = {
  1: "MO",
  2: "TU",
  3: "WE",
  4: "TH",
  5: "FR",
  6: "SA",
  7: "SU",
};

function formatIcsDateTime(dateStr: string, timeStr: string): string {
  const compactDate = dateStr.replace(/-/g, "");
  const [hh, mm] = timeStr.split(":");
  const safeH = (hh || "07").padStart(2, "0");
  const safeM = (mm || "00").padStart(2, "0");
  return `${compactDate}T${safeH}${safeM}00`;
}

export function ReminderSettingsCard({
  todayDateWIB,
  planDays,
}: ReminderSettingsCardProps) {
  const [workoutTime, setWorkoutTime] = useState("18:00");
  const [weighInTime, setWeighInTime] = useState("06:30");

  const activeTrainingByDays = useMemo(() => {
    const days = planDays
      .filter(
        (d) =>
          d.isActive &&
          d.dayType !== "rest" &&
          d.dayType !== "active_rest" &&
          d.items.length > 0,
      )
      .map((d) => WEEKDAY_TO_ICS_BYDAY[d.weekday])
      .filter(Boolean);
    return days.length > 0 ? days.join(",") : "MO,WE,FR";
  }, [planDays]);

  const googleCalendarUrl = useMemo(() => {
    const start = formatIcsDateTime(todayDateWIB, workoutTime);
    const [hh, mm] = workoutTime.split(":").map(Number);
    const endHour = String(((hh || 18) + 1) % 24).padStart(2, "0");
    const endMin = String(mm || 0).padStart(2, "0");
    const end = `${todayDateWIB.replace(/-/g, "")}T${endHour}${endMin}00`;

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: "Latihan Bodyweight (Pantau Berat)",
      details: "Buka aplikasi Pantau Berat untuk mencatat sesi latihan hari ini.",
      dates: `${start}/${end}`,
      ctz: "Asia/Jakarta",
      recur: `RRULE:FREQ=WEEKLY;BYDAY=${activeTrainingByDays}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }, [todayDateWIB, workoutTime, activeTrainingByDays]);

  function downloadIcsFile() {
    const workoutStart = formatIcsDateTime(todayDateWIB, workoutTime);
    const weighStart = formatIcsDateTime(todayDateWIB, weighInTime);
    const stamp = `${todayDateWIB.replace(/-/g, "")}T000000Z`;

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Pantau Berat//Pengingat Latihan//ID",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:pantau-berat-workout-${todayDateWIB}@local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Asia/Jakarta:${workoutStart}`,
      "DURATION:PT35M",
      "SUMMARY:Latihan Bodyweight (Pantau Berat)",
      "DESCRIPTION:Waktunya sesi latihan rumah tanpa alat. Buka Pantau Berat.",
      `RRULE:FREQ=WEEKLY;BYDAY=${activeTrainingByDays}`,
      "BEGIN:VALARM",
      "TRIGGER:-PT10M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Pengingat latihan 10 menit lagi",
      "END:VALARM",
      "END:VEVENT",
      "BEGIN:VEVENT",
      `UID:pantau-berat-timbang-${todayDateWIB}@local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Asia/Jakarta:${weighStart}`,
      "DURATION:PT10M",
      "SUMMARY:Timbang Berat Pagi (Pantau Berat)",
      "DESCRIPTION:Timbang berat badan pagi hari lalu catat di aplikasi.",
      "RRULE:FREQ=DAILY",
      "BEGIN:VALARM",
      "TRIGGER:PT0M",
      "ACTION:DISPLAY",
      "DESCRIPTION:Waktunya timbang berat pagi",
      "END:VALARM",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pengingat-pantau-berat.ics";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card id="pengingat" className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-bold">
          Pengingat & Kalender HP
        </CardTitle>
        <CardDescription>
          Aplikasi menampilkan pengingat otomatis di Ringkasan saat dibuka.
          Untuk notifikasi tepat waktu ketika browser ditutup, tambahkan ke
          kalender atau alarm HP Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="weighInTime">Jam Timbang Pagi (WIB)</Label>
            <Input
              id="weighInTime"
              type="time"
              value={weighInTime}
              onChange={(e) => setWeighInTime(e.target.value)}
              className="min-h-12 text-base tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="workoutTime">Jam Latihan (WIB)</Label>
            <Input
              id="workoutTime"
              type="time"
              value={workoutTime}
              onChange={(e) => setWorkoutTime(e.target.value)}
              className="min-h-12 text-base tabular-nums"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={downloadIcsFile}
            className="min-h-12 px-5 text-sm font-semibold"
          >
            Unduh Pengingat Kalender (.ics)
          </Button>
          <a
            href={googleCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Tambah ke Google Calendar
          </a>
        </div>

        <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          File <code>.ics</code> berisi jadwal berulang (timbang harian + hari
          latihan aktif: {activeTrainingByDays}) lengkap dengan alarm kalender
          bawaan iOS/Android, tanpa perlu layanan push berbayar atau cron
          berkala di server gratis.
        </p>
      </CardContent>
    </Card>
  );
}

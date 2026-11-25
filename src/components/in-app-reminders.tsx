import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

interface InAppRemindersProps {
  hasWeightToday: boolean;
  isSunday: boolean;
  hasScheduledWorkoutToday: boolean;
  todayWorkoutTitle: string | null;
  workoutCompletedToday: boolean;
  hasActiveSession: boolean;
}

export function InAppReminders({
  hasWeightToday,
  isSunday,
  hasScheduledWorkoutToday,
  todayWorkoutTitle,
  workoutCompletedToday,
  hasActiveSession,
}: InAppRemindersProps) {
  const reminders: Array<{
    key: string;
    text: string;
    href: string;
    cta: string;
  }> = [];

  if (!hasWeightToday) {
    reminders.push({
      key: "weigh-in",
      text: isSunday
        ? "Hari Minggu: timbang berat badan pagi dan lakukan review mingguan."
        : "Pengingat hari ini: berat badan belum dicatat.",
      href: "/berat#catat",
      cta: "Catat Berat",
    });
  }

  if (hasActiveSession) {
    reminders.push({
      key: "resume-workout",
      text: "Ada sesi workout yang masih berjalan dan belum diselesaikan.",
      href: "/workout/hari-ini",
      cta: "Lanjutkan",
    });
  } else if (hasScheduledWorkoutToday && !workoutCompletedToday) {
    reminders.push({
      key: "workout-today",
      text: `Pengingat latihan hari ini: ${todayWorkoutTitle ?? "Sesi terjadwal"} belum dikerjakan.`,
      href: "/workout/hari-ini",
      cta: "Mulai Workout",
    });
  }

  if (reminders.length === 0) {
    return null;
  }

  return (
    <Card className="border-primary/35 bg-accent/35">
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            Pengingat Hari Ini
          </p>
          <Link
            href="/profil#pengingat"
            className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Atur Kalender HP
          </Link>
        </div>

        <ul className="space-y-2">
          {reminders.map((item) => (
            <li
              key={item.key}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-sm text-foreground">{item.text}</span>
              <Link
                href={item.href}
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {item.cta}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

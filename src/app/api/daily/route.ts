import { NextResponse } from "next/server";
import { dailyLogs } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { todayWIB } from "@/lib/date";
import { getDb } from "@/lib/db";
import { getDailyLogs } from "@/lib/db/queries";
import { dailyLogUpsertSchema } from "@/lib/validators/daily";

export async function GET() {
  try {
    const logs = await getDailyLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Gagal mengambil data pelacak harian." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Autentikasi diperlukan." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  const parsed = dailyLogUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Data pelacak harian tidak valid.",
      },
      { status: 400 },
    );
  }

  const logDate = parsed.data.logDate ?? todayWIB();
  const sleepHoursValue =
    parsed.data.sleepHours !== null ? parsed.data.sleepHours.toFixed(1) : null;

  const db = getDb();
  try {
    const [saved] = await db
      .insert(dailyLogs)
      .values({
        logDate,
        steps: parsed.data.steps,
        sleepHours: sleepHoursValue,
        energyScore: parsed.data.energyScore,
        note: parsed.data.note,
      })
      .onConflictDoUpdate({
        target: dailyLogs.logDate,
        set: {
          steps: parsed.data.steps,
          sleepHours: sleepHoursValue,
          energyScore: parsed.data.energyScore,
          note: parsed.data.note,
        },
      })
      .returning();

    return NextResponse.json({
      log: {
        id: saved.id,
        logDate: saved.logDate,
        steps: saved.steps,
        sleepHours: saved.sleepHours !== null ? Number(saved.sleepHours) : null,
        energyScore: saved.energyScore,
        note: saved.note,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan data pelacak harian." },
      { status: 500 },
    );
  }
}

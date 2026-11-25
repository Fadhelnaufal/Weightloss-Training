import { NextResponse } from "next/server";
import { weightLogs } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { todayWIB } from "@/lib/date";
import { getDb } from "@/lib/db";
import { getWeightLogs } from "@/lib/db/queries";
import { weightLogCreateSchema } from "@/lib/validators/weight";

export async function GET() {
  try {
    const logs = await getWeightLogs();
    return NextResponse.json({ logs });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Gagal mengambil data berat badan." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  const parsed = weightLogCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data berat tidak valid.",
      },
      { status: 400 },
    );
  }

  const logDate = parsed.data.logDate ?? todayWIB();
  const weightValue = parsed.data.weightKg.toFixed(2);
  const waistValue =
    parsed.data.waistCm !== null ? parsed.data.waistCm.toFixed(1) : null;
  const noteValue = parsed.data.note;

  const db = getDb();

  try {
    const [saved] = await db
      .insert(weightLogs)
      .values({
        logDate,
        weightKg: weightValue,
        waistCm: waistValue,
        note: noteValue,
      })
      .onConflictDoUpdate({
        target: weightLogs.logDate,
        set: {
          weightKg: weightValue,
          waistCm: waistValue,
          note: noteValue,
        },
      })
      .returning();

    return NextResponse.json({
      log: {
        id: saved.id,
        logDate: saved.logDate,
        weightKg: Number(saved.weightKg),
        waistCm: saved.waistCm !== null ? Number(saved.waistCm) : null,
        note: saved.note,
        createdAt: saved.createdAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan catatan berat badan." },
      { status: 500 },
    );
  }
}

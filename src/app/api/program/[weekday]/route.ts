import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { planDays, planItems } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { planDayUpdateSchema } from "@/lib/validators/program";

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/program/[weekday]">,
) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Autentikasi diperlukan." },
      { status: 401 },
    );
  }

  const { weekday: rawWeekday } = await context.params;
  const weekday = Number(rawWeekday);
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
    return NextResponse.json(
      { error: "Hari program tidak valid (1 sampai 7)." },
      { status: 400 },
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

  const parsed = planDayUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data program tidak valid.",
      },
      { status: 400 },
    );
  }

  const db = getDb();
  const [existingDay] = await db
    .select()
    .from(planDays)
    .where(eq(planDays.weekday, weekday))
    .limit(1);

  if (!existingDay) {
    return NextResponse.json(
      { error: "Hari program tidak ditemukan." },
      { status: 404 },
    );
  }

  try {
    await db
      .update(planDays)
      .set({
        title: parsed.data.title,
        dayType: parsed.data.dayType,
        isActive: parsed.data.isActive ?? existingDay.isActive,
        note: parsed.data.note ?? null,
      })
      .where(eq(planDays.id, existingDay.id));

    await db.delete(planItems).where(eq(planItems.planDayId, existingDay.id));

    if (parsed.data.items.length > 0) {
      await db.insert(planItems).values(
        parsed.data.items.map((item, index) => ({
          planDayId: existingDay.id,
          exerciseId: item.exerciseId,
          position: index + 1,
          targetSets: item.targetSets,
          targetReps: item.targetReps,
          targetSeconds: item.targetSeconds,
          restSeconds: item.restSeconds,
          note: item.note ?? null,
        })),
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan perubahan program." },
      { status: 500 },
    );
  }
}

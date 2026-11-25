import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { planItems } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { applyProgressionSchema } from "@/lib/validators/program";

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

  const parsed = applyProgressionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data saran progresi tidak valid." },
      { status: 400 },
    );
  }

  const db = getDb();
  try {
    const [updated] = await db
      .update(planItems)
      .set({
        exerciseId: parsed.data.exerciseId,
        targetReps: parsed.data.targetReps,
        targetSeconds: parsed.data.targetSeconds,
      })
      .where(eq(planItems.id, parsed.data.planItemId))
      .returning({ id: planItems.id });

    if (!updated) {
      return NextResponse.json(
        { error: "Item program tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menerapkan saran progresi." },
      { status: 500 },
    );
  }
}

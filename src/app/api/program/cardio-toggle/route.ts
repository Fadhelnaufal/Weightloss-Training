import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { planDays } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { cardioToggleSchema } from "@/lib/validators/program";

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

  const parsed = cardioToggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter toggle kardio tidak valid." },
      { status: 400 },
    );
  }

  const db = getDb();
  try {
    await db
      .update(planDays)
      .set({ isActive: parsed.data.enabled })
      .where(eq(planDays.dayType, "cardio"));

    return NextResponse.json({ ok: true, enabled: parsed.data.enabled });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengubah status hari kardio." },
      { status: 500 },
    );
  }
}

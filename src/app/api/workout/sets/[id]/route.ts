import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { sessionSets } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { updateSessionSetSchema } from "@/lib/validators/workout";

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/workout/sets/[id]">,
) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Autentikasi diperlukan." },
      { status: 401 },
    );
  }

  const { id: rawId } = await context.params;
  const setId = Number(rawId);
  if (!Number.isInteger(setId) || setId <= 0) {
    return NextResponse.json(
      { error: "ID set tidak valid." },
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

  const parsed = updateSessionSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data set tidak valid.",
      },
      { status: 400 },
    );
  }

  const db = getDb();
  try {
    const [updated] = await db
      .update(sessionSets)
      .set({
        reps: parsed.data.reps,
        seconds: parsed.data.seconds,
        rpe: parsed.data.rpe,
        isCompleted: parsed.data.isCompleted,
      })
      .where(eq(sessionSets.id, setId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Set latihan tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ set: updated });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan progres set." },
      { status: 500 },
    );
  }
}

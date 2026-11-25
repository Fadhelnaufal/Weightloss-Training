import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { exercises, sessionSets } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { swapSetExerciseSchema } from "@/lib/validators/workout";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/workout/sessions/[id]/swap-exercise">,
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
  const sessionId = Number(rawId);
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return NextResponse.json(
      { error: "ID sesi tidak valid." },
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

  const parsed = swapSetExerciseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Parameter ganti gerakan tidak valid." },
      { status: 400 },
    );
  }

  const db = getDb();
  const [targetExercise] = await db
    .select()
    .from(exercises)
    .where(eq(exercises.id, parsed.data.toExerciseId))
    .limit(1);

  if (!targetExercise) {
    return NextResponse.json(
      { error: "Gerakan pengganti tidak ditemukan." },
      { status: 404 },
    );
  }

  try {
    await db
      .update(sessionSets)
      .set({
        exerciseId: targetExercise.id,
        reps: targetExercise.trackingType === "reps" ? 10 : null,
        seconds: targetExercise.trackingType === "time" ? 30 : null,
      })
      .where(
        and(
          eq(sessionSets.sessionId, sessionId),
          eq(sessionSets.exerciseId, parsed.data.fromExerciseId),
          eq(sessionSets.isCompleted, false),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengganti gerakan ke versi low-impact." },
      { status: 500 },
    );
  }
}

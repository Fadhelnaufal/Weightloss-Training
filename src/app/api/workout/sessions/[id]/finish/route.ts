import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { workoutSessions } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { finishWorkoutSchema } from "@/lib/validators/workout";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/workout/sessions/[id]/finish">,
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

  const parsed = finishWorkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data penyelesaian tidak valid.",
      },
      { status: 400 },
    );
  }

  const db = getDb();
  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.id, sessionId))
    .limit(1);

  if (!session) {
    return NextResponse.json(
      { error: "Sesi workout tidak ditemukan." },
      { status: 404 },
    );
  }

  const finishedAt = new Date();
  const durationSeconds = Math.max(
    1,
    Math.round((finishedAt.getTime() - session.startedAt.getTime()) / 1000),
  );

  try {
    const [updated] = await db
      .update(workoutSessions)
      .set({
        finishedAt,
        durationSeconds,
        overallRpe: parsed.data.overallRpe,
        note: parsed.data.note ?? null,
      })
      .where(eq(workoutSessions.id, sessionId))
      .returning();

    return NextResponse.json({
      sessionId: updated.id,
      durationSeconds: updated.durationSeconds,
      overallRpe: updated.overallRpe,
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyelesaikan sesi workout." },
      { status: 500 },
    );
  }
}

import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { workoutSessions } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/workout/sessions/[id]">,
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

  const db = getDb();
  try {
    const deleted = await db
      .delete(workoutSessions)
      .where(
        and(
          eq(workoutSessions.id, sessionId),
          isNull(workoutSessions.finishedAt),
        ),
      )
      .returning({ id: workoutSessions.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Sesi aktif tidak ditemukan atau sudah selesai." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal membatalkan sesi." },
      { status: 500 },
    );
  }
}

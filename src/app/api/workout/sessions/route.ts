import { asc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  exercises,
  planDays,
  planItems,
  sessionSets,
  workoutSessions,
} from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { todayWIB } from "@/lib/date";
import { getDb } from "@/lib/db";
import { startWorkoutSchema } from "@/lib/validators/workout";

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

  const parsed = startWorkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data sesi tidak valid.",
      },
      { status: 400 },
    );
  }

  const db = getDb();

  // Jika masih ada sesi yang belum selesai, kembalikan sesi tersebut agar tidak ganda.
  const [existingActive] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(isNull(workoutSessions.finishedAt))
    .limit(1);

  if (existingActive) {
    return NextResponse.json({ sessionId: existingActive.id, resumed: true });
  }

  const sessionDate = parsed.data.sessionDate ?? todayWIB();

  try {
    if (parsed.data.mode === "plan") {
      if (!parsed.data.planDayId) {
        return NextResponse.json(
          { error: "ID jadwal hari wajib dipilih." },
          { status: 400 },
        );
      }

      const [day] = await db
        .select()
        .from(planDays)
        .where(eq(planDays.id, parsed.data.planDayId))
        .limit(1);

      if (!day) {
        return NextResponse.json(
          { error: "Jadwal hari tidak ditemukan." },
          { status: 404 },
        );
      }

      const items = await db
        .select()
        .from(planItems)
        .where(eq(planItems.planDayId, day.id))
        .orderBy(asc(planItems.position), asc(planItems.id));

      if (items.length === 0) {
        return NextResponse.json(
          { error: "Hari ini belum memiliki daftar gerakan." },
          { status: 400 },
        );
      }

      const [created] = await db
        .insert(workoutSessions)
        .values({
          sessionDate,
          planDayId: day.id,
          title: parsed.data.title ?? day.title,
        })
        .returning({ id: workoutSessions.id });

      const setsToInsert: Array<typeof sessionSets.$inferInsert> = [];
      for (const item of items) {
        for (let setNumber = 1; setNumber <= item.targetSets; setNumber += 1) {
          setsToInsert.push({
            sessionId: created.id,
            exerciseId: item.exerciseId,
            setNumber,
            reps: item.targetReps,
            seconds: item.targetSeconds,
            rpe: null,
            isCompleted: false,
          });
        }
      }

      await db.insert(sessionSets).values(setsToInsert);
      return NextResponse.json({ sessionId: created.id, resumed: false });
    }

    // Mode sesi bebas
    const freeList = parsed.data.freeExercises ?? [];
    if (freeList.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal 1 gerakan untuk sesi bebas." },
        { status: 400 },
      );
    }

    const exerciseRows = await db.select().from(exercises);
    const exerciseById = new Map(exerciseRows.map((e) => [e.id, e]));

    const [created] = await db
      .insert(workoutSessions)
      .values({
        sessionDate,
        planDayId: null,
        title: parsed.data.title ?? "Sesi Bebas",
      })
      .returning({ id: workoutSessions.id });

    const setsToInsert: Array<typeof sessionSets.$inferInsert> = [];
    for (const item of freeList) {
      const ex = exerciseById.get(item.exerciseId);
      if (!ex) continue;
      for (let setNumber = 1; setNumber <= item.sets; setNumber += 1) {
        setsToInsert.push({
          sessionId: created.id,
          exerciseId: ex.id,
          setNumber,
          reps:
            ex.trackingType === "reps" ? (item.targetReps ?? 10) : null,
          seconds:
            ex.trackingType === "time" ? (item.targetSeconds ?? 30) : null,
          rpe: null,
          isCompleted: false,
        });
      }
    }

    if (setsToInsert.length === 0) {
      await db
        .delete(workoutSessions)
        .where(eq(workoutSessions.id, created.id));
      return NextResponse.json(
        { error: "Gerakan yang dipilih tidak valid." },
        { status: 400 },
      );
    }

    await db.insert(sessionSets).values(setsToInsert);
    return NextResponse.json({ sessionId: created.id, resumed: false });
  } catch {
    return NextResponse.json(
      { error: "Gagal memulai sesi workout." },
      { status: 500 },
    );
  }
}

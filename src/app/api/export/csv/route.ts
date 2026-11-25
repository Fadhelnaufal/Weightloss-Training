import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { todayWIB } from "@/lib/date";
import {
  getFinishedWorkoutSessions,
  getMealLogs,
  getWeightLogs,
} from "@/lib/db/queries";
import { buildCsvDocument } from "@/lib/export/csv";

const exportTypeSchema = z.enum(["weights", "meals", "sessions"]);

export async function GET(request: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Autentikasi diperlukan." },
      { status: 401 },
    );
  }

  const rawType = request.nextUrl.searchParams.get("type");
  const parsedType = exportTypeSchema.safeParse(rawType);
  if (!parsedType.success) {
    return NextResponse.json(
      { error: "Tipe ekspor CSV tidak valid (weights, meals, atau sessions)." },
      { status: 400 },
    );
  }

  const dateStr = todayWIB();

  try {
    let csvContent = "";
    let filename = "";

    if (parsedType.data === "weights") {
      const weights = await getWeightLogs();
      csvContent = buildCsvDocument(
        ["log_date", "weight_kg", "waist_cm", "note"],
        weights.map((item) => [
          item.logDate,
          item.weightKg,
          item.waistCm,
          item.note,
        ]),
      );
      filename = `pantau-berat-berat-${dateStr}.csv`;
    } else if (parsedType.data === "meals") {
      const meals = await getMealLogs();
      csvContent = buildCsvDocument(
        ["log_date", "meal_type", "description", "calories", "protein_g"],
        meals.map((item) => [
          item.logDate,
          item.mealType,
          item.description,
          item.calories,
          item.proteinG,
        ]),
      );
      filename = `pantau-berat-makanan-${dateStr}.csv`;
    } else {
      const sessions = await getFinishedWorkoutSessions();
      const rows = sessions.flatMap((session) =>
        session.sets.length > 0
          ? session.sets.map((s) => [
              session.sessionDate,
              session.title,
              session.durationSeconds,
              session.overallRpe,
              s.exercise.name,
              s.setNumber,
              s.reps,
              s.seconds,
              s.rpe,
              s.isCompleted ? "ya" : "tidak",
              session.note,
            ])
          : [
              [
                session.sessionDate,
                session.title,
                session.durationSeconds,
                session.overallRpe,
                "",
                "",
                "",
                "",
                "",
                "",
                session.note,
              ],
            ],
      );

      csvContent = buildCsvDocument(
        [
          "session_date",
          "session_title",
          "duration_seconds",
          "overall_rpe",
          "exercise",
          "set_number",
          "reps",
          "seconds",
          "set_rpe",
          "is_completed",
          "note",
        ],
        rows,
      );
      filename = `pantau-berat-sesi-${dateStr}.csv`;
    }

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengekspor data CSV." },
      { status: 500 },
    );
  }
}

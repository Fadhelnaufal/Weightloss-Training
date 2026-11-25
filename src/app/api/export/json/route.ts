import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { todayWIB } from "@/lib/date";
import {
  getDailyLogs,
  getFinishedWorkoutSessions,
  getMealLogs,
  getPlanDaysWithItems,
  getProfile,
  getWeightLogs,
} from "@/lib/db/queries";

export async function GET() {
  try {
    await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Autentikasi diperlukan." },
      { status: 401 },
    );
  }

  try {
    const [
      profile,
      weightLogs,
      dailyLogs,
      mealLogs,
      planDays,
      workoutSessions,
    ] = await Promise.all([
      getProfile(),
      getWeightLogs(),
      getDailyLogs(),
      getMealLogs(),
      getPlanDaysWithItems(),
      getFinishedWorkoutSessions(),
    ]);

    const dateStr = todayWIB();
    const payload = {
      exportedDateWIB: dateStr,
      profile,
      weightLogs,
      dailyLogs,
      mealLogs,
      planDays,
      workoutSessions,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="pantau-berat-export-${dateStr}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengekspor data." },
      { status: 500 },
    );
  }
}

import { NextResponse, type NextRequest } from "next/server";
import { mealLogs } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { isValidDateString, todayWIB } from "@/lib/date";
import { getDb } from "@/lib/db";
import { getMealLogs } from "@/lib/db/queries";
import { mealLogCreateSchema } from "@/lib/validators/meal";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json(
      { error: "Autentikasi diperlukan." },
      { status: 401 },
    );
  }

  const dateParam = request.nextUrl.searchParams.get("date");
  if (dateParam !== null && !isValidDateString(dateParam)) {
    return NextResponse.json(
      { error: "Parameter tanggal tidak valid." },
      { status: 400 },
    );
  }

  try {
    const logs = await getMealLogs(dateParam ?? undefined);
    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json(
      { error: "Gagal mengambil catatan makanan." },
      { status: 500 },
    );
  }
}

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

  const parsed = mealLogCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Data makanan tidak valid.",
      },
      { status: 400 },
    );
  }

  const logDate = parsed.data.logDate ?? todayWIB();
  const db = getDb();

  try {
    const [saved] = await db
      .insert(mealLogs)
      .values({
        logDate,
        mealType: parsed.data.mealType,
        description: parsed.data.description,
        calories: parsed.data.calories,
        proteinG:
          parsed.data.proteinG !== null
            ? parsed.data.proteinG.toFixed(1)
            : null,
      })
      .returning();

    return NextResponse.json({
      log: {
        id: saved.id,
        logDate: saved.logDate,
        mealType: saved.mealType,
        description: saved.description,
        calories: saved.calories,
        proteinG: saved.proteinG !== null ? Number(saved.proteinG) : null,
        createdAt: saved.createdAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan catatan makanan." },
      { status: 500 },
    );
  }
}

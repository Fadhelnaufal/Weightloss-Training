import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { mealLogs } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { mealLogUpdateSchema } from "@/lib/validators/meal";

function parseMealId(rawId: string): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/meals/[id]">,
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
  const id = parseMealId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: "ID catatan makanan tidak valid." },
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

  const parsed = mealLogUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "Data perubahan tidak valid.",
      },
      { status: 400 },
    );
  }

  const db = getDb();
  try {
    const [updated] = await db
      .update(mealLogs)
      .set({
        logDate: parsed.data.logDate,
        mealType: parsed.data.mealType,
        description: parsed.data.description,
        calories: parsed.data.calories,
        proteinG:
          parsed.data.proteinG !== null
            ? parsed.data.proteinG.toFixed(1)
            : null,
      })
      .where(eq(mealLogs.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Catatan makanan tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      log: {
        id: updated.id,
        logDate: updated.logDate,
        mealType: updated.mealType,
        description: updated.description,
        calories: updated.calories,
        proteinG: updated.proteinG !== null ? Number(updated.proteinG) : null,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui catatan makanan." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/meals/[id]">,
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
  const id = parseMealId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: "ID catatan makanan tidak valid." },
      { status: 400 },
    );
  }

  const db = getDb();
  try {
    const deleted = await db
      .delete(mealLogs)
      .where(eq(mealLogs.id, id))
      .returning({ id: mealLogs.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Catatan makanan tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus catatan makanan." },
      { status: 500 },
    );
  }
}

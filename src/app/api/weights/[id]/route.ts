import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { weightLogs } from "@/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { weightLogUpdateSchema } from "@/lib/validators/weight";

function parseLogId(rawId: string): number | null {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/weights/[id]">,
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
  const id = parseLogId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: "ID catatan berat tidak valid." },
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

  const parsed = weightLogUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Data perubahan tidak valid.",
      },
      { status: 400 },
    );
  }

  const db = getDb();

  try {
    const [updated] = await db
      .update(weightLogs)
      .set({
        logDate: parsed.data.logDate,
        weightKg: parsed.data.weightKg.toFixed(2),
        waistCm:
          parsed.data.waistCm !== null ? parsed.data.waistCm.toFixed(1) : null,
        note: parsed.data.note,
      })
      .where(eq(weightLogs.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Catatan berat tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      log: {
        id: updated.id,
        logDate: updated.logDate,
        weightKg: Number(updated.weightKg),
        waistCm: updated.waistCm !== null ? Number(updated.waistCm) : null,
        note: updated.note,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const pgCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (pgCode === "23505") {
      return NextResponse.json(
        { error: "Sudah ada catatan berat pada tanggal tersebut." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Gagal memperbarui catatan berat." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<"/api/weights/[id]">,
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
  const id = parseLogId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: "ID catatan berat tidak valid." },
      { status: 400 },
    );
  }

  const db = getDb();

  try {
    const deleted = await db
      .delete(weightLogs)
      .where(eq(weightLogs.id, id))
      .returning({ id: weightLogs.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Catatan berat tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Gagal menghapus catatan berat." },
      { status: 500 },
    );
  }
}

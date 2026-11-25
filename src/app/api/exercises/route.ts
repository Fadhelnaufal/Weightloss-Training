import { NextResponse } from "next/server";
import { getExercises } from "@/lib/db/queries";

export async function GET() {
  try {
    const items = await getExercises();
    return NextResponse.json({ exercises: items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Gagal mengambil daftar gerakan." },
      { status: 500 },
    );
  }
}

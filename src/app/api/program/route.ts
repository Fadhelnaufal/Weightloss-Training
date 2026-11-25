import { NextResponse } from "next/server";
import { getPlanDaysWithItems } from "@/lib/db/queries";

export async function GET() {
  try {
    const days = await getPlanDaysWithItems();
    return NextResponse.json({ days });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Autentikasi diperlukan." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Gagal mengambil jadwal program." },
      { status: 500 },
    );
  }
}

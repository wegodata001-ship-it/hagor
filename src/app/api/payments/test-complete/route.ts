import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Test payment bypass — permanently retired. */
export async function POST() {
  return NextResponse.json(
    { error: "Test payment is permanently disabled. Use Hyp card payment." },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Test payment is permanently disabled. Use Hyp card payment." },
    { status: 410 },
  );
}

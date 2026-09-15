import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Demo payment endpoint — permanently retired.
 * Does not mark orders PAID. Historical DEMO_PAID records are untouched.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Demo payment is permanently disabled. Use Hyp card payment." },
    { status: 410 },
  );
}

export async function GET() {
  return NextResponse.json(
    { error: "Demo payment is permanently disabled. Use Hyp card payment." },
    { status: 410 },
  );
}

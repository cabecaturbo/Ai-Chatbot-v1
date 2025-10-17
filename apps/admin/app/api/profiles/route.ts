import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  // TODO: persist to API/DB
  return NextResponse.json({ ok: true, saved: body });
}



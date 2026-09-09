import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/auth";

export async function GET(request: Request) {
  const user = getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user });
}

import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  clearSessionCookie,
  getSessionFromRequest,
  hashPassword,
  setSessionCookie,
} from "@/app/lib/auth";

export async function GET(request: Request) {
  const user = getSessionFromRequest(request);
  return NextResponse.json({ user });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { error: "A felhasználónév és a jelszó kötelező." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.passwordHash !== hashPassword(password)) {
      return NextResponse.json(
        { error: "Hibás felhasználónév vagy jelszó." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });

    return setSessionCookie(response, {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
  } catch {
    return NextResponse.json(
      { error: "Bejelentkezés sikertelen." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ user: null });
  }

  const response = NextResponse.json({ success: true });
  return clearSessionCookie(response);
}

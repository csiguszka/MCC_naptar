import { NextResponse } from "next/server";
import { getSessionFromRequest, hashPassword } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(request: Request) {
  const user = getSessionFromRequest(request);

  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Csak a super admin hozhat létre admin felhasználót." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const username = String(body.username ?? "").trim();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "").trim();

    if (!username || !name || !password) {
      return NextResponse.json({ error: "A felhasználónév, név és jelszó kötelező." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } });

    if (existing) {
      return NextResponse.json({ error: "Ez a felhasználónév már foglalt." }, { status: 409 });
    }

    const createdUser = await prisma.user.create({
      data: {
        username,
        name,
        passwordHash: hashPassword(password),
        role: "ADMIN",
      },
    });

    return NextResponse.json({
      id: createdUser.id,
      username: createdUser.username,
      name: createdUser.name,
      role: createdUser.role,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Nem sikerült létrehozni az admin felhasználót." }, { status: 500 });
  }
}

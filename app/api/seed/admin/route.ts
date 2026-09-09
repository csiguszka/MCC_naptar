import { NextResponse } from "next/server";
import { hashPassword } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function POST() {
  try {
    const existingSuperAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });

    if (existingSuperAdmin) {
      return NextResponse.json({ message: "A super admin már létezik." });
    }

    await prisma.user.create({
      data: {
        username: "superadmin",
        name: "Super Admin",
        passwordHash: hashPassword("superadmin123"),
        role: "SUPER_ADMIN",
      },
    });

    return NextResponse.json({ message: "Super admin létrehozva." });
  } catch {
    return NextResponse.json({ error: "Nem sikerült létrehozni a super admin felhasználót." }, { status: 500 });
  }
}

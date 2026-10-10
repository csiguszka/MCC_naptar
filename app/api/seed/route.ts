import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "FIT", color: "#c9a227" },
  { name: "KP", color: "#5bb3ff" },
  { name: "EP", color: "#7ad97a" },
];

export async function POST() {
  try {
    const existingSuperAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });

    if (existingSuperAdmin) {
      return NextResponse.json({ message: "A super admin már létre van hozva." });
    }

    const defaultUser = await prisma.user.create({
      data: {
        username: "superadmin",
        name: "Super Admin",
        passwordHash: "placeholder-hash",
        role: "SUPER_ADMIN",
      },
    });

    for (const category of DEFAULT_CATEGORIES) {
      await prisma.category.create({
        data: {
          ...category,
          createdBy: { connect: { id: defaultUser.id } },
        },
      });
    }

    return NextResponse.json({ message: "Super admin és alap kategóriák létrehozva." });
  } catch (error) {
    return NextResponse.json(
      { error: "Nem sikerült a seed létrehozása." },
      { status: 500 },
    );
  }
}

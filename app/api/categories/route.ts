import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

const DEFAULT_CATEGORIES = [
  { name: "FIT", color: "#c9a227" },
  { name: "KP", color: "#5bb3ff" },
  { name: "EP", color: "#7ad97a" },
];

export async function GET() {
  let categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  if (categories.length === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES,
    });

    categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  }

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const user = getSessionFromRequest(request);

  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Csak a super admin hozhat létre kategóriát." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const color = String(body.color ?? "#c9a227").trim();

    if (!name) {
      return NextResponse.json(
        { error: "A kategória neve kötelező." },
        { status: 400 },
      );
    }

    const existing = await prisma.category.findUnique({ where: { name } });

    if (existing) {
      return NextResponse.json(
        { error: "Ez a kategória már létezik." },
        { status: 409 },
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        color,
        createdById: user.id,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Nem sikerült menteni a kategóriát." },
      { status: 500 },
    );
  }
}

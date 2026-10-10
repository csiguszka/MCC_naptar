import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { isObjectId } from "@/app/lib/object-id";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionFromRequest(request);

  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultság a kategória módosításához." }, { status: 403 });
  }

  const { id } = await params;
  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Érvénytelen kategória azonosító." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const color = String(body.color ?? "").trim();

    if (!name || !color) {
      return NextResponse.json({ error: "A kategória neve és színe kötelező." }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name, color },
    });

    return NextResponse.json(category);
  } catch {
    return NextResponse.json({ error: "Nem sikerült frissíteni a kategóriát." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionFromRequest(request);

  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Nincs jogosultság a kategória törléséhez." }, { status: 403 });
  }

  const { id } = await params;
  if (!isObjectId(id)) {
    return NextResponse.json({ error: "Érvénytelen kategória azonosító." }, { status: 400 });
  }

  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Nem sikerült törölni a kategóriát." }, { status: 500 });
  }
}

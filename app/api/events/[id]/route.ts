import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { isObjectId } from "@/app/lib/object-id";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionFromRequest(request);

  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Bejelentkezés után módosíthatod az eseményeket." },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    if (!isObjectId(id)) {
      return NextResponse.json(
        { error: "Érvénytelen esemény azonosító." },
        { status: 400 },
      );
    }

    const existing = await prisma.event.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Az esemény nem található." },
        { status: 404 },
      );
    }

    if (user.role !== "SUPER_ADMIN" && existing.createdById !== user.id) {
      return NextResponse.json(
        { error: "Csak a saját eseményeidet módosíthatod." },
        { status: 403 },
      );
    }

    const categoryName = body.category ? String(body.category).trim() : undefined;
    let categoryIds: string[] | undefined;

    if (Array.isArray(body.categoryIds)) {
      const rawCategoryIds = body.categoryIds as unknown[];
      const parsedCategoryIds = rawCategoryIds.reduce<string[]>((ids, categoryId) => {
        if (isObjectId(categoryId)) ids.push(categoryId);
        return ids;
      }, []);
      categoryIds = [...new Set(parsedCategoryIds)];

      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } },
      });

      if (categoryIds.length === 0 || categories.length !== categoryIds.length) {
        return NextResponse.json(
          { error: "Egy vagy több kategória nem található." },
          { status: 400 },
        );
      }
    } else if (categoryName) {
      const category = await prisma.category.findUnique({ where: { name: categoryName } });

      if (!category) {
        return NextResponse.json(
          { error: "A kategória nem található." },
          { status: 400 },
        );
      }

      categoryIds = [category.id];
    }

    const tags: string[] | undefined = body.tags === undefined
      ? undefined
      : (Array.isArray(body.tags) ? body.tags as unknown[] : String(body.tags).split(","))
        .reduce<string[]>((items, tag) => {
          const normalizedTag = String(tag).trim();
          if (normalizedTag && !items.includes(normalizedTag)) items.push(normalizedTag);
          return items;
        }, []);

    const hasStart = body.startDateTime !== undefined && body.startDateTime !== null && body.startDateTime !== "";
    const hasEnd = body.endDateTime !== undefined && body.endDateTime !== null && body.endDateTime !== "";

    if (hasStart || hasEnd) {
      const startDateTime = hasStart ? new Date(body.startDateTime) : existing.startDateTime;
      const endDateTime = hasEnd ? new Date(body.endDateTime) : existing.endDateTime;

      if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
        return NextResponse.json(
          { error: "Érvénytelen kezdő vagy vég időpont." },
          { status: 400 },
        );
      }

      if (startDateTime.toISOString().slice(0, 10) !== endDateTime.toISOString().slice(0, 10)) {
        return NextResponse.json(
          { error: "Az esemény kezdete és vége ugyanazon a napon kell, hogy legyen." },
          { status: 400 },
        );
      }

      const durationHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

      if (durationHours <= 0 || durationHours > 6) {
        return NextResponse.json(
          { error: "Az esemény hossza 0 és 6 óra között lehet csak." },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: body.title ? String(body.title).trim() : undefined,
        location: body.location ? String(body.location).trim() : undefined,
        startDateTime: hasStart ? new Date(body.startDateTime) : undefined,
        endDateTime: hasEnd ? new Date(body.endDateTime) : undefined,
        category: categoryIds ? { connect: { id: categoryIds[0] } } : undefined,
        categories: categoryIds
          ? { set: categoryIds.map((categoryId) => ({ id: categoryId })) }
          : undefined,
        tags,
      },
      include: {
        category: true,
        categories: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: "Nem sikerült frissíteni az eseményt." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = getSessionFromRequest(request);

  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Bejelentkezés után törölheted az eseményeket." },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    if (!isObjectId(id)) {
      return NextResponse.json(
        { error: "Érvénytelen esemény azonosító." },
        { status: 400 },
      );
    }

    const existing = await prisma.event.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Az esemény nem található." },
        { status: 404 },
      );
    }

    if (user.role !== "SUPER_ADMIN" && existing.createdById !== user.id) {
      return NextResponse.json(
        { error: "Csak a saját eseményeidet törölheted." },
        { status: 403 },
      );
    }

    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Nem sikerült törölni az eseményt." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { isObjectId } from "@/app/lib/object-id";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "all";
  const tag = searchParams.get("tag")?.trim();
  const view = searchParams.get("view") ?? "display";
  const dateParam = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const startOfDay = new Date(`${dateParam}T00:00:00`);
  const endOfDay = new Date(`${dateParam}T23:59:59.999`);

  const filter: Prisma.EventWhereInput = {
    startDateTime: {
      gte: startOfDay,
      lte: endOfDay,
    },
  };

  if (category !== "all") {
    filter.OR = [
      { category: { name: category } },
      { categories: { some: { name: category } } },
    ];
  }

  if (tag) {
    filter.tags = { has: tag };
  }

  const events = await prisma.event.findMany({
    where: filter,
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
    orderBy: {
      startDateTime: "asc",
    },
  });

  const now = new Date();

  const visibleEvents = events.filter((event) => {
    if (view === "display") {
      return event.endDateTime >= now;
    }

    return true;
  });

  return NextResponse.json(visibleEvents);
}

export async function POST(request: Request) {
  const user = getSessionFromRequest(request);

  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Bejelentkezés után hozhatsz létre eseményt." },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const title = String(body.title ?? "").trim();
    const location = String(body.location ?? "").trim();
    const categoryName = String(body.category ?? "").trim();
    const requestedCategoryIds: string[] = Array.isArray(body.categoryIds)
      ? (body.categoryIds as unknown[]).reduce<string[]>((ids, categoryId) => {
          if (isObjectId(categoryId) && !ids.includes(categoryId)) ids.push(categoryId);
          return ids;
        }, [])
      : [];
    const rawTags: unknown[] = Array.isArray(body.tags)
      ? body.tags as unknown[]
      : String(body.tags ?? "").split(",");
    const tags = rawTags.reduce<string[]>((items, tag) => {
      const normalizedTag = String(tag).trim();
      if (normalizedTag && !items.includes(normalizedTag)) items.push(normalizedTag);
      return items;
    }, []);
    const startDateTime = new Date(body.startDateTime);
    const endDateTime = new Date(body.endDateTime);

    if (
      !title ||
      !location ||
      (!categoryName && requestedCategoryIds.length === 0) ||
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime())
    ) {
      return NextResponse.json(
        { error: "Hiányzó vagy érvénytelen mezők." },
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

    const categories = requestedCategoryIds.length > 0
      ? await prisma.category.findMany({ where: { id: { in: requestedCategoryIds } } })
      : await prisma.category.findMany({ where: { name: categoryName } });

    if (categories.length === 0 || categories.length !== (requestedCategoryIds.length || 1)) {
      return NextResponse.json(
        { error: "Egy vagy több kategória nem található." },
        { status: 400 },
      );
    }

    const orderedCategories = requestedCategoryIds.length > 0
      ? requestedCategoryIds.map((id: string) => categories.find((item) => item.id === id)!)
      : categories;

    const event = await prisma.event.create({
      data: {
        title,
        location,
        startDateTime,
        endDateTime,
        category: { connect: { id: orderedCategories[0].id } },
        categories: { connect: orderedCategories.map((item) => ({ id: item.id })) },
        tags,
        createdBy: { connect: { id: user.id } },
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

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Nem sikerült létrehozni az eseményt." },
      { status: 500 },
    );
  }
}

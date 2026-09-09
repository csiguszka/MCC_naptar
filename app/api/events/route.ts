import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "all";
  const view = searchParams.get("view") ?? "display";
  const dateParam = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const startOfDay = new Date(`${dateParam}T00:00:00`);
  const endOfDay = new Date(`${dateParam}T23:59:59.999`);

  const filter: Record<string, unknown> = {
    startDateTime: {
      gte: startOfDay,
      lte: endOfDay,
    },
  };

  if (category !== "all") {
    filter.category = {
      name: category,
    };
  }

  const events = await prisma.event.findMany({
    where: filter,
    include: {
      category: true,
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
    const startDateTime = new Date(body.startDateTime);
    const endDateTime = new Date(body.endDateTime);

    if (
      !title ||
      !location ||
      !categoryName ||
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

    const category = await prisma.category.findUnique({ where: { name: categoryName } });

    if (!category) {
      return NextResponse.json(
        { error: "A kategória nem található." },
        { status: 400 },
      );
    }

    const event = await prisma.event.create({
      data: {
        title,
        location,
        startDateTime,
        endDateTime,
        categoryId: category.id,
        createdById: user.id,
      },
      include: {
        category: true,
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

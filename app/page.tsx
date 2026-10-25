"use client";

import { useEffect, useMemo, useState } from "react";
import { btnIcon, btnPrimary, btnSecondary, cardCls, inputCls, labelCls, navCls } from "./ui";

type CategoryItem = {
  id: string;
  name: string;
  color: string;
};

type EventItem = {
  id: string;
  title: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  category: CategoryItem;
  categories: CategoryItem[];
  tags: string[];
  createdBy: {
    id: string;
    role: string;
    name: string;
    username: string;
  };
};

type SessionUser = {
  id: string;
  username: string;
  name: string;
  role: "SUPER_ADMIN" | "ADMIN";
};

type MessageState = {
  type: "success" | "error";
  text: string;
};

const ITEMS_PER_PAGE = 4;
const PAGE_SWITCH_MS = 15000;
const AUTO_REFRESH_MS = 5 * 60 * 1000;

const defaultEventForm = {
  title: "",
  location: "",
  category: "",
  startDateTime: "",
  endDateTime: "",
};

const defaultCategoryForm = {
  name: "",
  color: "#c9a227",
};

const defaultLoginForm = {
  username: "",
  password: "",
};

const defaultAdminForm = {
  username: "",
  name: "",
  password: "",
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("hu-HU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatDateLong = (value: string) =>
  new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));

const formatDayMonth = (value: string) =>
  new Intl.DateTimeFormat("hu-HU", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toDateTimeLocal = (value: string) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const getStartOfWeek = (value: string) => {
  const date = new Date(`${value}T12:00:00`);
  const start = new Date(date);
  const offset = (date.getDay() + 6) % 7;
  start.setDate(date.getDate() - offset);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getMonthGrid = (value: string) => {
  const startDate = new Date(`${value}T12:00:00`);
  const firstDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const start = new Date(firstDayOfMonth);
  const weekOffset = (firstDayOfMonth.getDay() + 6) % 7;
  start.setDate(firstDayOfMonth.getDate() - weekOffset);
  start.setHours(0, 0, 0, 0);

  const days: string[] = [];

  for (let index = 0; index < 42; index += 1) {
    const cell = new Date(start);
    cell.setDate(start.getDate() + index);
    days.push(toInputDate(cell));
  }

  return days;
};

const chunkArray = <T,>(items: T[], chunkSize: number) => {
  const pages: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    pages.push(items.slice(index, index + chunkSize));
  }

  return pages;
};

export default function Home() {
  const today = toInputDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [view, setView] = useState<"display" | "week">("display");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  // Telefonon/tableten nincs automatikus lapozás, az összes esemény görgethető listában látszik.
  const [isCompact, setIsCompact] = useState(false);
  const [showTopBar, setShowTopBar] = useState(() => {
    if (typeof window === "undefined") return true;

    // 1200px szélesség felett alapból rejtve
    return window.innerWidth <= 2000;
  });
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState(defaultEventForm);
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [adminForm, setAdminForm] = useState(defaultAdminForm);
  const [statusMessage, setStatusMessage] = useState<MessageState | null>(null);

  const loadCurrentUser = async () => {
    const response = await fetch("/api/users/me", { cache: "no-store" });
    const data = (await response.json()) as { user: SessionUser | null };
    setCurrentUser(data.user);
  };

  const loadCategories = async () => {
    const response = await fetch("/api/categories", { cache: "no-store" });
    const loadedCategories = (await response.json()) as CategoryItem[];
    setCategories(loadedCategories);
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsCompact(query.matches);
    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!statusMessage) return;

    const timeoutId = window.setTimeout(() => setStatusMessage(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "q") {
        event.preventDefault();
        setShowTopBar((previous) => !previous);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    void loadCurrentUser();
    void loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !eventForm.category) {
      setEventForm((previous) => ({
        ...previous,
        category: categories[0].name,
      }));
    }
  }, [categories, eventForm.category]);



  const loadEvents = async () => {
    const params = new URLSearchParams({
      category: selectedCategory,
      view,
      date: selectedDate,
    });

    const response = await fetch(`/api/events?${params.toString()}`, {
      cache: "no-store",
    });
    const loadedEvents = (await response.json()) as EventItem[];
    setEvents(Array.isArray(loadedEvents) ? loadedEvents : []);
    setCurrentPage(0);
  };

  useEffect(() => {
    void loadEvents();
  }, [selectedCategory, selectedDate, view]);

  useEffect(() => {
    if (view !== "display" && view !== "week") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadEvents();
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [view, selectedCategory, selectedDate]);

  useEffect(() => {
    if (view !== "display" || isCompact) {
      return;
    }

    const displayPages = chunkArray(events, ITEMS_PER_PAGE);

    if (displayPages.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setCurrentPage((previousPage) => (previousPage + 1) % displayPages.length);
    }, PAGE_SWITCH_MS);

    return () => window.clearInterval(intervalId);
  }, [events, view, isCompact]);

  const weekDays = useMemo(() => {
    const start = getStartOfWeek(selectedDate);

    return Array.from({ length: 7 }, (_, index) => {
      const cell = new Date(start);
      cell.setDate(start.getDate() + index);
      return toInputDate(cell);
    });
  }, [selectedDate]);

  const availableTags = useMemo(
    () => [...new Set(events.flatMap((event) => event.tags ?? []))].sort((left, right) => left.localeCompare(right)),
    [events],
  );

  useEffect(() => {
    if (selectedTag !== "all" && !availableTags.includes(selectedTag)) {
      setSelectedTag("all");
    }
  }, [availableTags, selectedTag]);
  const visibleEvents = useMemo(
    () => selectedTag === "all" ? events : events.filter((event) => event.tags?.includes(selectedTag)),
    [events, selectedTag],
  );
  const eventMap = useMemo(() => {
    const map = new Map<string, EventItem[]>();

    for (const event of visibleEvents) {
      const dateKey = event.startDateTime.slice(0, 10);
      const existing = map.get(dateKey) ?? [];
      existing.push(event);
      map.set(dateKey, existing);
    }

    for (const items of map.values()) {
      items.sort(
        (left, right) =>
          new Date(left.startDateTime).getTime() - new Date(right.startDateTime).getTime(),
      );
    }

    return map;
  }, [visibleEvents]);
  const displayPages = useMemo(() => chunkArray(visibleEvents, ITEMS_PER_PAGE), [visibleEvents]);
  const currentDisplayPage = isCompact ? visibleEvents : (displayPages[currentPage] ?? []);

  const canManageCategories = currentUser?.role === "SUPER_ADMIN";
  const canManageUsers = currentUser?.role === "SUPER_ADMIN";

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginForm),
    });

    const data = (await response.json()) as { error?: string; user?: SessionUser };

    if (!response.ok) {
      setStatusMessage({ type: "error", text: data.error ?? "Bejelentkezés sikertelen." });
      return;
    }

    setCurrentUser(data.user ?? null);
    setShowLogin(false);
    setStatusMessage({ type: "success", text: "Sikeres bejelentkezés." });
    setLoginForm(defaultLoginForm);
  };

  const handleLogout = async () => {
    await fetch("/api/login", { method: "DELETE" });
    setCurrentUser(null);
    setStatusMessage({ type: "success", text: "Sikeres kijelentkezés." });
  };

  const handleCreateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(adminForm),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatusMessage({ type: "error", text: data.error ?? "Nem sikerült létrehozni az admin fiókot." });
      return;
    }

    setAdminForm(defaultAdminForm);
    setStatusMessage({ type: "success", text: "Admin felhasználó létrehozva." });
  };

  const handleCategorySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isEditing = editingCategoryId !== null;
    const response = await fetch(
      isEditing ? `/api/categories/${editingCategoryId}` : "/api/categories",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(categoryForm),
      },
    );

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatusMessage({ type: "error", text: data.error ?? "Nem sikerült menteni a kategóriát." });
      return;
    }

    setCategoryForm(defaultCategoryForm);
    setEditingCategoryId(null);
    setStatusMessage({ type: "success", text: isEditing ? "Kategória frissítve." : "Kategória létrehozva." });
    await loadCategories();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const response = await fetch(`/api/categories/${categoryId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setStatusMessage({ type: "error", text: "Nem sikerült törölni a kategóriát." });
      return;
    }

    setStatusMessage({ type: "success", text: "Kategória törölve." });
    await loadCategories();
  };

  const handleEventSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser) {
      setStatusMessage({ type: "error", text: "Be kell jelentkezned esemény létrehozásához." });
      return;
    }

    if (new Date(eventForm.startDateTime).getTime() >= new Date(eventForm.endDateTime).getTime()) {
      setStatusMessage({ type: "error", text: "A kezdési időnek korábbinak kell lennie a vég időnél." });
      return;
    }

    const isEditing = editingEventId !== null;
    const response = await fetch(
      isEditing ? `/api/events/${editingEventId}` : "/api/events",
      {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventForm),
      },
    );

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatusMessage({ type: "error", text: data.error ?? "Nem sikerült menteni az eseményt." });
      return;
    }

    setEventForm(defaultEventForm);
    setEditingEventId(null);
    setStatusMessage({ type: "success", text: isEditing ? "Esemény frissítve." : "Esemény létrehozva." });
    await loadCategories();
  };

  const handleDeleteEvent = async (eventId: number) => {
    const response = await fetch(`/api/events/${eventId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setStatusMessage({ type: "error", text: "Nem sikerült törölni az eseményt." });
      return;
    }

    setStatusMessage({ type: "success", text: "Esemény törölve." });
    setEditingEventId(null);
    setEventForm(defaultEventForm);
  };

  const handleEditEvent = (eventItem: EventItem) => {
    setEditingEventId(eventItem.id);
    setEventForm({
      title: eventItem.title,
      location: eventItem.location,
      category: eventItem.category.name,
      startDateTime: toDateTimeLocal(eventItem.startDateTime),
      endDateTime: toDateTimeLocal(eventItem.endDateTime),
    });
  };

  const handleEditCategory = (category: CategoryItem) => {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name, color: category.color });
  };

  const shiftDate = (days: number) => {
    const next = new Date(`${selectedDate}T12:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(toInputDate(next));
  };

  const dateStep = view === "week" ? 7 : 1;
  const dateLabel =
    view === "week"
      ? `${formatDayMonth(weekDays[0])} – ${formatDayMonth(weekDays[6])}`
      : formatDateLong(`${selectedDate}T12:00:00`);
  const isToday = view === "week" ? weekDays.includes(today) : selectedDate === today;

  const getEventCategories = (event: EventItem) =>
    event.categories?.length ? event.categories : [event.category];

  return (
    <main className="min-h-screen bg-[#24334a] p-3 text-[#f4f1e8] sm:p-4 md:p-6">
      {showTopBar && (
        <nav className={navCls} aria-label="Főmenü">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex w-full gap-1 rounded-xl border border-[#45536a] bg-[#212836] p-1 lg:w-auto"
              role="tablist"
              aria-label="Nézetváltás"
            >
              {([
                ["display", "Napi nézet"],
                ["week", "Heti nézet"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={view === key}
                  className={`min-h-10 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition lg:flex-none lg:text-base ${view === key ? "bg-[#c9a227] text-[#1b1305]" : "text-[#c3cad5] hover:bg-[#2b3445]"}`}
                  onClick={() => setView(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex w-full items-center gap-2 lg:w-auto">
              <button type="button" className={btnIcon} aria-label="Előző" onClick={() => shiftDate(-dateStep)}>
                ←
              </button>
              <div className="min-w-0 flex-1 truncate text-center text-sm font-semibold lg:w-56 lg:flex-none">
                {dateLabel}
              </div>
              <button type="button" className={btnIcon} aria-label="Következő" onClick={() => shiftDate(dateStep)}>
                →
              </button>
              <button
                type="button"
                className={`${btnSecondary} px-3!`}
                disabled={isToday}
                onClick={() => setSelectedDate(today)}
              >
                Ma
              </button>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto">
              <label className="flex flex-col gap-1 text-xs font-medium text-[#c3cad5]">
                Kategória
                <select
                  className={`${inputCls} lg:w-44`}
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                >
                  <option value="all">Összes</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium text-[#c3cad5]">
                Címke
                <select
                  className={`${inputCls} lg:w-44`}
                  value={selectedTag}
                  onChange={(event) => setSelectedTag(event.target.value)}
                >
                  <option value="all">Összes</option>
                  {availableTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 lg:ml-auto lg:w-auto">
              {currentUser ? (
                <>
                  <span className="w-full truncate text-sm text-[#c3cad5] lg:w-auto lg:max-w-48">
                    {currentUser.name}
                  </span>
                  <a href="/admin" className={`${btnSecondary} flex-1 lg:flex-none`}>
                    Admin oldal
                  </a>
                  <button type="button" className={`${btnPrimary} flex-1 lg:flex-none`} onClick={handleLogout}>
                    Kijelentkezés
                  </button>
                </>
              ) : (
                <button type="button" className={`${btnPrimary} w-full lg:w-auto`} onClick={() => setShowLogin(true)}>
                  Bejelentkezés
                </button>
              )}
            </div>
          </div>
        </nav>
      )}

      {statusMessage && (
        <div
          role={statusMessage.type === "error" ? "alert" : "status"}
          aria-live={statusMessage.type === "error" ? "assertive" : "polite"}
          className={`fixed left-1/2 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start justify-between gap-4 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${statusMessage.type === "success" ? "border-green-500/40 bg-[#1b212b]/95 text-green-100" : "border-red-400/40 bg-[#1b212b]/95 text-red-100"}`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            aria-label="Visszajelzés bezárása"
            className="shrink-0 rounded px-1 text-lg leading-5 opacity-75 hover:opacity-100"
            onClick={() => setStatusMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {view === "display" && (
        <section className="flex flex-col overflow-hidden rounded-2xl bg-[#24334a] lg:min-h-[calc(100vh-3rem)] lg:rounded-3xl">
          <header className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-1 py-3 sm:px-4 sm:py-5 md:px-8">
            <img
              src="https://www.ojim.fr/wp-content/uploads/2024/11/mcc-budapest.jpg"
              alt="MCC"
              className="h-12 w-auto object-contain sm:h-20 md:h-28"
            />
            <div className="text-right">
              <div className="text-base font-semibold text-white sm:text-2xl xl:text-4xl">
                {formatDateLong(selectedDate)}
              </div>
              <div className="mt-1 whitespace-nowrap font-serif text-3xl font-semibold leading-none sm:mt-2 sm:text-5xl xl:text-6xl">
                {currentTime.toLocaleTimeString("hu-HU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </header>

          <div className="flex grow flex-col justify-center px-1 py-3 sm:px-4 sm:py-6 md:px-14">
            {currentDisplayPage.length === 0 ? (
              <div className="m-auto py-12 text-center font-serif text-xl text-[#aeb7c6] sm:text-3xl xl:text-5xl">
                Nincs aktív esemény ehhez a naphoz.
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-6">
                {currentDisplayPage.map((event) => (
                  <article
                    key={event.id}
                    className="grid grid-cols-1 items-center gap-2 rounded-xl border-l-[6px] bg-[#1b212b] px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 lg:min-h-32 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-8 lg:px-8"
                    style={{ borderLeftColor: getEventCategories(event)[0].color }}
                  >
                    <div className="whitespace-nowrap font-serif text-xl font-semibold text-[#c3cad5] sm:text-3xl lg:text-white xl:text-5xl">
                      {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)}
                    </div>
                    <div className="min-w-0">
                      <div className="break-words font-serif text-2xl font-semibold text-[#e3bd45] sm:text-3xl xl:text-5xl">
                        {event.title}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {getEventCategories(event).map((category) => (
                          <span
                            key={category.id}
                            className="rounded-full px-3 py-1 text-xs font-bold text-[#101722] sm:text-sm"
                            style={{ backgroundColor: category.color }}
                          >
                            {category.name}
                          </span>
                        ))}
                        {(event.tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-[#718099] px-3 py-1 text-xs font-semibold text-[#dbe3ed] sm:text-sm"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="break-words text-left font-serif text-lg font-semibold sm:text-2xl lg:text-right xl:text-4xl">
                      {event.location}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {!isCompact && displayPages.length > 1 && (
            <div className="flex justify-center gap-3 pb-6" aria-label="Lapszám">
              {displayPages.map((_, index) => (
                <span
                  key={index}
                  className={`h-2.5 w-2.5 rounded-full ${currentPage === index ? "scale-125 bg-[#c9a227]" : "bg-[#45536a]"}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {view === "week" && (
        <section className={cardCls}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="m-0 font-serif text-2xl md:text-3xl">Heti nézet</h2>
            <span className="text-sm text-[#c3cad5]">
              {formatDayMonth(weekDays[0])} – {formatDayMonth(weekDays[6])}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            {weekDays.map((dayKey) => {
              const dayDate = new Date(`${dayKey}T12:00:00`);
              const dayEvents = eventMap.get(dayKey) ?? [];
              const isCurrentDay = dayKey === today;

              return (
                <div
                  key={dayKey}
                  className={`rounded-xl border bg-[#212836] p-3 md:min-h-60 ${isCurrentDay ? "border-[#c9a227] ring-1 ring-[#c9a227]/60" : "border-[#45536a]"}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2 border-b border-[#45536a] pb-2 text-sm text-[#c3cad5]">
                    <strong className="capitalize">
                      {new Intl.DateTimeFormat("hu-HU", { weekday: "long" }).format(dayDate)}
                    </strong>
                    <span className="flex items-center gap-2">
                      {isCurrentDay && (
                        <span className="rounded-full bg-[#c9a227] px-2 py-0.5 text-xs font-bold text-[#1b1305]">Ma</span>
                      )}
                      {formatDayMonth(dayKey)}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {dayEvents.length === 0 ? (
                      <div className="py-2 text-center text-sm text-[#8792a4] md:pt-6">Nincs esemény</div>
                    ) : (
                      dayEvents.map((event) => {
                        const eventCategories = getEventCategories(event);

                        return (
                          <div
                            key={event.id}
                            className="rounded-lg border-l-4 p-2.5"
                            style={{
                              borderLeftColor: eventCategories[0].color,
                              backgroundColor: `${eventCategories[0].color}22`,
                            }}
                          >
                            <div className="text-xs font-medium text-[#c3cad5]">
                              {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)}
                            </div>
                            <div className="mt-1 break-words font-bold">{event.title}</div>
                            {event.location && (
                              <div className="mt-1 break-words text-sm text-[#c3cad5]">📍 {event.location}</div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {eventCategories.map((category) => (
                                <span
                                  key={category.id}
                                  className="rounded-full px-2 py-0.5 text-xs font-bold text-[#101722]"
                                  style={{ backgroundColor: category.color }}
                                >
                                  {category.name}
                                </span>
                              ))}
                              {(event.tags ?? []).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-[#718099] px-2 py-0.5 text-xs text-[#dbe3ed]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/60 p-3 sm:items-center sm:p-5"
          onClick={() => setShowLogin(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Bejelentkezés"
            className="w-full max-w-md rounded-2xl border border-[#45536a] bg-[#1b212b] p-5 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-5 font-serif text-2xl">Bejelentkezés</h3>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <label className={labelCls}>
                <span>Felhasználónév</span>
                <input
                  className={inputCls}
                  autoComplete="username"
                  autoFocus
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((previous) => ({ ...previous, username: event.target.value }))
                  }
                />
              </label>

              <label className={labelCls}>
                <span>Jelszó</span>
                <input
                  className={inputCls}
                  type="password"
                  autoComplete="current-password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((previous) => ({ ...previous, password: event.target.value }))
                  }
                />
              </label>

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
                <button type="button" className={`${btnSecondary} sm:flex-1`} onClick={() => setShowLogin(false)}>
                  Mégse
                </button>
                <button type="submit" className={`${btnPrimary} sm:flex-1`}>
                  Belépés
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

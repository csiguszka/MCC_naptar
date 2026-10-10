"use client";

import { useEffect, useMemo, useState } from "react";

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
    if (view !== "display") {
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
  }, [events, view]);

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
  const currentDisplayPage = displayPages[currentPage] ?? [];

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

  return (
    <main className="min-h-screen bg-[#24334a] p-4 text-[#f4f1e8] md:p-6">
      {showTopBar && (
        <div className="mb-6 flex flex-col items-stretch justify-between gap-5 xl:flex-row xl:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-3 rounded-xl border border-[#45536a] bg-[#1b212b] px-4 py-2 text-sm text-[#c3cad5]">
              <span>Kategória</span>
              <select
                className="rounded-lg border border-[#45536a] bg-[#212836] px-3 py-2 text-[#f4f1e8]"
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

            <label className="flex items-center gap-3 rounded-xl border border-[#45536a] bg-[#1b212b] px-4 py-2 text-sm text-[#c3cad5]">
              <span>Címke</span>
              <select
                className="rounded-lg border border-[#45536a] bg-[#212836] px-3 py-2 text-[#f4f1e8]"
                value={selectedTag}
                onChange={(event) => setSelectedTag(event.target.value)}
              >
                <option value="all">Összes</option>
                {availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
            </label>

          <div className="inline-flex gap-1 rounded-xl border border-[#45536a] bg-[#1b212b] p-1" aria-label="Nézetváltás">
            <button
              type="button"
              className={`rounded-lg px-4 py-2 font-semibold ${view === "display" ? "bg-[#c9a227] text-[#1b1305]" : "text-[#c3cad5] hover:bg-[#212836]"}`}
              onClick={() => setView("display")}
            >
              Napi kijelző
            </button>
            <button
              type="button"
              className={`rounded-lg px-4 py-2 font-semibold ${view === "week" ? "bg-[#c9a227] text-[#1b1305]" : "text-[#c3cad5] hover:bg-[#212836]"}`}
              onClick={() => setView("week")}
            >
              Heti
            </button>
          </div>


            {currentUser ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#45536a] bg-[#1b212b] px-3 py-2 text-[#c3cad5]">
                <span className="px-1">
                  {currentUser.name} ({currentUser.role})
                </span>
                <a href="/admin" className="inline-flex items-center justify-center rounded-lg border border-[#45536a] bg-[#212836] px-4 py-2 font-bold text-[#f4f1e8] no-underline hover:opacity-90">
                  Admin oldal
                </a>
                <button type="button" className="rounded-lg bg-[#c9a227] px-4 py-2 font-bold text-[#1b1305] hover:opacity-90" onClick={handleLogout}>
                  Kijelentkezés
                </button>
              </div>
            ) : (
              <button type="button" className="rounded-lg bg-[#c9a227] px-4 py-2 font-bold text-[#1b1305] hover:opacity-90" onClick={() => setShowLogin(true)}>
                Bejelentkezés
              </button>
            )}
          </div>

        </div>
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
        <section className="flex min-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-3xl bg-[#24334a]">
          <header className="flex items-start justify-between gap-8 px-4 py-5 md:px-8">
            <img src="https://www.ojim.fr/wp-content/uploads/2024/11/mcc-budapest.jpg" alt="MCC" className="h-20 w-auto object-contain md:h-28" />
            <div className="text-right">
              <div className="text-4xl font-semibold text-white">{formatDateLong(selectedDate)}</div>
              <div className="mt-2 whitespace-nowrap font-serif text-6xl font-semibold leading-none">
                {currentTime.toLocaleTimeString("hu-HU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </header>

          <div className="flex grow flex-col justify-center px-4 py-6 md:px-14">
            {currentDisplayPage.length === 0 ? (
              <div className="m-auto text-center font-serif text-3xl text-[#aeb7c6] md:text-5xl">Nincs aktív esemény ehhez a naphoz.</div>
            ) : (
              <div className="grid gap-6">
                {currentDisplayPage.map((event) => (
                  <article
                    key={event.id}
                    className="grid min-h-32 grid-cols-1 items-center gap-4 rounded-xl border-l-[6px] bg-[#1b212b] px-6 py-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-8 lg:px-8"
                    style={{ borderLeftColor: event.categories?.[0]?.color ?? event.category.color }}
                  >
                    <div className="whitespace-nowrap font-serif text-4xl font-semibold md:text-5xl">
                      {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)}
                    </div>
                    <div>
                      <div className="font-serif text-5xl font-semibold text-[#e3bd45]">{event.title}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(event.categories?.length ? event.categories : [event.category]).map((category) => (
                          <span key={category.id} className="rounded-full px-3 py-1 text-sm font-bold text-[#101722]" style={{ backgroundColor: category.color }}>{category.name}</span>
                        ))}
                        {(event.tags ?? []).map((tag) => <span key={tag} className="rounded-full border border-[#718099] px-3 py-1 text-sm font-semibold text-[#dbe3ed]">{tag}</span>)}
                      </div>
                    </div>
                    <div className="text-left font-serif text-4xl font-semibold lg:text-right">{event.location}</div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {displayPages.length > 1 && (
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
        <section className="rounded-2xl border border-[#45536a] bg-[#1b212b]/90 p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-5">
            <button
              type="button"
              className="h-11 w-11 rounded-lg border border-[#45536a] bg-[#212836] text-xl text-[#f4f1e8]"
              onClick={() => {
                const next = new Date(`${selectedDate}T12:00:00`);
                next.setDate(next.getDate() - 7);
                setSelectedDate(toInputDate(next));
              }}
            >
              ←
            </button>
            <h2 className="m-0 font-serif text-2xl md:text-3xl">Heti nézet</h2>
            <button
              type="button"
              className="h-11 w-11 rounded-lg border border-[#45536a] bg-[#212836] text-xl text-[#f4f1e8]"
              onClick={() => {
                const next = new Date(`${selectedDate}T12:00:00`);
                next.setDate(next.getDate() + 7);
                setSelectedDate(toInputDate(next));
              }}
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            {weekDays.map((dayKey) => (
              <div key={dayKey} className="min-h-60 rounded-xl border border-[#45536a] bg-[#212836] p-3">
                <div className="mb-3 flex items-center justify-between border-b border-[#45536a] pb-2 text-sm text-[#c3cad5]">
                  <strong>
                    {new Intl.DateTimeFormat("hu-HU", { weekday: "short" }).format(
                      new Date(`${dayKey}T12:00:00`),
                    )}
                  </strong>
                  <span>
                    {new Intl.DateTimeFormat("hu-HU", {
                      month: "numeric",
                      day: "numeric",
                    }).format(new Date(`${dayKey}T12:00:00`))}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {(eventMap.get(dayKey) ?? []).length === 0 ? (
                    <div className="pt-6 text-center text-sm text-[#8792a4]">Nincs esemény</div>
                  ) : (
                    (eventMap.get(dayKey) ?? []).map((event) => (
                      <div
                        key={event.id}
                        className="rounded-lg border-l-4 p-2.5"
                        style={{
                          borderLeftColor: event.category.color,
                          backgroundColor: `${event.category.color}22`,
                        }}
                      >
                        <div className="text-xs text-[#c3cad5]">
                          {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)}
                        </div>
                        <div className="mt-1 font-bold">{event.title}</div>
                        <div className="mt-1 text-sm text-[#c3cad5]">{event.location}</div>
                        <div className="mt-2 flex flex-wrap gap-1">{(event.tags ?? []).map((tag) => <span key={tag} className="rounded-full border border-[#718099] px-2 py-0.5 text-xs text-[#dbe3ed]">{tag}</span>)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* <footer className="shortcut-footer">
        <span>Ctrl+Q</span>
        {showTopBar ? " menü elrejtése" : " menü megjelenítése"}
      </footer> */}

      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5" onClick={() => setShowLogin(false)}>
          <div className="w-full max-w-md rounded-2xl border border-[#45536a] bg-[#1b212b] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="mb-5 font-serif text-2xl">Bejelentkezés</h3>
            <form onSubmit={handleLogin} className="flex flex-col gap-4 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:text-[#c3cad5] [&_input]:rounded-lg [&_input]:border [&_input]:border-[#45536a] [&_input]:bg-[#212836] [&_input]:px-3 [&_input]:py-2 [&_input]:text-[#f4f1e8]">
              <label>
                <span>Felhasználónév</span>
                <input
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((previous) => ({ ...previous, username: event.target.value }))
                  }
                />
              </label>

              <label>
                <span>Jelszó</span>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((previous) => ({ ...previous, password: event.target.value }))
                  }
                />
              </label>

              <div className="mt-2 flex flex-wrap gap-3">
                <button type="submit" className="rounded-lg bg-[#c9a227] px-4 py-2 font-bold text-[#1b1305] hover:opacity-90">
                  Belépés
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-[#45536a] bg-[#212836] px-4 py-2 font-semibold text-[#f4f1e8] hover:opacity-90"
                  onClick={() => setShowLogin(false)}
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        <button onClick={() => setShowTopBar(prev => !prev)}>
          x
        </button>
    </main>
  );
}

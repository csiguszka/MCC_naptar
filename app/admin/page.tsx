"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { btnDanger, btnIcon, btnPrimary, btnSecondary, cardCls, inputCls, labelCls, navCls, panelCls } from "../ui";

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

type AdminTab = "events" | "categories" | "users";

type EventFormState = {
  title: string;
  location: string;
  categoryIds: string[];
  tags: string;
  startTime: string;
  endTime: string;
};

const defaultEventForm = (): EventFormState => ({
  title: "",
  location: "",
  categoryIds: [],
  tags: "",
  startTime: "09:00",
  endTime: "10:00",
});

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

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  }).format(new Date(`${value}T12:00:00`));

const toDateTimeLocal = (value: string) => {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return {
    date: localDate.toISOString().slice(0, 10),
    time: localDate.toISOString().slice(11, 16),
  };
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

const buildDateTime = (date: string, time: string) => {
  const timestamp = new Date(`${date}T${time}:00`);
  return timestamp;
};

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(toInputDate(new Date()));
  const monthDays = getMonthGrid(selectedDate);
  const monthName = new Intl.DateTimeFormat("hu-HU", {
    year: "numeric",
    month: "long",
  }).format(new Date(`${selectedDate}T12:00:00`));
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [tab, setTab] = useState<AdminTab>("events");
  const [showLogin, setShowLogin] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(defaultEventForm());
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [adminForm, setAdminForm] = useState(defaultAdminForm);
  const [statusMessage, setStatusMessage] = useState<MessageState | null>(null);

  const scrollToForm = (id: string) => {
    window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const canManageCategories = currentUser?.role === "SUPER_ADMIN";
  const canManageUsers = currentUser?.role === "SUPER_ADMIN";

  const loadCurrentUser = async () => {
    const response = await fetch("/api/users/me", { cache: "no-store" });
    const data = (await response.json()) as { user: SessionUser | null };
    setCurrentUser(data.user);

    if (!data.user) {
      setShowLogin(true);
    }
  };

  const loadCategories = async () => {
    const response = await fetch("/api/categories", { cache: "no-store" });
    const loadedCategories = (await response.json()) as CategoryItem[];
    setCategories(loadedCategories);
  };

  useEffect(() => {
    void loadCurrentUser();
    void loadCategories();
  }, []);

  useEffect(() => {
    if (!statusMessage) return;

    const timeoutId = window.setTimeout(() => setStatusMessage(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [statusMessage]);

  useEffect(() => {
    if (categories.length > 0 && eventForm.categoryIds.length === 0) {
      setEventForm((previous) => ({
        ...previous,
        categoryIds: [categories[0].id],
      }));
    }
  }, [categories, eventForm.categoryIds.length]);

  useEffect(() => {
    if (currentUser) {
      void loadEvents();
    }
  }, [currentUser, selectedDate]);

  const loadEvents = async () => {
    const params = new URLSearchParams({
      category: "all",
      view: "display",
      date: selectedDate,
    });

    const response = await fetch(`/api/events?${params.toString()}`, {
      cache: "no-store",
    });
    const loadedEvents = (await response.json()) as EventItem[];
    setEvents(Array.isArray(loadedEvents) ? loadedEvents : []);
  };

  const availableTags = [...new Set(events.flatMap((event) => event.tags ?? []))].sort((left, right) => left.localeCompare(right));
  const filteredEvents = events.filter((event) => {
    const eventCategories = event.categories?.length ? event.categories : [event.category];
    const matchesCategory = selectedCategory === "all" || eventCategories.some((category) => category.name === selectedCategory);
    const matchesTag = selectedTag === "all" || event.tags?.includes(selectedTag);
    return matchesCategory && matchesTag;
  });

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
    setShowLogin(true);
    setStatusMessage({ type: "success", text: "Sikeres kijelentkezés." });
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

  const handleDeleteCategory = async (category: CategoryItem) => {
    if (!window.confirm(`Biztosan törölni szeretnéd a(z) „${category.name}” kategóriát?`)) return;

    const response = await fetch(`/api/categories/${category.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setStatusMessage({ type: "error", text: "Nem sikerült törölni a kategóriát." });
      return;
    }

    setStatusMessage({ type: "success", text: "Kategória törölve." });
    await loadCategories();
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

  const handleEventSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser) {
      setStatusMessage({ type: "error", text: "Be kell jelentkezned az esemény kezeléséhez." });
      return;
    }

    const startDateTime = buildDateTime(selectedDate, eventForm.startTime);
    const endDateTime = buildDateTime(selectedDate, eventForm.endTime);

    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      setStatusMessage({ type: "error", text: "Érvénytelen kezdő vagy vég időpont." });
      return;
    }

    if (startDateTime.getTime() >= endDateTime.getTime()) {
      setStatusMessage({ type: "error", text: "A kezdési időnek korábbinak kell lennie a vég időnél." });
      return;
    }

    const durationHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);

    if (durationHours > 6) {
      setStatusMessage({ type: "error", text: "Az esemény maximum 6 óra lehet." });
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
        body: JSON.stringify({
          title: eventForm.title,
          location: eventForm.location,
          categoryIds: eventForm.categoryIds,
          tags: eventForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
        }),
      },
    );

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatusMessage({ type: "error", text: data.error ?? "Nem sikerült menteni az eseményt." });
      return;
    }

    setEventForm(defaultEventForm());
    setEditingEventId(null);
    setStatusMessage({ type: "success", text: isEditing ? "Esemény frissítve." : "Esemény létrehozva." });
    await loadEvents();
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt az eseményt?")) return;

    const response = await fetch(`/api/events/${eventId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setStatusMessage({ type: "error", text: "Nem sikerült törölni az eseményt." });
      return;
    }

    setStatusMessage({ type: "success", text: "Esemény törölve." });
    setEditingEventId(null);
    setEventForm(defaultEventForm());
    await loadEvents();
  };

  const handleEditEvent = (eventItem: EventItem) => {
    const start = toDateTimeLocal(eventItem.startDateTime);
    const end = toDateTimeLocal(eventItem.endDateTime);

    setEditingEventId(eventItem.id);
    setSelectedDate(start.date);
    setEventForm({
      title: eventItem.title,
      location: eventItem.location,
      categoryIds: eventItem.categories?.length
        ? eventItem.categories.map((category) => category.id)
        : [eventItem.category.id],
      tags: (eventItem.tags ?? []).join(", "),
      startTime: start.time,
      endTime: end.time,
    });
    scrollToForm("event-form");
  };

  const handleEditCategory = (category: CategoryItem) => {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name, color: category.color });
    scrollToForm("category-form");
  };

  const todayKey = toInputDate(new Date());
  const selectedMonth = new Date(`${selectedDate}T12:00:00`).getMonth();

  const shiftDay = (days: number) => {
    const next = new Date(`${selectedDate}T12:00:00`);
    next.setDate(next.getDate() + days);
    setSelectedDate(toInputDate(next));
  };

  const shiftMonth = (months: number) => {
    const next = new Date(`${selectedDate}T12:00:00`);
    next.setDate(1);
    next.setMonth(next.getMonth() + months);
    setSelectedDate(toInputDate(next));
  };

  const getEventCategories = (event: EventItem) =>
    event.categories?.length ? event.categories : [event.category];

  const tabs = [
    { key: "events", label: "Események" },
    ...(canManageCategories ? [{ key: "categories", label: "Kategóriák" }] : []),
    ...(canManageUsers ? [{ key: "users", label: "Felhasználók" }] : []),
  ] as { key: AdminTab; label: string }[];

  return (
    <main className="min-h-screen bg-[#24334a] p-3 text-[#f4f1e8] sm:p-4 md:p-6">
      <nav className={navCls} aria-label="Admin menü">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className={btnSecondary}>
            ← Főoldal
          </Link>

          {currentUser ? (
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden min-w-0 truncate text-sm text-[#c3cad5] sm:block">
                {currentUser.name} ({currentUser.role === "SUPER_ADMIN" ? "szuperadmin" : "admin"})
              </span>
              <button type="button" className={btnPrimary} onClick={handleLogout}>
                Kijelentkezés
              </button>
            </div>
          ) : (
            <button type="button" className={btnPrimary} onClick={() => setShowLogin(true)}>
              Bejelentkezés
            </button>
          )}
        </div>
      </nav>

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

      {!currentUser && showLogin && (
        <section className={`${cardCls} mx-auto max-w-md`}>
          <h2 className="mb-5 font-serif text-2xl">Bejelentkezés</h2>

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

            <button type="submit" className={`${btnPrimary} mt-2 w-full`}>
              Belépés
            </button>
          </form>
        </section>
      )}

      {currentUser && (
        <section className={cardCls}>
          {tabs.length > 1 && (
            <div
              className="-mx-1 mb-5 flex gap-1 overflow-x-auto rounded-xl border border-[#45536a] bg-[#212836] p-1"
              role="tablist"
            >
              {tabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.key}
                  className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition sm:text-base ${tab === item.key ? "bg-[#c9a227] text-[#1b1305]" : "text-[#c3cad5] hover:bg-[#2b3445]"}`}
                  onClick={() => setTab(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {tab === "events" && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.3fr)]">
              {/* Esemény lista – telefonon legelöl */}
              <section className="order-1 min-w-0 rounded-xl border border-[#45536a] bg-[#1b212b] p-4 lg:order-2">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#45536a] pb-4">
                  <h3 className="m-0 font-serif text-xl">Események listája</h3>
                  <button
                    type="button"
                    className={`${btnPrimary} lg:hidden`}
                    onClick={() => {
                      setEditingEventId(null);
                      setEventForm(defaultEventForm());
                      scrollToForm("event-form");
                    }}
                  >
                    + Új esemény
                  </button>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <button type="button" className={btnIcon} aria-label="Előző nap" onClick={() => shiftDay(-1)}>
                    ←
                  </button>
                  <div className="min-w-0 flex-1 text-center text-sm font-semibold sm:text-base">
                    {formatDateLong(selectedDate)}
                  </div>
                  <button type="button" className={btnIcon} aria-label="Következő nap" onClick={() => shiftDay(1)}>
                    →
                  </button>
                  <button
                    type="button"
                    className={`${btnSecondary} px-3`}
                    disabled={selectedDate === todayKey}
                    onClick={() => setSelectedDate(todayKey)}
                  >
                    Ma
                  </button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1 text-xs font-medium text-[#c3cad5]">
                    Kategória szűrő
                    <select className={inputCls} value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                      <option value="all">Összes</option>
                      {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-[#c3cad5]">
                    Címke szűrő
                    <select className={inputCls} value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)}>
                      <option value="all">Összes</option>
                      {availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                  </label>
                </div>

                {filteredEvents.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#45536a] py-10 text-center text-sm text-[#8792a4]">
                    Nincsenek események erre a napra.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredEvents.map((event) => {
                      const canModify =
                        currentUser.role === "SUPER_ADMIN" || event.createdBy.id === currentUser.id;
                      const eventCategories = getEventCategories(event);

                      return (
                        <article
                          key={event.id}
                          className={`rounded-lg border-l-4 border border-[#45536a] bg-[#212836] p-3 ${editingEventId === event.id ? "ring-2 ring-[#c9a227]" : ""}`}
                          style={{ borderLeftColor: eventCategories[0].color }}
                        >
                          <div className="text-sm font-semibold text-[#e3bd45]">
                            {formatTime(event.startDateTime)} – {formatTime(event.endDateTime)}
                          </div>
                          <div className="mt-0.5 break-words text-lg font-bold">{event.title}</div>
                          {event.location && <div className="break-words text-sm text-[#c3cad5]">📍 {event.location}</div>}

                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {eventCategories.map((category) => (
                              <span
                                key={category.id}
                                className="rounded-full px-2.5 py-0.5 text-xs font-bold text-[#101722]"
                                style={{ backgroundColor: category.color }}
                              >
                                {category.name}
                              </span>
                            ))}
                            {(event.tags ?? []).map((tag) => (
                              <span key={tag} className="rounded-full border border-[#718099] px-2.5 py-0.5 text-xs text-[#dbe3ed]">
                                {tag}
                              </span>
                            ))}
                          </div>

                          <div className="mt-2 text-xs text-[#8792a4]">Készítette: {event.createdBy.name}</div>

                          {canModify && (
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                              <button type="button" className={btnSecondary} onClick={() => handleEditEvent(event)}>
                                Szerkesztés
                              </button>
                              <button type="button" className={btnDanger} onClick={() => void handleDeleteEvent(event.id)}>
                                Törlés
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Esemény űrlap */}
              <form id="event-form" className={`${panelCls} order-2 min-w-0 scroll-mt-20 lg:order-1`} onSubmit={handleEventSubmit}>
                <h4 className="mb-4 font-serif text-xl">{editingEventId ? "Esemény szerkesztése" : "Esemény létrehozása"}</h4>

                <div className="flex flex-col gap-4">
                  <label className={labelCls}>
                    <span>Cím</span>
                    <input
                      className={inputCls}
                      required
                      value={eventForm.title}
                      onChange={(event) => setEventForm((previous) => ({ ...previous, title: event.target.value }))}
                    />
                  </label>

                  <label className={labelCls}>
                    <span>Helyszín</span>
                    <input
                      className={inputCls}
                      value={eventForm.location}
                      onChange={(event) => setEventForm((previous) => ({ ...previous, location: event.target.value }))}
                    />
                  </label>

                  <fieldset className="flex flex-col gap-2">
                    <legend className="mb-1.5 text-sm font-medium text-[#c3cad5]">Kategóriák</legend>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((category) => {
                        const checked = eventForm.categoryIds.includes(category.id);

                        return (
                          <label
                            key={category.id}
                            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${checked ? "border-transparent text-[#101722]" : "border-[#45536a] bg-[#1b212b] text-[#f4f1e8] hover:bg-[#2b3445]"}`}
                            style={checked ? { backgroundColor: category.color } : undefined}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={checked}
                              onChange={(event) =>
                                setEventForm((previous) => ({
                                  ...previous,
                                  categoryIds: event.target.checked
                                    ? [...previous.categoryIds, category.id]
                                    : previous.categoryIds.filter((id) => id !== category.id),
                                }))
                              }
                            />
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/30"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <label className={labelCls}>
                    <span>Címkék (vesszővel elválasztva)</span>
                    <input
                      className={inputCls}
                      value={eventForm.tags}
                      onChange={(event) => setEventForm((previous) => ({ ...previous, tags: event.target.value }))}
                      placeholder="például: nyílt nap, előadás"
                    />
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-[#c3cad5]">
                      Dátum: <strong className="text-[#f4f1e8]">{formatDateLong(selectedDate)}</strong>
                    </span>
                    <div className="rounded-xl border border-[#45536a] bg-[#1b212b] p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <button type="button" className={btnIcon} aria-label="Előző hónap" onClick={() => shiftMonth(-1)}>
                          ←
                        </button>
                        <h2 className="m-0 text-center font-serif text-lg capitalize">{monthName}</h2>
                        <button type="button" className={btnIcon} aria-label="Következő hónap" onClick={() => shiftMonth(1)}>
                          →
                        </button>
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: 7 }, (_, index) => (
                          <div key={index} className="pb-1 text-center text-xs text-[#aeb7c6]">
                            {new Intl.DateTimeFormat("hu-HU", { weekday: "short" }).format(new Date(2025, 0, index + 6))}
                          </div>
                        ))}

                        {monthDays.map((dayKey) => {
                          const currentDate = new Date(`${dayKey}T12:00:00`);
                          const isCurrentMonth = currentDate.getMonth() === selectedMonth;
                          const isSelected = dayKey === selectedDate;
                          const isToday = dayKey === todayKey;

                          return (
                            <button
                              key={dayKey}
                              type="button"
                              aria-label={formatDateLong(dayKey)}
                              aria-pressed={isSelected}
                              className={`flex aspect-square min-h-10 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                                isSelected
                                  ? "border-[#c9a227] bg-[#c9a227] text-[#1b1305]"
                                  : isCurrentMonth
                                    ? "border-[#45536a] bg-[#212836] hover:bg-[#2b3445]"
                                    : "border-[#45536a]/40 bg-[#212836]/40 text-[#8792a4]"
                              } ${isToday && !isSelected ? "ring-2 ring-[#c9a227]/70" : ""}`}
                              onClick={() => setSelectedDate(dayKey)}
                            >
                              {currentDate.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className={labelCls}>
                      <span>Kezdés</span>
                      <input
                        className={inputCls}
                        type="time"
                        value={eventForm.startTime}
                        onChange={(event) => setEventForm((previous) => ({ ...previous, startTime: event.target.value }))}
                      />
                    </label>
                    <label className={labelCls}>
                      <span>Vég</span>
                      <input
                        className={inputCls}
                        type="time"
                        value={eventForm.endTime}
                        onChange={(event) => setEventForm((previous) => ({ ...previous, endTime: event.target.value }))}
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                  {editingEventId && (
                    <button
                      type="button"
                      className={`${btnSecondary} sm:flex-1`}
                      onClick={() => {
                        setEditingEventId(null);
                        setEventForm(defaultEventForm());
                      }}
                    >
                      Mégse
                    </button>
                  )}
                  <button type="submit" className={`${btnPrimary} sm:flex-1`}>
                    {editingEventId ? "Mentés" : "Létrehozás"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === "categories" && canManageCategories && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
              <div className="order-1 min-w-0 rounded-xl border border-[#45536a] bg-[#1b212b] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="m-0 font-serif text-xl">Kategóriák</h3>
                  <button
                    type="button"
                    className={`${btnPrimary} lg:hidden`}
                    onClick={() => {
                      setEditingCategoryId(null);
                      setCategoryForm(defaultCategoryForm);
                      scrollToForm("category-form");
                    }}
                  >
                    + Új kategória
                  </button>
                </div>

                {categories.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#45536a] py-10 text-center text-sm text-[#8792a4]">
                    Még nincs kategória.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {categories.map((category) => (
                      <div
                        key={category.id}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#45536a] bg-[#212836] p-3 ${editingCategoryId === category.id ? "ring-2 ring-[#c9a227]" : ""}`}
                      >
                        <div className="flex min-w-0 items-center gap-3 font-bold">
                          <span className="h-4 w-4 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: category.color }} />
                          <span className="break-words">{category.name}</span>
                        </div>

                        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                          <button type="button" className={btnSecondary} onClick={() => handleEditCategory(category)}>
                            Szerkesztés
                          </button>
                          <button type="button" className={btnDanger} onClick={() => void handleDeleteCategory(category)}>
                            Törlés
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form id="category-form" className={`${panelCls} order-2 min-w-0 scroll-mt-20`} onSubmit={handleCategorySubmit}>
                <h4 className="mb-4 font-serif text-xl">{editingCategoryId ? "Kategória szerkesztése" : "Kategória létrehozása"}</h4>

                <div className="flex flex-col gap-4">
                  <label className={labelCls}>
                    <span>Név</span>
                    <input
                      className={inputCls}
                      required
                      value={categoryForm.name}
                      onChange={(event) => setCategoryForm((previous) => ({ ...previous, name: event.target.value }))}
                    />
                  </label>

                  <label className={labelCls}>
                    <span>Színkód</span>
                    <input
                      className="h-12 w-full cursor-pointer rounded-lg border border-[#45536a] bg-[#212836] p-1"
                      type="color"
                      value={categoryForm.color}
                      onChange={(event) => setCategoryForm((previous) => ({ ...previous, color: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
                  {editingCategoryId && (
                    <button
                      type="button"
                      className={`${btnSecondary} sm:flex-1`}
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm(defaultCategoryForm);
                      }}
                    >
                      Mégse
                    </button>
                  )}
                  <button type="submit" className={`${btnPrimary} sm:flex-1`}>
                    {editingCategoryId ? "Mentés" : "Létrehozás"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === "users" && canManageUsers && (
            <form className={`${panelCls} mx-auto max-w-lg`} onSubmit={handleCreateAdmin}>
              <h4 className="mb-4 font-serif text-xl">Admin fiók létrehozása</h4>

              <div className="flex flex-col gap-4">
                <label className={labelCls}>
                  <span>Felhasználónév</span>
                  <input
                    className={inputCls}
                    required
                    autoComplete="off"
                    value={adminForm.username}
                    onChange={(event) => setAdminForm((previous) => ({ ...previous, username: event.target.value }))}
                  />
                </label>

                <label className={labelCls}>
                  <span>Név</span>
                  <input
                    className={inputCls}
                    required
                    value={adminForm.name}
                    onChange={(event) => setAdminForm((previous) => ({ ...previous, name: event.target.value }))}
                  />
                </label>

                <label className={labelCls}>
                  <span>Jelszó</span>
                  <input
                    className={inputCls}
                    type="password"
                    required
                    autoComplete="new-password"
                    value={adminForm.password}
                    onChange={(event) => setAdminForm((previous) => ({ ...previous, password: event.target.value }))}
                  />
                </label>
              </div>

              <button type="submit" className={`${btnPrimary} mt-6 w-full`}>
                Létrehozás
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [showLogin, setShowLogin] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(defaultEventForm());
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [adminForm, setAdminForm] = useState(defaultAdminForm);
  const [statusMessage, setStatusMessage] = useState<MessageState | null>(null);

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
  };

  const handleEditCategory = (category: CategoryItem) => {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name, color: category.color });
  };

  return (
    <main className="min-h-screen bg-[#24334a] p-4 text-[#f4f1e8] md:p-6 [&_input]:rounded-lg [&_input]:border [&_input]:border-[#45536a] [&_input]:bg-[#212836] [&_input]:px-3 [&_input]:py-2 [&_input]:text-[#f4f1e8] [&_input[type=checkbox]]:h-4 [&_input[type=checkbox]]:w-4 [&_input[type=checkbox]]:p-0 [&_input[type=checkbox]]:accent-[#c9a227] [&_select]:rounded-lg [&_select]:border [&_select]:border-[#45536a] [&_select]:bg-[#212836] [&_select]:px-3 [&_select]:py-2 [&_select]:text-[#f4f1e8]">
      <div className="mb-6 flex flex-col items-stretch justify-between gap-5 xl:flex-row xl:items-center">

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/" className="inline-flex items-center justify-center rounded-lg border border-[#45536a] bg-[#212836] px-4 py-2 font-bold text-[#f4f1e8] no-underline hover:opacity-90">
            Vissza a főoldalra
          </Link>

          {currentUser ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#45536a] bg-[#1b212b] px-3 py-2 text-[#c3cad5]">
              <span>
                {currentUser.name} ({currentUser.role})
              </span>
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

      {statusMessage && (
        <div
          role={statusMessage.type === "error" ? "alert" : "status"}
          aria-live={statusMessage.type === "error" ? "assertive" : "polite"}
          className={`fixed left-1/2 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-start justify-between gap-4 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${statusMessage.type === "success" ? "border-green-500/40 bg-[#1b212b]/95 text-green-100" : "border-red-400/40 bg-[#1b212b]/95 text-red-100"}`}
        >
          {statusMessage.text}
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
        <section className="rounded-2xl border border-[#45536a] bg-[#1b212b]/90 p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between gap-5">
            <h2 className="m-0 font-serif text-2xl md:text-3xl">Bejelentkezés</h2>
          </div>

          <form onSubmit={handleLogin} className="flex max-w-xl flex-col gap-4 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:text-[#c3cad5]">
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

            <div className="mt-3 flex flex-wrap gap-3">
              <button type="submit" className="rounded-lg bg-[#c9a227] px-4 py-2 font-bold text-[#1b1305] hover:opacity-90">
                Belépés
              </button>
            </div>
          </form>
        </section>
      )}

      {currentUser && (
        <>
          <section className="rounded-2xl border border-[#45536a] bg-[#1b212b]/90 p-5 md:p-6">
            <div className="mb-5 flex items-center justify-between gap-5">
              <h2 className="m-0 font-serif text-2xl md:text-3xl">Események kezelése</h2>
            </div>

            <div className="mb-5 flex flex-wrap gap-4 text-sm text-[#c3cad5]">
              <label className="flex items-center gap-3 rounded-lg border border-[#45536a] bg-[#212836] px-3 py-2">
                <span>Kategória szűrő</span>
                <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                  <option value="all">Összes</option>
                  {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-[#45536a] bg-[#212836] px-3 py-2">
                <span>Címke szűrő</span>
                <select value={selectedTag} onChange={(event) => setSelectedTag(event.target.value)}>
                  <option value="all">Összes</option>
                  {availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.4fr)]">
              <form className="my-2 rounded-xl border border-[#45536a] bg-[#212836] p-5 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:text-[#c3cad5]" onSubmit={handleEventSubmit}>
                <h4 className="mb-4 font-serif text-xl">{editingEventId ? "Esemény szerkesztése" : "Esemény létrehozása"}</h4>

                <div className="mb-4 flex flex-col gap-2">
                  <label>
                    <span>Cím</span>
                    <input
                      value={eventForm.title}
                      onChange={(event) =>
                        setEventForm((previous) => ({ ...previous, title: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="mb-4 flex flex-col gap-2">
                  <label>
                    <span>Helyszín</span>
                    <input
                      value={eventForm.location}
                      onChange={(event) =>
                        setEventForm((previous) => ({ ...previous, location: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="mb-4 flex flex-col gap-2">
                  <span>Kategóriák</span>
                  <div className="flex flex-wrap gap-3">
                    {categories.map((category) => (
                      <label key={category.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={eventForm.categoryIds.includes(category.id)}
                          onChange={(event) => setEventForm((previous) => ({
                            ...previous,
                            categoryIds: event.target.checked
                              ? [...previous.categoryIds, category.id]
                              : previous.categoryIds.filter((id) => id !== category.id),
                          }))}
                        />
                        <span>{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-4 flex flex-col gap-2">
                  <label>
                    <span>Címkék (vesszővel elválasztva)</span>
                    <input
                      value={eventForm.tags}
                      onChange={(event) => setEventForm((previous) => ({ ...previous, tags: event.target.value }))}
                      placeholder="például: nyílt nap, előadás"
                    />
                  </label>
                </div>

                <div className="mb-4 flex flex-col gap-2">
                  <span>Dátum</span>
                  <div className="rounded-xl border border-[#45536a] bg-[#1b212b] p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <button
                        type="button"
                        className="h-10 w-10 rounded-lg border border-[#45536a] bg-[#212836] text-xl"
                        onClick={() => {
                          const next = new Date(`${selectedDate}T12:00:00`);
                          next.setMonth(next.getMonth() - 1);
                          setSelectedDate(toInputDate(next));
                        }}
                      >
                        ←
                      </button>
                      <h2 className="m-0 font-serif text-lg">{monthName}</h2>
                      <button
                        type="button"
                        className="h-10 w-10 rounded-lg border border-[#45536a] bg-[#212836] text-xl"
                        onClick={() => {
                          const next = new Date(`${selectedDate}T12:00:00`);
                          next.setMonth(next.getMonth() + 1);
                          setSelectedDate(toInputDate(next));
                        }}
                      >
                        →
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: 7 }, (_, index) => (
                        <div key={index} className="pb-1 text-center text-xs text-[#aeb7c6]">
                          {new Intl.DateTimeFormat("hu-HU", { weekday: "short" }).format(
                            new Date(2025, 0, index + 1),
                          )}
                        </div>
                      ))}

                      {monthDays.map((dayKey) => {
                        const currentDate = new Date(`${dayKey}T12:00:00`);
                        const isCurrentMonth =
                          currentDate.getMonth() === new Date(`${selectedDate}T12:00:00`).getMonth();
                        const isSelected = dayKey === selectedDate;

                        return (
                          <button
                            key={dayKey}
                            type="button"
                            className={`min-h-10 rounded-lg border p-2 text-left ${isCurrentMonth ? "border-[#45536a] bg-[#212836]" : "border-[#45536a]/50 bg-[#212836]/50 text-[#8792a4]"} ${isSelected ? "ring-2 ring-[#c9a227]" : ""}`}
                            onClick={() => setSelectedDate(dayKey)}
                          >
                            <span className="font-semibold">{currentDate.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label>
                    <span>Kezdés</span>
                    <input
                      type="time"
                      value={eventForm.startTime}
                      onChange={(event) =>
                        setEventForm((previous) => ({ ...previous, startTime: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Vég</span>
                    <input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(event) =>
                        setEventForm((previous) => ({ ...previous, endTime: event.target.value }))
                      }
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  <button type="submit" className="rounded-lg bg-[#c9a227] px-4 py-2 font-bold text-[#1b1305] hover:opacity-90">
                    {editingEventId ? "Mentés" : "Létrehozás"}
                  </button>
                  {editingEventId && (
                    <button
                      type="button"
                      className="rounded-lg border border-[#45536a] bg-[#1b212b] px-4 py-2 font-semibold text-[#f4f1e8] hover:opacity-90"
                      onClick={() => {
                        setEditingEventId(null);
                        setEventForm(defaultEventForm());
                      }}
                    >
                      Mégse
                    </button>
                  )}
                </div>
              </form>

              <section className="mt-2 rounded-xl border border-[#45536a] bg-[#1b212b] p-4">
            <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#45536a] pb-4">
              <h3 className="m-0 font-serif text-xl">Események listája</h3>
              <span className="text-sm text-[#c3cad5]">{formatDateLong(selectedDate)}</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="min-h-52 rounded-xl border border-[#45536a] bg-[#212836] p-4">
                {filteredEvents.length === 0 ? (
                  <p className="pt-6 text-center text-sm text-[#8792a4]">Nincsenek események erre a napra.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {filteredEvents.map((event) => {
                      const canEdit =
                        currentUser.role === "SUPER_ADMIN" || event.createdBy.id === currentUser.id;
                      const canDelete =
                        currentUser.role === "SUPER_ADMIN" || event.createdBy.id === currentUser.id;

                      return (
                        <div key={event.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#45536a] bg-[#1b212b] p-3">
                          <div className="min-w-0">
                            <div className="mb-1 flex flex-wrap items-center gap-2 font-bold">
                              {event.title} <span>({(event.categories?.length ? event.categories : [event.category]).map((category) => category.name).join(", ")})</span>
                            </div>
                            <div className="text-sm text-[#c3cad5]">
                              {formatDateLong(event.startDateTime.slice(0, 10))} • {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)} • {event.location}
                            </div>
                            <div className="text-sm text-[#c3cad5]">
                              Készítette: {event.createdBy.name} ({event.createdBy.role})
                            </div>
                            {!!event.tags?.length && <div className="mt-2 flex flex-wrap gap-1">{event.tags.map((tag) => <span key={tag} className="rounded-full border px-2 py-0.5 text-xs">{tag}</span>)}</div>}
                          </div>

                          <div className="flex flex-wrap justify-end gap-2">
                            {canEdit && (
                              <button
                                type="button"
                                className="rounded-lg border border-[#45536a] bg-[#212836] px-3 py-2 text-sm font-semibold hover:opacity-90"
                                onClick={() => handleEditEvent(event)}
                              >
                                Szerkesztés
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 hover:opacity-90"
                                onClick={() => void handleDeleteEvent(event.id)}
                              >
                                Törlés
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {canManageCategories && (
                <div className="min-h-52 rounded-xl border border-[#45536a] bg-[#212836] p-4">
                  <h4 className="mb-4 font-serif text-lg">Kategóriák</h4>

                  <div className="flex flex-col gap-3">
                    {categories.map((category) => (
                      <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#45536a] bg-[#1b212b] p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 font-bold">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                            {category.name}
                          </div>
                        </div>

                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-[#45536a] bg-[#212836] px-3 py-2 text-sm font-semibold hover:opacity-90"
                            onClick={() => handleEditCategory(category)}
                          >
                            Szerkesztés
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-100 hover:opacity-90"
                            onClick={() => void handleDeleteCategory(category.id)}
                          >
                            Törlés
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

              {canManageCategories && (
                <form className="my-2 rounded-xl border border-[#45536a] bg-[#212836] p-5 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:text-[#c3cad5]" onSubmit={handleCategorySubmit}>
                  <h4 className="mb-4 font-serif text-xl">{editingCategoryId ? "Kategória szerkesztése" : "Kategória létrehozása"}</h4>

                  <div className="mb-4 flex flex-col gap-2">
                    <label>
                      <span>Név</span>
                      <input
                        value={categoryForm.name}
                        onChange={(event) =>
                          setCategoryForm((previous) => ({ ...previous, name: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mb-4 flex flex-col gap-2">
                    <label>
                      <span>Színkód</span>
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(event) =>
                          setCategoryForm((previous) => ({ ...previous, color: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="submit" className="rounded-lg bg-[#c9a227] px-4 py-2 font-bold text-[#1b1305] hover:opacity-90">
                      {editingCategoryId ? "Mentés" : "Létrehozás"}
                    </button>
                    {editingCategoryId && (
                      <button
                        type="button"
                        className="rounded-lg border border-[#45536a] bg-[#1b212b] px-4 py-2 font-semibold text-[#f4f1e8] hover:opacity-90"
                        onClick={() => {
                          setEditingCategoryId(null);
                          setCategoryForm(defaultCategoryForm);
                        }}
                      >
                        Mégse
                      </button>
                    )}
                  </div>
                </form>
              )}

              {canManageUsers && (
                <form className="my-2 rounded-xl border border-[#45536a] bg-[#212836] p-5 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-sm [&_label]:text-[#c3cad5]" onSubmit={handleCreateAdmin}>
                  <h4 className="mb-4 font-serif text-xl">Admin fiók létrehozása</h4>

                  <div className="mb-4 flex flex-col gap-2">
                    <label>
                      <span>Felhasználónév</span>
                      <input
                        value={adminForm.username}
                        onChange={(event) =>
                          setAdminForm((previous) => ({ ...previous, username: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mb-4 flex flex-col gap-2">
                    <label>
                      <span>Név</span>
                      <input
                        value={adminForm.name}
                        onChange={(event) =>
                          setAdminForm((previous) => ({ ...previous, name: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mb-4 flex flex-col gap-2">
                    <label>
                      <span>Jelszó</span>
                      <input
                        type="password"
                        value={adminForm.password}
                        onChange={(event) =>
                          setAdminForm((previous) => ({ ...previous, password: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="submit" className="rounded-lg bg-[#c9a227] px-4 py-2 font-bold text-[#1b1305] hover:opacity-90">
                      Létrehozás
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>

        </>
      )}
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

type CategoryItem = {
  id: number;
  name: string;
  color: string;
};

type EventItem = {
  id: number;
  title: string;
  location: string;
  startDateTime: string;
  endDateTime: string;
  category: CategoryItem;
  createdBy: {
    id: number;
    role: string;
    name: string;
    username: string;
  };
};

type SessionUser = {
  id: number;
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
  const [view, setView] = useState<"display" | "week">("display");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTopBar, setShowTopBar] = useState(() => {
    if (typeof window === "undefined") return true;

    // 1200px szélesség felett alapból rejtve
    return window.innerWidth <= 1200;
  });
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState(defaultEventForm);
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [adminForm, setAdminForm] = useState(defaultAdminForm);
  const [statusMessage, setStatusMessage] = useState<MessageState | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "q") {
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

  const weekDays = useMemo(() => {
    const start = getStartOfWeek(selectedDate);

    return Array.from({ length: 7 }, (_, index) => {
      const cell = new Date(start);
      cell.setDate(start.getDate() + index);
      return toInputDate(cell);
    });
  }, [selectedDate]);

  const eventMap = useMemo(() => {
    const map = new Map<string, EventItem[]>();

    for (const event of events) {
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
  }, [events]);

  const displayPages = useMemo(() => chunkArray(events, ITEMS_PER_PAGE), [events]);
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

  const handleDeleteCategory = async (categoryId: number) => {
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
    <main className="calendar-shell">
      {showTopBar && (
        <div className="top-bar">
          <div className="toolbar">
            <label className="filter-control">
              <span>Kategória</span>
              <select
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

          <div className="view-switcher" aria-label="Nézetváltás">
            <button
              type="button"
              className={view === "display" ? "active" : ""}
              onClick={() => setView("display")}
            >
              Napi kijelző
            </button>
            <button
              type="button"
              className={view === "week" ? "active" : ""}
              onClick={() => setView("week")}
            >
              Heti
            </button>
          </div>

            {currentUser ? (
              <div className="user-box">
                <span>
                  {currentUser.name} ({currentUser.role})
                </span>
                <a href="/admin" className="secondary-button">
                  Admin oldal
                </a>
                <button type="button" className="primary-button" onClick={handleLogout}>
                  Kijelentkezés
                </button>
              </div>
            ) : (
              <button type="button" className="primary-button" onClick={() => setShowLogin(true)}>
                Bejelentkezés
              </button>
            )}
          </div>
        </div>
      )}
      {statusMessage && (
        <div className={`status-banner ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      {view === "display" && (
        <section className="display-screen">
          <header className="display-header">
            <img src="https://www.ojim.fr/wp-content/uploads/2024/11/mcc-budapest.jpg" alt="Logo" className="block logo h-[100px] bg-[url('/path')] bg-no-repeat overflow-hidden whitespace-nowrap" />
            <div className="datetime">
              <div className="current-date">{formatDateLong(selectedDate)}</div>
              <div className="current-time">
                {currentTime.toLocaleTimeString("hu-HU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            </div>
          </header>

          <div className="events-main">
            {currentDisplayPage.length === 0 ? (
              <div className="empty-state">Nincs aktív esemény ehhez a naphoz.</div>
            ) : (
              <div className="events-grid">
                {currentDisplayPage.map((event) => (
                  <article
                    key={event.id}
                    className="event-card"
                    style={{ borderLeftColor: event.category.color }}
                  >
                    <div className="event-time">
                      {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)}
                    </div>
                    <div className="event-title">{event.title}</div>
                    <div className="event-location">{event.location}</div>
                  </article>
                ))}
              </div>
            )}
          </div>

          {displayPages.length > 1 && (
            <div className="pagination-dots" aria-label="Lapszám">
              {displayPages.map((_, index) => (
                <span
                  key={index}
                  className={`dot ${currentPage === index ? "active" : ""}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {view === "week" && (
        <section className="content-panel">
          <div className="panel-header">
            <button
              type="button"
              className="nav-button"
              onClick={() => {
                const next = new Date(`${selectedDate}T12:00:00`);
                next.setDate(next.getDate() - 7);
                setSelectedDate(toInputDate(next));
              }}
            >
              ←
            </button>
            <h2>Heti nézet</h2>
            <button
              type="button"
              className="nav-button"
              onClick={() => {
                const next = new Date(`${selectedDate}T12:00:00`);
                next.setDate(next.getDate() + 7);
                setSelectedDate(toInputDate(next));
              }}
            >
              →
            </button>
          </div>

          <div className="week-grid">
            {weekDays.map((dayKey) => (
              <div key={dayKey} className="week-day-card">
                <div className="day-header">
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

                <div className="day-events">
                  {(eventMap.get(dayKey) ?? []).length === 0 ? (
                    <div className="empty-hint">Nincs esemény</div>
                  ) : (
                    (eventMap.get(dayKey) ?? []).map((event) => (
                      <div
                        key={event.id}
                        className="mini-event"
                        style={{
                          borderLeftColor: event.category.color,
                          backgroundColor: `${event.category.color}22`,
                        }}
                      >
                        <div className="mini-time">
                          {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)}
                        </div>
                        <div className="mini-title">{event.title}</div>
                        <div className="mini-location">{event.location}</div>
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
        <div className="modal-overlay" onClick={() => setShowLogin(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Bejelentkezés</h3>
            <form onSubmit={handleLogin} className="login-form">
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

              <div className="form-actions">
                <button type="submit" className="primary-button">
                  Belépés
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowLogin(false)}
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </main>
  );
}

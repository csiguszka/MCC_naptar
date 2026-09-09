"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

type EventFormState = {
  title: string;
  location: string;
  category: string;
  startTime: string;
  endTime: string;
};

const defaultEventForm = (): EventFormState => ({
  title: "",
  location: "",
  category: "",
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
  const [showLogin, setShowLogin] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>(defaultEventForm());
  const [categoryForm, setCategoryForm] = useState(defaultCategoryForm);
  const [loginForm, setLoginForm] = useState(defaultLoginForm);
  const [adminForm, setAdminForm] = useState(defaultAdminForm);
  const [statusMessage, setStatusMessage] = useState<MessageState | null>(null);

  const canManageCategories = currentUser?.role === "SUPER_ADMIN";
  const canManageUsers = currentUser?.role === "SUPER_ADMIN";

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

  useEffect(() => {
    if (currentUser) {
      void loadEvents();
    }
  }, [currentUser, selectedCategory, selectedDate]);

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

  const loadEvents = async () => {
    const params = new URLSearchParams({
      category: selectedCategory,
      view: "display",
      date: selectedDate,
    });

    const response = await fetch(`/api/events?${params.toString()}`, {
      cache: "no-store",
    });
    const loadedEvents = (await response.json()) as EventItem[];
    setEvents(Array.isArray(loadedEvents) ? loadedEvents : []);
  };

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
          category: eventForm.category,
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
      category: eventItem.category.name,
      startTime: start.time,
      endTime: end.time,
    });
  };

  const handleEditCategory = (category: CategoryItem) => {
    setEditingCategoryId(category.id);
    setCategoryForm({ name: category.name, color: category.color });
  };

  return (
    <main className="calendar-shell">
      <div className="top-bar">

        <div className="toolbar">
          <Link href="/" className="secondary-button">
            Vissza a főoldalra
          </Link>

          {currentUser ? (
            <div className="user-box">
              <span>
                {currentUser.name} ({currentUser.role})
              </span>
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

      {statusMessage && (
        <div className={`status-banner ${statusMessage.type}`}>{statusMessage.text}</div>
      )}

      {!currentUser && showLogin && (
        <section className="content-panel">
          <div className="panel-header">
            <h2>Bejelentkezés</h2>
          </div>

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
            </div>
          </form>
        </section>
      )}

      {currentUser && (
        <>
          <section className="content-panel">
            <div className="panel-header">
              <h2>Események kezelése</h2>
            </div>

            <div className="admin-grid">
              <form className="admin-card" onSubmit={handleEventSubmit}>
                <h4>{editingEventId ? "Esemény szerkesztése" : "Esemény létrehozása"}</h4>

                <div className="form-row">
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

                <div className="form-row">
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

                <div className="form-row double">
                  <label>
                    <span>Kategória</span>
                    <select
                      value={eventForm.category}
                      onChange={(event) =>
                        setEventForm((previous) => ({ ...previous, category: event.target.value }))
                      }
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="form-row">
                  <span>Dátum</span>
                  <div className="content-panel">
                    <div className="panel-header">
                      <button
                        type="button"
                        className="nav-button"
                        onClick={() => {
                          const next = new Date(`${selectedDate}T12:00:00`);
                          next.setMonth(next.getMonth() - 1);
                          setSelectedDate(toInputDate(next));
                        }}
                      >
                        ←
                      </button>
                      <h2>{monthName}</h2>
                      <button
                        type="button"
                        className="nav-button"
                        onClick={() => {
                          const next = new Date(`${selectedDate}T12:00:00`);
                          next.setMonth(next.getMonth() + 1);
                          setSelectedDate(toInputDate(next));
                        }}
                      >
                        →
                      </button>
                    </div>

                    <div className="calendar-grid-month">
                      {Array.from({ length: 7 }, (_, index) => (
                        <div key={index} className="weekday-header">
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
                            className={`month-day ${isCurrentMonth ? "in-month" : "outside"} ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedDate(dayKey)}
                          >
                            <span className="month-day-number">{currentDate.getDate()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="form-row double">
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

                <div className="form-actions">
                  <button type="submit" className="primary-button">
                    {editingEventId ? "Mentés" : "Létrehozás"}
                  </button>
                  {editingEventId && (
                    <button
                      type="button"
                      className="secondary-button"
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

              <section className="admin-panel">
            <div className="admin-header">
              <h3>Események listája</h3>
              <span>{formatDateLong(selectedDate)}</span>
            </div>

            <div className="admin-lists">
              <div className="admin-card list-card">
                {events.length === 0 ? (
                  <p className="empty-hint">Nincsenek események erre a napra.</p>
                ) : (
                  <div className="list-items">
                    {events.map((event) => {
                      const canEdit =
                        currentUser.role === "SUPER_ADMIN" || event.createdBy.id === currentUser.id;
                      const canDelete =
                        currentUser.role === "SUPER_ADMIN" || event.createdBy.id === currentUser.id;

                      return (
                        <div key={event.id} className="list-item">
                          <div className="list-item-main">
                            <div className="list-item-title">
                              {event.title} <span>({event.category.name})</span>
                            </div>
                            <div className="list-item-meta">
                              {formatDateLong(event.startDateTime.slice(0, 10))} • {formatTime(event.startDateTime)} - {formatTime(event.endDateTime)} • {event.location}
                            </div>
                            <div className="list-item-meta">
                              Készítette: {event.createdBy.name} ({event.createdBy.role})
                            </div>
                          </div>

                          <div className="list-item-actions">
                            {canEdit && (
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleEditEvent(event)}
                              >
                                Szerkesztés
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="danger-button"
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
                <div className="admin-card list-card">
                  <h4>Kategóriák</h4>

                  <div className="list-items">
                    {categories.map((category) => (
                      <div key={category.id} className="list-item">
                        <div className="list-item-main">
                          <div className="list-item-title">
                            <span className="category-dot" style={{ backgroundColor: category.color }} />
                            {category.name}
                          </div>
                        </div>

                        <div className="list-item-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleEditCategory(category)}
                          >
                            Szerkesztés
                          </button>
                          <button
                            type="button"
                            className="danger-button"
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
                <form className="admin-card" onSubmit={handleCategorySubmit}>
                  <h4>{editingCategoryId ? "Kategória szerkesztése" : "Kategória létrehozása"}</h4>

                  <div className="form-row">
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

                  <div className="form-row">
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

                  <div className="form-actions">
                    <button type="submit" className="primary-button">
                      {editingCategoryId ? "Mentés" : "Létrehozás"}
                    </button>
                    {editingCategoryId && (
                      <button
                        type="button"
                        className="secondary-button"
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
                <form className="admin-card" onSubmit={handleCreateAdmin}>
                  <h4>Admin fiók létrehozása</h4>

                  <div className="form-row">
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

                  <div className="form-row">
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

                  <div className="form-row">
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

                  <div className="form-actions">
                    <button type="submit" className="primary-button">
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

import { randomBytes, createHash } from "node:crypto";

export type UserRole = "SUPER_ADMIN" | "ADMIN";

export type SessionUser = {
  id: number;
  username: string;
  name: string;
  role: UserRole;
};

const SESSION_COOKIE = "session";

export function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export function createSessionToken(user: SessionUser) {
  return Buffer.from(JSON.stringify(user)).toString("base64url");
}

export function parseSessionToken(token: string | null) {
  if (!token) {
    return null;
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    return JSON.parse(decoded) as SessionUser;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());

  const sessionCookie = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));

  if (!sessionCookie) {
    return null;
  }

  const token = sessionCookie.slice(SESSION_COOKIE.length + 1);
  return parseSessionToken(token);
}

export function setSessionCookie(response: Response, user: SessionUser) {
  const token = createSessionToken(user);
  const cookieValue = `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 12}`;

  response.headers.set("Set-Cookie", cookieValue);
  return response;
}

export function clearSessionCookie(response: Response) {
  response.headers.set(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return response;
}

export function generateRandomPassword() {
  return randomBytes(6).toString("hex");
}

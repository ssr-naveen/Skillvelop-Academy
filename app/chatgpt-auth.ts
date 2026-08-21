import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { database } from "@/db/lms";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

type SessionPayload = { sub: string; exp: number };
type LoginUser = { id: string; email: string; name: string; password_hash: string; status: string };

export const SESSION_COOKIE = "skillvelop_session";

function sessionSecret() {
  const secret = process.env.SESSION_SECRET || process.env.APP_KEY;
  if (!secret) throw new Error("Skillvelop session security is not configured.");
  return secret;
}

function sign(encoded: string) {
  return createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
}

export function createSessionToken(userId: string) {
  const payload: SessionPayload = { sub: userId, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function readSessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = Buffer.from(sign(encoded));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    return payload.sub && payload.exp > Date.now() / 1000 ? payload : null;
  } catch { return null; }
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, expected] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const target = Buffer.from(expected, "base64url");
  return actual.length === target.length && timingSafeEqual(actual, target);
}

export async function authenticateCredentials(identifier: string, password: string): Promise<LoginUser | null> {
  const user = await database().prepare(
    "SELECT id,email,name,password_hash,status FROM users WHERE lower(username)=lower(?) OR lower(email)=lower(?) LIMIT 1",
  ).bind(identifier, identifier).first<LoginUser>();
  if (!user || user.status === "suspended" || !verifyPassword(password, user.password_hash || "")) return null;
  return user;
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = readSessionToken(token);
  if (!session) return null;
  const user = await database().prepare("SELECT id,email,name,status FROM users WHERE id=? LIMIT 1").bind(session.sub).first<{id:string;email:string;name:string;status:string}>();
  if (!user || user.status === "suspended") return null;
  return { userId: user.id, displayName: user.name, email: user.email, fullName: user.name };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return `/api/auth/logout?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local" || url.pathname.startsWith("/api/auth")) return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/dashboard"; }
}

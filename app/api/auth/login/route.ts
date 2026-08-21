import { NextResponse } from "next/server";
import { authenticateCredentials, createSessionToken, safeRelativeReturnPath, SESSION_COOKIE } from "@/app/chatgpt-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const identifier = String(form.get("identifier") || "").trim().slice(0,160);
  const password = String(form.get("password") || "");
  const returnTo = safeRelativeReturnPath(String(form.get("returnTo") || "/dashboard"));
  const user = identifier && password ? await authenticateCredentials(identifier, password) : null;
  if (!user) return NextResponse.redirect(new URL(`/login?error=credentials&returnTo=${encodeURIComponent(returnTo)}`, request.url), 303);
  const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
  response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

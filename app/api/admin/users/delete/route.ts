import { getChatGPTUser } from "@/app/chatgpt-auth";
import { canManage, database, ensureProfile } from "@/db/lms";
import { NextResponse } from "next/server";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const profile = await ensureProfile(identity);
  if (profile.status !== "active") return NextResponse.json({ error: "Account unavailable" }, { status: 403 });
  if (!(await canManage(profile, "manage_users"))) return NextResponse.json({ error: "User management access required" }, { status: 403 });

  const form = await request.formData();
  const userId = String(form.get("userId") ?? "").trim();
  if (!userId) return redirectTo(request, "/dashboard/admin/users?error=delete-user");

  if (userId === profile.id) {
    return redirectTo(request, "/dashboard/admin/users?error=self-delete");
  }

  const db = database();
  const target = await db.prepare("SELECT id, role FROM users WHERE id=? AND status!='deleted'").bind(userId).first<{ id: string; role: string }>();
  if (!target) return redirectTo(request, "/dashboard/admin/users?error=user-not-found");

  if (target.role === "admin" && profile.role !== "admin") {
    return NextResponse.json({ error: "Only a full administrator can delete another administrator" }, { status: 403 });
  }

  await db.batch([
    db.prepare("DELETE FROM manager_permissions WHERE manager_id=?").bind(userId),
    db.prepare("UPDATE users SET status='deleted' WHERE id=?").bind(userId),
  ]);

  return redirectTo(request, "/dashboard/admin/users?deleted=user");
}

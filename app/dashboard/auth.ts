import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { ensureProfile, managerPermissions, type ManagerPermission, type UserProfile, type UserRole } from "@/db/lms";
import { redirect } from "next/navigation";

export async function requireProfile(returnTo: string): Promise<UserProfile> {
  const user = await requireChatGPTUser(returnTo);
  const profile = await ensureProfile(user);
  if (profile.status === "suspended") redirect("/?account=suspended");
  if (profile.role === "manager") profile.permissions = await managerPermissions(profile.id);
  return profile;
}

export async function requireAdminPermission(permission: ManagerPermission, returnTo: string): Promise<UserProfile> {
  const profile = await requireProfile(returnTo);
  if (profile.role === "admin") return profile;
  if (profile.role === "manager" && profile.permissions?.includes(permission)) return profile;
  redirect("/dashboard?denied=1");
}

export async function requireRole(role: UserRole, returnTo: string): Promise<UserProfile> {
  const profile = await requireProfile(returnTo);
  if (profile.role !== role && profile.role !== "admin") redirect("/dashboard?denied=1");
  return profile;
}

import { redirect } from "next/navigation";
import { requireProfile } from "./auth";

export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const profile = await requireProfile("/dashboard");
  if (profile.role === "manager") {
    const destinations = [
      ["view_dashboard", "/dashboard/admin"], ["manage_users", "/dashboard/admin/users"],
      ["manage_students", "/dashboard/admin/students"], ["manage_courses", "/dashboard/admin/courses"],
      ["manage_classes", "/dashboard/admin/classes"],
    ] as const;
    const destination = destinations.find(([permission]) => profile.permissions?.includes(permission))?.[1];
    redirect(destination ?? "/login?access=pending");
  }
  redirect(`/dashboard/${profile.role}`);
}

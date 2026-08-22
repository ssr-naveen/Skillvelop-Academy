import { Trash2 } from "lucide-react";
import { all } from "@/db/lms";
import { LmsShell, Notice, Status, initials } from "../../components";
import { requireAdminPermission } from "../../auth";

type Row = { id:string; name:string; email:string; role:string; status:string; permissions:string|null };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const profile = await requireAdminPermission("manage_users", "/dashboard/admin/users");
  const users = await all<Row>(`SELECT u.id,u.name,u.email,u.role,u.status,GROUP_CONCAT(mp.permission, ', ') permissions FROM users u LEFT JOIN manager_permissions mp ON mp.manager_id=u.id WHERE u.status!='deleted' GROUP BY u.id ORDER BY CASE u.role WHEN 'admin' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END,u.created_at DESC`);
  return <LmsShell profile={profile} activeRole="admin" activePath="/dashboard/admin/users" eyebrow="People & access" title="Users & managers" subtitle="Create users and delegate selected administration duties without giving full owner access." actions={<a className="module-link" href="/dashboard/admin/users/new">+ Create user</a>}>
    <Notice params={await searchParams}/>
    <section className="panel"><div className="list-toolbar"><p>{users.length} people in Skillvelop</p><Status>{users.filter(u=>u.role==='manager').length} managers</Status></div><div className="data-table"><div className="table-row table-head user-management-row"><span>User</span><span>Role</span><span>Status</span><span>Access</span><span>Actions</span></div>{users.map(u=><div className="table-row user-management-row" key={u.id}><span className="person-cell"><i>{initials(u.name)}</i><b>{u.name}<small>{u.email}</small></b></span><span className="role-label">{u.role}</span><span><Status tone={u.status==='active'?'green':'amber'}>{u.status}</Status></span><span className="muted">{u.role==='manager'?(u.permissions?.replaceAll('_',' ')||'No permissions'):'Role defaults'}</span><span className="user-row-actions">{u.id===profile.id?<small className="muted">Current account</small>:<form action="/api/admin/users/delete" method="post"><input type="hidden" name="userId" value={u.id}/><button className="delete-user-button" type="submit" title={`Delete ${u.name}`} aria-label={`Delete ${u.name}`}><Trash2 size={16} strokeWidth={1.9}/><span>Delete</span></button></form>}</span></div>)}</div></section>
  </LmsShell>;
}

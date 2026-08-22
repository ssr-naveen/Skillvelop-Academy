"use client";

import { Trash2 } from "lucide-react";

export default function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  return (
    <form
      action="/api/admin/users/delete"
      method="post"
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${userName}? This will disable their account and remove them from the active user list.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button className="delete-user-button" type="submit" title={`Delete ${userName}`} aria-label={`Delete ${userName}`}>
        <Trash2 size={16} strokeWidth={1.9} />
        <span>Delete</span>
      </button>
    </form>
  );
}

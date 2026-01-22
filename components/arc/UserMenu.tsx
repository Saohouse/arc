"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
};

type UserMenuProps = {
  user: User;
};

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
      editor: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
      viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
    return badges[role as keyof typeof badges] || badges.viewer;
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background font-semibold">
            {user.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        </div>
        <div className="mt-2">
          <span
            className={`inline-block rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${getRoleBadge(
              user.role
            )}`}
          >
            {user.role}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {user.role === "admin" && (
          <Link
            href="/admin/users"
            className="block rounded px-3 py-2 text-xs hover:bg-muted transition-colors"
          >
            👥 Manage Users
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="w-full rounded px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          🚪 Log out
        </button>
      </div>
    </div>
  );
}

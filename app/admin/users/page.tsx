import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { RoleSelector } from "@/components/arc/RoleSelector";
import { DeleteUserButton } from "@/components/arc/DeleteUserButton";

export default async function UsersPage() {
  // Require admin role
  const currentUser = await requireRole("admin");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { sessions: true },
      },
    },
  });

  const stats = {
    total: users.length,
    admins: users.filter((u: { role: string }) => u.role === "admin").length,
    editors: users.filter((u: { role: string }) => u.role === "editor").length,
    viewers: users.filter((u: { role: string }) => u.role === "viewer").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">👥 User Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage user accounts and permissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total Users</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">{stats.admins}</div>
          <div className="text-xs text-muted-foreground">Admins</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">{stats.editors}</div>
          <div className="text-xs text-muted-foreground">Editors</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-2xl font-bold">{stats.viewers}</div>
          <div className="text-xs text-muted-foreground">Viewers</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Active Sessions
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleSelector
                      userId={user.id}
                      currentRole={user.role}
                      disabled={user.id === currentUser.id}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {user._count.sessions}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {user.createdAt.toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.id !== currentUser.id && (
                      <DeleteUserButton userId={user.id} userName={user.name} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-400">
          About User Roles
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-blue-800 dark:text-blue-300">
          <li>
            <strong>Viewer:</strong> Can view all content but cannot make changes
          </li>
          <li>
            <strong>Editor:</strong> Can create and edit content (characters,
            worlds, locations, etc.)
          </li>
          <li>
            <strong>Admin:</strong> Full access including user management and
            system settings
          </li>
        </ul>
      </div>
    </div>
  );
}

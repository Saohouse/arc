import { getCurrentUser } from "@/lib/auth";

type RoleGateProps = {
  children: React.ReactNode;
  allowedRoles: ("viewer" | "editor" | "admin")[];
  fallback?: React.ReactNode;
};

export async function RoleGate({ children, allowedRoles, fallback }: RoleGateProps) {
  const user = await getCurrentUser();

  if (!user) {
    return fallback || null;
  }

  const roleHierarchy = { viewer: 0, editor: 1, admin: 2 };
  const userRole = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
  const minRequiredRole = Math.min(
    ...allowedRoles.map((role) => roleHierarchy[role])
  );

  if (userRole < minRequiredRole) {
    return fallback || null;
  }

  return <>{children}</>;
}

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

type RoleGateProps = {
  children: React.ReactNode;
  allowedRoles: ("viewer" | "editor" | "admin" | "owner")[];
  fallback?: React.ReactNode;
};

export async function RoleGate({ children, allowedRoles, fallback }: RoleGateProps) {
  const user = await getCurrentUser();

  if (!user) {
    return fallback || null;
  }

  // Get current story from cookie
  const cookieStore = await cookies();
  const storyId = cookieStore.get("currentStoryId")?.value;
  
  if (!storyId) {
    return fallback || null;
  }
  
  // Get user's role in this specific story
  const membership = await prisma.storyMember.findUnique({
    where: {
      storyId_userId: {
        storyId,
        userId: user.id,
      },
    },
  });
  
  if (!membership) {
    return fallback || null;
  }

  const roleHierarchy = { viewer: 0, editor: 1, admin: 2, owner: 3 };
  const userRole = roleHierarchy[membership.role as keyof typeof roleHierarchy] || 0;
  const minRequiredRole = Math.min(
    ...allowedRoles.map((role) => roleHierarchy[role])
  );

  if (userRole < minRequiredRole) {
    return fallback || null;
  }

  return <>{children}</>;
}

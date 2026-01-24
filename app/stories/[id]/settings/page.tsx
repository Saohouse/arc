import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { StoryMemberRoleSelector } from "@/components/arc/StoryMemberRoleSelector";
import { RemoveMemberButton } from "@/components/arc/RemoveMemberButton";

async function inviteMember(formData: FormData) {
  "use server";

  const storyId = String(formData.get("storyId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !storyId) {
    redirect(`/stories/${storyId}/settings`);
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // Check if current user is owner of this story
  const membership = await prisma.storyMember.findUnique({
    where: {
      storyId_userId: {
        storyId,
        userId: currentUser.id,
      },
    },
  });

  if (!membership || membership.role !== "owner") {
    redirect(`/stories/${storyId}/settings`);
  }

  // Find user by email
  const userToInvite = await prisma.user.findUnique({
    where: { email },
  });

  if (!userToInvite) {
    redirect(`/stories/${storyId}/settings`);
  }

  // Check if already a member
  const existingMember = await prisma.storyMember.findUnique({
    where: {
      storyId_userId: {
        storyId,
        userId: userToInvite.id,
      },
    },
  });

  if (existingMember) {
    redirect(`/stories/${storyId}/settings`);
  }

  // Get the role from the form (default to editor)
  const role = String(formData.get("role") ?? "editor");
  
  // Add as member with specified role
  await prisma.storyMember.create({
    data: {
      storyId,
      userId: userToInvite.id,
      role,
    },
  });

  redirect(`/stories/${storyId}/settings`);
}

async function updateMemberRole(formData: FormData) {
  "use server";

  const storyId = String(formData.get("storyId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const newRole = String(formData.get("role") ?? "");

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // Check if current user is owner
  const membership = await prisma.storyMember.findUnique({
    where: {
      storyId_userId: {
        storyId,
        userId: currentUser.id,
      },
    },
  });

  if (!membership || membership.role !== "owner") {
    redirect(`/stories/${storyId}/settings`);
  }

  // Don't allow changing your own role
  if (userId === currentUser.id) {
    redirect(`/stories/${storyId}/settings`);
  }

  // Update the member's role
  await prisma.storyMember.update({
    where: {
      storyId_userId: {
        storyId,
        userId,
      },
    },
    data: {
      role: newRole,
    },
  });

  redirect(`/stories/${storyId}/settings`);
}

async function removeMember(formData: FormData) {
  "use server";

  const storyId = String(formData.get("storyId") ?? "");
  const userId = String(formData.get("userId") ?? "");

  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // Check if current user is owner
  const membership = await prisma.storyMember.findUnique({
    where: {
      storyId_userId: {
        storyId,
        userId: currentUser.id,
      },
    },
  });

  if (!membership || membership.role !== "owner") {
    redirect(`/stories/${storyId}/settings`);
  }

  // Don't allow removing yourself
  if (userId === currentUser.id) {
    redirect(`/stories/${storyId}/settings`);
  }

  await prisma.storyMember.delete({
    where: {
      storyId_userId: {
        storyId,
        userId,
      },
    },
  });

  redirect(`/stories/${storyId}/settings`);
}

export default async function StorySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: storyId } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  // Get story with members
  const story = await prisma.story.findFirst({
    where: {
      id: storyId,
      members: {
        some: {
          userId: currentUser.id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!story) {
    redirect("/");
  }

  // Check if current user is owner
  const currentMembership = story.members.find((m) => m.userId === currentUser.id);
  const isOwner = currentMembership?.role === "owner";

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="text-4xl font-semibold tracking-tight">{story.name}</h1>
        <p className="mt-2 text-base text-muted-foreground">Story Settings</p>
      </div>

      {/* Story Members */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Members</h2>
            <p className="text-sm text-muted-foreground">
              People who have access to this story
            </p>
          </div>
        </div>

        {/* Members List */}
        <div className="rounded-lg border">
          <div className="divide-y">
            {story.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground font-semibold">
                    {member.user.name[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{member.user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {member.user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StoryMemberRoleSelector
                    storyId={storyId}
                    userId={member.userId}
                    currentRole={member.role}
                    disabled={!isOwner || member.userId === currentUser.id}
                  />
                  {isOwner && member.userId !== currentUser.id && (
                    <RemoveMemberButton
                      storyId={storyId}
                      userId={member.userId}
                      userName={member.user.name}
                      action={removeMember}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Form - Only for owners */}
        {isOwner && (
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Invite Member</h3>
            <form action={inviteMember} className="space-y-4">
              <input type="hidden" name="storyId" value={storyId} />
              <div>
                <label className="block text-sm font-medium mb-2">
                  User Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-md border bg-background px-4 py-2.5 text-sm"
                  placeholder="user@example.com"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  The user must already have an account to be invited
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Role
                </label>
                <select
                  name="role"
                  defaultValue="editor"
                  className="w-full rounded-md border bg-background px-4 py-2.5 text-sm"
                >
                  <option value="editor">Editor - Can create and edit content</option>
                  <option value="viewer">Viewer - Can only view content</option>
                </select>
              </div>
              
              <button
                type="submit"
                className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
              >
                Send Invite
              </button>
            </form>
          </div>
        )}

        {!isOwner && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-sm text-blue-900 dark:text-blue-400">
              Only story owners can invite new members
            </p>
          </div>
        )}

        {/* About Story Roles */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-400">
            About Story Roles
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-blue-800 dark:text-blue-300">
            <li>
              <strong>Owner:</strong> Full access including member management
            </li>
            <li>
              <strong>Editor:</strong> Can create and edit all story content
            </li>
            <li>
              <strong>Viewer:</strong> Can only view story content (read-only)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";

async function inviteMember(formData: FormData) {
  "use server";

  const storyId = String(formData.get("storyId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !storyId) {
    return { error: "Email and story are required" };
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
    return { error: "Only story owners can invite members" };
  }

  // Find user by email
  const userToInvite = await prisma.user.findUnique({
    where: { email },
  });

  if (!userToInvite) {
    return { error: "No user found with that email" };
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
    return { error: "User is already a member of this story" };
  }

  // Add as member
  await prisma.storyMember.create({
    data: {
      storyId,
      userId: userToInvite.id,
      role: "member",
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
    return { error: "Only story owners can remove members" };
  }

  // Don't allow removing yourself
  if (userId === currentUser.id) {
    return { error: "You cannot remove yourself from the story" };
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
                  <span
                    className={`inline-block rounded px-3 py-1 text-xs font-medium ${
                      member.role === "owner"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                    }`}
                  >
                    {member.role === "owner" ? "Owner" : "Member"}
                  </span>
                  {isOwner && member.userId !== currentUser.id && (
                    <form action={removeMember}>
                      <input type="hidden" name="storyId" value={storyId} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <button
                        type="submit"
                        className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </form>
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
      </div>
    </div>
  );
}

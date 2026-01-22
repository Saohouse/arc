"use client";

import { useRouter } from "next/navigation";

type StoryMemberRoleSelectorProps = {
  storyId: string;
  userId: string;
  currentRole: string;
  disabled?: boolean;
};

export function StoryMemberRoleSelector({
  storyId,
  userId,
  currentRole,
  disabled = false,
}: StoryMemberRoleSelectorProps) {
  const router = useRouter();

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    
    const formData = new FormData();
    formData.append("storyId", storyId);
    formData.append("userId", userId);
    formData.append("role", newRole);

    await fetch(`/api/story/update-member-role`, {
      method: "POST",
      body: formData,
    });

    router.refresh();
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      owner: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
      editor: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
      viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
    return colors[role as keyof typeof colors] || colors.viewer;
  };

  if (disabled || currentRole === "owner") {
    // Show as badge for owners or disabled state
    return (
      <span
        className={`inline-block rounded px-3 py-1 text-xs font-medium uppercase ${getRoleBadgeColor(
          currentRole
        )}`}
      >
        {currentRole}
      </span>
    );
  }

  return (
    <select
      value={currentRole}
      onChange={handleRoleChange}
      className={`rounded px-3 py-1 text-xs font-medium uppercase border-0 cursor-pointer ${getRoleBadgeColor(
        currentRole
      )}`}
    >
      <option value="editor">Editor</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}

"use client";

import { useRouter } from "next/navigation";

type DeleteUserButtonProps = {
  userId: string;
  userName: string;
};

export function DeleteUserButton({ userId, userName }: DeleteUserButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm(`Delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    await fetch("/api/admin/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    router.refresh();
  };

  return (
    <button
      onClick={handleDelete}
      className="text-xs text-red-600 hover:underline dark:text-red-400"
    >
      Delete
    </button>
  );
}

"use client";

import { useRouter } from "next/navigation";

type RoleSelectorProps = {
  userId: string;
  currentRole: string;
  disabled: boolean;
};

export function RoleSelector({ userId, currentRole, disabled }: RoleSelectorProps) {
  const router = useRouter();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    
    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("role", newRole);

    await fetch("/api/admin/update-role", {
      method: "POST",
      body: formData,
    });

    router.refresh();
  };

  return (
    <select
      name="role"
      value={currentRole}
      disabled={disabled}
      onChange={handleChange}
      className="rounded border bg-background px-2 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="viewer">Viewer</option>
      <option value="editor">Editor</option>
      <option value="admin">Admin</option>
    </select>
  );
}

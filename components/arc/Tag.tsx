"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getTagColor } from "@/lib/tags";

type TagProps = {
  name: string;
  customColor?: string | null;
  size?: "sm" | "md";
  removable?: boolean;
  onRemove?: () => void;
  href?: string;
  editHref?: string;
  tagId?: string;
};

export function Tag({
  name,
  customColor,
  size = "sm",
  removable = false,
  onRemove,
  href,
  editHref,
  tagId,
}: TagProps) {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();
  const colors = getTagColor(name, customColor);

  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  const className = `inline-flex items-center gap-1 rounded-full border font-medium transition-all ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses} ${
    href ? "hover:scale-105 hover:shadow-sm cursor-pointer" : ""
  }`;

  const content = (
    <>
      {name}
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          aria-label={`Remove ${name} tag`}
        >
          ×
        </button>
      )}
      {editHref && isHovered && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(editHref);
          }}
          className="ml-0.5 -mr-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label={`Customize ${name} tag`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      )}
    </>
  );

  const wrapperProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };

  if (href) {
    return (
      <Link href={href} className={className} style={colors.style} {...wrapperProps}>
        {content}
      </Link>
    );
  }

  return (
    <span className={className} style={colors.style} {...wrapperProps}>
      {content}
    </span>
  );
}

type TagListProps = {
  tags: string[];
  size?: "sm" | "md";
};

export function TagList({ tags, size = "sm" }: TagListProps) {
  if (tags.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Tag key={tag} name={tag} size={size} />
      ))}
    </div>
  );
}

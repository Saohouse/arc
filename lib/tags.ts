// Tag color system - automatically assigns colors based on tag name

const TAG_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-300 dark:border-blue-800" },
  { bg: "bg-purple-100 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-300 dark:border-purple-800" },
  { bg: "bg-emerald-100 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-300 dark:border-emerald-800" },
  { bg: "bg-amber-100 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-300 dark:border-amber-800" },
  { bg: "bg-rose-100 dark:bg-rose-950/30", text: "text-rose-700 dark:text-rose-400", border: "border-rose-300 dark:border-rose-800" },
  { bg: "bg-cyan-100 dark:bg-cyan-950/30", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-300 dark:border-cyan-800" },
  { bg: "bg-pink-100 dark:bg-pink-950/30", text: "text-pink-700 dark:text-pink-400", border: "border-pink-300 dark:border-pink-800" },
  { bg: "bg-indigo-100 dark:bg-indigo-950/30", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-300 dark:border-indigo-800" },
  { bg: "bg-orange-100 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400", border: "border-orange-300 dark:border-orange-800" },
  { bg: "bg-teal-100 dark:bg-teal-950/30", text: "text-teal-700 dark:text-teal-400", border: "border-teal-300 dark:border-teal-800" },
];

// Hash function to consistently assign colors to tags
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getTagColor(tagName: string, customColor?: string | null) {
  // If custom color provided, use inline styles
  if (customColor) {
    return {
      bg: "",
      text: "",
      border: "",
      style: {
        backgroundColor: `${customColor}20`,
        color: customColor,
        borderColor: `${customColor}60`,
      },
    };
  }

  // Otherwise use auto-generated color from hash
  const hash = hashString(tagName.toLowerCase());
  const colorIndex = hash % TAG_COLORS.length;
  return { ...TAG_COLORS[colorIndex], style: undefined };
}

export function parseTagsString(tagsString: string): string[] {
  return tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function formatTagsArray(tags: string[]): string {
  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(", ");
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Story = {
  id: string;
  name: string;
  description: string | null;
};

type StorySelectorProps = {
  currentStory: Story;
  allStories: Story[];
};

export function StorySelector({ currentStory, allStories }: StorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  async function handleStoryChange(storyId: string) {
    await fetch("/api/story/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId }),
    });
    setIsOpen(false);
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded border px-3 py-2 text-left transition-colors hover:bg-muted"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium tracking-tight">
              {currentStory.name}
            </div>
            {currentStory.description ? (
              <div className="truncate text-[11px] text-muted-foreground">
                {currentStory.description}
              </div>
            ) : null}
          </div>
          <svg
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {isOpen ? (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded border bg-background shadow-lg">
            <div className="max-h-64 overflow-auto p-1">
              {allStories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => handleStoryChange(story.id)}
                  className={`w-full rounded px-3 py-2 text-left transition-colors hover:bg-muted ${
                    story.id === currentStory.id ? "bg-muted" : ""
                  }`}
                >
                  <div className="text-[13px] font-medium tracking-tight">
                    {story.name}
                  </div>
                  {story.description ? (
                    <div className="text-[11px] text-muted-foreground">
                      {story.description}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
            <div className="border-t p-1 space-y-1">
              <Link
                href={`/stories/${currentStory.id}/settings`}
                className="flex items-center gap-2 rounded px-3 py-2 text-[13px] font-medium tracking-tight transition-colors hover:bg-muted"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Story Settings
              </Link>
              <Link
                href="/stories/new"
                className="flex items-center gap-2 rounded px-3 py-2 text-[13px] font-medium tracking-tight transition-colors hover:bg-muted"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Story
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

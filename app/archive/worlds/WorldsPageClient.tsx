"use client";

import Link from "next/link";
import { useState } from "react";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";

type World = {
  id: string;
  name: string;
  summary: string | null;
  imageUrl: string | null;
  tags: string;
  updatedAt: Date;
};

type WorldsListProps = {
  worlds: World[];
  tagColorMap: Map<string, string | null>;
};

function WorldsList({ worlds, tagColorMap }: WorldsListProps) {
  const [isCompact, setIsCompact] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          {worlds.length} {worlds.length === 1 ? "world" : "worlds"}
        </div>
        <button
          onClick={() => setIsCompact(!isCompact)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          {isCompact ? "Show Photos" : "Hide Photos"}
        </button>
      </div>

      <div className="grid gap-3">
        {worlds.map((world) => (
          <Link
            key={world.id}
            href={`/archive/worlds/${world.id}`}
            className={`rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 ${
              isCompact ? "p-3" : "p-4"
            }`}
          >
            <div className={`flex items-start gap-4 ${isCompact ? "items-center" : ""}`}>
              {!isCompact && (
                <>
                  {world.imageUrl ? (
                    <img
                      src={world.imageUrl}
                      alt={world.name}
                      className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-lg border border-dashed flex items-center justify-center text-2xl flex-shrink-0">
                      🌍
                    </div>
                  )}
                </>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className={`font-semibold ${isCompact ? "text-sm" : "text-base"}`}>
                      {world.name}
                    </div>
                    {world.summary ? (
                      <div className="text-sm text-muted-foreground">
                        {world.summary}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {world.updatedAt.toLocaleDateString()}
                  </div>
                </div>
                {world.tags && !isCompact && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {parseTagsString(world.tags).map((tag) => (
                      <Tag 
                        key={`${world.id}-${tag}`} 
                        name={tag}
                        customColor={tagColorMap.get(tag)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

type WorldsPageClientProps = {
  worlds: World[];
  tagColorMap: Map<string, string | null>;
  newWorldButton: React.ReactNode;
};

export function WorldsPageClient({
  worlds,
  tagColorMap,
  newWorldButton,
}: WorldsPageClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Archive / Worlds</div>
          <h1 className="text-3xl font-semibold">🌍 Worlds</h1>
          <p className="text-sm text-muted-foreground">
            Macro settings, timelines, and canon rulesets.
          </p>
        </div>
        {newWorldButton}
      </div>

      {worlds.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No worlds yet. Add the first setting.
        </div>
      ) : (
        <WorldsList worlds={worlds} tagColorMap={tagColorMap} />
      )}
    </div>
  );
}

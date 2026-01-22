"use client";

import Link from "next/link";
import { useState } from "react";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";

type ObjectType = {
  id: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  tags: string;
  updatedAt: Date;
};

type ObjectsListProps = {
  objects: ObjectType[];
  tagColorMap: Map<string, string | null>;
};

function ObjectsList({ objects, tagColorMap }: ObjectsListProps) {
  const [isCompact, setIsCompact] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          {objects.length} {objects.length === 1 ? "object" : "objects"}
        </div>
        <button
          onClick={() => setIsCompact(!isCompact)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          {isCompact ? "Show Photos" : "Hide Photos"}
        </button>
      </div>

      <div className="grid gap-3">
        {objects.map((object) => (
          <Link
            key={object.id}
            href={`/archive/objects/${object.id}`}
            className={`rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 ${
              isCompact ? "p-3" : "p-4"
            }`}
          >
            <div className={`flex items-start gap-4 ${isCompact ? "items-center" : ""}`}>
              {!isCompact && (
                <>
                  {object.imageUrl ? (
                    <img
                      src={object.imageUrl}
                      alt={object.name}
                      className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-lg border border-dashed flex items-center justify-center text-2xl flex-shrink-0">
                      🔮
                    </div>
                  )}
                </>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className={`font-semibold tracking-tight ${isCompact ? "text-sm" : "text-base"}`}>
                      {object.name}
                    </div>
                    {object.category ? (
                      <div className="text-sm text-muted-foreground">
                        {object.category}
                      </div>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated {object.updatedAt.toLocaleDateString()}
                  </div>
                </div>
                {object.tags && !isCompact && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {parseTagsString(object.tags).map((tag) => (
                      <Tag 
                        key={`${object.id}-${tag}`} 
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

type ObjectsPageClientProps = {
  objects: ObjectType[];
  tagColorMap: Map<string, string | null>;
  newObjectButton: React.ReactNode;
};

export function ObjectsPageClient({
  objects,
  tagColorMap,
  newObjectButton,
}: ObjectsPageClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">🔮 Objects</h1>
          <p className="text-sm text-muted-foreground">
            Weapons, tools, artifacts, and collectibles.
          </p>
        </div>
        {newObjectButton}
      </div>

      {objects.length === 0 ? (
        <div className="rounded border border-dashed p-8 text-center text-sm text-muted-foreground">
          No objects yet. Create the first canon item.
        </div>
      ) : (
        <ObjectsList objects={objects} tagColorMap={tagColorMap} />
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";
import { SortableList } from "@/components/arc/SortableList";
import { reorderCharacters } from "@/lib/reorder-actions";
import { ArrowUpDown } from "lucide-react";

type Character = {
  id: string;
  name: string;
  title: string | null;
  imageUrl: string | null;
  tags: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
};

type SortMode = "custom" | "alphabetical" | "date-created";

type CharactersListProps = {
  storyId: string;
  characters: Character[];
  tagColorMap: Map<string, string | null>;
};

function CharactersList({ storyId, characters, tagColorMap }: CharactersListProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("characters-sort-mode") as SortMode) || "custom";
    }
    return "custom";
  });

  const handleSortModeChange = (mode: SortMode) => {
    setSortMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("characters-sort-mode", mode);
    }
  };

  const sortedCharacters = useMemo(() => {
    const sorted = [...characters];
    switch (sortMode) {
      case "alphabetical":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "date-created":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "custom":
      default:
        return sorted.sort((a, b) => a.order - b.order);
    }
  }, [characters, sortMode]);

  const handleReorder = async (reorderedItems: Character[]) => {
    await reorderCharacters(
      storyId,
      reorderedItems.map((item) => ({ id: item.id, order: item.order }))
    );
  };

  const renderCharacter = (character: Character) => (
    <Link
      href={`/archive/characters/${character.id}`}
      className={`block rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 ${
        isCompact ? "p-3" : "p-4"
      }`}
    >
      <div className={`flex items-start gap-4 ${isCompact ? "items-center" : ""}`}>
        {!isCompact && (
          <>
            {character.imageUrl ? (
              <img
                src={character.imageUrl}
                alt={character.name}
                className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="h-20 w-20 rounded-lg border border-dashed flex items-center justify-center text-2xl flex-shrink-0">
                👤
              </div>
            )}
          </>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className={`font-semibold ${isCompact ? "text-sm" : "text-base"}`}>
                {character.name}
              </div>
              {character.title ? (
                <div className="text-sm text-muted-foreground">
                  {character.title}
                </div>
              ) : null}
            </div>
            <div className="text-xs text-muted-foreground">
              Updated {character.updatedAt.toLocaleDateString()}
            </div>
          </div>
          {character.tags && !isCompact && (
            <div className="mt-3 flex flex-wrap gap-2">
              {parseTagsString(character.tags).map((tag) => (
                <Tag 
                  key={`${character.id}-${tag}`} 
                  name={tag}
                  customColor={tagColorMap.get(tag)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {characters.length} {characters.length === 1 ? "character" : "characters"}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-md p-1">
            <button
              onClick={() => handleSortModeChange("custom")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                sortMode === "custom" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Custom drag-and-drop order"
            >
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleSortModeChange("alphabetical")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                sortMode === "alphabetical" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Sort alphabetically"
            >
              A-Z
            </button>
            <button
              onClick={() => handleSortModeChange("date-created")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                sortMode === "date-created" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Sort by date created (newest first)"
            >
              Date
            </button>
          </div>
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            {isCompact ? "Show Photos" : "Hide Photos"}
          </button>
        </div>
      </div>

      {sortMode === "custom" ? (
        <SortableList
          items={sortedCharacters}
          onReorder={handleReorder}
          renderItem={renderCharacter}
        />
      ) : (
        <div className="grid gap-3">
          {sortedCharacters.map((character) => (
            <div key={character.id}>{renderCharacter(character)}</div>
          ))}
        </div>
      )}
    </>
  );
}

type CharactersPageClientProps = {
  storyId: string;
  characters: Character[];
  tagColorMap: Map<string, string | null>;
  newCharacterButton: React.ReactNode;
};

export function CharactersPageClient({
  storyId,
  characters,
  tagColorMap,
  newCharacterButton,
}: CharactersPageClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            Archive / Characters
          </div>
          <h1 className="text-3xl font-semibold">👤 Characters</h1>
          <p className="text-sm text-muted-foreground">
            Canon profiles for the Sao House universe.
          </p>
        </div>
        {newCharacterButton}
      </div>

      {characters.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No characters yet. Create the first canon entry.
        </div>
      ) : (
        <CharactersList storyId={storyId} characters={characters} tagColorMap={tagColorMap} />
      )}
    </div>
  );
}

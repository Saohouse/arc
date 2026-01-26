"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
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
  psychologyTraits: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  wizardData?: any;
};

// Get emoji based on character type from wizard data
function getCharacterEmoji(character: Character): string {
  if (!character.wizardData) return "⭐";
  
  const wizardData = character.wizardData as Record<string, string>;
  const characterType = wizardData["character_type_type"] || "other";
  
  const typeEmojis: Record<string, string> = {
    protagonist: "🦸",
    antagonist: "😈",
    mentor: "🧙",
    support: "🤝",
    love_interest: "💖",
    other: "⭐"
  };
  
  return typeEmojis[characterType] || "⭐";
}

// Get gradient based on character type
function getCharacterGradient(character: Character): string {
  if (!character.wizardData) return "from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20";
  
  const wizardData = character.wizardData as Record<string, string>;
  const characterType = wizardData["character_type_type"] || "other";
  
  const typeGradients: Record<string, string> = {
    protagonist: "from-blue-50 via-cyan-50 to-blue-100 dark:from-blue-950/20 dark:via-cyan-950/20 dark:to-blue-950/30",
    antagonist: "from-red-50 via-orange-50 to-red-100 dark:from-red-950/20 dark:via-orange-950/20 dark:to-red-950/30",
    mentor: "from-purple-50 via-indigo-50 to-purple-100 dark:from-purple-950/20 dark:via-indigo-950/20 dark:to-purple-950/30",
    support: "from-green-50 via-emerald-50 to-green-100 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-green-950/30",
    love_interest: "from-pink-50 via-rose-50 to-pink-100 dark:from-pink-950/20 dark:via-rose-950/20 dark:to-pink-950/30",
    other: "from-amber-50 via-yellow-50 to-amber-100 dark:from-amber-950/20 dark:via-yellow-950/20 dark:to-amber-950/30"
  };
  
  return typeGradients[characterType] || typeGradients.other;
}

type SortMode = "custom" | "alphabetical" | "date-created";

type CharactersListProps = {
  storyId: string;
  characters: Character[];
  tagColorMap: Map<string, string | null>;
};

function CharactersList({ storyId, characters, tagColorMap }: CharactersListProps) {
  const [isCompact, setIsCompact] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [sortMode, setSortMode] = useState<SortMode>("custom");
  const [mounted, setMounted] = useState(false);

  // Load preferences from localStorage after hydration
  useEffect(() => {
    setMounted(true);
    const savedSort = localStorage.getItem("characters-sort-mode") as SortMode;
    if (savedSort === "alphabetical" || savedSort === "date-created") {
      setSortMode(savedSort);
    }
    const savedView = localStorage.getItem("characters-view-mode") as "list" | "card";
    if (savedView === "card" || savedView === "list") {
      setViewMode(savedView);
    }
  }, []);

  const handleSortModeChange = (mode: SortMode) => {
    setSortMode(mode);
    localStorage.setItem("characters-sort-mode", mode);
  };

  const handleViewModeChange = (mode: "list" | "card") => {
    setViewMode(mode);
    localStorage.setItem("characters-view-mode", mode);
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

  const renderCharacter = (character: Character) => {
    return (
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
                <Image
                  src={character.imageUrl}
                  alt={character.name}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className={`h-20 w-20 rounded-lg border border-dashed flex items-center justify-center text-3xl flex-shrink-0 bg-gradient-to-br ${getCharacterGradient(character)}`}>
                  {getCharacterEmoji(character)}
                </div>
              )}
            </>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
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
  };

  const renderCharacterCard = (character: Character) => {
    return (
      <Link
        href={`/archive/characters/${character.id}`}
        className="block rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 p-4"
      >
        <div className="flex flex-col items-center text-center gap-3">
          {!isCompact && (
            <>
              {character.imageUrl ? (
                <Image
                  src={character.imageUrl}
                  alt={character.name}
                  width={120}
                  height={120}
                  className="h-30 w-30 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <div className={`h-30 w-30 rounded-lg border border-dashed flex items-center justify-center text-5xl bg-gradient-to-br ${getCharacterGradient(character)}`}>
                  {getCharacterEmoji(character)}
                </div>
              )}
            </>
          )}
          <div className="w-full">
            <div className="font-semibold text-base truncate">
              {character.name}
            </div>
            {character.title ? (
              <div className="text-sm text-muted-foreground truncate">
                {character.title}
              </div>
            ) : null}
            {character.tags && !isCompact && (
              <div className="mt-2 flex flex-wrap gap-1 justify-center">
                {parseTagsString(character.tags).slice(0, 3).map((tag) => (
                  <Tag 
                    key={`${character.id}-${tag}`} 
                    name={tag}
                    customColor={tagColorMap.get(tag)}
                    size="sm"
                  />
                ))}
                {parseTagsString(character.tags).length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{parseTagsString(character.tags).length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {characters.length} {characters.length === 1 ? "character" : "characters"}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <button
              onClick={() => handleViewModeChange("list")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors touch-manipulation ${
                viewMode === "list" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="List view"
            >
              List
            </button>
            <button
              onClick={() => handleViewModeChange("card")}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors touch-manipulation ${
                viewMode === "card" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Card view"
            >
              Cards
            </button>
          </div>

          {/* Sort Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <button
              onClick={() => handleSortModeChange("custom")}
              className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors touch-manipulation flex items-center gap-1 ${
                sortMode === "custom" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Custom order (drag to reorder)"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span className="hidden sm:inline">Custom</span>
            </button>
            <button
              onClick={() => handleSortModeChange("alphabetical")}
              className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors touch-manipulation ${
                sortMode === "alphabetical" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Alphabetical order"
            >
              A-Z
            </button>
            <button
              onClick={() => handleSortModeChange("date-created")}
              className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded transition-colors touch-manipulation ${
                sortMode === "date-created" 
                  ? "bg-foreground/10 text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Sort by date created (newest first)"
            >
              Date
            </button>
          </div>

          {/* Hide Photos Toggle */}
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-colors touch-manipulation whitespace-nowrap ${
              isCompact
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={isCompact ? "Show photos" : "Hide photos"}
          >
            {isCompact ? "Show Photos" : "Hide Photos"}
          </button>
        </div>
      </div>

      {viewMode === "card" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedCharacters.map((character) => (
            <div key={character.id}>{renderCharacterCard(character)}</div>
          ))}
        </div>
      ) : sortMode === "custom" ? (
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
      {/* Header Section - Mobile Optimized */}
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Archive / Characters
        </div>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-semibold">👤 Characters</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Canon profiles for the Sao House universe.
            </p>
          </div>
          <div className="flex-shrink-0">
            {newCharacterButton}
          </div>
        </div>
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

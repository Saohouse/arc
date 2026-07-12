"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";
import { SortableList } from "@/components/arc/SortableList";
import { reorderCharacters } from "@/lib/reorder-actions";
import { deleteCharacters } from "@/lib/character-actions";
import { ArrowUpDown, CheckSquare, Square } from "lucide-react";

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
  canEdit: boolean;
  onCharactersDeleted: (deletedIds: string[]) => void;
};

function CharactersList({
  storyId,
  characters,
  tagColorMap,
  canEdit,
  onCharactersDeleted,
}: CharactersListProps) {
  const router = useRouter();
  const [isCompact, setIsCompact] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [sortMode, setSortMode] = useState<SortMode>("custom");
  const [mounted, setMounted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

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

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(sortedCharacters.map((character) => character.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const exitEditMode = () => {
    setEditMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const names = characters
      .filter((character) => selectedIds.has(character.id))
      .map((character) => character.name);
    const preview = names.slice(0, 3).join(", ");
    const more = names.length > 3 ? ` and ${names.length - 3} more` : "";

    if (
      !confirm(
        `Delete ${ids.length} character${ids.length === 1 ? "" : "s"} (${preview}${more})? This cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCharacters(storyId, ids);
      onCharactersDeleted(ids);
      exitEditMode();
      router.refresh();
    } catch {
      alert("Failed to delete characters. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderSelectionCheckbox = (character: Character) => {
    const isSelected = selectedIds.has(character.id);

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          toggleSelection(character.id);
        }}
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
          isSelected
            ? "border-foreground bg-foreground text-background"
            : "border-muted-foreground/40 text-transparent hover:border-foreground/50"
        }`}
        aria-label={isSelected ? `Deselect ${character.name}` : `Select ${character.name}`}
      >
        {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
      </button>
    );
  };

  const getItemClassName = (character: Character, baseClassName: string) => {
    const isSelected = selectedIds.has(character.id);

    if (!editMode) {
      return baseClassName;
    }

    return `${baseClassName} cursor-pointer ${
      isSelected ? "border-foreground/40 bg-muted/60" : "hover:border-foreground/20 hover:bg-muted/30"
    }`;
  };

  const renderCharacter = (character: Character) => {
    const content = (
      <div className={`flex items-start gap-4 ${isCompact ? "items-center" : ""}`}>
        {editMode && renderSelectionCheckbox(character)}
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
    );

    if (editMode) {
      return (
        <div
          onClick={() => toggleSelection(character.id)}
          className={getItemClassName(
            character,
            `block rounded-lg border transition ${isCompact ? "p-3" : "p-4"}`
          )}
        >
          {content}
        </div>
      );
    }

    return (
      <Link
        href={`/archive/characters/${character.id}`}
        className={getItemClassName(
          character,
          `block rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 ${
            isCompact ? "p-3" : "p-4"
          }`
        )}
      >
        {content}
      </Link>
    );
  };

  const renderCharacterCard = (character: Character) => {
    const content = (
      <div className="flex flex-col items-center text-center gap-3">
        {editMode && (
          <div className="self-start">{renderSelectionCheckbox(character)}</div>
        )}
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
    );

    if (editMode) {
      return (
        <div
          onClick={() => toggleSelection(character.id)}
          className={getItemClassName(
            character,
            "block rounded-lg border transition p-4"
          )}
        >
          {content}
        </div>
      );
    }

    return (
      <Link
        href={`/archive/characters/${character.id}`}
        className={getItemClassName(
          character,
          "block rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 p-4"
        )}
      >
        {content}
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

          {canEdit && (
            <button
              onClick={() => (editMode ? exitEditMode() : setEditMode(true))}
              className={`px-3 py-1.5 text-xs font-medium border rounded-md transition-colors touch-manipulation whitespace-nowrap ${
                editMode
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={editMode ? "Exit edit mode" : "Select and delete characters"}
            >
              {editMode ? "Done" : "Edit"}
            </button>
          )}
        </div>
      </div>

      {editMode && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="text-sm text-muted-foreground">
            {selectedIds.size} of {sortedCharacters.length} selected
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={selectAllVisible}
              className="px-3 py-1.5 text-xs font-medium border rounded-md transition-colors hover:bg-background"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
              className="px-3 py-1.5 text-xs font-medium border rounded-md transition-colors hover:bg-background disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0 || isDeleting}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
            </button>
          </div>
        </div>
      )}

      {viewMode === "card" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedCharacters.map((character) => (
            <div key={character.id}>{renderCharacterCard(character)}</div>
          ))}
        </div>
      ) : viewMode === "list" && sortMode === "custom" && !editMode ? (
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
  canEdit: boolean;
};

export function CharactersPageClient({
  storyId,
  characters,
  tagColorMap,
  newCharacterButton,
  canEdit,
}: CharactersPageClientProps) {
  // Track deleted IDs so they stay hidden even if a background refresh
  // briefly returns stale data (e.g. Prisma Accelerate cache lag).
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const visibleCharacters = useMemo(
    () => characters.filter((character) => !deletedIds.has(character.id)),
    [characters, deletedIds]
  );

  const handleCharactersDeleted = (ids: string[]) => {
    setDeletedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  };

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

      {visibleCharacters.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No characters yet. Create the first canon entry.
        </div>
      ) : (
        <CharactersList
          storyId={storyId}
          characters={visibleCharacters}
          tagColorMap={tagColorMap}
          canEdit={canEdit}
          onCharactersDeleted={handleCharactersDeleted}
        />
      )}
    </div>
  );
}

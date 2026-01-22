"use client";

import Link from "next/link";
import { useState } from "react";
import { Tag } from "@/components/arc/Tag";
import { parseTagsString } from "@/lib/tags";

type Character = {
  id: string;
  name: string;
  title: string | null;
  imageUrl: string | null;
  tags: string;
  updatedAt: Date;
};

type CharactersListProps = {
  characters: Character[];
  tagColorMap: Map<string, string | null>;
};

function CharactersList({ characters, tagColorMap }: CharactersListProps) {
  const [isCompact, setIsCompact] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          {characters.length} {characters.length === 1 ? "character" : "characters"}
        </div>
        <button
          onClick={() => setIsCompact(!isCompact)}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
        >
          {isCompact ? "Show Photos" : "Hide Photos"}
        </button>
      </div>

      <div className="grid gap-3">
        {characters.map((character) => (
          <Link
            key={character.id}
            href={`/archive/characters/${character.id}`}
            className={`rounded-lg border transition hover:border-foreground/30 hover:bg-muted/50 ${
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
        ))}
      </div>
    </>
  );
}

type CharactersPageClientProps = {
  characters: Character[];
  tagColorMap: Map<string, string | null>;
  newCharacterButton: React.ReactNode;
};

export function CharactersPageClient({
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
        <CharactersList characters={characters} tagColorMap={tagColorMap} />
      )}
    </div>
  );
}

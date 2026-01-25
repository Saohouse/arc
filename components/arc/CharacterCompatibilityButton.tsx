"use client";

import { useState } from "react";
import { CompatibilityModal } from "./CompatibilityModal";

type Character = {
  id: string;
  name: string;
  imageUrl: string | null;
  psychologyTraits: string;
};

type CharacterCompatibilityButtonProps = {
  character: Character;
  allCharacters: Character[];
};

export function CharacterCompatibilityButton({
  character,
  allCharacters,
}: CharacterCompatibilityButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const hasTraits = character.psychologyTraits && character.psychologyTraits.length > 0;

  if (!hasTraits) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-all"
      >
        View Compatibility
      </button>

      <CompatibilityModal
        character={character}
        allCharacters={allCharacters}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { CharacterWizard } from "./CharacterWizard";

interface CharacterWizardFormProps {
  action: (formData: FormData) => Promise<void>;
  characterId?: string; // If provided, we're editing an existing character
  characterName?: string; // If provided, we're editing an existing character
  initialData?: Record<string, string>; // Pre-populate with existing wizard data
  isFromAI?: boolean; // If true, load from localStorage
}

export function CharacterWizardForm({ 
  action, 
  characterId, 
  characterName, 
  initialData,
  isFromAI 
}: CharacterWizardFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isEditMode = !!characterName;
  const [aiData, setAiData] = useState<any>(null);
  const [loadedInitialData, setLoadedInitialData] = useState(initialData || {});

  // Load AI-generated data from localStorage if coming from AI generator
  useEffect(() => {
    if (isFromAI && typeof window !== "undefined") {
      const storedData = localStorage.getItem("ai-generated-character");
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          setAiData(parsed);
          setLoadedInitialData(parsed.wizardData || {});
          // Clear from localStorage after loading
          localStorage.removeItem("ai-generated-character");
        } catch (e) {
          console.error("Failed to load AI data:", e);
        }
      }
    }
  }, [isFromAI]);

  const handleSave = async (data: Record<string, string>) => {
    // If editing existing character, skip the name prompt
    let name: string | undefined | null = characterName;
    
    // Only prompt for name if creating new character and not from AI
    if (!isEditMode) {
      if (aiData?.name) {
        name = aiData.name;
      } else {
        name = prompt("Enter character name:");
        if (!name?.trim()) return;
      }
    }

    setIsSubmitting(true);

    try {
      // Create form data
      const formData = new FormData();
      if (isEditMode && characterId) {
        formData.append("characterId", characterId);
      } else if (!isEditMode) {
        formData.append("name", name!);
      }
      formData.append("wizardData", JSON.stringify(data));
      
      // Include psychology traits from AI if available
      if (aiData?.psychologyTraits) {
        const traitsString = Array.isArray(aiData.psychologyTraits) 
          ? aiData.psychologyTraits.join(",")
          : String(aiData.psychologyTraits);
        formData.append("psychologyTraits", traitsString);
      }

      // Submit to server action
      await action(formData);
      // Note: If we reach here without error, redirect happened successfully
      // The redirect() function throws a NEXT_REDIRECT error which is caught below
    } catch (error: any) {
      // Next.js redirect() throws a special error - this is expected behavior
      if (error?.message?.includes('NEXT_REDIRECT')) {
        // This is a successful redirect, not an actual error
        return;
      }
      
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} character:`, error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} character. Please try again.`);
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef}>
      <CharacterWizard 
        onSave={handleSave} 
        characterName={aiData?.name || characterName}
        initialData={loadedInitialData}
      />
      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {isEditMode ? 'Updating character...' : 'Creating character...'}
            </p>
          </div>
        </div>
      )}
    </form>
  );
}

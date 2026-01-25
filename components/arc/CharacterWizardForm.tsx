"use client";

import { useState, useRef } from "react";
import { CharacterWizard } from "./CharacterWizard";

interface CharacterWizardFormProps {
  action: (formData: FormData) => Promise<void>;
}

export function CharacterWizardForm({ action }: CharacterWizardFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSave = async (data: Record<string, string>) => {
    // Prompt for character name
    const name = prompt("Enter character name:");
    if (!name?.trim()) return;

    setIsSubmitting(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("name", name);
      formData.append("wizardData", JSON.stringify(data));

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
      
      console.error("Failed to create character:", error);
      alert("Failed to create character. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form ref={formRef}>
      <CharacterWizard onSave={handleSave} />
      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Creating character...</p>
          </div>
        </div>
      )}
    </form>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { FRANK_DANIEL_SECTIONS, CHARACTER_TYPES, type WizardSection } from "@/lib/frank-daniel-questions";
import { ChevronLeft, ChevronRight, Save, Sparkles } from "lucide-react";

interface CharacterWizardProps {
  initialData?: Record<string, string>;
  onSave: (data: Record<string, string>, updatedName?: string) => void;
  characterName?: string;
}

export function CharacterWizard({ initialData = {}, onSave, characterName }: CharacterWizardProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(initialData);
  const [editableName, setEditableName] = useState(characterName || "");
  const [previousName, setPreviousName] = useState(characterName || "");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasLoadedDraft = useRef(false);

  const currentSection = FRANK_DANIEL_SECTIONS[currentSectionIndex];
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === FRANK_DANIEL_SECTIONS.length - 1;

  // Function to replace all occurrences of old name with new name in all answers
  const replaceNameInAnswers = (oldName: string, newName: string) => {
    if (!oldName || !newName || oldName === newName) return;
    
    const updatedAnswers: Record<string, string> = {};
    Object.keys(answers).forEach((key) => {
      const value = answers[key];
      if (typeof value === "string") {
        // Replace all occurrences (case-insensitive)
        const regex = new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        updatedAnswers[key] = value.replace(regex, newName);
      } else {
        updatedAnswers[key] = value;
      }
    });
    setAnswers(updatedAnswers);
    setHasUnsavedChanges(true);
  };

  // Handle name change
  const handleNameChange = (newName: string) => {
    setEditableName(newName);
    if (previousName && newName && previousName !== newName) {
      replaceNameInAnswers(previousName, newName);
      setPreviousName(newName);
    } else if (!previousName && newName) {
      setPreviousName(newName);
    }
  };

  // Auto-save to localStorage
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`wizard-draft-${characterName || "new"}`, JSON.stringify(answers));
        setHasUnsavedChanges(false);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [answers, hasUnsavedChanges, characterName]);

  // Load draft on mount (only once)
  useEffect(() => {
    if (!hasLoadedDraft.current && Object.keys(initialData).length === 0) {
      const draft = localStorage.getItem(`wizard-draft-${characterName || "new"}`);
      if (draft) {
        try {
          setAnswers(JSON.parse(draft));
        } catch (e) {
          // Invalid draft, ignore
        }
      }
      hasLoadedDraft.current = true;
    }
  }, []);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [`${currentSection.id}_${questionId}`]: value }));
    setHasUnsavedChanges(true);
  };

  const handleNext = () => {
    if (!isLastSection) {
      setCurrentSectionIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    if (!isFirstSection) {
      setCurrentSectionIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSaveDraft = () => {
    // Just save to localStorage without creating character
    localStorage.setItem(`wizard-draft-${characterName || "new"}`, JSON.stringify(answers));
    alert("Draft saved! You can continue later from where you left off.");
  };

  const handleComplete = () => {
    // Actually create the character
    onSave(answers, editableName);
    localStorage.removeItem(`wizard-draft-${characterName || "new"}`);
  };

  const progress = ((currentSectionIndex + 1) / FRANK_DANIEL_SECTIONS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Frank Daniel credit */}
      <div className="rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">The Frank Daniel Method</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Frank Daniel (1926-1996) was a legendary Czech-American film director and teacher who revolutionized 
              screenwriting pedagogy. His systematic question-based approach became the foundation of modern 
              narrative structure teaching at USC, Columbia University, and the American Film Institute.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              First, choose your character type. Then answer questions to deeply understand their motivations, 
              conflicts, and arc before writing a single scene.
            </p>
          </div>
        </div>
      </div>

      {/* Character Name Field */}
      {editableName && (
        <div className="rounded-lg border p-6 bg-card">
          <label className="block text-sm font-semibold mb-3">
            Character Name
          </label>
          <input
            type="text"
            value={editableName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter character name..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            💡 Changing the name will automatically update it throughout all answers.
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Section {currentSectionIndex + 1} of {FRANK_DANIEL_SECTIONS.length}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Section overview */}
      <div className="rounded-lg border p-6 bg-card">
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="text-xl font-bold">{currentSection.title}</h2>
          <span className="text-sm text-muted-foreground">{currentSection.description}</span>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {currentSection.questions.map((q, index) => {
            const fullId = `${currentSection.id}_${q.id}`;
            const value = answers[fullId] || "";

            // Special handling for character type selector on first question of first section
            if (currentSection.id === "character_type" && q.id === "type") {
              return (
                <div key={q.id} className="space-y-3">
                  <label htmlFor={fullId} className="block font-medium">
                    {q.question}
                  </label>
                  {q.helpText && (
                    <p className="text-sm text-muted-foreground">{q.helpText}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CHARACTER_TYPES.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleAnswerChange(q.id, type.value)}
                        className={`text-left p-4 rounded-lg border-2 transition-all ${
                          value === type.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/50"
                        }`}
                      >
                        <div className="font-medium mb-1">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.description}</div>
                      </button>
                    ))}
                  </div>
                  {value === "other" && (
                    <input
                      type="text"
                      value={answers[`${currentSection.id}_type_custom`] || ""}
                      onChange={(e) => handleAnswerChange("type_custom", e.target.value)}
                      placeholder="Describe the character type..."
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  )}
                </div>
              );
            }

            return (
              <div key={q.id} className="space-y-2">
                <label htmlFor={fullId} className="block font-medium">
                  {q.question}
                </label>
                {q.helpText && (
                  <p className="text-sm text-muted-foreground">{q.helpText}</p>
                )}
                <textarea
                  id={fullId}
                  value={value}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={handlePrev}
          disabled={isFirstSection}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md border transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border transition-colors hover:bg-muted"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>

          {hasUnsavedChanges && (
            <span className="text-xs text-muted-foreground">Auto-saving...</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleNext}
          disabled={isLastSection}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Section navigation dots */}
      <div className="flex items-center justify-center gap-2 pt-4">
        {FRANK_DANIEL_SECTIONS.map((section, index) => (
          <button
            key={section.id}
            type="button"
            onClick={() => {
              setCurrentSectionIndex(index);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentSectionIndex
                ? "bg-primary w-8"
                : index < currentSectionIndex
                ? "bg-primary/50"
                : "bg-muted-foreground/20"
            }`}
            title={section.title}
          />
        ))}
      </div>

      {/* Complete button on last section */}
      {isLastSection && (
        <div className="rounded-lg border bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-950/20 dark:to-cyan-950/20 p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Ready to create your character?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You've completed all sections. Review your answers and save when ready.
          </p>
          <button
            type="button"
            onClick={handleComplete}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90"
          >
            <Save className="w-4 h-4" />
            Complete Character Development
          </button>
        </div>
      )}
    </div>
  );
}

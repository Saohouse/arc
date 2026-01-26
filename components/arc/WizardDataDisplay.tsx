"use client";

import { useState } from "react";
import { FRANK_DANIEL_SECTIONS } from "@/lib/frank-daniel-questions";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface WizardDataDisplayProps {
  wizardData: Record<string, string>;
  characterName?: string; // Add character name for placeholder replacement
}

export function WizardDataDisplay({ wizardData, characterName }: WizardDataDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  if (!wizardData || Object.keys(wizardData).length === 0) {
    return null;
  }

  // Helper function to render text with highlighted placeholders
  const renderWithHighlightedPlaceholders = (text: string) => {
    if (!text) return null;
    
    // Split by {{name}} placeholder (case-insensitive)
    const parts = text.split(/(\{\{name\}\})/gi);
    
    return (
      <>
        {parts.map((part, idx) => {
          if (part.toLowerCase() === '{{name}}') {
            return (
              <span
                key={idx}
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1 rounded font-medium"
                title="Dynamic name placeholder"
              >
                {characterName || '{{name}}'}
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </>
    );
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSections(new Set(FRANK_DANIEL_SECTIONS.map((s) => s.id)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Check if any answers exist for a section
  const sectionHasAnswers = (sectionId: string) => {
    return Object.keys(wizardData).some(
      (key) => key.startsWith(`${sectionId}_`) && wizardData[key]?.trim()
    );
  };

  const sectionsWithAnswers = FRANK_DANIEL_SECTIONS.filter((section) =>
    sectionHasAnswers(section.id)
  );

  if (sectionsWithAnswers.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border p-6 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/10 dark:to-pink-950/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-lg font-semibold">Character Development Notes</h2>
          <span className="text-xs text-muted-foreground">(Frank Daniel Method)</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Expand All
          </button>
          <span className="text-muted-foreground">•</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {sectionsWithAnswers.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const answeredQuestions = section.questions.filter((q) => {
            const key = `${section.id}_${q.id}`;
            return wizardData[key]?.trim();
          });

          return (
            <div
              key={section.id}
              className="rounded-lg border bg-background overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{section.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {section.description} • {answeredQuestions.length} of{" "}
                    {section.questions.length} answered
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="border-t p-4 space-y-4 bg-muted/20">
                  {section.questions.map((q) => {
                    const key = `${section.id}_${q.id}`;
                    const answer = wizardData[key]?.trim();

                    if (!answer) return null;

                    return (
                      <div key={q.id} className="space-y-1.5">
                        <div className="text-sm font-medium text-foreground">
                          {q.question}
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                          {renderWithHighlightedPlaceholders(answer)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          These development notes were created using the Frank Daniel Method, a systematic 
          approach to character development used at top film schools worldwide.
        </p>
      </div>
    </section>
  );
}

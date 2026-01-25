"use client";

import { useState, useMemo } from "react";
import { X, Search, ChevronDown, ChevronRight } from "lucide-react";
import {
  PSYCHOLOGY_TRAITS,
  TRAIT_CATEGORIES,
  TraitCategory,
  getTraitsByCategory,
  searchTraits,
} from "@/lib/psychology-traits";

type TraitSelectorProps = {
  name: string;
  label: string;
  selectedTraits: string[]; // trait IDs
  onChange?: (traits: string[]) => void; // For client-side controlled component
};

export function TraitSelector({
  name,
  label,
  selectedTraits: initialTraits = [],
  onChange,
}: TraitSelectorProps) {
  const [selectedTraits, setSelectedTraits] = useState<string[]>(initialTraits);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<TraitCategory>>(
    new Set(["personality"])
  );

  const handleToggleTrait = (traitId: string) => {
    const newTraits = selectedTraits.includes(traitId)
      ? selectedTraits.filter((id) => id !== traitId)
      : [...selectedTraits, traitId];
    
    setSelectedTraits(newTraits);
    onChange?.(newTraits);
  };

  const handleRemoveTrait = (traitId: string) => {
    const newTraits = selectedTraits.filter((id) => id !== traitId);
    setSelectedTraits(newTraits);
    onChange?.(newTraits);
  };

  const toggleCategory = (category: TraitCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get filtered traits
  const filteredTraits = useMemo(() => {
    if (searchQuery) {
      return searchTraits(searchQuery);
    }
    return PSYCHOLOGY_TRAITS;
  }, [searchQuery]);

  // Group traits by category
  const traitsByCategory = useMemo(() => {
    const grouped: Partial<Record<TraitCategory, typeof PSYCHOLOGY_TRAITS>> = {};
    filteredTraits.forEach((trait) => {
      if (!grouped[trait.category]) {
        grouped[trait.category] = [];
      }
      grouped[trait.category]!.push(trait);
    });
    return grouped;
  }, [filteredTraits]);

  // Get selected trait objects
  const selectedTraitObjects = PSYCHOLOGY_TRAITS.filter((t) =>
    selectedTraits.includes(t.id)
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={selectedTraits.join(",")} />

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search traits..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {/* Selected Traits (Tags) */}
      {selectedTraitObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 rounded-md border bg-muted/30">
          {selectedTraitObjects.map((trait) => {
            const categoryColors = {
              personality: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
              attachment: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
              values: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
              behavioral: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
              cognitive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
            };
            
            return (
              <button
                key={trait.id}
                type="button"
                onClick={() => handleRemoveTrait(trait.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium hover:opacity-80 transition-opacity ${categoryColors[trait.category]}`}
              >
                {trait.name}
                <X className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      )}

      {/* Trait Categories (Accordion) */}
      <div className="rounded-md border bg-background max-h-96 overflow-y-auto">
        {Object.entries(TRAIT_CATEGORIES).map(([category, categoryLabel]) => {
          const categoryTraits = traitsByCategory[category as TraitCategory] || [];
          const isExpanded = expandedCategories.has(category as TraitCategory);

          if (categoryTraits.length === 0 && searchQuery) return null;

          return (
            <div key={category} className="border-b last:border-b-0">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category as TraitCategory)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
              >
                <span className="font-medium text-sm">{categoryLabel}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {categoryTraits.filter((t) => selectedTraits.includes(t.id)).length} selected
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* Trait Checkboxes */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  {categoryTraits.map((trait) => (
                    <label
                      key={trait.id}
                      className="flex items-start gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTraits.includes(trait.id)}
                        onChange={() => handleToggleTrait(trait.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{trait.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {trait.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground">
        Select psychology traits to analyze character compatibility and relationship dynamics
      </p>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import {
  calculateCompatibility,
  getCompatibilityIcon,
  getCompatibilityLabel,
  type CompatibilityScore,
} from "@/lib/compatibility";

type Character = {
  id: string;
  name: string;
  imageUrl: string | null;
  psychologyTraits: string;
};

type CompatibilityModalProps = {
  character: Character;
  allCharacters: Character[];
  isOpen: boolean;
  onClose: () => void;
};

type FilterType = "all" | "healthy" | "warning" | "toxic";
type SortType = "score" | "name";

export function CompatibilityModal({
  character,
  allCharacters,
  isOpen,
  onClose,
}: CompatibilityModalProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("score");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Calculate compatibility for all characters
  const compatibilityData = useMemo(() => {
    if (!character.psychologyTraits) return [];

    const characterTraits = character.psychologyTraits.split(",").filter(Boolean);
    if (characterTraits.length === 0) return [];

    return allCharacters
      .filter((c) => c.id !== character.id && c.psychologyTraits)
      .map((otherChar) => {
        const otherTraits = otherChar.psychologyTraits.split(",").filter(Boolean);
        const compatibility = calculateCompatibility(characterTraits, otherTraits);
        return {
          character: otherChar,
          compatibility,
        };
      })
      .filter((item) => item.compatibility.score > 0 || item.compatibility.warnings.length > 0);
  }, [character, allCharacters]);

  // Apply filters
  const filteredData = useMemo(() => {
    let data = [...compatibilityData];

    // Filter
    switch (filter) {
      case "healthy":
        data = data.filter((d) => d.compatibility.level === "healthy");
        break;
      case "warning":
        data = data.filter((d) =>
          ["challenging", "growth"].includes(d.compatibility.level)
        );
        break;
      case "toxic":
        data = data.filter((d) => d.compatibility.level === "toxic");
        break;
    }

    // Sort
    if (sort === "score") {
      data.sort((a, b) => b.compatibility.score - a.compatibility.score);
    } else {
      data.sort((a, b) => a.character.name.localeCompare(b.character.name));
    }

    return data;
  }, [compatibilityData, filter, sort]);

  // Summary counts
  const summary = useMemo(() => {
    const counts = {
      healthy: 0,
      growth: 0,
      challenging: 0,
      toxic: 0,
    };
    compatibilityData.forEach((item) => {
      counts[item.compatibility.level]++;
    });
    return counts;
  }, [compatibilityData]);

  // Get gradient color based on score
  const getGradientColor = (level: CompatibilityScore["level"]) => {
    switch (level) {
      case "healthy":
        return "bg-gradient-to-r from-green-500 to-green-600";
      case "growth":
        return "bg-gradient-to-r from-blue-500 to-blue-600";
      case "challenging":
        return "bg-gradient-to-r from-yellow-500 to-yellow-600";
      case "toxic":
        return "bg-gradient-to-r from-red-500 to-red-600";
    }
  };

  const getBgColor = (level: CompatibilityScore["level"]) => {
    switch (level) {
      case "healthy":
        return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
      case "growth":
        return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800";
      case "challenging":
        return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800";
      case "toxic":
        return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                {character.name}'s Psychology Compatibility
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Based on personality traits, attachment styles, and behavioral patterns
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Summary */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Summary:</span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                {summary.healthy} Healthy
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                {summary.growth} Growth
              </span>
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {summary.challenging} Challenging
              </span>
              <span className="text-red-600 dark:text-red-400 font-medium">
                {summary.toxic} Toxic
              </span>
            </div>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filter:</span>
            <div className="flex gap-1 border rounded-md p-1">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  filter === "all"
                    ? "bg-foreground text-background"
                    : "hover:bg-muted"
                }`}
              >
                All ({compatibilityData.length})
              </button>
              <button
                onClick={() => setFilter("healthy")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  filter === "healthy"
                    ? "bg-green-600 text-white"
                    : "hover:bg-muted"
                }`}
              >
                Healthy ({summary.healthy})
              </button>
              <button
                onClick={() => setFilter("warning")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  filter === "warning"
                    ? "bg-yellow-600 text-white"
                    : "hover:bg-muted"
                }`}
              >
                Warning ({summary.growth + summary.challenging})
              </button>
              <button
                onClick={() => setFilter("toxic")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  filter === "toxic"
                    ? "bg-red-600 text-white"
                    : "hover:bg-muted"
                }`}
              >
                Toxic ({summary.toxic})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Sort:</span>
            <div className="flex gap-1 border rounded-md p-1">
              <button
                onClick={() => setSort("score")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  sort === "score"
                    ? "bg-foreground text-background"
                    : "hover:bg-muted"
                }`}
              >
                By Score
              </button>
              <button
                onClick={() => setSort("name")}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                  sort === "name"
                    ? "bg-foreground text-background"
                    : "hover:bg-muted"
                }`}
              >
                By Name
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No characters match the selected filter.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredData.map(({ character: otherChar, compatibility }) => (
                <div
                  key={otherChar.id}
                  className={`rounded-lg border-2 p-4 transition-all ${getBgColor(
                    compatibility.level
                  )}`}
                >
                  {/* Character Info */}
                  <div className="flex items-start gap-3 mb-3">
                    {otherChar.imageUrl ? (
                      <img
                        src={otherChar.imageUrl}
                        alt={otherChar.name}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg border border-dashed flex items-center justify-center text-xl flex-shrink-0">
                        👤
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">
                        {otherChar.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl">{getCompatibilityIcon(compatibility.level)}</span>
                        <span className="text-sm font-medium">
                          {getCompatibilityLabel(compatibility.level)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Compatibility</span>
                      <span className="font-bold">{compatibility.score}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getGradientColor(
                          compatibility.level
                        )}`}
                        style={{ width: `${compatibility.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-4 text-xs mb-3">
                    {compatibility.warnings.length > 0 && (
                      <span className="text-muted-foreground">
                        ⚠️ {compatibility.warnings.length} Warning{compatibility.warnings.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {compatibility.strengths.length > 0 && (
                      <span className="text-muted-foreground">
                        ✅ {compatibility.strengths.length} Strength{compatibility.strengths.length > 1 ? "s" : ""}
                      </span>
                    )}
                    {compatibility.growthAreas.length > 0 && (
                      <span className="text-muted-foreground">
                        🌱 {compatibility.growthAreas.length} Growth
                      </span>
                    )}
                  </div>

                  {/* Expandable Details */}
                  {(compatibility.warnings.length > 0 ||
                    compatibility.strengths.length > 0 ||
                    compatibility.growthAreas.length > 0) && (
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === otherChar.id ? null : otherChar.id)
                      }
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2 rounded-md hover:bg-background/50 transition-colors"
                    >
                      {expandedId === otherChar.id ? (
                        <>
                          Hide Details <ChevronUp className="h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Show Details <ChevronDown className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}

                  {/* Expanded Details */}
                  {expandedId === otherChar.id && (
                    <div className="mt-3 pt-3 border-t space-y-2 text-xs">
                      {compatibility.warnings.map((warning, i) => (
                        <div key={i} className="text-muted-foreground">
                          {warning}
                        </div>
                      ))}
                      {compatibility.strengths.map((strength, i) => (
                        <div key={i} className="text-muted-foreground">
                          {strength}
                        </div>
                      ))}
                      {compatibility.growthAreas.map((growth, i) => (
                        <div key={i} className="text-muted-foreground">
                          {growth}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

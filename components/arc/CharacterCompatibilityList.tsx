"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
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

type CharacterCompatibilityListProps = {
  character: Character;
  allCharacters: Character[];
};

export function CharacterCompatibilityList({
  character,
  allCharacters,
}: CharacterCompatibilityListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Calculate compatibility for all characters
  const compatibilityData = useMemo(() => {
    if (!character.psychologyTraits) return [];

    const characterTraits = character.psychologyTraits.split(",").filter(Boolean);
    if (characterTraits.length === 0) return [];

    return allCharacters
      .filter((c) => c.psychologyTraits)
      .map((otherChar) => {
        const otherTraits = otherChar.psychologyTraits.split(",").filter(Boolean);
        const compatibility = calculateCompatibility(characterTraits, otherTraits);
        return {
          character: otherChar,
          compatibility,
        };
      })
      .filter((item) => item.compatibility.score > 0 || item.compatibility.warnings.length > 0)
      .sort((a, b) => b.compatibility.score - a.compatibility.score);
  }, [character, allCharacters]);

  // Get gradient color based on score percentage (0-100)
  const getGradientColorByScore = (score: number) => {
    if (score >= 80) {
      return "bg-gradient-to-r from-green-500 to-green-600";
    } else if (score >= 65) {
      return "bg-gradient-to-r from-lime-500 to-green-500";
    } else if (score >= 50) {
      return "bg-gradient-to-r from-yellow-500 to-yellow-600";
    } else if (score >= 35) {
      return "bg-gradient-to-r from-orange-500 to-orange-600";
    } else {
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

  if (compatibilityData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No other characters with psychology traits to compare.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {compatibilityData.map(({ character: otherChar, compatibility }) => (
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
                className={`h-full transition-all ${getGradientColorByScore(
                  compatibility.score
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
  );
}
